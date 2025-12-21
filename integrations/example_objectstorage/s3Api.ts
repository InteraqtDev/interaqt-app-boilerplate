/**
 * AWS S3 / MinIO API wrapper
 *
 * Generates pre-signed URLs for client-side direct uploads.
 * Supports both AWS S3 and MinIO (S3-compatible storage).
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export type S3Config = {
  accessKeyId: string
  secretAccessKey: string
  region: string
  endpoint: string
  publicEndpoint?: string // 用于生成公开访问的下载 URL
  bucket: string
  forcePathStyle?: boolean // Required for MinIO (default: true)
}

export type PreSignedURLParams = {
  objectKey: string // Object key in bucket (e.g., "uploads/user123/photo.jpg")
  method?: 'PUT' | 'GET' // HTTP method (PUT for upload, GET for download)
  contentType?: string // Content type for upload
  expiresIn?: number // Expiration time in seconds (default: 3600)
}

export type PreSignedURLResult = {
  signedUrl: string // Pre-signed URL for direct client access
  expiresAt: number // Timestamp when URL expires
}

/**
 * Create S3 client (compatible with AWS S3 and MinIO)
 *
 * @param config - S3 configuration
 * @param usePublicEndpoint - If true and publicEndpoint is configured, use publicEndpoint instead of endpoint
 */
export function createS3Client(config: S3Config, usePublicEndpoint: boolean = false): S3Client {
  const endpoint = usePublicEndpoint && config.publicEndpoint ? config.publicEndpoint : config.endpoint

  return new S3Client({
    region: config.region,
    endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    },
    // Force path-style URLs for MinIO compatibility
    forcePathStyle: config.forcePathStyle !== false, // Default: true
    // Disable request checksums for MinIO compatibility
    requestChecksumCalculation: 'WHEN_REQUIRED' as any
  })
}

/**
 * Generate pre-signed URL for client-side upload or download
 *
 * Uses publicEndpoint (if configured) to generate URLs accessible by external clients.
 */
export async function generatePresignedUrl(
  config: S3Config,
  params: PreSignedURLParams
): Promise<PreSignedURLResult> {
  // Use publicEndpoint for pre-signed URLs so external clients can access
  const client = createS3Client(config, true)

  const expiresIn = params.expiresIn || 3600 // Default: 1 hour
  const method = params.method || 'PUT'

  try {
    let command

    if (method === 'PUT') {
      // Generate pre-signed URL for upload
      command = new PutObjectCommand({
        Bucket: config.bucket,
        Key: params.objectKey,
        ContentType: params.contentType,
        ChecksumAlgorithm: undefined
      })
    } else {
      // Generate pre-signed URL for download
      command = new GetObjectCommand({
        Bucket: config.bucket,
        Key: params.objectKey
      })
    }

    // Generate signed URL
    const signedUrl = await getSignedUrl(client, command, {
      expiresIn,
      ...(params.contentType && method === 'PUT'
        ? {
            unhoistableHeaders: new Set(['content-type'])
          }
        : {})
    })

    return {
      signedUrl,
      expiresAt: Date.now() + expiresIn * 1000
    }
  } catch (error: any) {
    console.error('[S3] Failed to generate pre-signed URL', {
      objectKey: params.objectKey,
      method,
      error: error.message
    })
    throw error
  }
}

/**
 * Generate public download URL
 *
 * For public buckets or when you want the URL format without signing.
 * Uses publicEndpoint if available (for external access), otherwise falls back to endpoint.
 */
export function generatePublicUrl(config: S3Config, objectKey: string): string {
  // 优先使用 publicEndpoint（用于外部访问）
  const publicEndpointUrl = config.publicEndpoint || config.endpoint
  const endpoint = publicEndpointUrl.replace(/^https?:\/\//, '')
  const protocol = publicEndpointUrl.startsWith('https://') ? 'https' : 'http'

  // MinIO uses path-style URLs: http://endpoint/bucket/key
  if (config.forcePathStyle !== false) {
    return `${protocol}://${endpoint}/${config.bucket}/${objectKey}`
  } else {
    // Virtual-hosted-style URLs: http://bucket.endpoint/key (AWS S3 style)
    return `${protocol}://${config.bucket}.${endpoint}/${objectKey}`
  }
}

/**
 * Ensure bucket exists, create if not
 *
 * Safe to call multiple times (idempotent).
 */
export async function ensureBucketExists(config: S3Config, publicReadWrite: boolean = false): Promise<boolean> {
  const client = createS3Client(config)

  let bucketExists = false

  try {
    // Try to check if bucket exists
    await client.send(
      new HeadBucketCommand({
        Bucket: config.bucket
      })
    )

    console.log(`[S3] Bucket '${config.bucket}' already exists`)
    bucketExists = true
  } catch (error: any) {
    // If bucket doesn't exist (404), create it
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      try {
        console.log(`[S3] Bucket '${config.bucket}' not found, creating...`)

        await client.send(
          new CreateBucketCommand({
            Bucket: config.bucket
          })
        )

        console.log(`[S3] Bucket '${config.bucket}' created successfully`)
        bucketExists = true
      } catch (createError: any) {
        console.error(`[S3] Failed to create bucket '${config.bucket}'`, {
          error: createError.message,
          code: createError.code
        })
        throw createError
      }
    } else {
      console.error(`[S3] Failed to check bucket '${config.bucket}'`, {
        error: error.message,
        code: error.code
      })
      throw error
    }
  }

  // If bucket exists and publicReadWrite is true, configure public access
  if (bucketExists && publicReadWrite) {
    try {
      console.log(`[S3] Configuring bucket '${config.bucket}' for public read access...`)

      // Wait a bit for bucket to be fully available
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Set bucket policy to allow public read access
      const bucketPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicRead',
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${config.bucket}/*`]
          }
        ]
      }

      await client.send(
        new PutBucketPolicyCommand({
          Bucket: config.bucket,
          Policy: JSON.stringify(bucketPolicy)
        })
      )

      console.log(`[S3] Bucket '${config.bucket}' configured for public read access`)
    } catch (policyError: any) {
      console.error(`[S3] Failed to configure public access for bucket '${config.bucket}'`, {
        error: policyError.message,
        code: policyError.code
      })
      console.warn(`[S3] Warning: Bucket created but public access configuration failed`)
    }
  }

  return bucketExists
}
