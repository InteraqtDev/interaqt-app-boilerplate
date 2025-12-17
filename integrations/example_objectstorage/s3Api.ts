/**
 * AWS S3 / MinIO API wrapper
 * 
 * CRITICAL: This file generates pre-signed URLs for client-side direct uploads.
 * Supports both AWS S3 and MinIO (S3-compatible storage).
 */

import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand, CreateBucketCommand, PutBucketPolicyCommand, DeletePublicAccessBlockCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export type S3Config = {
  accessKeyId: string
  secretAccessKey: string
  region: string
  endpoint: string
  bucket: string
  forcePathStyle?: boolean  // Required for MinIO (default: true)
}

export type PreSignedURLParams = {
  objectKey: string         // Object key in bucket (e.g., "uploads/user123/photo.jpg")
  method?: 'PUT' | 'GET'   // HTTP method (PUT for upload, GET for download)
  contentType?: string      // Content type for upload
  expiresIn?: number        // Expiration time in seconds (default: 3600)
}

export type PreSignedURLResult = {
  signedUrl: string         // Pre-signed URL for direct client access
  expiresAt: number         // Timestamp when URL expires
}

/**
 * Create S3 client (compatible with AWS S3 and MinIO)
 * 
 * Returns configured S3 client instance.
 */
export function createS3Client(config: S3Config): S3Client {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    },
    // Force path-style URLs for MinIO compatibility
    // MinIO requires: http://endpoint/bucket/key instead of http://bucket.endpoint/key
    forcePathStyle: config.forcePathStyle !== false,  // Default: true
    // Disable request checksums for MinIO compatibility
    // MinIO may not support all AWS checksum algorithms
    requestChecksumCalculation: 'WHEN_REQUIRED' as any
  })
}

/**
 * Generate pre-signed URL for client-side upload or download
 * 
 * Returns raw pre-signed URL - NO transformation.
 * Client will use this URL to directly interact with S3/MinIO.
 */
export async function generatePresignedUrl(
  config: S3Config,
  params: PreSignedURLParams
): Promise<PreSignedURLResult> {
  const client = createS3Client(config)
  
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
        // Disable checksums for better MinIO compatibility
        ChecksumAlgorithm: undefined
      })
    } else {
      // Generate pre-signed URL for download
      command = new GetObjectCommand({
        Bucket: config.bucket,
        Key: params.objectKey
      })
    }
    
    // Generate signed URL without SDK-added query parameters
    const signedUrl = await getSignedUrl(client, command, {
      expiresIn,
      // Ensure Content-Type is included in signature if provided
      ...(params.contentType && method === 'PUT' ? {
        unhoistableHeaders: new Set(['content-type'])
      } : {})
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
 */
export function generatePublicUrl(config: S3Config, objectKey: string): string {
  // MinIO uses path-style URLs: http://endpoint/bucket/key
  const endpoint = config.endpoint.replace(/^https?:\/\//, '')
  const protocol = config.endpoint.startsWith('https://') ? 'https' : 'http'
  
  // Check if forcePathStyle is enabled (default for MinIO)
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
 * Checks if the bucket exists, creates it if it doesn't.
 * Safe to call multiple times (idempotent).
 * 
 * @param config - S3/MinIO configuration
 * @param publicReadWrite - If true, configure bucket for public read/write access
 * @returns true if bucket exists or was created successfully
 */
export async function ensureBucketExists(config: S3Config, publicReadWrite: boolean = false): Promise<boolean> {
  const client = createS3Client(config)
  
  let bucketExists = false
  
  try {
    // Try to check if bucket exists
    await client.send(new HeadBucketCommand({
      Bucket: config.bucket
    }))
    
    console.log(`[S3] Bucket '${config.bucket}' already exists`)
    bucketExists = true
  } catch (error: any) {
    // If bucket doesn't exist (404), create it
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      try {
        console.log(`[S3] Bucket '${config.bucket}' not found, creating...`)
        
        await client.send(new CreateBucketCommand({
          Bucket: config.bucket
        }))
        
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
      // For other errors (permissions, network, etc.), log and re-throw
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
      console.log(`[S3] Configuring bucket '${config.bucket}' for public read/write access...`)
      
      // Wait a bit for bucket to be fully available (especially important after creation)
      // MinIO may need time to fully initialize the bucket
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // MinIO note: Skip DeletePublicAccessBlockCommand as it may cause issues in MinIO
      // MinIO doesn't have the same public access block mechanism as AWS S3
      console.log(`[S3] Skipping public access block removal (not needed for MinIO)`)
      
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
      
      await client.send(new PutBucketPolicyCommand({
        Bucket: config.bucket,
        Policy: JSON.stringify(bucketPolicy)
      }))
      
      console.log(`[S3] Bucket '${config.bucket}' configured for public read access`)
    } catch (policyError: any) {
      console.error(`[S3] Failed to configure public access for bucket '${config.bucket}'`, {
        error: policyError.message,
        code: policyError.code
      })
      // Don't throw - bucket is created, just policy configuration failed
      console.warn(`[S3] Warning: Bucket created but public access configuration failed`)
    }
  }
  
  return bucketExists
}

