/**
 * Volcengine TOS API wrapper
 * 
 * CRITICAL: This file generates pre-signed URLs for client-side direct uploads.
 * NO data transformation - returns credentials for client use.
 */

import { TosClient } from '@volcengine/tos-sdk'

export type TOSConfig = {
  accessKeyId: string
  secretAccessKey: string
  region: string
  endpoint: string
  bucket: string
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
 * Create TOS client
 * 
 * Returns configured TOS client instance.
 */
export function createTOSClient(config: TOSConfig): TosClient {
  return new TosClient({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.secretAccessKey,
    region: config.region,
    endpoint: config.endpoint
  })
}

/**
 * Generate pre-signed URL for client-side upload or download
 * 
 * Returns raw pre-signed URL - NO transformation.
 * Client will use this URL to directly interact with TOS.
 */
export function generatePresignedUrl(
  config: TOSConfig,
  params: PreSignedURLParams
): PreSignedURLResult {
  const client = createTOSClient(config)
  
  const expiresIn = params.expiresIn || 3600 // Default: 1 hour
  const method = params.method || 'PUT'
  
  try {
    // Generate pre-signed URL using TOS SDK
    // Note: getPreSignedUrl returns the URL directly as a string
    const signedUrl = client.getPreSignedUrl({
      bucket: config.bucket,
      key: params.objectKey,
      method,
      expires: expiresIn
    })
    
    return {
      signedUrl,
      expiresAt: Date.now() + expiresIn * 1000
    }
  } catch (error: any) {
    console.error('[TOS] Failed to generate pre-signed URL', {
      objectKey: params.objectKey,
      method,
      error: error.message
    })
    throw error
  }
}

/**
 * Generate public download URL (if bucket is public)
 * 
 * For public buckets, objects can be accessed via standard URL format.
 */
export function generatePublicUrl(config: TOSConfig, objectKey: string): string {
  // Extract protocol from endpoint and remove it
  const endpoint = config.endpoint.replace(/^https?:\/\//, '')
  const protocol = config.endpoint.startsWith('https://') ? 'https' : 'http'
  
  // TOS uses virtual-hosted-style URLs: http://bucket.endpoint/key
  return `${protocol}://${config.bucket}.${endpoint}/${objectKey}`
}

/**
 * Ensure bucket exists, create if not
 * 
 * Checks if the bucket exists, creates it if it doesn't.
 * Safe to call multiple times (idempotent).
 * 
 * @param config - TOS configuration
 * @param publicReadWrite - If true, configure bucket for public read/write access
 * @returns true if bucket exists or was created successfully
 */
export async function ensureBucketExists(config: TOSConfig, publicReadWrite: boolean = false): Promise<boolean> {
  const client = createTOSClient(config)
  
  let bucketExists = false
  
  try {
    // Try to check if bucket exists
    await client.headBucket(config.bucket)
    
    console.log(`[TOS] Bucket '${config.bucket}' already exists`)
    bucketExists = true
  } catch (error: any) {
    // If bucket doesn't exist, create it
    if (error.statusCode === 404 || error.code === 'NoSuchBucket') {
      try {
        console.log(`[TOS] Bucket '${config.bucket}' not found, creating...`)
        
        await client.createBucket({
          bucket: config.bucket
        })
        
        console.log(`[TOS] Bucket '${config.bucket}' created successfully`)
        bucketExists = true
      } catch (createError: any) {
        console.error(`[TOS] Failed to create bucket '${config.bucket}'`, {
          error: createError.message,
          code: createError.code
        })
        throw createError
      }
    } else {
      // For other errors (permissions, network, etc.), log and re-throw
      console.error(`[TOS] Failed to check bucket '${config.bucket}'`, {
        error: error.message,
        code: error.code
      })
      throw error
    }
  }
  
  // If bucket exists and publicReadWrite is true, configure public access
  if (bucketExists && publicReadWrite) {
    try {
      console.log(`[TOS] Configuring bucket '${config.bucket}' for public read access...`)
      
      // Set bucket ACL to public-read
      // TOS supports: private, public-read, public-read-write, authenticated-read
      await client.putBucketAcl({
        bucket: config.bucket,
        acl: 'public-read' as any  // Allow public read access
      })
      
      console.log(`[TOS] Bucket '${config.bucket}' configured for public read access`)
    } catch (aclError: any) {
      console.error(`[TOS] Failed to configure public access for bucket '${config.bucket}'`, {
        error: aclError.message,
        code: aclError.code
      })
      // Don't throw - bucket is created, just ACL configuration failed
      console.warn(`[TOS] Warning: Bucket created but public access configuration failed`)
    }
  }
  
  return bucketExists
}
