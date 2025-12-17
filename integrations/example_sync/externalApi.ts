/**
 * Nanobanana2 Image Generation API wrapper
 *
 * Using nano banana 2 API (via litellm) for AI image generation
 *
 * CRITICAL: This file returns raw API responses with strict types.
 * NO data transformation - integration file handles that.
 */

import { z } from 'zod'

export type Nanobanana2ApiConfig = {
  apiKey: string
  baseUrl: string
  model: string
}

/**
 * Request parameters for image generation
 */
export type ImageGenerationParams = {
  model: string // Model name
  prompt: string // Text description guiding generation
  image: string | string[] // Input image URLs or base64 data
}

/**
 * Response data format
 */
export type ImageGenerationResponse = {
  model: string
  created: number
  data: Array<{
    url: string // Generated image URL or base64 data URI
    size: string
  }>
  usage: {
    generated_images: number
    output_tokens: number
    total_tokens: number
  }
}

/**
 * Error response format
 */
export type ImageGenerationErrorResponse = {
  error: {
    code: string
    message: string
    type: string
  }
}

/**
 * Zod schema for nano banana 2 API response validation
 */
const NanoBanana2ResponseSchema = z.object({
  id: z.string(),
  object: z.string(),
  created: z.number(),
  model: z.string(),
  choices: z.array(
    z.object({
      index: z.number(),
      message: z.object({
        role: z.string(),
        content: z.string().nullable().optional(),
        images: z
          .array(
            z.object({
              image_url: z.union([z.string(), z.object({ url: z.string(), detail: z.string().optional() })]),
              type: z.string().optional(),
              index: z.number().optional()
            })
          )
          .optional()
      }),
      finish_reason: z.string()
    })
  ),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      total_tokens: z.number()
    })
    .optional()
})

type NanoBanana2Response = z.infer<typeof NanoBanana2ResponseSchema>

/**
 * Fetch image from URL and convert to base64 data URI
 */
export async function fetchImageAsBase64(imageUrl: string): Promise<string> {
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

    return dataUri
  } catch (error: any) {
    console.error('[Nanobanana2API] Failed to fetch and convert image', {
      imageUrl,
      error: error.message
    })
    throw error
  }
}

/**
 * Extract image size from base64 data URI (PNG only)
 */
function extractImageSize(dataUri: string): string {
  try {
    const base64Data = dataUri.split(',')[1]
    if (!base64Data) return '1024x1024'

    const buffer = Buffer.from(base64Data, 'base64')

    // Check for PNG signature
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      const width = buffer.readUInt32BE(16)
      const height = buffer.readUInt32BE(20)
      return `${width}x${height}`
    }

    return '1024x1024'
  } catch {
    return '1024x1024'
  }
}

/**
 * Build multimodal content array for API
 */
function buildMultimodalContent(
  images: string | string[],
  prompt: string
): Array<{ type: string; image_url?: { url: string }; text?: string }> {
  const content: Array<{ type: string; image_url?: { url: string }; text?: string }> = []

  const imageArray = Array.isArray(images) ? images : [images]
  for (const image of imageArray) {
    content.push({
      type: 'image_url',
      image_url: { url: image }
    })
  }

  content.push({
    type: 'text',
    text: prompt
  })

  return content
}

/**
 * Call image generation API (nano banana 2 via litellm)
 *
 * Returns raw API response
 */
export async function callImageGenerationApi(
  params: ImageGenerationParams,
  config: Nanobanana2ApiConfig
): Promise<ImageGenerationResponse> {
  const apiKey = config.apiKey
  const baseUrl = config.baseUrl
  const defaultModel = config.model

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API key is required in config')
  }

  if (!baseUrl || !defaultModel) {
    throw new Error('All API configuration fields are required in config')
  }

  const model = params.model || defaultModel

  try {
    const requestBody = {
      model,
      messages: [
        {
          role: 'user',
          content: buildMultimodalContent(params.image, params.prompt)
        }
      ]
    }

    const apiEndpoint = baseUrl.endsWith('/') ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: ImageGenerationErrorResponse | null = null

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

      console.error('[Nanobanana2API] API call failed', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      })

      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorData?.error?.message || errorText}`)
    }

    const rawResponse = await response.json()
    const nanoBananaResponse = NanoBanana2ResponseSchema.parse(rawResponse)

    const images: Array<{ url: string; size: string }> = []

    for (const choice of nanoBananaResponse.choices) {
      const messageImages = choice.message?.images
      if (messageImages) {
        for (const img of messageImages) {
          let imageUrl = img.image_url
          if (typeof imageUrl === 'object' && imageUrl.url) {
            imageUrl = imageUrl.url
          }
          if (typeof imageUrl === 'string') {
            const size = extractImageSize(imageUrl)
            images.push({
              url: imageUrl,
              size
            })
          }
        }
      }
    }

    if (images.length === 0) {
      throw new Error('No images found in API response')
    }

    const transformedResponse: ImageGenerationResponse = {
      model: nanoBananaResponse.model,
      created: nanoBananaResponse.created,
      data: images,
      usage: {
        generated_images: images.length,
        output_tokens: nanoBananaResponse.usage?.completion_tokens || 0,
        total_tokens: nanoBananaResponse.usage?.total_tokens || 0
      }
    }

    return transformedResponse
  } catch (error: any) {
    console.error('[Nanobanana2API] Exception during API call', {
      error: error.message,
      stack: error.stack
    })
    throw error
  }
}
