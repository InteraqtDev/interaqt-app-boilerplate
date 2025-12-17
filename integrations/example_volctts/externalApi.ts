/**
 * External API wrapper for Volcengine Doubao TTS (Text-to-Speech)
 *
 * CRITICAL: This file returns raw API responses with strict types.
 * NO data transformation - integration file handles that.
 */

import { z } from 'zod'

export type ExternalApiConfig = {
  appId: string
  accessToken: string
  resourceId: string
  apiEndpoint: string
}

/**
 * TTS request parameters - MUST match Volcengine TTS API documentation
 */
export type TTSRequestParams = {
  user?: {
    uid: string                     // User ID (optional)
  }
  req_params: {
    text: string                    // Text to synthesize (required)
    speaker: string                 // Speaker voice ID (required)
    audio_params: {                 // Audio configuration (required)
      format: 'mp3' | 'ogg_opus' | 'pcm'  // Audio format (default: mp3)
      sample_rate: number           // 8000-48000 (default: 24000)
      bit_rate?: number             // Bitrate for MP3 format
      speech_rate?: number          // Speed: -50 to 100 (default: 0)
      loudness_rate?: number        // Volume: -50 to 100 (default: 0)
      emotion?: string              // Emotion for supported speakers
      emotion_scale?: number        // Emotion intensity: 1-5 (default: 4)
    }
    additions?: {
      silence_duration?: number     // Add silence at end: 0-30000ms
      enable_language_detector?: boolean
      disable_markdown_filter?: boolean
      disable_emoji_filter?: boolean
      explicit_language?: string    // Language hint (zh-cn, en, ja, etc.)
      aigc_watermark?: boolean      // Add audio watermark (default: false)
    }
  }
}

/**
 * Zod schema for TTS streaming response chunk validation
 */
const TTSStreamChunkSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.string().nullable()
})

/**
 * TTS streaming response chunk - MUST match Volcengine TTS API response
 */
export type TTSStreamChunk = z.infer<typeof TTSStreamChunkSchema>

/**
 * TTS complete audio result
 */
export type TTSAudioResult = {
  audioData: Buffer                 // Complete audio file as buffer
  format: string                    // Audio format (mp3, ogg_opus, pcm)
  chunks: number                    // Number of chunks received
}

/**
 * Call TTS Unidirectional Streaming API
 *
 * Returns complete audio result - NO transformation to internal event format.
 * This is a SYNCHRONOUS streaming API that returns audio immediately.
 *
 * @param params - TTS request parameters
 * @param config - API configuration
 * @returns Complete audio result with buffer
 * @throws Error if API call fails
 */
export async function callTTSApi(
  params: TTSRequestParams,
  config: ExternalApiConfig
): Promise<TTSAudioResult> {
  const appId = config.appId
  const accessToken = config.accessToken
  const resourceId = config.resourceId
  const apiEndpoint = config.apiEndpoint

  if (!appId || !accessToken || !resourceId || !apiEndpoint) {
    throw new Error('All API configuration fields are required in config')
  }

  const requestId = generateRequestId()

  console.log('[VolcTTS] Calling TTS API', {
    endpoint: apiEndpoint,
    requestId,
    text: params.req_params.text.substring(0, 50) + '...',
    speaker: params.req_params.speaker,
    format: params.req_params.audio_params.format
  })

  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'X-Api-App-Id': appId,
        'X-Api-Access-Key': accessToken,
        'X-Api-Resource-Id': resourceId,
        'X-Api-Request-Id': requestId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    // Process streaming response
    const audioChunks: Buffer[] = []
    let chunkCount = 0
    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true })

      // Process complete JSON lines
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue

        try {
          const chunk = TTSStreamChunkSchema.parse(JSON.parse(line))

          // Check for errors
          if (chunk.code !== 0 && chunk.code !== 20000000) {
            throw new Error(`TTS API error ${chunk.code}: ${chunk.message}`)
          }

          // Audio data chunk (code=0)
          if (chunk.code === 0 && chunk.data) {
            const audioBuffer = Buffer.from(chunk.data, 'base64')
            audioChunks.push(audioBuffer)
            chunkCount++
          }

          // Final success response (code=20000000)
          if (chunk.code === 20000000) {
            console.log('[VolcTTS] TTS API completed successfully', {
              requestId,
              chunks: chunkCount,
              totalSize: audioChunks.reduce((sum, buf) => sum + buf.length, 0)
            })
          }
        } catch (error: any) {
          console.error('[VolcTTS] Failed to parse JSON chunk:', line.substring(0, 100))
          throw new Error(`Failed to parse streaming response: ${error.message}`)
        }
      }
    }

    // Process any remaining data in buffer
    if (buffer.trim()) {
      try {
        const chunk = TTSStreamChunkSchema.parse(JSON.parse(buffer))
        if (chunk.code === 0 && chunk.data) {
          const audioBuffer = Buffer.from(chunk.data, 'base64')
          audioChunks.push(audioBuffer)
          chunkCount++
        }
      } catch (error) {
        // Ignore parse errors for final buffer
      }
    }

    // Concatenate all audio chunks
    if (audioChunks.length === 0) {
      throw new Error('No audio data received from TTS API')
    }

    const completeAudio = Buffer.concat(audioChunks)

    return {
      audioData: completeAudio,
      format: params.req_params.audio_params.format,
      chunks: chunkCount
    }
  } catch (error: any) {
    console.error('[VolcTTS] TTS API call failed', {
      requestId,
      error: error.message
    })
    throw error
  }
}

/**
 * Generate unique request ID for tracking
 */
function generateRequestId(): string {
  return `tts-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}
