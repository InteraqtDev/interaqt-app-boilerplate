/**
 * Authentication Integration (Type 2: Functional Integration)
 * 
 * Purpose: Provide infrastructure-level authentication functionality
 * 
 * Features:
 * - User registration with password hashing
 * - User login with JWT token generation
 * - Authentication middleware for token verification
 * - Direct storage operations (no external API)
 * - Factory function pattern for configuration flexibility
 */

import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { Controller, MatchExp } from 'interaqt'
import { IIntegration, IIntegrationConstructorArgs, API } from '@/integrations/index'
import type { MiddlewareHandler } from 'hono'
import {
  RegisterRequestSchema,
  RegisterResponseSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  type RegisterRequest,
  type LoginRequest
} from './schemas'

/**
 * Configuration interface for Authentication Integration
 * 
 * 🔴 CRITICAL: All fields are required - NO optional fields or defaults
 */
export type AuthIntegrationConfig = {
  /**
   * JWT configuration
   */
  jwt: {
    secret: string           // JWT signing secret (REQUIRED, no env fallback)
    expiresIn: number       // Token expiration in seconds (REQUIRED, no default)
  }
  
  /**
   * User entity configuration
   */
  user: {
    entityName: string      // User entity name (REQUIRED)
    usernameField: string   // Username field name (REQUIRED)
    emailField: string      // Email field name (REQUIRED)
    passwordField: string   // Password field name (REQUIRED)
    userIdField: string     // User ID field name for login (REQUIRED)
  }
  
  /**
   * Password hashing configuration
   */
  password: {
    saltRounds: number      // Bcrypt salt rounds (REQUIRED)
  }
}

/**
 * Create Authentication Integration
 * 
 * Factory function that returns an IIntegration implementation class.
 * 
 * The integration provides:
 * 1. Registration API: Create new users with hashed passwords
 * 2. Login API: Authenticate users and generate JWT tokens
 * 3. Authentication Middleware: Extract and verify tokens
 * 
 * @param config - Integration configuration
 * @returns Integration class
 * 
 * @example
 * ```typescript
 * const AuthIntegration = createAuthIntegration({
 *   jwt: {
 *     secret: 'your-jwt-secret-here',
 *     expiresIn: 86400
 *   },
 *   user: {
 *     entityName: 'User',
 *     usernameField: 'username',
 *     emailField: 'email',
 *     passwordField: 'password',
 *     userIdField: 'username'
 *   },
 *   password: {
 *     saltRounds: 10
 *   }
 * })
 * ```
 */
export function createAuthIntegration(config: AuthIntegrationConfig) {
  // ✅ CORRECT: Use config directly, no fallbacks or defaults
  const jwtSecret = config.jwt.secret
  const jwtExpiresIn = config.jwt.expiresIn
  const userEntityName = config.user.entityName
  const usernameField = config.user.usernameField
  const emailField = config.user.emailField
  const passwordField = config.user.passwordField
  const userIdField = config.user.userIdField
  const saltRounds = config.password.saltRounds

  return class AuthIntegration implements IIntegration {
    private controller?: Controller
    public readonly namespace: string

    constructor(
      public args: IIntegrationConstructorArgs
    ) {
      this.namespace = args.namespace
    }

    /**
     * Configure phase - NOT USED for functional integrations
     * 
     * Type 2 integrations don't configure computations.
     */
    async configure() {
      console.log('[Auth] Integration configure phase - no action needed')
    }

    /**
     * Setup phase - Store controller reference
     */
    async setup(controller: Controller) {
      this.controller = controller
      console.log('[Auth] Integration setup completed')
    }

    /**
     * Create side effects - NOT USED for functional integrations
     * 
     * Type 2 integrations don't listen to entity mutations.
     */
    createSideEffects() {
      return []
    }

    /**
     * Create custom APIs
     * 
     * Expose registration and login APIs.
     */
    createAPIs(): API[] {
      return [
        /**
         * Register new user
         * 
         * Creates a new user with hashed password using direct storage operation.
         */
        {
          name: 'register',
          namespace: this.namespace,
          callback: async function(this: Controller, context, params: RegisterRequest) {
            try {
              // Validation is handled by Zod schema
              console.log('[Auth] Registering user', { username: params.username, email: params.email })

              // Check if username already exists
              const existingUser = await this.system.storage.findOne(
                userEntityName,
                MatchExp.atom({ key: usernameField, value: ['=', params.username] }),
                undefined,
                ['id']
              )

              if (existingUser) {
                throw { statusCode: 400, message: 'Username already exists' }
              }

              // Hash password
              const hashedPassword = await bcrypt.hash(params.password, saltRounds)

              // Create user directly using storage
              const userData: any = {
                [usernameField]: params.username,
                [emailField]: params.email,
                [passwordField]: hashedPassword
              }

              const user = await this.system.storage.create(userEntityName, userData)

              console.log('[Auth] User registered successfully', { userId: user.id })

              return {
                success: true,
                message: 'User registered successfully',
                userId: user.id
              }
            } catch (error: any) {
              // If error already has statusCode, re-throw it directly
              if (error.statusCode) {
                throw error
              }

              console.error('[Auth] Registration failed', {
                username: params.username,
                error: error.message
              })

              // Handle duplicate user error
              if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
                throw {
                  statusCode: 400,
                  message: 'Username or email already exists'
                }
              }

              throw {
                statusCode: 500,
                message: error.message || 'Registration failed'
              }
            }
          },
          paramsSchema: RegisterRequestSchema,
          responseSchema: RegisterResponseSchema,
          useNamedParams: true,
          allowAnonymous: true,
          openapi: {
            summary: 'Register new user',
            description: 'Creates a new user account with username, email, and password',
            tags: ['Auth']
          }
        },

        /**
         * Login user
         * 
         * Authenticates user and generates JWT token.
         */
        {
          name: 'login',
          namespace: this.namespace,
          callback: async function(this: Controller, context, params: LoginRequest) {
            try {
              // Validation is handled by Zod schema
              console.log('[Auth] Login attempt', { identifier: params.identifier })

              // Query user by username or email
              const user = await this.system.storage.findOne(
                userEntityName,
                MatchExp.atom({ key: userIdField, value: ['=', params.identifier] }),
                undefined,
                ['*']
              )

              if (!user) {
                console.log('[Auth] User not found', { [userIdField]: params.identifier })
                throw { statusCode: 401, message: 'Invalid credentials' }
              }

              // Verify password
              const isValidPassword = await bcrypt.compare(params.password, user[passwordField])
              if (!isValidPassword) {
                console.log('[Auth] Invalid password', { userId: user.id }, params.password, user[passwordField])
                throw { statusCode: 401, message: 'Invalid credentials' }
              }

              // Generate JWT token using jose
              const secretKey = new TextEncoder().encode(jwtSecret)
              const token = await new SignJWT({
                userId: user.id,
                [userIdField]: user[userIdField]
              })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt()
                .setExpirationTime(`${jwtExpiresIn}s`)
                .sign(secretKey)

              console.log('[Auth] Login successful', { userId: user.id })

              // Return token and user profile (NEVER include password)
              const userProfile: any = {
                id: user.id,
                [usernameField]: user[usernameField],
                [emailField]: user[emailField]
              }

              return {
                token,
                user: userProfile
              }
            } catch (error: any) {
              // If it's already a structured error, re-throw
              if (error.statusCode) {
                throw error
              }

              console.error('[Auth] Login failed', {
                identifier: params.identifier,
                error: error.message
              })

              throw {
                statusCode: 500,
                message: error.message || 'Login failed'
              }
            }
          },
          paramsSchema: LoginRequestSchema,
          responseSchema: LoginResponseSchema,
          useNamedParams: true,
          allowAnonymous: true,
          openapi: {
            summary: 'User login',
            description: 'Authenticates user with username/email and password, returns JWT token',
            tags: ['Auth']
          }
        }
      ]
    }

    /**
     * Create middleware
     * 
     * Authentication middleware to extract and verify JWT tokens.
     */
    createMiddlewares(): MiddlewareHandler[] {
      return [
        async (c, next) => {
          let token: string | undefined

          // Extract token from multiple sources
          const authToken = c.req.query('authToken')
          const authHeader = c.req.header('authorization')
          const cookieHeader = c.req.header('cookie')

          if (authToken) {
            token = authToken
          } else if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7)
          } else if (cookieHeader) {
            // Parse cookies manually
            const allCookies: Record<string, string> = {}
            cookieHeader.split(';').forEach((cookie) => {
              const [name, value] = cookie.trim().split('=')
              if (name && value) {
                allCookies[name] = decodeURIComponent(value)
              }
            })
            token = allCookies.token
          }

          // Verify token and inject userId into context
          if (token) {
            try {
              const secretKey = new TextEncoder().encode(jwtSecret)
              const { payload } = await jwtVerify(token, secretKey)
              c.set('userId', payload.userId as string)
              console.log('[Auth] Token verified', { userId: payload.userId })
            } catch (err) {
              console.log('[Auth] Invalid token', { error: (err as Error).message })
              // Don't throw - allow request to continue as anonymous
            }
          }

          await next()
        }
      ]
    }
  }
}
