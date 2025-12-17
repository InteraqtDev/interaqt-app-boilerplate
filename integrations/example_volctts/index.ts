/**
 * Volcengine Doubao TTS Integration
 *
 * Purpose: Integrate with Volcengine Doubao TTS (Text-to-Speech) API to generate
 * AI-synthesized voice thank you messages when users send gifts to posts.
 *
 * Features:
 * - Listen to VolcTTSCall entity creation and trigger external API calls
 * - Stream and process audio data from TTS API
 * - Upload audio to object storage (TOS)
 * - Transform external API responses to internal event format
 * - Create integration events following unified sequence (pending → processing → completed|failed)
 * - Factory function pattern for configuration flexibility
 *
 * Note: This is a SYNCHRONOUS streaming API but MUST follow unified event sequence
 */

import {
  Controller,
  RecordMutationSideEffect
} from 'interaqt'
import { IIntegration, IIntegrationConstructorArgs, API } from '@/integrations/index'
import { callTTSApi, TTSRequestParams } from '@/integrations/example_volctts/externalApi'
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
 * API name for querying TTS status
 */
export const QUERY_STATUS_API_NAME = 'queryVolcTTSStatus'

/**
 * Side effect return type for Volcengine Doubao TTS
 */
type VolcTTSSideEffectResult = {
  success: boolean
  data?: {
    apiCallId: string
    externalId: string
    status: 'processing' | 'completed' | 'failed'
    audioUrl?: string
    format?: string
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
 * Configuration interface for Volcengine Doubao TTS Integration
 */
/**
 * 🔴 CRITICAL: All fields are required - NO optional fields or defaults
 */
export type VolcTTSConfig = {
  /**
   * APICall entity (designed in business phase)
   * Integration listens to THIS entity creation
   */
  apiCallEntity: {
    entityName: string              // Entity name, e.g., 'VolcTTSCall'
    fields: {
      status: string                // Field for status (computed via statemachine)
      externalId: string            // Field for external UUID (computed from first event)
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
    entityName: string              // Entity name, e.g., 'VolcTTSEvent'
    fields: {
      eventType: string             // Field for event type (fixed: 'task.status.update')
      entityId: string              // Field for APICall entity id (required for first event with status='processing')
      externalId: string            // Field for generated UUID (sync API has no external task ID)
      status: string                // Field for current status ('processing'|'completed'|'failed') - Note: 'pending' is set when APICall is created
      createdAt: string             // Field for event creation timestamp
      data: string                  // Field for event payload
    }
  }

  /**
   * Volcengine TTS API configuration
   */
  volcTTS: {
    appId: string                  // REQUIRED, no env fallback
    accessToken: string            // REQUIRED, no env fallback
    resourceId: string             // REQUIRED, no env fallback
    speaker: string                // REQUIRED, no env fallback
    apiEndpoint: string            // REQUIRED, no default
  }

  /**
   * Object storage configuration for audio upload
   */
  storage: {
    accessKeyId: string            // REQUIRED, no env fallback
    secretAccessKey: string        // REQUIRED, no env fallback
    region: string                 // REQUIRED, no env fallback
    endpoint: string               // REQUIRED, no env fallback
    bucket: string                 // REQUIRED, no env fallback
    objectKeyPrefix: string        // Prefix for audio files (REQUIRED)
  }

}

/**
 * Create Volcengine Doubao TTS Integration
 *
 * Factory function that returns an IIntegration implementation class.
 *
 * The integration follows this pattern:
 * 1. Listen to VolcTTSCall entity creation (via RecordMutationSideEffect)
 * 2. Read requestParams from VolcTTSCall entity
 * 3. Call external TTS API and stream audio data
 * 4. Upload complete audio to object storage
 * 5. Create integration event entities following unified sequence (even for sync API)
 * 6. Let statemachine computations update VolcTTSCall properties
 * 7. Let business computations derive final values
 *
 * @param config - Integration configuration
 * @returns Integration class
 *
 * @example
 * ```typescript
 * const TTSIntegration = createVolcTTSIntegration({
 *   apiCallEntity: {
 *     entityName: 'VolcTTSCall',
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
 *     entityName: 'VolcTTSEvent',
 *     fields: {
 *       eventType: 'eventType',
 *       entityId: 'entityId',
 *       externalId: 'externalId',
 *       status: 'status',
 *       createdAt: 'createdAt',
 *       data: 'data'
 *     }
 *   },
 *   volcTTS: {
 *     appId: 'your-app-id',
 *     accessToken: 'your-access-token',
 *     resourceId: 'your-resource-id',
 *     speaker: 'zh_female_meilinvyou_saturn_bigtts',
 *     apiEndpoint: 'https://openspeech.bytedance.com/api/v3/tts/unidirectional'
 *   },
 *   storage: {
 *     accessKeyId: 'your-access-key',
 *     secretAccessKey: 'your-secret-key',
 *     region: 'us-east-1',
 *     endpoint: 'http://localhost:9000',
 *     bucket: 'your-bucket',
 *     objectKeyPrefix: 'tts-audio/'
 *   },
 *   api: {
 *     queryApiName: 'queryVolcTTSStatus'
 *   }
 * })
 * ```
 */
export function createVolcTTSIntegration(config: VolcTTSConfig) {
  return class VolcTTSIntegration implements IIntegration {
    private controller?: Controller
    private s3Config: S3Config
    private objectKeyPrefix: string

    constructor(
      public args: IIntegrationConstructorArgs
    ) {
      // ✅ CORRECT: Use config directly, no fallbacks
      // Initialize S3 config for audio upload (MinIO compatible)
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
     * Configure phase - NOT USED for Type 1 integrations
     *
     * Business computations are defined in business phase, not here.
     * Integrations only create events, not define computations.
     */
    async configure() {
      console.log('[VolcTTS] Integration configure phase - no action needed')
    }

    /**
     * Setup phase - Store controller reference
     *
     * This runs after controller is created. Use it to access controller
     * services like storage and logger.
     */
    async setup(controller: Controller) {
      this.controller = controller
      console.log('[VolcTTS] Integration setup completed')
    }

    /**
     * Create side effects - MAIN INTEGRATION LOGIC
     *
     * Listen to VolcTTSCall entity creation, call external API, create integration events.
     *
     * 🔴 CRITICAL: Listen to APICall entity ONLY, NOT business entities!
     * Business logic creates VolcTTSCall when it needs external API call.
     */
    createSideEffects(): RecordMutationSideEffect<VolcTTSSideEffectResult>[] {
      const self = this

      return [
        RecordMutationSideEffect.create<VolcTTSSideEffectResult>({
          name: `VolcTTS_${config.apiCallEntity.entityName}_handler`,
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

            const apiCall = event.record!
            console.log('[VolcTTS] Handling APICall creation', {
              entityName: config.apiCallEntity.entityName,
              apiCallId: apiCall.id
            })

            try {
              // Step 1: Read request parameters from APICall entity
              const requestParamsField = config.apiCallEntity.fields.requestParams
              const requestParamsJson = apiCall[requestParamsField]

              if (!requestParamsJson) {
                console.error('[VolcTTS] Missing requestParams', {
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

              // Parse request parameters
              let requestParams: any
              try {
                requestParams = typeof requestParamsJson === 'string' ? JSON.parse(requestParamsJson) : requestParamsJson
              } catch (e) {
                console.error('[VolcTTS] Failed to parse requestParams', {
                  apiCallId: apiCall.id,
                  requestParamsJson,
                  error: e
                })
                return {
                  success: false,
                  error: {
                    message: 'Failed to parse requestParams: ' + (e as Error).message
                  },
                  context: {
                    apiCallId: apiCall.id
                  }
                }
              }

              console.log('[VolcTTS] Processing APICall', {
                apiCallId: apiCall.id,
                text: requestParams.text?.substring(0, 50) + '...',
                speaker: requestParams.speaker
              })

              // Generate UUID as externalId (sync API has no task ID)
              const externalId = crypto.randomUUID()

              // Step 2: Create first event (status='processing')
              // Status = 'processing' (APICall already has status='pending' from creation)
              await self.createIntegrationEvent(
                this,
                apiCall.id,              // entityId - APICall's id
                externalId,              // externalId - generated UUID
                'processing',            // status
                null,                    // No data yet
                null
              )

              // Step 3: Call external TTS API (returns raw audio buffer)
              try {
                // Build external API parameters
                // ✅ CORRECT: Use config values directly, with requestParams overrides
                const ttsParams: TTSRequestParams = {
                  req_params: {
                    text: requestParams.text,
                    speaker: requestParams.speaker || config.volcTTS.speaker,
                    audio_params: {
                      format: requestParams.audio_params?.format || 'mp3',
                      sample_rate: requestParams.audio_params?.sample_rate || 24000,
                      speech_rate: requestParams.audio_params?.speech_rate || 0,
                      loudness_rate: requestParams.audio_params?.loudness_rate || 0,
                      ...(requestParams.audio_params?.emotion && { emotion: requestParams.audio_params.emotion }),
                      ...(requestParams.audio_params?.emotion_scale && { emotion_scale: requestParams.audio_params.emotion_scale })
                    },
                    ...(requestParams.additions && { additions: requestParams.additions })
                  }
                }

                console.log('[VolcTTS] Calling external TTS API', {
                  apiCallId: apiCall.id,
                  externalId,
                  speaker: ttsParams.req_params.speaker,
                  format: ttsParams.req_params.audio_params.format
                })

                // ✅ CORRECT: Pass config values directly to API
                const audioResult = await callTTSApi(ttsParams, {
                  appId: config.volcTTS.appId,
                  accessToken: config.volcTTS.accessToken,
                  resourceId: config.volcTTS.resourceId,
                  apiEndpoint: config.volcTTS.apiEndpoint
                })

                console.log('[VolcTTS] Audio received', {
                  apiCallId: apiCall.id,
                  externalId,
                  audioSize: audioResult.audioData.length,
                  chunks: audioResult.chunks,
                  format: audioResult.format
                })

                // Step 5: Upload audio to object storage (S3/MinIO)
                const objectKey = `${self.objectKeyPrefix}${externalId}.${audioResult.format}`

                try {
                  console.log('[VolcTTS] trying to upload audio to S3/MinIO', {
                    apiCallId: apiCall.id,
                    externalId,
                    objectKey,
                    audioSize: audioResult.audioData.length,
                    chunks: audioResult.chunks,
                    format: audioResult.format
                  })
                  const s3Client = createS3Client(self.s3Config)
                  const { PutObjectCommand } = await import('@aws-sdk/client-s3')

                  console.log('[VolcTTS] Sending PutObjectCommand to S3/MinIO', {
                    Bucket: self.s3Config.bucket,
                    Key: objectKey,
                    ContentType: `audio/${audioResult.format}`
                  })
                  
                  await s3Client.send(new PutObjectCommand({
                    Bucket: self.s3Config.bucket,
                    Key: objectKey,
                    Body: audioResult.audioData,
                    ContentType: `audio/${audioResult.format}`
                  }))

                  console.log('[VolcTTS] Audio uploaded to S3/MinIO', {
                    apiCallId: apiCall.id,
                    externalId,
                    objectKey
                  })

                  // Generate public URL for MinIO
                  const audioUrl = `${self.s3Config.endpoint}/${self.s3Config.bucket}/${objectKey}`

                  // Step 4: Transform completion data - map to data design attributes
                  const completedData = {
                    audioUrl,
                    duration: 0,  // TTS API doesn't return duration
                    format: audioResult.format
                  }

                  // Create completed event with transformed data
                  await self.createIntegrationEvent(
                    this,
                    null,
                    externalId,
                    'completed',           // status
                    completedData,         // Transformed data
                    null
                  )

                  console.log('[VolcTTS] TTS processing completed successfully', {
                    apiCallId: apiCall.id,
                    externalId,
                    audioUrl
                  })
                  
                  return {
                    success: true,
                    data: {
                      apiCallId: apiCall.id,
                      externalId,
                      status: 'completed',
                      audioUrl,
                      format: audioResult.format
                    }
                  }

                } catch (uploadError: any) {
                  console.error('[VolcTTS] Failed to upload audio to S3/MinIO', {
                    apiCallId: apiCall.id,
                    externalId,
                    error: uploadError.message,
                    errorStack: uploadError.stack
                  })

                  // Create failed event for upload error
                  await self.createIntegrationEvent(
                    this,
                    null,
                    externalId,
                    'failed',
                    null,
                    `Failed to upload audio: ${uploadError.message}`
                  )
                  
                  return {
                    success: false,
                    data: {
                      apiCallId: apiCall.id,
                      externalId,
                      status: 'failed'
                    },
                    error: {
                      message: 'Failed to upload audio: ' + uploadError.message,
                      stack: uploadError.stack
                    }
                  }
                }

              } catch (ttsError: any) {
                console.error('[VolcTTS] TTS API call failed', {
                  apiCallId: apiCall.id,
                  externalId,
                  error: ttsError.message
                })

                // Create failed event for TTS API error
                await self.createIntegrationEvent(
                  this,
                  null,
                  externalId,
                  'failed',
                  null,
                  ttsError.message
                )
                
                return {
                  success: false,
                  data: {
                    apiCallId: apiCall.id,
                    externalId,
                    status: 'failed'
                  },
                  error: {
                    message: ttsError.message
                  }
                }
              }

            } catch (error: any) {
              console.error('[VolcTTS] Error in side effect handler', {
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
     * Expose query API for status checks.
     * Note: For sync TTS API, status is usually already final.
     */
    createAPIs(): API[] {
      return [
        /**
         * Query VolcTTS call status
         *
         * Returns current status and result.
         * Note: TTS is synchronous so status is usually already completed/failed.
         */
        {
          name: QUERY_STATUS_API_NAME,
          namespace: this.namespace,
          callback: async function(this: Controller, context, params: QueryStatusRequest) {
            try {
              console.log('[VolcTTS] Query status request', {
                volcTTSCallId: params.volcTTSCallId,
                userId: context.user?.id
              })

              // Find VolcTTSCall by id
              const apiCall = await this.system.storage.findOne(
                config.apiCallEntity.entityName,
                { id: params.volcTTSCallId },
                undefined,
                ['id', 'status', 'externalId', 'responseData', 'error', 'completedAt']
              )

              if (!apiCall) {
                console.warn('[VolcTTS] APICall not found', {
                  volcTTSCallId: params.volcTTSCallId
                })

                return {
                  success: false,
                  error: 'TTS call not found'
                }
              }

              console.log('[VolcTTS] Found APICall', {
                apiCallId: apiCall.id,
                status: apiCall.status,
                externalId: apiCall.externalId
              })

              // Return cached result (TTS is synchronous, no need to re-query)
              return {
                success: true,
                apiCall: {
                  id: apiCall.id,
                  status: apiCall.status,
                  externalId: apiCall.externalId,
                  responseData: apiCall.responseData ?? null,
                  error: apiCall.error ? apiCall.error : null,
                  completedAt: apiCall.completedAt
                }
              }

            } catch (error: any) {
              console.error('[VolcTTS] Failed to query status', {
                volcTTSCallId: params.volcTTSCallId,
                error: error.message
              })

              return {
                success: false,
                message: error.message
              }
            }
          },
          paramsSchema: QueryStatusRequestSchema,
          responseSchema: QueryStatusResponseSchema,
          useNamedParams: true,
          allowAnonymous: false,
          openapi: {
            summary: 'Query Volcengine TTS status',
            description: 'Queries the TTS call status and returns cached result',
            tags: ['TTS']
          }
        }
      ]
    }

    /**
     * Create integration event to trigger reactive updates
     *
     * 🔴 CRITICAL: This is the ONLY way integration updates internal data.
     * Never directly update entity properties - always create events.
     *
     * @param controller - Controller instance
     * @param entityId - APICall entity id (required for first event only, null otherwise)
     * @param externalId - Generated UUID (sync API has no external task ID)
     * @param status - Status: 'processing' | 'completed' | 'failed' (Note: 'pending' is set when APICall is created)
     * @param data - Event payload data
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

        // Add externalId - generated UUID for sync API
        if (externalId) {
          eventData[config.eventEntity.fields.externalId] = externalId
        }

        // Add event payload data
        if (data) {
          eventData[config.eventEntity.fields.data] = data
        }

        // Add error message to data field if failed
        if (errorMessage) {
          const errorData = data ? { ...data, error: errorMessage } : { error: errorMessage }
          eventData[config.eventEntity.fields.data] = errorData
        }

        await controller.system.storage.create(config.eventEntity.entityName, eventData)

        console.log('[VolcTTS] Integration event created', {
          entityId,
          externalId,
          status,
          hasData: !!data,
          hasError: !!errorMessage
        })

        // The reactive computation chain will handle the rest:
        // 1. For first event (status='processing'): VolcTTSCall.externalId is computed from this event
        // 2. For all events: VolcTTSCall.status, responseData, error, completedAt update via statemachine
        // 3. ThankYouVoice.audioUrl updates based on VolcTTSCall entity

      } catch (error: any) {
        console.error('[VolcTTS] Failed to create integration event', {
          entityId,
          externalId,
          status,
          error: error.message
        })
      }
    }
  }
}
