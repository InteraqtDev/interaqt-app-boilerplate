import { DictionaryInstance, ActivityInstance, EntityInstance, InteractionInstance, RecordMutationSideEffect, RelationInstance, Controller, EventUser } from "interaqt"
import { MiddlewareHandler } from "hono"
import type { ZodSchema } from 'zod'

// ============================================
// Pull Mode Configuration Types
// ============================================

/**
 * Configuration for Pull Mode task processing
 * 
 * Pull Mode allows the AsyncTask Component to fetch pending tasks via HTTP
 * instead of receiving them via push (Side Effects).
 * 
 * This provides better reliability:
 * - Tasks are persisted in database first
 * - If Temporal is unavailable, tasks remain pending and will be retried
 * - Multiple TaskProcessor instances can scale horizontally
 */
export type PullModeConfig = {
  /** Whether pull mode is enabled for this integration */
  enabled: boolean
  
  // Temporal configuration
  /** Task queue name for Temporal workers */
  taskQueue: string
  /** Workflow function name to start */
  workflowName: string
  /** Build deterministic workflow ID from APICall */
  buildWorkflowId: (apiCall: any) => string
  /** Build workflow parameters from APICall */
  buildWorkflowParams: (apiCall: any) => any
  
  // Internal API endpoints (complete URLs)
  internalAPIs: {
    /** URL to fetch pending tasks, e.g. 'http://main:3000/api/custom/fangzhou/fetchPendingTasks' */
    fetchPendingTasks: string
    /** URL to report task events, reuses existing reportResult API */
    reportTaskEvent: string
  }
}

// -----------------------------------------------------------------------------
// Integration-facing API abstractions (moved from main-component/app.ts)
// -----------------------------------------------------------------------------

export type APIContext = {
    user: EventUser,
    useRequestContext?: (handler: (context: {
        setCookie: (name: string, value: string, options?: any) => void,
        deleteCookie: (name: string, options?: any) => void
    }) => void | Promise<void>) => void
}

export type APIHandle = (this: Controller, context: APIContext, ...rest: any[]) => any

/**
 * OpenAPI metadata for schema documentation
 */
export type APISchemaMetadata = {
    summary?: string
    description?: string
    tags?: string[]
    deprecated?: boolean
}

/**
 * API definition with object structure
 *
 * API is a plain object with all configuration as properties
 */
export type API = {
    /** API name - used as the endpoint name */
    name: string
    /** Optional namespace for grouping APIs */
    namespace?: string
    /** The callback function that handles the API request */
    callback: APIHandle
    /** Parameter definitions for legacy validation */
    params?: any[] | {}
    /** Whether to use named params (object) instead of array */
    useNamedParams?: boolean
    /** Allow anonymous access (no authentication required) */
    allowAnonymous?: boolean
    /** Enable access to request context (cookies, etc.) */
    useRequestContext?: boolean
    // Zod schema support for OpenAPI
    paramsSchema?: ZodSchema
    responseSchema?: ZodSchema
    errorSchema?: ZodSchema
    // OpenAPI metadata
    openapi?: APISchemaMetadata
}

/**
 * Build API full name from namespace and api name
 * This is the path segment after 'api/custom/' in the URL
 */
export function buildAPIFullName(namespace: string | undefined, apiName: string): string {
    return namespace ? `${namespace}/${apiName}` : apiName
}

/**
 * Build API path for custom APIs
 *
 * Generates a consistent API path following the format: api/custom/:namespace/:apiName
 * This function should be used both by app.ts for route registration and by integrations
 * for generating callback URLs.
 *
 * @returns The API path (without leading slash)
 */
export function buildAPIPath(namespace: string | undefined, apiName: string): string {
    return `api/custom/${buildAPIFullName(namespace, apiName)}`
}

export type IIntegration = {
    /** Integration namespace - used for API routing and identification */
    namespace: string
    configure?:() => Promise<any>
    setup?:(controller: Controller) => Promise<any>
    createSideEffects:() => RecordMutationSideEffect<any>[]
    createAPIs?: () => API[]
    createMiddlewares?: () => MiddlewareHandler[]
    /** 
     * Returns Pull Mode configuration if enabled
     * Pull Mode allows TaskProcessor to fetch pending tasks via HTTP
     * instead of using Side Effects (push mode)
     */
    getPullModeConfig?: () => PullModeConfig | null
}

export type IIntegrationConstructorArgs = {
    entities: EntityInstance[],
    relations: RelationInstance[],
    activities: ActivityInstance[],
    interactions: InteractionInstance[],
    dict: DictionaryInstance[],
    namespace: string
}

// Integration 类构造函数类型（不含 namespace）
export type IIntegrationClass = 
    | (new (args: IIntegrationConstructorArgs) => IIntegration)
    | { new (args: IIntegrationConstructorArgs): IIntegration }

// 工厂函数：创建聚合多个 IIntegration 的类
// 使用 kv 结构的参数，key 是 namespace
export function createAggregatedIntegration(
    integrationClassesMap: Record<string, IIntegrationClass>
) {
    return class AggregatedIntegration implements IIntegration {
        public readonly namespace = '__aggregated__'
        private integrations: IIntegration[]

        constructor(public args: Omit<IIntegrationConstructorArgs, 'namespace'>) {
            // 创建所有集成实例，将 namespace 作为 key 传入
            this.integrations = Object.entries(integrationClassesMap).map(
                ([namespace, IntegrationClass]) => new IntegrationClass({ ...args, namespace })
            )
        }
        
        /**
         * Get all integration instances
         * Used by TaskProcessor to collect PullModeConfigs
         * Each integration has its own namespace accessible via integration.namespace
         */
        getIntegrations(): IIntegration[] {
            return this.integrations
        }

        async configure() {
            // 串行执行所有集成的 configure 方法
            for (const integration of this.integrations) {
                if (integration.configure) {
                    await integration.configure()
                }
            }
        }

        async setup(controller: Controller) {
            // 串行执行所有集成的 setup 方法
            for (const integration of this.integrations) {
                if (integration.setup) {
                    await integration.setup(controller)
                }
            }
        }

        createSideEffects(): RecordMutationSideEffect<any>[] {
            // 合并所有集成的 createSideEffects 结果
            const allListeners: RecordMutationSideEffect<any>[] = []
            for (const integration of this.integrations) {
                const listeners = integration.createSideEffects()
                allListeners.push(...listeners)
            }
            return allListeners
        }

        createAPIs?(): API[] {
            // 合并所有集成的 createAPIs 结果
            const allAPIs: API[] = []
            for (const integration of this.integrations) {
                const apis = integration.createAPIs?.()
                if (apis) {
                    allAPIs.push(...apis)
                }
            }
            return allAPIs
        }

        createMiddlewares?(): MiddlewareHandler[] {
            // 合并所有集成的 createMiddlewares 结果
            const allMiddlewares: MiddlewareHandler[] = []
            for (const integration of this.integrations) {
                const middlewares = integration.createMiddlewares?.()
                if (middlewares) {
                    allMiddlewares.push(...middlewares)
                }
            }
            return allMiddlewares
        }
    }
}


