/**
 * Nanobanana2 Image Generation Activities
 *
 * Activities handle side-effectful operations:
 * 1. Call nanobanana2 API to generate images
 * 2. Upload generated images to Object Storage
 * 3. Report result back to main component via callback API
 */

import { callImageGenerationApi, fetchImageAsBase64, ImageGenerationResponse } from '../externalApi.js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

/**
 * S3/MinIO configuration type
 */
export type S3Config = {
  accessKeyId: string
  secretAccessKey: string
  region: string
  endpoint: string
  publicEndpoint?: string // 用于生成公开访问的下载 URL
  bucket: string
  forcePathStyle?: boolean
}

/**
 * Image generation task parameters
 */
export type GenerateImageParams = {
  prompt: string
  referenceImageUrl: string
  // API config
  apiKey: string
  baseUrl: string
  model: string
  // Storage config
  storage: S3Config
  objectKeyPrefix: string
}

/**
 * Image generation task result
 */
export type GenerateImageResult = {
  success: boolean
  imageUrls?: string[]
  error?: string
}

/**
 * Create S3 client
 */
function createS3Client(config: S3Config): S3Client {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    },
    forcePathStyle: config.forcePathStyle !== false,
    requestChecksumCalculation: 'WHEN_REQUIRED' as any
  })
}

/**
 * Activity: Call nanobanana2 API to generate images
 */
export async function callNanobanana2Api(params: {
  prompt: string
  referenceImageUrl: string
  apiKey: string
  baseUrl: string
  model: string
}): Promise<ImageGenerationResponse> {
  console.log('[Activity:callNanobanana2Api] Starting image generation', {
    prompt: params.prompt.substring(0, 50) + '...',
    hasReferenceImage: !!params.referenceImageUrl
  })

  // Fetch reference image and convert to base64
  const referenceImageBase64 = await fetchImageAsBase64(params.referenceImageUrl)

  console.log('[Activity:callNanobanana2Api] Reference image converted to base64', {
    base64Length: referenceImageBase64.length
  })

  // Call API with image
  const apiResponse = await callImageGenerationApi(
    {
      model: params.model,
      prompt: params.prompt,
      image: referenceImageBase64
    },
    {
      apiKey: params.apiKey,
      baseUrl: params.baseUrl,
      model: params.model
    }
  )

  console.log('[Activity:callNanobanana2Api] API call succeeded', {
    model: apiResponse.model,
    imageCount: apiResponse.data?.length || 0
  })

  return apiResponse
}

/**
 * Activity: Upload image to Object Storage
 */
export async function uploadImageToStorage(params: {
  imageDataUri: string // base64 data URI or URL
  objectKey: string
  storage: S3Config
}): Promise<{
  success: boolean
  publicUrl: string
  error?: string
}> {
  console.log('[Activity:uploadImageToStorage] Starting upload', {
    objectKey: params.objectKey,
    bucket: params.storage.bucket,
    isDataUri: params.imageDataUri.startsWith('data:')
  })

  try {
    const s3Client = createS3Client(params.storage)

    let buffer: Buffer
    let contentType: string = 'image/jpeg'

    if (params.imageDataUri.startsWith('data:')) {
      const matches = params.imageDataUri.match(/^data:([^;]+);base64,(.+)$/)
      if (matches) {
        contentType = matches[1]
        buffer = Buffer.from(matches[2], 'base64')
      } else {
        throw new Error('Invalid base64 data URI format')
      }
    } else {
      const response = await fetch(params.imageDataUri)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      contentType = response.headers.get('content-type') || 'image/jpeg'
    }

    console.log('[Activity:uploadImageToStorage] Image prepared for upload', {
      bufferSize: buffer.length,
      contentType
    })

    await s3Client.send(
      new PutObjectCommand({
        Bucket: params.storage.bucket,
        Key: params.objectKey,
        Body: buffer,
        ContentType: contentType
      })
    )

    // 使用 publicEndpoint 生成公开访问的 URL（如果配置了的话）
    const publicEndpointUrl = params.storage.publicEndpoint || params.storage.endpoint
    const endpoint = publicEndpointUrl.replace(/^https?:\/\//, '')
    const protocol = publicEndpointUrl.startsWith('https://') ? 'https' : 'http'
    const publicUrl = `${protocol}://${endpoint}/${params.storage.bucket}/${params.objectKey}`

    console.log('[Activity:uploadImageToStorage] Upload successful', {
      objectKey: params.objectKey,
      publicUrl
    })

    return {
      success: true,
      publicUrl
    }
  } catch (error: any) {
    console.error('[Activity:uploadImageToStorage] Upload failed', {
      objectKey: params.objectKey,
      error: error.message
    })

    return {
      success: false,
      publicUrl: '',
      error: error.message
    }
  }
}

/**
 * Activity: Full image generation workflow
 *
 * Includes: Call API + Upload to Object Storage
 */
export async function generateAndUploadImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  console.log('[Activity:generateAndUploadImage] Starting full workflow', {
    prompt: params.prompt.substring(0, 50) + '...'
  })

  try {
    // Step 1: Call nanobanana2 API
    const apiResponse = await callNanobanana2Api({
      prompt: params.prompt,
      referenceImageUrl: params.referenceImageUrl,
      apiKey: params.apiKey,
      baseUrl: params.baseUrl,
      model: params.model
    })

    // Step 2: Upload all generated images to Object Storage
    const uploadedUrls: string[] = []

    for (let i = 0; i < apiResponse.data.length; i++) {
      const imageData = apiResponse.data[i]
      const imageUrl = imageData.url

      if (!imageUrl) {
        console.warn('[Activity:generateAndUploadImage] No image URL at index', i)
        continue
      }

      // Fix escaped characters in URL
      const cleanedImageUrl = imageUrl.replace(/\\u0026/g, '&')

      const objectKey = `${params.objectKeyPrefix}${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}.jpg`

      const uploadResult = await uploadImageToStorage({
        imageDataUri: cleanedImageUrl,
        objectKey,
        storage: params.storage
      })

      if (uploadResult.success) {
        uploadedUrls.push(uploadResult.publicUrl)
      } else {
        console.warn('[Activity:generateAndUploadImage] Failed to upload image', {
          index: i,
          error: uploadResult.error
        })
      }
    }

    if (uploadedUrls.length === 0) {
      throw new Error('No images were successfully uploaded')
    }

    console.log('[Activity:generateAndUploadImage] Full workflow completed', {
      uploadedCount: uploadedUrls.length
    })

    return {
      success: true,
      imageUrls: uploadedUrls
    }
  } catch (error: any) {
    console.error('[Activity:generateAndUploadImage] Workflow failed', {
      error: error.message
    })

    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Report result callback parameters
 * 
 * Status values:
 * - 'queued': First event when worker picks up task (requires apiCallId)
 * - 'processing': Before calling external API (requires apiCallId and externalId for debugging)
 * - 'completed': Task completed successfully (requires apiCallId, includes imageUrls)
 * - 'failed': Task failed (requires apiCallId, includes error message)
 * 
 * ALL events MUST have apiCallId (entityId) for state machine matching.
 */
export type ReportResultParams = {
  workflowId: string
  callbackUrl: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  // APICall entity ID (required for ALL events for state machine matching)
  apiCallId: string
  // External ID for debugging (optional, included in 'processing' event for sync APIs)
  externalId?: string
  imageUrls?: string[]
  error?: string
}

/**
 * Report result callback response
 */
export type ReportResultResponse = {
  success: boolean
  message?: string
  error?: string
}

/**
 * Activity: Report result back to main component via callback API
 *
 * This activity is called by the workflow to notify the main component:
 * - After workflow is picked up: status='queued' with apiCallId
 * - Before calling external API: status='processing' with apiCallId and externalId
 * - After task completion: status='completed' or 'failed' with apiCallId
 * 
 * ALL events MUST have apiCallId (entityId) for state machine matching.
 */
export async function reportToMain(params: ReportResultParams): Promise<ReportResultResponse> {
  console.log('[Activity:reportToMain] Reporting result to main component', {
    workflowId: params.workflowId,
    callbackUrl: params.callbackUrl,
    status: params.status,
    apiCallId: params.apiCallId,
    externalId: params.externalId,
    hasImageUrls: !!params.imageUrls,
    hasError: !!params.error
  })

  try {
    // Build request body - apiCallId is always included for state machine matching
    const requestBody: Record<string, any> = {
      workflowId: params.workflowId,
      status: params.status,
      apiCallId: params.apiCallId
    }

    // Include externalId for 'processing' status (for debugging)
    if (params.externalId) {
      requestBody.externalId = params.externalId
    }

    if (params.imageUrls) {
      requestBody.imageUrls = params.imageUrls
    }

    if (params.error) {
      requestBody.error = params.error
    }

    // Call the callback API using the URL passed from workflow
    const response = await fetch(params.callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Callback API returned ${response.status}: ${errorText}`)
    }

    const result = await response.json()

    console.log('[Activity:reportToMain] Callback API response', {
      workflowId: params.workflowId,
      apiCallId: params.apiCallId,
      result
    })

    return {
      success: true,
      message: result.message || 'Result reported successfully'
    }
  } catch (error: any) {
    console.error('[Activity:reportToMain] Failed to report result', {
      workflowId: params.workflowId,
      apiCallId: params.apiCallId,
      error: error.message
    })

    // Return error but don't throw - we don't want to retry callback indefinitely
    return {
      success: false,
      error: error.message
    }
  }
}
