/**
 * Volcengine Fangzhou Video Generation Integration
 *
 * Purpose: Integrate with Volcengine Fangzhou Seedance API for AI-powered video generation
 *
 * Features:
 * - Listen to Sora2VideoGenerationCall entity creation and trigger external API calls
 * - Transform external API responses to internal event format
 * - Create integration events following unified sequence (processing → completed|failed)
 * - Provide manual status query API for frontend polling
 * - Factory function pattern for configuration flexibility
 */

import {
  Controller,
  RecordMutationSideEffect,
  MatchExp
} from 'interaqt'
import { IIntegration, IIntegrationConstructorArgs, API } from '@/integrations/index'
import {
  createVideoGenerationTask,
  queryVideoGenerationTask,
  downloadVideoContent,
  VideoGenerationCreateResponse,
  VideoGenerationQueryResponse,
  fetchAndResizeImageToFit
} from '@/integrations/example_sora2-video/externalApi'
import { createS3Client, S3Config } from '@/integrations/example_objectstorage/s3Api'
import * as crypto from 'crypto'
import {
  QueryStatusRequestSchema,
  QueryStatusResponseSchema,
  type QueryStatusRequest
} from './schemas'

// ============================================
// API Names - defined here as constants
// ============================================

/**
 * API name for querying video generation status
 */
export const QUERY_STATUS_API_NAME = 'querySora2VideoStatus'

/**
 * Side effect return type for Volcengine Fangzhou Video Generation
 */
type Sora2VideoGenerationSideEffectResult = {
  success: boolean
  data?: {
    apiCallId: string
    taskId?: string
    status?: 'processing' | 'completed' | 'failed'
  }
  error?: {
    message: string
    stack?: string
  }
  context?: {
    eventType?: string
    apiCallId?: string
  }
}

/**
 * Configuration interface for Volcengine Fangzhou Video Generation
 * 
 * 🔴 CRITICAL: All fields are required - NO optional fields or defaults
 */
export type Sora2VideoGenerationConfig = {
  /**
   * APICall entity (designed in business phase)
   * Integration listens to THIS entity creation
   */
  apiCallEntity: {
    entityName: string              // Entity name, e.g., 'Sora2VideoGenerationCall'
    fields: {
      status: string                // Field for status (computed via statemachine)
      externalId: string            // Field for external task/job ID (computed from first event)
      requestParams: string         // Field for request parameters (read by integration)
      responseData: string          // Field for response data (computed via statemachine)
      createdAt: string             // Field for creation timestamp
      completedAt: string           // Field for completion timestamp (computed via statemachine)
      error: string                 // Field for error details (computed via statemachine)
    }
  }

  /**
   * Integration event entity (designed in business phase)
   * Integration creates THIS entity to trigger reactive updates
   */
  eventEntity: {
    entityName: string              // Entity name, e.g., 'Sora2VideoGenerationEvent'
    fields: {
      eventType: string             // Field for event type (fixed: 'task.status.update')
      entityId: string              // Field for API Call entity id (required for first event)
      externalId: string            // Field for external task/job ID
      status: string                // Field for current status
      createdAt: string             // Field for event creation timestamp
      data: string                  // Field for event payload
    }
  }

  /**
   * External API settings
   */
  external: {
    apiKey: string                 // REQUIRED, no env fallback
    baseUrl: string                // REQUIRED, no default
    model: string                  // REQUIRED, no default
    organization?: string          // OPTIONAL, OpenAI organization ID
    projectId?: string             // OPTIONAL, OpenAI project ID
  }

  /**
   * Object storage configuration for video upload
   * Since Sora2 does not provide permanent video URLs for direct streaming,
   * we download the video and upload it to our own object storage.
   */
  storage: {
    accessKeyId: string            // REQUIRED, no env fallback
    secretAccessKey: string        // REQUIRED, no env fallback
    region: string                 // REQUIRED, no env fallback
    endpoint: string               // REQUIRED, no env fallback
    bucket: string                 // REQUIRED, no env fallback
    objectKeyPrefix: string        // Prefix for video files (REQUIRED)
  }
}

/**
 * Create Volcengine Fangzhou Video Generation Integration
 *
 * Factory function that returns an IIntegration implementation class.
 *
 * The integration follows this pattern:
 * 1. Listen to APICall entity creation (via RecordMutationSideEffect)
 * 2. Read requestParams from APICall entity
 * 3. Call external API to create task (returns task ID immediately)
 * 4. Create first event (status='processing') with task ID
 * 5. Frontend polls manual query API to check task status
 * 6. Query API creates subsequent events based on external status
 *
 * @param config - Integration configuration
 * @returns Integration class
 *
 * @example
 * ```typescript
 * const VideoGenIntegration = createSora2VideoGenerationIntegration({
 *   apiCallEntity: {
 *     entityName: 'Sora2VideoGenerationCall',
 *     fields: {
 *       status: 'status',
 *       externalId: 'externalId',
 *       requestParams: 'requestParams',
 *       responseData: 'responseData',
 *       createdAt: 'createdAt',
 *       completedAt: 'completedAt',
 *       error: 'error'
 *     }
 *   },
 *   eventEntity: {
 *     entityName: 'Sora2VideoGenerationEvent',
 *     fields: {
 *       eventType: 'eventType',
 *       entityId: 'entityId',
 *       externalId: 'externalId',
 *       status: 'status',
 *       createdAt: 'createdAt',
 *       data: 'data'
 *     }
 *   },
 *   api: {
 *     queryApiName: 'querySora2VideoStatus'
 *   },
 *   external: {
 *     apiKey: process.env.SORA2_API_KEY!,
 *     baseUrl: 'https://api.openai.com/v1',
 *     model: 'sora-2',
 *     organization: process.env.OPENAI_ORGANIZATION,
 *     projectId: process.env.OPENAI_PROJECT
 *   },
 *   storage: {
 *     accessKeyId: process.env.S3_ACCESS_KEY!,
 *     secretAccessKey: process.env.S3_SECRET_KEY!,
 *     region: 'us-east-1',
 *     endpoint: 'http://localhost:9000',
 *     bucket: 'videos',
 *     objectKeyPrefix: 'sora2-videos/'
 *   }
 * })
 * ```
 */
export function createSora2VideoGenerationIntegration(config: Sora2VideoGenerationConfig) {
  return class Sora2VideoGenerationIntegration implements IIntegration {
    private storage: any
    private logger: any
    private controller?: Controller
    private s3Config: S3Config
    private objectKeyPrefix: string

    constructor(
      public args: IIntegrationConstructorArgs
    ) {
      // ✅ CORRECT: Use config directly, no fallbacks
      // Initialize S3 config for video upload (MinIO compatible)
      const endpoint = config.storage.endpoint
      // Ensure endpoint has protocol for S3 SDK
      const fullEndpoint = endpoint.startsWith('http://') || endpoint.startsWith('https://') 
        ? endpoint 
        : `http://${endpoint}`
      
      this.s3Config = {
        accessKeyId: config.storage.accessKeyId,
        secretAccessKey: config.storage.secretAccessKey,
        region: config.storage.region,
        endpoint: fullEndpoint,
        bucket: config.storage.bucket,
        forcePathStyle: true  // Required for MinIO
      }
      this.objectKeyPrefix = config.storage.objectKeyPrefix
      this.namespace = args.namespace
    }

    public readonly namespace: string

    /**
     * Configure phase - NOT USED for integrations
     *
     * Business computations are defined in business phase, not here.
     * Integrations only create events, not define computations.
     */
    async configure() {
      // Integration doesn't configure computations
      // All computations are defined in business phase
      console.log('[Sora2VideoGeneration] Integration configure phase - no action needed')
    }

    /**
     * Setup phase - Store controller reference
     *
     * This runs after controller is created. Use it to access controller
     * services like storage and logger.
     */
    async setup(controller: Controller) {
      this.controller = controller
      this.storage = controller.system.storage
      this.logger = controller.system.logger

      console.log('[Sora2VideoGeneration] Integration setup completed')
    }

    /**
     * Create side effects - MAIN INTEGRATION LOGIC
     *
     * Listen to APICall entity creation, call external API, create integration events.
     * Frontend polls the manual query API to check status updates.
     *
     * 🔴 CRITICAL: Listen to APICall entity ONLY, NOT business entities!
     * Business logic creates APICall when it needs external API call.
     */
    createSideEffects(): RecordMutationSideEffect<Sora2VideoGenerationSideEffectResult>[] {
      const self = this

      return [
        RecordMutationSideEffect.create<Sora2VideoGenerationSideEffectResult>({
          name: `Sora2VideoGeneration_${config.apiCallEntity.entityName}_handler`,
          record: { name: config.apiCallEntity.entityName },
          content: async function(this: Controller, event) {
            // Only handle creation events
            if (event.type !== 'create') {
              return {
                success: true,
                context: {
                  eventType: event.type
                }
              }
            }

            const apiCall = event.record
            console.log('[Sora2VideoGeneration] Handling APICall creation', {
              entityName: config.apiCallEntity.entityName,
              apiCallId: apiCall.id
            })

            try {
              // Step 1: Read request parameters from APICall entity
              const requestParamsField = config.apiCallEntity.fields.requestParams
              const requestParams = apiCall[requestParamsField]

              if (!requestParams) {
                console.error('[Sora2VideoGeneration] Missing requestParams', {
                  apiCallId: apiCall.id
                })
                return {
                  success: false,
                  error: {
                    message: 'Missing requestParams in APICall entity'
                  },
                  context: {
                    apiCallId: apiCall.id
                  }
                }
              }

              console.log('[Sora2VideoGeneration] Processing APICall', {
                apiCallId: apiCall.id,
                requestParams
              })

              // Step 2: Call external API to create video generation task
              try {
                // Prepare content array for API
                const content: any[] = []

                // Add first frame image (convert to base64 first)
                if (requestParams.image_urls && requestParams.image_urls[0]) {
                  console.log('[Sora2VideoGeneration] Fetching image for base64 conversion and resizing', {
                    imageUrl: requestParams.image_urls[0],
                    targetSize: requestParams.size || '720x1280'
                  })

                  // Fetch image, resize to exact target dimensions, and convert to base64
                  // This ensures the image matches the video size requirement
                  const targetSize = requestParams.size || '720x1280'
                  const imageBase64 = await fetchAndResizeImageToFit(requestParams.image_urls[0], targetSize)

                  console.log('[Sora2VideoGeneration] Image resized and converted to base64', {
                    apiCallId: apiCall.id,
                    targetSize,
                    base64Length: imageBase64.length
                  })

                  content.push({
                    type: 'image_url',
                    image_url: {
                      url: imageBase64  // Use base64 instead of URL
                    },
                    role: 'first_frame'
                  })
                }

                // Add text prompt - REQUIRED by OpenAI API
                // Note: OpenAI Sora2 requires prompt even with input_reference image
                let textContent = requestParams.prompt
                
                // Always add text content (prompt is required by OpenAI)
                if (textContent) {
                  content.push({
                    type: 'text',
                    text: textContent
                  })
                }

                console.log('[Sora2VideoGeneration] Content array prepared', {
                  apiCallId: apiCall.id,
                  hasImage: content.some(c => c.type === 'image_url'),
                  hasText: content.some(c => c.type === 'text'),
                  textContent: textContent || '(empty)'
                })

                // Call create task API
                // ✅ CORRECT: Use config value directly, no default
                const createResponse: VideoGenerationCreateResponse = await createVideoGenerationTask(
                  {
                    model: config.external.model,
                    content: content,
                    seconds: requestParams.seconds,
                    size: requestParams.size
                  },
                  {
                    apiKey: config.external.apiKey,
                    baseUrl: config.external.baseUrl,
                    model: config.external.model,
                    organization: config.external.organization,
                    projectId: config.external.projectId
                  }
                )

                const taskId = createResponse.id

                console.log('[Sora2VideoGeneration] Video generation task created', {
                  apiCallId: apiCall.id,
                  taskId
                })

                // Step 3: Create first event (status='processing')
                // This indicates that task has been submitted to external system
                await self.createIntegrationEvent(
                  this,
                  apiCall.id,              // entityId - APICall's id
                  taskId,                  // externalId - task ID from API
                  'processing',            // status
                  { status: 'queued' },    // data - initial status
                  null                     // errorMessage - no error yet
                )

                console.log('[Sora2VideoGeneration] First event created (processing)', {
                  apiCallId: apiCall.id,
                  taskId
                })

                // Frontend will poll the query API to check status updates
                
                return {
                  success: true,
                  data: {
                    apiCallId: apiCall.id,
                    taskId,
                    status: 'processing'
                  }
                }

              } catch (error: any) {
                console.error('[Sora2VideoGeneration] ❌ External API call failed', {
                  apiCallId: apiCall.id,
                  errorName: error.name,
                  errorMessage: error.message,
                  errorStack: error.stack,
                  errorCode: error.code,
                  requestParams: {
                    prompt: requestParams.prompt?.substring(0, 100),
                    hasImage: !!(requestParams.image_urls && requestParams.image_urls[0]),
                    seconds: requestParams.seconds,
                    size: requestParams.size
                  },
                  apiConfig: {
                    baseUrl: config.external.baseUrl,
                    model: config.external.model,
                    hasApiKey: !!config.external.apiKey,
                    hasOrganization: !!config.external.organization,
                    hasProjectId: !!config.external.projectId
                  }
                })

                // Generate externalId for failed task
                const externalId = crypto.randomUUID()

                // Create first event (processing)
                await self.createIntegrationEvent(
                  this,
                  apiCall.id,
                  externalId,
                  'processing',
                  null,
                  null
                )

                // Create failed event
                await self.createIntegrationEvent(
                  this,
                  null,
                  externalId,
                  'failed',
                  null,
                  error.message
                )
                
                return {
                  success: false,
                  data: {
                    apiCallId: apiCall.id,
                    status: 'failed'
                  },
                  error: {
                    message: error.message
                  }
                }
              }

            } catch (error: any) {
              console.error('[Sora2VideoGeneration] Error in side effect handler', {
                apiCallId: apiCall.id,
                error: error.message
              })
              
              return {
                success: false,
                error: {
                  message: 'Side effect handler error: ' + error.message
                },
                context: {
                  apiCallId: apiCall.id
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
     * Expose manual query API for frontend polling.
     * Frontend calls this API periodically to check task status.
     *
     * 🔴 CRITICAL: Query API MUST create integration events!
     * - Call checkAndUpdateStatus() which queries external system AND creates events
     * - NEVER directly return external status without creating events
     * - Events trigger reactive computations to update internal state
     */
    createAPIs(): API[] {
      const self = this

      return [
        {
          name: QUERY_STATUS_API_NAME,
          namespace: this.namespace,
          callback: async function(this: Controller, context, params: QueryStatusRequest) {
            try {
              console.log('[Sora2VideoGeneration] Manual status query requested', {
                apiCallId: params.apiCallId
              })

              // Query external system and create events if needed
              const result = await self.checkAndUpdateStatus(this, params.apiCallId)

              return {
                success: true,
                message: result.eventCreated 
                  ? 'Status check triggered, integration event created' 
                  : result.message || 'No status change detected'
              }
            } catch (error: any) {
              console.error('[Sora2VideoGeneration] ❌ Failed to query status', {
                apiCallId: params.apiCallId,
                errorName: error.name,
                errorMessage: error.message,
                errorStack: error.stack,
                errorCode: error.code
              })
              return {
                success: false,
                error: error.message
              }
            }
          },
          paramsSchema: QueryStatusRequestSchema,
          responseSchema: QueryStatusResponseSchema,
          useNamedParams: true,
          allowAnonymous: false,
          openapi: {
            summary: 'Query Sora2 video generation status',
            description: 'Queries the external API status and creates integration events if status changed',
            tags: ['VideoGeneration']
          }
        }
      ]
    }

    /**
     * Check and update status from external system
     *
     * 🔴 CRITICAL: This method performs FOUR actions:
     * 1. Query APICall entity to get current status and external ID
     * 2. Skip query if already in terminal state (completed/failed)
     * 3. Query external system for latest status
     * 4. Create integration event ONLY if status changed
     *
     * NEVER query external status without creating events!
     *
     * @param controller - Controller instance
     * @param apiCallId - Internal API Call entity ID
     * @returns Result object indicating whether event was created
     */
    private async checkAndUpdateStatus(
      controller: Controller,
      apiCallId: string
    ): Promise<{ eventCreated: boolean; message?: string }> {
      console.log('[Sora2VideoGeneration] Checking status', { apiCallId })

      // Step 1: Query APICall entity to get current status and external ID
      const apiCall = await controller.system.storage.findOne(
        config.apiCallEntity.entityName,
        MatchExp.atom({ key: 'id', value: ['=', apiCallId] }),
        undefined,
        ['id', config.apiCallEntity.fields.status, config.apiCallEntity.fields.externalId]
      )

      if (!apiCall) {
        throw new Error(`APICall not found: ${apiCallId}`)
      }

      const currentStatus = apiCall[config.apiCallEntity.fields.status]
      const externalId = apiCall[config.apiCallEntity.fields.externalId]

      if (!externalId) {
        throw new Error(`No external ID found for APICall: ${apiCallId}`)
      }

      console.log('[Sora2VideoGeneration] Current APICall status', {
        apiCallId,
        externalId,
        currentStatus
      })

      // Step 2: Skip query if already in terminal state
      if (currentStatus === 'completed' || currentStatus === 'failed') {
        console.log('[Sora2VideoGeneration] Task already in terminal state, skipping query', {
          apiCallId,
          externalId,
          currentStatus
        })
        return {
          eventCreated: false,
          message: `Task already ${currentStatus}`
        }
      }

      // Step 3: Query external system (returns raw response)
      console.log('[Sora2VideoGeneration] Querying external system...', {
        apiCallId,
        externalId,
        currentStatus,
        apiConfig: {
          baseUrl: config.external.baseUrl,
          model: config.external.model,
          hasApiKey: !!config.external.apiKey
        }
      })

      const queryResponse: VideoGenerationQueryResponse = await queryVideoGenerationTask(
        externalId,
        {
          apiKey: config.external.apiKey,
          baseUrl: config.external.baseUrl,
          model: config.external.model,
          organization: config.external.organization,
          projectId: config.external.projectId
        }
      )

      console.log('[Sora2VideoGeneration] Status checked from external system', {
        apiCallId,
        externalId,
        externalStatus: queryResponse.status,
        hasContent: !!queryResponse.content,
        hasVideoUrl: !!queryResponse.content?.video_url,
        hasError: !!queryResponse.error,
        errorMessage: queryResponse.error?.message
      })

      // Map external status to internal status
      // OpenAI official statuses: queued, in_progress, completed, failed, cancelled, incomplete
      // Map to internal statuses: processing, completed, failed
      let newInternalStatus: string

      switch (queryResponse.status) {
        case 'queued':
        case 'in_progress':
          // Both queued and in_progress are non-terminal "processing" states
          newInternalStatus = 'processing'
          break
        case 'completed':
          // Successfully completed
          newInternalStatus = 'completed'
          break
        case 'failed':
        case 'cancelled':
        case 'incomplete':
          // All terminal failure states
          newInternalStatus = 'failed'
          break
        default:
          console.warn('[Sora2VideoGeneration] Unknown status', {
            externalId,
            status: queryResponse.status
          })
          newInternalStatus = 'processing'
      }

      // Step 4: Only create event if status changed
      if (newInternalStatus === currentStatus) {
        console.log('[Sora2VideoGeneration] Status unchanged, skipping event creation', {
          apiCallId,
          externalId,
          status: currentStatus
        })
        return {
          eventCreated: false,
          message: `Status unchanged: ${currentStatus}`
        }
      }

      console.log('[Sora2VideoGeneration] Status changed, creating event', {
        apiCallId,
        externalId,
        oldStatus: currentStatus,
        newStatus: newInternalStatus
      })

      // Transform external response to internal event format
      // Extract fields according to data design attributes
      let eventData: any = {
        aigc_meta_tagged: true,  // Assumed from Sora2
        status: queryResponse.status
      }

      const errorMessage = queryResponse.error ? queryResponse.error.message : null

      // Log error details if status is failed
      if (newInternalStatus === 'failed') {
        console.error('[Sora2VideoGeneration] ❌ Task failed on external system', {
          apiCallId,
          externalId,
          externalStatus: queryResponse.status,
          error: queryResponse.error,
          fullResponse: JSON.stringify(queryResponse, null, 2)
        })
      }

      // If video is completed, download and upload to our object storage
      if (newInternalStatus === 'completed' && queryResponse.content?.video_url) {
        try {
          console.log('[Sora2VideoGeneration] Video completed, downloading content...', {
            apiCallId,
            externalId,
            downloadUrl: queryResponse.content.video_url
          })

          // Download video content from Sora2 API
          const videoBuffer = await downloadVideoContent(
            externalId,
            {
              apiKey: config.external.apiKey,
              baseUrl: config.external.baseUrl,
              model: config.external.model,
              organization: config.external.organization,
              projectId: config.external.projectId
            }
          )

          console.log('[Sora2VideoGeneration] Video downloaded, uploading to S3/MinIO...', {
            apiCallId,
            externalId,
            videoSize: videoBuffer.length,
            bucket: this.s3Config.bucket,
            endpoint: this.s3Config.endpoint
          })

          // Upload to object storage (S3/MinIO)
          const objectKey = `${this.objectKeyPrefix}${externalId}.mp4`

          const s3Client = createS3Client(this.s3Config)
          const { PutObjectCommand } = await import('@aws-sdk/client-s3')

          await s3Client.send(new PutObjectCommand({
            Bucket: this.s3Config.bucket,
            Key: objectKey,
            Body: videoBuffer,
            ContentType: 'video/mp4'
          }))

          console.log('[Sora2VideoGeneration] ✅ Video uploaded to S3/MinIO successfully', {
            apiCallId,
            externalId,
            objectKey,
            bucket: this.s3Config.bucket
          })

          // Generate public URL for MinIO
          const videoUrl = `${this.s3Config.endpoint}/${this.s3Config.bucket}/${objectKey}`

          // Update eventData with our own video URL
          eventData = {
            ...eventData,
            video_url: videoUrl
          }

          console.log('[Sora2VideoGeneration] ✅ Video URL updated to object storage', {
            apiCallId,
            externalId,
            videoUrl
          })

        } catch (uploadError: any) {
          console.error('[Sora2VideoGeneration] ❌ Failed to download/upload video', {
            apiCallId,
            externalId,
            errorName: uploadError.name,
            errorMessage: uploadError.message,
            errorStack: uploadError.stack,
            errorCode: uploadError.code,
            s3Config: {
              bucket: this.s3Config.bucket,
              endpoint: this.s3Config.endpoint,
              region: this.s3Config.region
            }
          })

          // Still create event but with error info
          eventData = {
            ...eventData,
            video_url: null,
            upload_error: uploadError.message
          }
        }
      }

      // Create integration event based on status
      // entityId is null because APICall already exists (not first event)
      await this.createIntegrationEvent(
        controller,
        null,                // entityId - not needed for status updates
        externalId,          // externalId - to match with existing APICall
        newInternalStatus,   // status - 'processing' | 'completed' | 'failed'
        eventData,           // Transformed data
        errorMessage         // Extracted error message
      )

      return {
        eventCreated: true,
        message: `Status changed from ${currentStatus} to ${newInternalStatus}`
      }
    }

    /**
     * Create integration event to trigger reactive updates
     *
     * 🔴 CRITICAL: This is the ONLY way integration updates internal data.
     * Never directly update entity properties - always create events.
     *
     * @param controller - Controller instance
     * @param entityId - APICall entity id (required for first event, null otherwise)
     * @param externalId - External task ID
     * @param status - Status: 'processing' | 'completed' | 'failed'
     * @param data - Event payload data (matching data design attributes)
     * @param errorMessage - Error message if failed (nullable)
     */
    private async createIntegrationEvent(
      controller: Controller,
      entityId: string | null,
      externalId: string | null,
      status: string,
      data: any | null,
      errorMessage: string | null
    ) {
      try {
        const eventData: any = {
          [config.eventEntity.fields.eventType]: 'task.status.update',
          [config.eventEntity.fields.status]: status,
          [config.eventEntity.fields.createdAt]: Math.floor(Date.now() / 1000)
        }

        // Add entityId (APICall id) - required for first event only
        if (entityId) {
          eventData[config.eventEntity.fields.entityId] = entityId
        }

        // Add externalId - external system's task ID
        if (externalId) {
          eventData[config.eventEntity.fields.externalId] = externalId
        }

        // Add event payload data
        if (data) {
          eventData[config.eventEntity.fields.data] = data
        }

        // Add error message to data field if failed
        if (errorMessage) {
          eventData[config.eventEntity.fields.data] = {
            ...eventData[config.eventEntity.fields.data],
            error: {
              code: 'api_error',
              message: errorMessage,
              type: 'external_api_error'
            }
          }
        }

        await controller.system.storage.create(config.eventEntity.entityName, eventData)

        // Enhanced logging with full details
        if (status === 'failed' || errorMessage) {
          console.error('[Sora2VideoGeneration] ❌ Integration event created (FAILED)', {
            entityId,
            externalId,
            status,
            errorMessage,
            eventData: JSON.stringify(eventData[config.eventEntity.fields.data], null, 2)
          })
        } else {
          console.log('[Sora2VideoGeneration] ✅ Integration event created', {
            entityId,
            externalId,
            status,
            hasData: !!data,
            hasError: !!errorMessage,
            ...(status === 'completed' && data?.video_url ? { videoUrl: data.video_url } : {})
          })
        }

        // The reactive computation chain will handle the rest:
        // 1. For first event: APICall.externalId is computed from this event
        // 2. For all events: APICall.status, responseData, error, completedAt update via statemachine
        // 3. Business entity properties update based on APICall entity

      } catch (error: any) {
        console.error('[Sora2VideoGeneration] ❌ Failed to create integration event', {
          entityId,
          externalId,
          status,
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
          dataProvided: !!data,
          errorMessageProvided: !!errorMessage
        })
      }
    }
  }
}

