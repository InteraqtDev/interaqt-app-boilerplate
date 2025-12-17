/**
 * OpenAI Sora2 Video Generation API wrapper
 *
 * Official API documentation:
 * - OpenAI Videos API: https://platform.openai.com/docs/api-reference/videos
 *
 * CRITICAL: This file returns raw API responses with strict types.
 * NO data transformation - integration file handles that.
 * 
 * NOTE: This file was originally for Volcengine Fangzhou but has been 
 * replaced with OpenAI Sora2 API. The file name is kept for minimal changes.
 */

import { z } from 'zod'
import * as sharpModule from 'sharp'
const sharp = (sharpModule as any).default || sharpModule

export type VolcFangzhouApiConfig = {
  apiKey: string
  baseUrl: string
  model: string
  organization?: string      // OpenAI organization ID (optional)
  projectId?: string         // OpenAI project ID (optional)
}

/**
 * Video generation request parameters - MUST match external API documentation exactly
 */
export type VideoGenerationParams = {
  // Required parameters
  model: string                 // Model name (e.g., 'sora-2')
  content: Array<{
    type: 'image_url' | 'text'
    image_url?: {
      url: string               // Image URL or base64
    }
    role?: 'first_frame' | 'last_frame' | 'reference_image'
    text?: string               // Text prompt
  }>

  // Optional parameters
  seconds?: string | number    // Video duration in seconds (default: '4')
  size?: string                 // Video resolution (default: '720x1280')
  callback_url?: string
  return_last_frame?: boolean
}

/**
 * Zod schema for video generation create response validation
 */
export const VideoGenerationCreateResponseSchema = z.object({
  id: z.string()
})

/**
 * Video generation response (create task) - MUST match external API response exactly
 */
export type VideoGenerationCreateResponse = z.infer<typeof VideoGenerationCreateResponseSchema>

/**
 * Zod schema for video generation query response validation
 * Note: Raw API response schema - some fields may be optional or null
 */
const VideoGenerationQueryRawResponseSchema = z.object({
  id: z.string(),
  model: z.string().nullish(),
  status: z.enum(['queued', 'in_progress', 'completed', 'failed', 'cancelled', 'incomplete']),
  error: z.object({
    code: z.string(),
    message: z.string()
  }).nullish(),
  created_at: z.number(),
  updated_at: z.number().nullish(),
  seed: z.number().nullish(),
  resolution: z.string().nullish(),
  ratio: z.string().nullish(),
  duration: z.number().nullish(),
  frames: z.number().nullish(),
  framespersecond: z.number().nullish(),
  usage: z.object({
    completion_tokens: z.number(),
    total_tokens: z.number()
  }).nullish()
})

/**
 * Video generation query response - MUST match external API response exactly
 */
export type VideoGenerationQueryResponse = {
  id: string                    // Video ID
  model: string                 // Model name
  // Official OpenAI status values: queued, in_progress, completed, failed, cancelled, incomplete
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'incomplete'
  content?: {
    video_url: string           // Video URL (download endpoint)
    last_frame_url?: string     // Optional last frame URL
  }
  error?: {
    code: string
    message: string
  }
  created_at: number            // Unix timestamp (seconds)
  updated_at: number            // Unix timestamp (seconds)
  seed?: number
  resolution?: string
  ratio?: string
  duration?: number             // Video duration in seconds
  frames?: number               // Video frame count
  framespersecond?: number      // Frame rate
  usage?: {
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Video generation error response format
 */
export type VideoGenerationErrorResponse = {
  error: {
    code: string
    message: string
    type: string
  }
}

/**
 * Fetch image from URL and convert to base64 data URI
 *
 * @param imageUrl - Image URL to fetch
 * @returns Base64 data URI string (data:image/jpeg;base64,...)
 * @throws Error if fetch fails
 */
export async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  console.log('[Sora2VideoAPI] Fetching image for base64 conversion', { imageUrl })

  try {
    const response = await fetch(imageUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    
    // Detect content type from response headers, default to jpeg
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const dataUri = `data:${contentType};base64,${base64}`

    console.log('[Sora2VideoAPI] Image converted to base64', {
      imageUrl,
      contentType,
      base64Length: base64.length
    })

    return dataUri
  } catch (error: any) {
    console.error('[Sora2VideoAPI] Failed to fetch and convert image', {
      imageUrl,
      error: error.message
    })
    throw error
  }
}

/**
 * Parse size string to width and height
 * 
 * @param size - Size string in format "widthxheight" or "width*height"
 * @returns Object with width and height numbers
 * @throws Error if format is invalid
 */
function parseSize(size: string): { width: number; height: number } {
  const match = size.match(/^(\d+)[x*](\d+)$/)
  if (!match) {
    throw new Error(`Invalid size format: ${size}. Expected format: 1280x720 or 1280*720`)
  }
  return {
    width: parseInt(match[1], 10),
    height: parseInt(match[2], 10)
  }
}

/**
 * Fetch image from URL, resize to fit target size with letterboxing/pillarboxing if needed
 * 
 * This function ensures the output image matches the exact target dimensions required by Sora2:
 * 1. Fetches the image from URL
 * 2. Calculates scaling to fit within target dimensions while maintaining aspect ratio
 * 3. Adds black borders (letterbox/pillarbox) if needed to reach exact target dimensions
 * 4. Returns base64 data URI of processed image
 * 
 * @param imageUrl - Image URL to fetch
 * @param targetSize - Target size string in format "widthxheight" (e.g., "1280x720")
 * @returns Base64 data URI string (data:image/jpeg;base64,...)
 * @throws Error if fetch or processing fails
 */
export async function fetchAndResizeImageToFit(imageUrl: string, targetSize: string): Promise<string> {
  console.log('[Sora2VideoAPI] Fetching and resizing image to fit', { imageUrl, targetSize })

  try {
    // Parse target dimensions
    const { width: targetWidth, height: targetHeight } = parseSize(targetSize)
    
    console.log('[Sora2VideoAPI] Target dimensions', {
      targetWidth,
      targetHeight,
      aspectRatio: (targetWidth / targetHeight).toFixed(2)
    })

    // Fetch image
    const response = await fetch(imageUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)
    
    // Get image metadata
    const image = sharp(inputBuffer)
    const metadata = await image.metadata()
    
    const originalWidth = metadata.width || 0
    const originalHeight = metadata.height || 0
    
    console.log('[Sora2VideoAPI] Original image dimensions', {
      width: originalWidth,
      height: originalHeight,
      format: metadata.format,
      aspectRatio: originalWidth && originalHeight ? (originalWidth / originalHeight).toFixed(2) : 'unknown'
    })

    // Check if image already matches target size
    if (originalWidth === targetWidth && originalHeight === targetHeight) {
      console.log('[Sora2VideoAPI] Image already matches target size, no processing needed')
      const base64 = inputBuffer.toString('base64')
      const contentType = `image/${metadata.format || 'jpeg'}`
      return `data:${contentType};base64,${base64}`
    }

    // Calculate scaling to fit within target dimensions while maintaining aspect ratio
    const scaleWidth = targetWidth / originalWidth
    const scaleHeight = targetHeight / originalHeight
    const scale = Math.min(scaleWidth, scaleHeight)
    
    const scaledWidth = Math.round(originalWidth * scale)
    const scaledHeight = Math.round(originalHeight * scale)
    
    console.log('[Sora2VideoAPI] Calculated scaling', {
      scale: scale.toFixed(3),
      scaledWidth,
      scaledHeight,
      needsLetterbox: scaledWidth < targetWidth,
      needsPillarbox: scaledHeight < targetHeight
    })

    // Resize image to fit within target dimensions
    const resizedBuffer = await sharp(inputBuffer)
      .resize(scaledWidth, scaledHeight, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      })
      .toBuffer()

    // Add black borders to reach exact target dimensions
    const finalBuffer = await sharp(resizedBuffer)
      .extend({
        top: Math.floor((targetHeight - scaledHeight) / 2),
        bottom: Math.ceil((targetHeight - scaledHeight) / 2),
        left: Math.floor((targetWidth - scaledWidth) / 2),
        right: Math.ceil((targetWidth - scaledWidth) / 2),
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      })
      .jpeg({ quality: 95 })  // Convert to JPEG with high quality
      .toBuffer()

    // Verify final dimensions
    const finalMetadata = await sharp(finalBuffer).metadata()
    console.log('[Sora2VideoAPI] Final image dimensions', {
      width: finalMetadata.width,
      height: finalMetadata.height,
      matches: finalMetadata.width === targetWidth && finalMetadata.height === targetHeight
    })

    if (finalMetadata.width !== targetWidth || finalMetadata.height !== targetHeight) {
      throw new Error(`Failed to resize image to exact dimensions. Expected ${targetWidth}x${targetHeight}, got ${finalMetadata.width}x${finalMetadata.height}`)
    }

    // Convert to base64
    const base64 = finalBuffer.toString('base64')
    const dataUri = `data:image/jpeg;base64,${base64}`

    console.log('[Sora2VideoAPI] Image resized and converted to base64', {
      imageUrl,
      originalSize: `${originalWidth}x${originalHeight}`,
      targetSize: `${targetWidth}x${targetHeight}`,
      base64Length: base64.length
    })

    return dataUri
  } catch (error: any) {
    console.error('[Sora2VideoAPI] Failed to fetch and resize image', {
      imageUrl,
      targetSize,
      error: error.message
    })
    throw error
  }
}

/**
 * Create video generation task using OpenAI Sora2 API
 *
 * Returns raw API response - NO transformation
 *
 * @param params - Video generation parameters
 * @param config - API configuration
 * @returns Raw API response with video ID
 * @throws Error if API call fails
 */
export async function createVideoGenerationTask(
  params: VideoGenerationParams,
  config: VolcFangzhouApiConfig
): Promise<VideoGenerationCreateResponse> {
  const apiKey = config.apiKey
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1'
  const defaultModel = config.model || 'sora-2'

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API key is required in config')
  }

  console.log('[Sora2VideoAPI] Creating video generation task', {
    baseUrl,
    model: params.model || defaultModel,
    contentCount: params.content?.length || 0
  })

  try {
    // Extract parameters from content array
    let prompt = '' 
    let imageData: { url: string } | null = null
    // Use provided seconds and size, or fall back to defaults
    let seconds = params.seconds !== undefined 
      ? String(params.seconds) 
      : '4'  // default
    let size = params.size || '720x1280'  // default

    console.log('[Sora2VideoAPI] Parsing content array', {
      contentLength: params.content?.length,
      content: params.content
    })

    for (const item of params.content) {
      if (item.type === 'text' && item.text) {
        prompt = item.text
      } else if (item.type === 'image_url' && item.image_url) {
        imageData = item.image_url
      }
    }

    console.log('[Sora2VideoAPI] Extracted parameters', {
      prompt: prompt || '(empty)',
      hasImage: !!imageData,
      seconds,
      size
    })

    // Validate required parameters
    // According to OpenAI API, prompt is required even when using input_reference
    if (!prompt || prompt.trim() === '') {
      throw new Error('Prompt is required. Please provide a text description for the video.')
    }

    // Prepare multipart form data
    const formData = new FormData()
    formData.append('model', params.model || defaultModel)
    formData.append('prompt', prompt)
    formData.append('seconds', seconds)
    formData.append('size', size)

    // Add image if provided
    if (imageData && imageData.url) {
      console.log('[Sora2VideoAPI] Processing input image...')
      
      // Check if it's a base64 data URI or URL
      if (imageData.url.startsWith('data:')) {
        // Extract base64 data
        const matches = imageData.url.match(/^data:([^;]+);base64,(.+)$/)
        if (matches) {
          const mimeType = matches[1]
          const base64Data = matches[2]
          const buffer = Buffer.from(base64Data, 'base64')
          const blob = new Blob([buffer], { type: mimeType })
          
          // Determine file extension from mime type
          const ext = mimeType.split('/')[1] || 'jpg'
          formData.append('input_reference', blob, `reference.${ext}`)
          
          console.log('[Sora2VideoAPI] Added base64 image to form data', {
            mimeType,
            size: buffer.length
          })
        } else {
          throw new Error('Invalid base64 data URI format')
        }
      } else {
        // It's a URL, fetch and convert
        console.log('[Sora2VideoAPI] Fetching image from URL:', imageData.url)
        const imageResponse = await fetch(imageData.url)
        
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.status}`)
        }
        
        const imageBuffer = await imageResponse.arrayBuffer()
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
        const blob = new Blob([imageBuffer], { type: contentType })
        
        const ext = contentType.split('/')[1] || 'jpg'
        formData.append('input_reference', blob, `reference.${ext}`)
        
        console.log('[Sora2VideoAPI] Added URL image to form data', {
          contentType,
          size: imageBuffer.byteLength
        })
      }
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`
    }
    
    if (config.organization) {
      headers['OpenAI-Organization'] = config.organization
    }
    
    if (config.projectId) {
      headers['OpenAI-Project'] = config.projectId
    }

    console.log('[Sora2VideoAPI] Submitting video generation request to OpenAI...')

    const response = await fetch(`${baseUrl}/videos`, {
      method: 'POST',
      headers,
      body: formData
    })

    // Check if response is successful
    if (!response.ok) {
      const errorText = await response.text()
      let errorData: VideoGenerationErrorResponse | null = null

      try {
        errorData = JSON.parse(errorText)
      } catch {
        // If not JSON, create error object
        errorData = {
          error: {
            code: `http_${response.status}`,
            message: errorText || response.statusText,
            type: 'http_error'
          }
        }
      }

      console.error('[Sora2VideoAPI] ❌ Create video failed', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        errorData: errorData ? JSON.stringify(errorData, null, 2) : null,
        requestParams: {
          model: params.model || defaultModel,
          hasContent: !!params.content,
          contentCount: params.content?.length || 0,
          seconds: params.seconds,
          size: params.size
        },
        headers: {
          contentType: response.headers.get('content-type')
        }
      })

      throw new Error(`Create video failed: ${response.status} ${response.statusText} - ${errorData?.error?.message || errorText}`)
    }

    // Parse and validate response
    const rawData = await response.json()
    const data = VideoGenerationCreateResponseSchema.parse(rawData)

    console.log('[Sora2VideoAPI] Video generation task created', {
      videoId: data.id
    })

    return data
  } catch (error: any) {
    console.error('[Sora2VideoAPI] Exception during create video', {
      error: error.message,
      stack: error.stack
    })
    throw error
  }
}

/**
 * Query video generation task status using OpenAI Sora2 API
 *
 * Returns raw API response - NO transformation
 *
 * @param taskId - Video ID from create video API
 * @param config - API configuration
 * @returns Raw API response with video status
 * @throws Error if API call fails
 */
export async function queryVideoGenerationTask(
  taskId: string,
  config: VolcFangzhouApiConfig
): Promise<VideoGenerationQueryResponse> {
  const apiKey = config.apiKey
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1'

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API key is required')
  }

  const url = `${baseUrl}/videos/${taskId}`

  console.log('[Sora2VideoAPI] Querying video generation task', {
    taskId,
    url
  })

  try {
    // Prepare headers
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`
    }
    
    if (config.organization) {
      headers['OpenAI-Organization'] = config.organization
    }
    
    if (config.projectId) {
      headers['OpenAI-Project'] = config.projectId
    }

    const response = await fetch(url, {
      method: 'GET',
      headers
    })

    // Check if response is successful
    if (!response.ok) {
      const errorText = await response.text()
      let errorData: VideoGenerationErrorResponse | null = null

      try {
        errorData = JSON.parse(errorText)
      } catch {
        // If not JSON, create error object
        errorData = {
          error: {
            code: `http_${response.status}`,
            message: errorText || response.statusText,
            type: 'http_error'
          }
        }
      }

      console.error('[Sora2VideoAPI] ❌ Query video failed', {
        taskId,
        url,
        status: response.status,
        statusText: response.statusText,
        errorText,
        errorData: errorData ? JSON.stringify(errorData, null, 2) : null,
        headers: {
          contentType: response.headers.get('content-type')
        }
      })

      throw new Error(`Query video failed: ${response.status} ${response.statusText} - ${errorData?.error?.message || errorText}`)
    }

    // Parse and validate raw response
    const rawData = await response.json()
    const validatedData = VideoGenerationQueryRawResponseSchema.parse(rawData)

    console.log('[Sora2VideoAPI] Video generation status retrieved', {
      videoId: validatedData.id,
      status: validatedData.status
    })

    // Return response with minimal transformation
    // OpenAI official statuses: queued, in_progress, completed, failed, cancelled, incomplete
    // Status mapping is handled by the integration layer (index.ts)
    
    const responseData: VideoGenerationQueryResponse = {
      id: validatedData.id,
      model: validatedData.model || config.model,
      status: validatedData.status,
      created_at: validatedData.created_at,
      updated_at: validatedData.updated_at ?? validatedData.created_at,
      error: validatedData.error ?? undefined,
      seed: validatedData.seed ?? undefined,
      resolution: validatedData.resolution ?? undefined,
      ratio: validatedData.ratio ?? undefined,
      duration: validatedData.duration ?? undefined,
      frames: validatedData.frames ?? undefined,
      framespersecond: validatedData.framespersecond ?? undefined,
      usage: validatedData.usage ?? undefined
    }

    // If completed, construct video_url as download endpoint
    if (validatedData.status === 'completed') {
      responseData.content = {
        video_url: `${baseUrl}/videos/${taskId}/content`
      }
      
      console.log('[Sora2VideoAPI] Video completed, download URL:', responseData.content.video_url)
    }

    return responseData
  } catch (error: any) {
    console.error('[Sora2VideoAPI] Exception during query video', {
      taskId,
      error: error.message,
      stack: error.stack
    })
    throw error
  }
}

/**
 * Download video content from OpenAI Sora2 API
 *
 * Downloads the completed video file as a Buffer. This is used to download
 * the video and upload it to object storage, as Sora2 does not provide
 * permanent download URLs for direct streaming.
 *
 * @param taskId - Video ID from create video API
 * @param config - API configuration
 * @returns Buffer containing video data
 * @throws Error if API call fails
 */
export async function downloadVideoContent(
  taskId: string,
  config: VolcFangzhouApiConfig
): Promise<Buffer> {
  const apiKey = config.apiKey
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1'

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API key is required')
  }

  const url = `${baseUrl}/videos/${taskId}/content`

  console.log('[Sora2VideoAPI] Downloading video content', {
    taskId,
    url
  })

  try {
    // Prepare headers
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`
    }
    
    if (config.organization) {
      headers['OpenAI-Organization'] = config.organization
    }
    
    if (config.projectId) {
      headers['OpenAI-Project'] = config.projectId
    }

    const response = await fetch(url, {
      method: 'GET',
      headers
    })

    // Check if response is successful
    if (!response.ok) {
      const errorText = await response.text()
      let parsedError = null
      try {
        parsedError = JSON.parse(errorText)
      } catch (e) {
        // errorText is not JSON
      }
      
      console.error('[Sora2VideoAPI] ❌ Download video failed', {
        taskId,
        url,
        status: response.status,
        statusText: response.statusText,
        errorText,
        parsedError: parsedError ? JSON.stringify(parsedError, null, 2) : null,
        headers: {
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length')
        }
      })

      throw new Error(`Download video failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const contentType = response.headers.get('content-type')
    const contentLength = response.headers.get('content-length')
    
    console.log('[Sora2VideoAPI] Video content downloaded', {
      taskId,
      contentType,
      contentLength,
      bufferSize: buffer.length
    })

    return buffer
  } catch (error: any) {
    console.error('[Sora2VideoAPI] Exception during download video', {
      taskId,
      error: error.message,
      stack: error.stack
    })
    throw error
  }
}
