/**
 * Centrifugo Messaging Integration
 *
 * Purpose: Enable real-time message delivery to chat room members through Centrifugo
 *
 * Integration Type: Side-Effect Execution Pattern
 *
 * Architecture:
 * - Centrifugo handles all real-time communication (WebSocket connections, channel subscriptions, message pushing)
 * - Backend handles business logic, data persistence, token generation, message publishing
 * - Frontend connects directly to Centrifugo, not to backend WebSocket
 *
 * Features:
 * - Listen to Message entity creation and publish to Centrifugo channels
 * - Generate connection tokens for frontend to connect to Centrifugo
 * - Generate subscription tokens for frontend to subscribe to private channels
 * - Validate user permissions before generating subscription tokens
 */

import {
  Controller,
  RecordMutationSideEffect
} from 'interaqt'
import { IIntegration, IIntegrationConstructorArgs, API, APIContext } from '@/integrations/index'
import crypto from 'crypto'
import {
  GenerateConnectionTokenRequestSchema,
  GenerateConnectionTokenResponseSchema,
  GenerateChannelSubscriptionTokenRequestSchema,
  GenerateChannelSubscriptionTokenResponseSchema,
  type GenerateChannelSubscriptionTokenRequest
} from './schemas'
/**
 * Configuration interface for Centrifugo Integration
 * 
 * 🔴 CRITICAL: All fields are required
 */
export type CentrifugoMessagingConfig = {
  /**
   * Entity configuration - 实体名称配置
   * 
   * 🔴 CRITICAL: 所有实体名称必须通过配置传入，不能直接 import
   */
  entities: {
    /**
     * Message entity name
     * 用于监听消息创建事件，发布到 Centrifugo 频道
     */
    messageEntityName: string
    
    /**
     * ChatRoomMembership relation name
     * 用于验证用户是否是聊天室成员
     */
    chatRoomMembershipRelationName: string
  }

  /**
   * Centrifugo HTTP API URL
   * 
   * 用途：后端服务器通过此 URL 向 Centrifugo 发送 HTTP API 请求
   * 作用：发布消息到频道、管理频道、获取在线状态等
   * 
   * 示例：
   * - 本地开发：'http://localhost:3001/api'
   * - 生产环境：'http://centrifugo-service:8000/api' (k8s 内部服务)
   * 
   * 注意：
   * - 这是 Centrifugo 的 HTTP API endpoint，不是 WebSocket endpoint
   * - 路径必须以 /api 结尾
   * - 仅用于服务器端通信，前端不使用此 URL
   */
  apiUrl: string

  /**
   * Centrifugo API Key
   * 
   * 用途：后端服务器调用 Centrifugo HTTP API 时的身份验证
   * 作用：确保只有授权的服务器才能发布消息和管理频道
   * 
   * 如何获取：
   * - Centrifugo 配置文件中的 api_key 字段
   * - 可以在 Centrifugo 启动时通过环境变量 CENTRIFUGO_API_KEY 设置
   * 
   * 使用方式：
   * - 在 HTTP 请求头中添加：Authorization: apikey <API_KEY>
   * - 所有服务器到 Centrifugo 的 API 调用都需要此 key
   * 
   * 安全建议：
   * - 使用强随机字符串（建议 32+ 字符）
   * - 不要提交到代码仓库，使用环境变量或密钥管理系统
   * - 生产环境和开发环境使用不同的 key
   * 
   * 示例：
   * - 开发环境：'dev-api-key-12345678'
   * - 生产环境：'prod-a8f3c2d1e9b4567890abcdef12345678'
   */
  apiKey: string

  /**
   * JWT Token Secret (HMAC Secret Key)
   * 
   * 用途：后端生成 JWT token 供前端连接和订阅 Centrifugo 频道
   * 作用：确保 token 的签名安全，防止伪造
   * 
   * Token 类型：
   * 1. Connection Token：前端连接 Centrifugo 时使用
   *    - 包含用户 ID (sub)
   *    - 验证用户身份
   * 
   * 2. Subscription Token：前端订阅私有频道时使用
   *    - 包含用户 ID 和频道名
   *    - 验证用户是否有权订阅该频道
   * 
   * 如何同步：
   * - 此 secret 必须与 Centrifugo 配置中的 token_hmac_secret_key 完全一致
   * - Centrifugo 使用相同的 secret 验证后端生成的 token
   * 
   * 安全建议：
   * - 使用强随机字符串（建议 64+ 字符）
   * - 定期轮换（建议每 3-6 个月）
   * - 不同环境使用不同的 secret
   * 
   * 示例：
   * - 开发环境：'dev-token-secret-key-for-jwt-signing'
   * - 生产环境：'prod-8a7f6e5d4c3b2a1098765f4e3d2c1b0a9f8e7d6c5b4a39f8e7d6c5b4a3'
   */
  tokenHmacSecretKey: string

  /**
   * Channel prefix (频道名称前缀)
   * 
   * 用途：为所有聊天室频道添加统一前缀
   * 作用：命名空间隔离，避免与其他应用的频道冲突
   * 
   * 频道命名规则：
   * - 完整频道名 = channelPrefix + chatRoomId
   * - 例如：'chat-room:' + 'room-123' = 'chat-room:room-123'
   * 
   * 建议：
   * - 使用冒号分隔符（Centrifugo 推荐格式）
   * - 简短且有意义
   * - 不同功能模块使用不同前缀
   * 
   * 示例：
   * - 聊天室：'chat-room:'
   * - 通知：'notification:'
   * - 实时状态：'presence:'
   */
  channelPrefix: string

  /**
   * Token expiration time (token 有效期，单位：秒)
   * 
   * 用途：设置生成的 JWT token 的有效期
   * 作用：平衡安全性和用户体验
   * 
   * Connection Token：
   * - 建议：3600 秒（1 小时）
   * - 过期后客户端会调用 getToken 回调自动刷新
   * 
   * Subscription Token：
   * - 建议：3600 秒（1 小时）
   * - 过期后客户端会为每个订阅调用 getToken 刷新
   * 
   * 权衡：
   * - 短期（< 1h）：更安全，但刷新频繁
   * - 长期（> 4h）：用户体验好，但安全性降低
   * 
   * 示例：
   * - 3600（1 小时）- 推荐用于生产环境
   * - 86400（24 小时）- 可用于开发环境
   */
  tokenExpiresIn: number
}

/**
 * Create Centrifugo Messaging Integration
 *
 * Factory function that returns an IIntegration implementation class.
 *
 * 架构说明：
 * - Centrifugo 负责所有实时通信（WebSocket 连接、频道订阅、消息推送）
 * - 后端服务器负责业务逻辑、数据持久化、生成认证 token、发布消息
 * - 前端直接连接 Centrifugo，不再连接后端 WebSocket
 *
 * 通信流程：
 * 1. 前端获取 Connection Token -> 连接 Centrifugo
 * 2. 前端获取 Subscription Token -> 订阅聊天室频道
 * 3. 用户发送消息 -> 后端创建 Message 实体
 * 4. Side-effect 拦截 -> 后端调用 Centrifugo HTTP API 发布消息
 * 5. Centrifugo 推送消息 -> 所有订阅该频道的前端
 *
 * @param config - Integration configuration
 * @returns Integration class
 */
export function createCentrifugoMessagingIntegration(config: CentrifugoMessagingConfig) {
  return class CentrifugoMessagingIntegration implements IIntegration {
    private controller?: Controller
    
    // 配置参数（从闭包中获取）
    private readonly apiUrl: string
    private readonly apiKey: string
    private readonly tokenHmacSecretKey: string
    private readonly channelPrefix: string
    private readonly tokenExpiresIn: number
    public readonly namespace: string
    
    constructor(
      public args: IIntegrationConstructorArgs
    ) {
      // 从工厂函数闭包中读取配置
      this.apiUrl = config.apiUrl
      this.apiKey = config.apiKey
      this.tokenHmacSecretKey = config.tokenHmacSecretKey
      this.channelPrefix = config.channelPrefix
      this.tokenExpiresIn = config.tokenExpiresIn
      this.namespace = args.namespace
    }
  
    async setup(controller: Controller) {
      this.controller = controller
      console.log('[Centrifugo] Integration setup started')
      console.log('[Centrifugo] API URL:', this.apiUrl)
      console.log('[Centrifugo] Channel prefix:', this.channelPrefix)
      console.log('[Centrifugo] Token expires in:', this.tokenExpiresIn, 'seconds')
    }
  
    /**
     * Configure phase - NOT USED for side-effect only integrations
     */
    async configure() {
      console.log('[Centrifugo] Integration configure phase - no action needed')
    }
  
    /**
     * Create side effects - MAIN INTEGRATION LOGIC
     * 
     * Side-effect: 监听 Message 创建事件，发布到 Centrifugo 频道
     */
    createSideEffects(): RecordMutationSideEffect<any>[] {
      const self = this
      
      return [
        // Side-effect: 发布消息到 Centrifugo
        RecordMutationSideEffect.create({
          name: 'Centrifugo_MessagePublisher',
          record: { name: config.entities.messageEntityName },
          content: async function(this: Controller, event) {
            if (event.type !== 'create') {
              return { success: true }
            }
            
            const message = event.record
            console.log('[Centrifugo] Message created, publishing to Centrifugo', {
              messageId: message.id
            })
            
            try {
              const chatRoomId = message.chatRoom?.id
              if (!chatRoomId) {
                console.error('[Centrifugo] Message missing chatRoom', { messageId: message.id })
                return {
                  success: false,
                  error: { message: 'Message missing chatRoom' }
                }
              }
              
              const senderId = message.sender?.id
              if (!senderId) {
                console.error('[Centrifugo] Message missing sender', { messageId: message.id })
                return {
                  success: false,
                  error: { message: 'Message missing sender' }
                }
              }
              
              // 查询完整的 sender 信息（包含 username）
              const sender = await this.system.storage.findOne(
                'User',
                this.globals.MatchExp.atom({ key: 'id', value: ['=', senderId] }),
                undefined,
                ['id', 'username']
              )
              
              if (!sender) {
                console.error('[Centrifugo] Sender not found', { senderId })
                return {
                  success: false,
                  error: { message: 'Sender not found' }
                }
              }
              
              const channel = `${self.channelPrefix}${chatRoomId}`
              
              // 构造消息体
              const messageData = {
                type: 'new-message',
                messageId: message.id,
                content: message.content,
                senderId: sender.id,
                senderName: sender.username,  // ✅ 使用查询到的完整 username
                chatRoomId: chatRoomId,
                timestamp: new Date(message.createdAt * 1000).toISOString()
              }
              
              // 调用 Centrifugo HTTP API 发布消息
              const response = await fetch(`${self.apiUrl}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `apikey ${self.apiKey}`
                },
                body: JSON.stringify({
                  method: 'publish',
                  params: {
                    channel: channel,
                    data: messageData
                  }
                })
              })
              
              if (!response.ok) {
                throw new Error(`Centrifugo API error: ${response.status} ${response.statusText}`)
              }
              
              const result = await response.json()
              
              if (result.error) {
                // "unknown channel" 是预期行为（当没有订阅者时）
                // 详见: tests/centrifugo-integration.test.ts:422-427
                if (result.error.message === 'unknown channel') {
                  console.log('[Centrifugo] Message published to channel without active subscribers:', channel)
                  return {
                    success: true,
                    data: {
                      messageId: message.id,
                      channel: channel,
                      warning: 'Channel has no active subscribers'
                    }
                  }
                }
                
                // 其他错误仍然抛出
                throw new Error(`Centrifugo error: ${result.error.message}`)
              }
              
              console.log('[Centrifugo] Message published successfully', {
                messageId: message.id,
                channel: channel
              })
              
              return {
                success: true,
                data: {
                  messageId: message.id,
                  channel: channel
                }
              }
            } catch (error: any) {
              console.error('[Centrifugo] Failed to publish message:', error.message, error.stack)
              return {
                success: false,
                error: {
                  message: error.message,
                  stack: error.stack
                }
              }
            }
          }
        })
      ]
    }
    
    /**
     * Create custom APIs
     * 
     * 提供两个 API：
     * 1. generateCentrifugoConnectionToken - 生成连接 token
     * 2. generateChannelSubscriptionToken - 生成频道订阅 token
     */
    createAPIs(): API[] {
      const self = this
      
      return [
        // API: 生成 Centrifugo 连接 token
        {
          name: 'generateCentrifugoConnectionToken',
          namespace: this.namespace,
          callback: async function(this: Controller, context: APIContext) {
            const userId = context.user.id
            
            // 生成 JWT token
            // 注意：Centrifugo 要求 sub 字段必须是字符串类型
            const token = self.generateJWT({
              sub: String(userId),  // subject = userId (转换为字符串)
              exp: Math.floor(Date.now() / 1000) + self.tokenExpiresIn
            })
            
            console.log('[Centrifugo] Generated connection token for user:', userId)
            
            return { token }
          },
          paramsSchema: GenerateConnectionTokenRequestSchema,
          responseSchema: GenerateConnectionTokenResponseSchema,
          allowAnonymous: false,
          useNamedParams: true,
          openapi: {
            summary: 'Generate Centrifugo connection token',
            description: 'Generates a JWT token for connecting to Centrifugo WebSocket',
            tags: ['Centrifugo']
          }
        },
        
        // API: 生成频道订阅 token
        {
          name: 'generateChannelSubscriptionToken',
          namespace: this.namespace,
          callback: async function(this: Controller, context: APIContext, params: GenerateChannelSubscriptionTokenRequest) {
            const userId = context.user.id
            const chatRoomId = params.chatRoomId
            
            // 验证用户是否是该聊天室成员
            const membership = await this.system.storage.findOne(
              config.entities.chatRoomMembershipRelationName,
              this.globals.MatchExp.atom({ key: 'source.id', value: ['=', userId] })
                .and({ key: 'target.id', value: ['=', chatRoomId] }),
              undefined,
              ['id', ['source', { attributeQuery: ['id'] }], ['target', { attributeQuery: ['id'] }]]
            )
            
            if (!membership) {
              throw new Error('User is not a member of this chat room')
            }
            
            const channel = `${self.channelPrefix}${chatRoomId}`
            
            // 生成订阅 token
            // 注意：Centrifugo 要求 sub 字段必须是字符串类型
            const token = self.generateJWT({
              sub: String(userId),
              channel: channel,
              exp: Math.floor(Date.now() / 1000) + self.tokenExpiresIn
            })
            
            console.log('[Centrifugo] Generated subscription token for user:', userId, 'channel:', channel)
            
            return { token, channel }
          },
          paramsSchema: GenerateChannelSubscriptionTokenRequestSchema,
          responseSchema: GenerateChannelSubscriptionTokenResponseSchema,
          useNamedParams: true,
          allowAnonymous: false,
          openapi: {
            summary: 'Generate channel subscription token',
            description: 'Generates a JWT token for subscribing to a private Centrifugo channel',
            tags: ['Centrifugo']
          }
        }
      ]
    }
    
    /**
     * Generate JWT token using HMAC-SHA256
     * 
     * @param payload - JWT payload (包含 sub, exp, channel 等)
     * @returns JWT token string
     */
    private generateJWT(payload: any): string {
      
      // JWT Header
      const header = {
        alg: 'HS256',
        typ: 'JWT'
      }
      
      // Base64URL encode
      const base64UrlEncode = (obj: any) => {
        return Buffer.from(JSON.stringify(obj))
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '')
      }
      
      const encodedHeader = base64UrlEncode(header)
      const encodedPayload = base64UrlEncode(payload)
      
      // Create signature
      const signature = crypto
        .createHmac('sha256', this.tokenHmacSecretKey)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
      
      return `${encodedHeader}.${encodedPayload}.${signature}`
    }
    
    /**
     * Shutdown integration
     */
    async shutdown() {
      console.log('[Centrifugo] Integration shutting down...')
      console.log('[Centrifugo] Integration shut down')
    }
  }
}

