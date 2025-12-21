/**
 * ObjectStorage Integration (Type 3: Client-Direct Integration)
 *
 * Purpose: Provide pre-signed URLs for direct client-to-S3/MinIO file uploads
 *
 * Features:
 * - Generate pre-signed upload URLs for authenticated users
 * - Client uploads files directly to storage (no server bandwidth usage)
 * - Automatic object key generation with user isolation
 * - Content type validation and security checks
 * - Factory function pattern for configuration flexibility
 */

import { Controller } from 'interaqt'
import { IIntegration, IIntegrationConstructorArgs, API } from '@/integrations/index'
import {
  generatePresignedUrl,
  generatePublicUrl,
  ensureBucketExists,
  S3Config
} from '@/integrations/example_objectstorage/s3Api'
import {
  GetUploadUrlRequestSchema,
  GetUploadUrlResponseSchema,
  type GetUploadUrlRequest
} from './schemas'

/**
 * Configuration interface for ObjectStorage Integration
 *
 * All fields are required - NO optional fields or defaults
 */
export type ObjectStorageConfig = {
  /**
   * S3/MinIO service configuration
   */
  s3: {
    accessKeyId: string // REQUIRED, no env fallback
    secretAccessKey: string // REQUIRED, no env fallback
    region: string // REQUIRED, no env fallback
    endpoint: string // REQUIRED, no env fallback
    publicEndpoint: string // 用于生成公开访问的下载 URL
    bucket: string // REQUIRED, no env fallback
  }

  /**
   * Authorization settings
   */
  authorization: {
    defaultExpiresIn: number // Default pre-signed URL expiration (seconds, REQUIRED)
    maxExpiresIn: number // Maximum allowed expiration (seconds, REQUIRED)
    allowedContentTypes: string[] // Allowed MIME types (REQUIRED)
  }

  /**
   * Object key generation
   */
  objectKey: {
    prefix: string // Prefix for all object keys (REQUIRED)
    includeUserId: boolean // Include user ID in path (REQUIRED)
    includeTimestamp: boolean // Include timestamp in filename (REQUIRED)
  }

  /**
   * Bucket configuration
   */
  bucket: {
    publicReadWrite: boolean // Allow public read access to objects (REQUIRED)
  }
}

/**
 * Create ObjectStorage Integration
 *
 * Factory function that returns an IIntegration implementation class.
 */
export function createObjectStorageIntegration(config: ObjectStorageConfig) {
  // Use config directly, no fallbacks or defaults
  const storageConfig: S3Config = {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
    region: config.s3.region,
    endpoint: config.s3.endpoint,
    publicEndpoint: config.s3.publicEndpoint,
    bucket: config.s3.bucket,
    forcePathStyle: true // Required for MinIO
  }

  const defaultExpiresIn = config.authorization.defaultExpiresIn
  const maxExpiresIn = config.authorization.maxExpiresIn
  const allowedContentTypes = config.authorization.allowedContentTypes

  const objectKeyPrefix = config.objectKey.prefix
  const includeUserId = config.objectKey.includeUserId
  const includeTimestamp = config.objectKey.includeTimestamp

  const publicReadWrite = config.bucket.publicReadWrite

  return class ObjectStorageIntegration implements IIntegration {
    private controller?: Controller
    public readonly namespace: string

    constructor(public args: IIntegrationConstructorArgs) {
      this.namespace = args.namespace
    }

    /**
     * Configure phase - NOT USED for client-direct integrations
     */
    async configure() {
      console.log('[ObjectStorage] Integration configure phase - no action needed')
    }

    /**
     * Setup phase - Store controller reference and ensure bucket exists
     */
    async setup(controller: Controller) {
      this.controller = controller
      console.log('[ObjectStorage] Integration setup starting...')

      try {
        // Ensure bucket exists, create if not
        await ensureBucketExists(storageConfig, publicReadWrite)

        console.log('[ObjectStorage] Integration setup completed')
      } catch (error: any) {
        console.error('[ObjectStorage] Failed to ensure bucket exists', {
          bucket: storageConfig.bucket,
          error: error.message
        })
        // Don't throw - allow app to start even if bucket creation fails
        console.warn('[ObjectStorage] Warning: Bucket may not exist. File uploads might fail.')
      }
    }

    /**
     * Create side effects - NOT USED for client-direct integrations
     *
     * Type 3 integrations don't process server-side uploads.
     */
    createSideEffects() {
      return []
    }

    /**
     * Create custom APIs
     *
     * Expose pre-signed URL generation API.
     */
    createAPIs(): API[] {
      return [
        /**
         * Get pre-signed upload URL
         *
         * Generates a pre-signed URL for client to upload file directly to S3/MinIO.
         */
        {
          name: 'getUploadUrl',
          namespace: this.namespace,
          callback: async function (this: Controller, context, params: GetUploadUrlRequest) {
            try {
              // Validate authentication
              if (!context.user || !context.user.id) {
                throw { statusCode: 401, message: 'Authentication required' }
              }
              const userId = context.user.id

              // Security: Prevent path traversal
              if (params.fileName.includes('../') || params.fileName.includes('..\\')) {
                console.error('[ObjectStorage] Path traversal attempt detected', {
                  userId,
                  fileName: params.fileName
                })
                throw { statusCode: 400, message: 'Invalid fileName' }
              }

              // Validate contentType (if provided)
              if (params.contentType) {
                const isAllowed = allowedContentTypes.some((allowed) =>
                  params.contentType!.startsWith(allowed)
                )
                if (!isAllowed) {
                  throw {
                    statusCode: 400,
                    message: `Content type not allowed. Allowed types: ${allowedContentTypes.join(', ')}`
                  }
                }
              }

              // Validate expiresIn
              const expiresIn = params.expiresIn || defaultExpiresIn
              if (expiresIn > maxExpiresIn) {
                throw {
                  statusCode: 400,
                  message: `expiresIn cannot exceed ${maxExpiresIn} seconds`
                }
              }

              // Generate object key
              const sanitizedFileName = params.fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
              let objectKey = objectKeyPrefix

              if (includeUserId) {
                objectKey += `${userId}/`
              }

              if (includeTimestamp) {
                objectKey += `${Date.now()}-`
              }

              objectKey += sanitizedFileName

              console.log('[ObjectStorage] Generating upload URL', {
                userId,
                fileName: params.fileName,
                objectKey,
                expiresIn
              })

              // Generate pre-signed upload URL
              const presignedResult = await generatePresignedUrl(storageConfig, {
                objectKey,
                method: 'PUT',
                contentType: params.contentType,
                expiresIn
              })

              const downloadUrl = generatePublicUrl(storageConfig, objectKey)

              console.log('[ObjectStorage] Upload URL generated successfully', {
                userId,
                objectKey,
                expiresAt: new Date(presignedResult.expiresAt).toISOString(),
                downloadUrl
              })

              return {
                success: true,
                uploadUrl: presignedResult.signedUrl,
                objectKey,
                downloadUrl,
                expiresAt: presignedResult.expiresAt
              }
            } catch (error: any) {
              // If it's already a structured error, re-throw
              if (error.statusCode) {
                throw error
              }

              console.error('[ObjectStorage] Failed to generate upload URL', {
                fileName: params.fileName,
                error: error.message
              })

              throw {
                statusCode: 500,
                message: error.message || 'Failed to generate upload URL'
              }
            }
          },
          paramsSchema: GetUploadUrlRequestSchema,
          responseSchema: GetUploadUrlResponseSchema,
          useNamedParams: true,
          allowAnonymous: false,
          openapi: {
            summary: 'Get pre-signed upload URL',
            description: 'Generates a pre-signed URL for direct client-to-storage file uploads',
            tags: ['Storage']
          }
        }
      ]
    }
  }
}
