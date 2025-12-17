/**
 * Volcengine Fangzhou Seedance Video Generation API wrapper
 *
 * Official API documentation:
 * - Create Task: https://www.volcengine.com/docs/82379/1520757
 * - Query Task: https://www.volcengine.com/docs/82379/1521309
 *
 * CRITICAL: This file returns raw API responses with strict types.
 * NO data transformation - integration file handles that.
 */

import { z } from 'zod'

export type FangzhouApiConfig = {
  apiKey: string
  baseUrl: string
  model: string
}

/**
 * Video generation request parameters
 */
export type VideoGenerationParams = {
  model: string
  content: Array<{
    type: 'image_url' | 'text'
    image_url?: {
      url: string // Image URL or base64
    }
    role?: 'first_frame' | 'last_frame' | 'reference_image'
    text?: string
  }>
  callback_url?: string
  return_last_frame?: boolean
}

/**
 * Zod schema for video generation create response
 */
const VideoGenerationCreateResponseSchema = z.object({
  id: z.string()
})

export type VideoGenerationCreateResponse = z.infer<typeof VideoGenerationCreateResponseSchema>

/**
 * Zod schema for video generation query response
 */
const VideoGenerationQueryResponseSchema = z.object({
  id: z.string(),
  model: z.string(),
  status: z.enum(['queued', 'running', 'succeeded', 'failed', 'cancelled']),
  content: z
    .object({
      video_url: z.string(),
      last_frame_url: z.string().optional()
    })
    .optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string()
    })
    .optional(),
  created_at: z.number(),
  updated_at: z.number(),
  seed: z.number().optional(),
  resolution: z.string().optional(),
  ratio: z.string().optional(),
  duration: z.number().optional(),
  frames: z.number().optional(),
  framespersecond: z.number().optional(),
  usage: z
    .object({
      completion_tokens: z.number(),
      total_tokens: z.number()
    })
    .optional()
})

export type VideoGenerationQueryResponse = z.infer<typeof VideoGenerationQueryResponseSchema>

/**
 * Error response format
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
 */
export async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  console.log('[FangzhouVideoAPI] Fetching image for base64 conversion', { imageUrl })

  try {
    const response = await fetch(imageUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const dataUri = `data:${contentType};base64,${base64}`

    console.log('[FangzhouVideoAPI] Image converted to base64', {
      imageUrl,
      contentType,
      base64Length: base64.length
    })

    return dataUri
  } catch (error: any) {
    console.error('[FangzhouVideoAPI] Failed to fetch and convert image', {
      imageUrl,
      error: error.message
    })
    throw error
  }
}

/**
 * Create video generation task
 *
 * Returns raw API response - NO transformation
 */
export async function createVideoGenerationTask(
  params: VideoGenerationParams,
  config: FangzhouApiConfig
): Promise<VideoGenerationCreateResponse> {
  const apiKey = config.apiKey
  const baseUrl = config.baseUrl
  const defaultModel = config.model

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API key is required in config')
  }

  if (!baseUrl || !defaultModel) {
    throw new Error('All API configuration fields are required in config')
  }

  const requestBody = {
    ...params,
    model: params.model || defaultModel
  }

  console.log('[FangzhouVideoAPI] Creating video generation task', {
    baseUrl,
    model: requestBody.model,
    contentCount: requestBody.content?.length || 0
  })

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: VideoGenerationErrorResponse | null = null

      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = {
          error: {
            code: `http_${response.status}`,
            message: errorText || response.statusText,
            type: 'http_error'
          }
        }
      }

      console.error('[FangzhouVideoAPI] Create task failed', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      })

      throw new Error(
        `Create task failed: ${response.status} ${response.statusText} - ${errorData?.error?.message || errorText}`
      )
    }

    const rawData = await response.json()
    const data = VideoGenerationCreateResponseSchema.parse(rawData)

    console.log('[FangzhouVideoAPI] Video generation task created', {
      taskId: data.id
    })

    return data
  } catch (error: any) {
    console.error('[FangzhouVideoAPI] Exception during create task', {
      error: error.message,
      stack: error.stack
    })
    throw error
  }
}

/**
 * Query video generation task status
 *
 * Returns raw API response - NO transformation
 */
export async function queryVideoGenerationTask(
  taskId: string,
  config: FangzhouApiConfig
): Promise<VideoGenerationQueryResponse> {
  const apiKey = config.apiKey
  const baseUrl = config.baseUrl

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API key is required')
  }

  const url = `${baseUrl}/${taskId}`

  console.log('[FangzhouVideoAPI] Querying video generation task', {
    taskId,
    url
  })

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: VideoGenerationErrorResponse | null = null

      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = {
          error: {
            code: `http_${response.status}`,
            message: errorText || response.statusText,
            type: 'http_error'
          }
        }
      }

      console.error('[FangzhouVideoAPI] Query task failed', {
        taskId,
        status: response.status,
        statusText: response.statusText,
        error: errorData
      })

      throw new Error(
        `Query task failed: ${response.status} ${response.statusText} - ${errorData?.error?.message || errorText}`
      )
    }

    const rawData = await response.json()
    const data = VideoGenerationQueryResponseSchema.parse(rawData)

    console.log('[FangzhouVideoAPI] Video generation task status retrieved', {
      taskId: data.id,
      status: data.status,
      hasVideoUrl: !!data.content?.video_url
    })

    return data
  } catch (error: any) {
    console.error('[FangzhouVideoAPI] Exception during query task', {
      taskId,
      error: error.message,
      stack: error.stack
    })
    throw error
  }
}
