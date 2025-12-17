import { Context, Hono, MiddlewareHandler } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { cors } from 'hono/cors'
import { setCookie, deleteCookie } from 'hono/cookie'
import { Controller, USER_ENTITY, EventPayload, EventQuery, EventUser, InteractionEventArgs, MatchExp, assert } from "interaqt"
import * as path from 'path'
import * as fs from 'fs'
import { API, APIContext, buildAPIFullName } from '@/integrations/index'

type ServerOptions = {
    middlewares?: MiddlewareHandler[]
    cors? : {
        origin?: string | string[],
        credentials?: boolean,
        methods?: string[],
        allowedHeaders?: string[]
    }
    logger? : boolean
}

export type APIBody = {
    activity?: string,
    interaction? : string,
    activityId?: string
    payload?: EventPayload
    query?: EventQuery
}

type SyncUserBody = {
    userId: string,
}

type APIClassParam<T extends any> = T & { fromValue: (value: any) => T }

/**
 * Parse and validate API parameters
 * Supports both legacy string-based params and new Zod schema validation
 */
function parseAPIParams(inputParams: API["params"], api: API): API["params"] {
    // If API has Zod schema, use it for validation
    if (api.paramsSchema) {
        const result = api.paramsSchema.safeParse(inputParams)
        if (!result.success) {
            const errorMessages = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
            throw { statusCode: 400, message: `Validation error: ${errorMessages}` }
        }
        return result.data
    }

    // Legacy params handling
    if (!api.params) {
        return inputParams
    }

    if (api.useNamedParams) {
        const params = api.params as {[k:string]:any}
        const objectParams = inputParams as {[k:string]:any}

        return Object.fromEntries(Object.entries(objectParams).map(([key, inputParam]) => {
            const param = params[key]

            if (param === undefined) return [key, inputParam]

            if (typeof param === 'string' || inputParam === undefined || inputParam === null) {
                // 'string'|'number'|'boolean'|'object'|'undefined'|'null'
                return [key, inputParam]
            } else if (typeof param === 'function') {
                // 对象
                if (!(param as APIClassParam<any>).fromValue) {
                    throw new Error('Invalid Class param type, missing fromValue')
                }
                return [key, (param as APIClassParam<any>).fromValue(inputParam)]
            } else {
                throw new Error('Invalid param type')
            }

        }))

    } else {
        const params = api.params as any[]

        const arrayParams = inputParams as any[]
        return arrayParams.map((inputParam, index) =>{
            const param = params[index]
            if (param === undefined) return inputParam

            if (typeof param === 'string' || inputParam === undefined || inputParam === null) {
                // 'string'|'number'|'boolean'|'object'|'undefined'|'null'
                return inputParam
            } else if (typeof param === 'function') {
                // 对象
                if (!(param as APIClassParam<any>).fromValue) {
                    throw new Error('Invalid Class param type, missing fromValue')
                }
                return (param as APIClassParam<any>).fromValue(inputParam)
            } else {
                throw new Error('Invalid param type')
            }
        })
    }
}


/**
 * Convert API array to a map indexed by full API name (namespace/name or just name)
 */
function buildAPIMap(apis: API[]): Map<string, API> {
    const apiMap = new Map<string, API>()
    for (const api of apis) {
        const fullName = buildAPIFullName(api.namespace, api.name)
        apiMap.set(fullName, api)
    }
    return apiMap
}

export function setupHttpServer(app: Hono, controller: Controller, options: ServerOptions, apis: API[] = []) {
    const apiMap = buildAPIMap(apis)
    // Health check endpoint
    app.get('/health', (c) => {
        return c.json({ status: 'ok', timestamp: new Date().toISOString() })
    })
    
    // CORS middleware
    if (options.cors) {
        console.log('setting up cors', options.cors)
        app.use('*', cors({
            origin: options.cors.origin,
            credentials: options.cors.credentials,
            allowMethods: options.cors.methods,
            allowHeaders: options.cors.allowedHeaders
        }))
    }

    // Apply custom middlewares from integrations
    if (options.middlewares) {
        for (const middleware of options.middlewares) {
            app.use('*', middleware)
        }
    }

    // Serve static files from frontend/dist
    const frontendDistPath = path.join(process.cwd(), 'frontend', 'dist')
    if (fs.existsSync(frontendDistPath)) {
        app.use('/*', serveStatic({
            root: frontendDistPath,
            rewriteRequestPath: (path) => {
                // Don't rewrite API paths
                if (path.startsWith('/api/')) {
                    return path
                }
                return path
            }
        }))
    }

    // Interaction endpoint
    app.post('/api/interaction/:interactionName', async (c: Context) => {
        const { interactionName } = c.req.param()
        const body = await c.req.json() as APIBody
        const { activity: activityName, activityId, payload, query } = body

        // Get userId from context (set by middleware) or fallback to parseUserId
        let userId = (c as any).get('userId')
       
        if (!userId) {
            return c.json({ error: 'Unauthorized' }, 401)
        }

        console.log('calling interaction', interactionName, userId)

        let user = await controller.system.storage.findOne(USER_ENTITY, MatchExp.atom({key:'id', value: ['=', userId]}), undefined, ['*'])
        if (!user) {
            return c.json({ error: 'User not synced' }, 500)
        }

        const eventArgs: InteractionEventArgs = {
            user,
            payload,
            query
        }

        const result = await controller.callInteraction(interactionName!, eventArgs, activityName, activityId)

        if (result.error) {
            return c.json(result, 400)
        }

        return c.json(result)
    })

    // Custom API endpoint - supports both simple name and namespace/name format
    app.post('/api/custom/:apiName{.*}', async (c: Context) => {
        try {
            const { apiName } = c.req.param()
            console.log('API call for:', apiName)
            const api = apiMap.get(apiName)
            if (!api) {
                console.log('API not found:', apiName)
                return c.json({ error: `api ${apiName} not found` }, 404)
            }

            let user
            if (!api.allowAnonymous) {
                // Get userId from context (set by middleware) or fallback to parseUserId
                let userId = (c as any).get('userId')
                
                if (!userId) {
                    return c.json({ error: 'Unauthorized' }, 401)
                }

                user = await controller.system.storage.findOne(USER_ENTITY, MatchExp.atom({key:'id', value: ['=', userId]}), undefined, ['*'])
                if (!user) {
                    return c.json({ error: 'User not synced' }, 500)
                }
            }

            // Parse API parameters
            let requestBody = {};
            const contentType = c.req.header('content-type');
            
            // Only try to parse JSON if there's a content-type header indicating JSON
            // and the content-length is greater than 0
            if (contentType && contentType.includes('application/json')) {
                const contentLength = c.req.header('content-length');
                if (!contentLength || parseInt(contentLength) > 0) {
                    try {
                        requestBody = await c.req.json();
                    } catch (err) {
                        // If JSON parsing fails, use empty object as fallback
                        console.log('JSON parsing failed, using empty object:', err);
                        requestBody = {};
                    }
                }
            }
            
            const apiParams = parseAPIParams(requestBody, api)

            // Create request context handler if needed
            let requestContextHandler: APIContext['useRequestContext']
            if (api.useRequestContext) {
                requestContextHandler = (handler) => {
                    // Execute the handler immediately with cookie functions
                    const cookieContext = {
                        setCookie: (name: string, value: string, options?: any) => {
                            setCookie(c, name, value, options)
                        },
                        deleteCookie: (name: string, options?: any) => {
                            deleteCookie(c, name, options)
                        }
                    }
                    Promise.resolve(handler(cookieContext)).catch(err => {
                        console.error('Error in requestContext handler:', err)
                    })
                }
            }

            let result
            if(api.useNamedParams) {
                result = await api.callback.call(controller, {
                    user: user as EventUser,
                    useRequestContext: requestContextHandler
                }, apiParams)
            } else {
                result = await api.callback.call(controller, {
                    user: user as EventUser,
                    useRequestContext: requestContextHandler
                }, ...(apiParams as any[]))
            }

            return c.json(result)
        } catch (error: any) {
            console.error('Error in API call:', error)
            if (error.statusCode) {
                return c.json({ error: error.message || 'API Error' }, error.statusCode)
            }
            return c.json({ error: 'Internal server error', details: String(error) }, 500)
        }
    })

    // Health check
    app.get('/ping', async (c) => {
        return c.json({ message: 'pong' })
    })

    // SPA fallback - serve index.html for all non-API and non-file routes
    app.get('*', async (c) => {
        const url = c.req.url
        const pathname = new URL(url).pathname
        
        // Don't handle API routes
        if (pathname.startsWith('/api')) {
            return c.json({ error: 'Not Found' }, 404)
        }
        
        // Check if it's a file request (has extension)
        const hasExtension = /\.[^\/]+$/.test(pathname)
        if (hasExtension) {
            // Return 404 for file requests that weren't found by static middleware
            return c.json({ error: 'File not found' }, 404)
        }
        
        // For all other routes, serve index.html for SPA routing
        const indexPath = path.join(process.cwd(), 'frontend', 'dist', 'index.html')
        if (fs.existsSync(indexPath)) {
            const html = fs.readFileSync(indexPath, 'utf-8')
            return c.html(html)
        } else {
            return c.json({ error: 'index.html not found' }, 404)
        }
    })
}


type WebSocketMessageData = {
    type: 'interaction' | 'api',
    name: string,
    args : {[k:string]:any}
}
type WebSocketErrorResponse = {
    error: string,
    details?: string
}

export function setupWebSocketServer( ws: WebSocket, controller: Controller, user: any) {
    ws.addEventListener('message', async(message) => {
        // 同样支持 interaction/api
        console.log('WebSocket message received:', message.data)
        let data: WebSocketMessageData
        try {
            data = JSON.parse(message.data)
        } catch (error) {
            console.error('Error parsing WebSocket message:', error)
            return ws.send(JSON.stringify({
                error: 'Invalid message format',
                details: String(error)
            }))
        }

        if (data.type === 'interaction') {
            const eventArgs: InteractionEventArgs = {
                user,
                payload: data.args.payload,
                query: data.args.query
            }
    
            const result = await controller.callInteraction(data.name, eventArgs, data.args.activityName, data.args.activityId)
    
            if (result.error) {
                return ws.send(JSON.stringify({
                    error: result.error.toString(),
                    details: result.error
                }))
            }
    
            return ws.send(JSON.stringify(result))
        } else if (data.type === 'api') {
            // TODO ws 中只能 call 那些不需要 cookie 等副作用的 api。
        }
    })
}