/**
 * Fangzhou Video Generation Activities
 *
 * Activities handle side-effectful operations:
 * 1. Create video generation task via external API
 * 2. Poll external API for video generation status
 * 3. Report result back to main component via callback API
 *
 * All external API calls are now centralized in activities,
 * making the integration cleaner (only communicates with Temporal).
 */

import {
  createVideoGenerationTask,
  queryVideoGenerationTask,
  fetchImageAsBase64,
  type FangzhouApiConfig,
  type VideoGenerationParams
} from '../externalApi.js'

// ============================================
// Activity: Create Video Generation Task
// ============================================

/**
 * Create video task parameters
 * Contains the user's request params that will be sent to external API
 */
export type CreateVideoTaskParams = {
  // Request parameters from APICall entity
  requestParams: {
    firstFrameImageUrl?: string
    prompt?: string
    frames?: number
  }
  // API configuration
  apiKey: string
  baseUrl: string
  model: string
}

/**
 * Create video task result
 */
export type CreateVideoTaskResult = {
  success: boolean
  taskId?: string
  error?: string
}

/**
 * Activity: Create video generation task via external API
 *
 * This activity handles:
 * 1. Fetch and convert image to base64 (if provided)
 * 2. Build content array for API request
 * 3. Call external API to create video generation task
 */
export async function createVideoTask(params: CreateVideoTaskParams): Promise<CreateVideoTaskResult> {
  console.log('[Activity:createVideoTask] Creating video generation task', {
    hasImageUrl: !!params.requestParams.firstFrameImageUrl,
    hasPrompt: !!params.requestParams.prompt,
    hasFrames: !!params.requestParams.frames
  })

  try {
    const apiConfig: FangzhouApiConfig = {
      apiKey: params.apiKey,
      baseUrl: params.baseUrl,
      model: params.model
    }

    // Build content array for API request
    const content: VideoGenerationParams['content'] = []

    // Add first frame image (convert to base64 first)
    if (params.requestParams.firstFrameImageUrl) {
      console.log('[Activity:createVideoTask] Fetching image for base64 conversion', {
        imageUrl: params.requestParams.firstFrameImageUrl
      })

      const imageBase64 = await fetchImageAsBase64(params.requestParams.firstFrameImageUrl)

      console.log('[Activity:createVideoTask] Image converted to base64', {
        base64Length: imageBase64.length
      })

      content.push({
        type: 'image_url',
        image_url: {
          url: imageBase64
        },
        role: 'first_frame'
      })
    }

    // Add text prompt with frames parameter if provided
    if (params.requestParams.prompt || params.requestParams.frames) {
      let textContent = params.requestParams.prompt ? params.requestParams.prompt : ''
      if (params.requestParams.frames) {
        textContent = textContent ? `${textContent} --frames ${params.requestParams.frames}` : `--frames ${params.requestParams.frames}`
      }
      if (textContent) {
        content.push({
          type: 'text',
          text: textContent
        })
      }
    }

    // Call external API to create task
    const createResponse = await createVideoGenerationTask(
      {
        model: params.model,
        content: content
      },
      apiConfig
    )

    console.log('[Activity:createVideoTask] Task created successfully', {
      taskId: createResponse.id
    })

    return {
      success: true,
      taskId: createResponse.id
    }
  } catch (error: any) {
    console.error('[Activity:createVideoTask] Failed to create task', {
      error: error.message
    })

    return {
      success: false,
      error: error.message
    }
  }
}

// ============================================
// Activity: Poll Video Status
// ============================================

/**
 * Poll video status parameters
 */
export type PollVideoStatusParams = {
  taskId: string
  apiKey: string
  baseUrl: string
  model: string
}

/**
 * Poll video status result
 * Maps external status to internal representation
 */
export type PollVideoStatusResult = {
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
  videoUrl?: string
  error?: string
}

/**
 * Activity: Poll external API for video generation status
 */
export async function pollVideoStatus(params: PollVideoStatusParams): Promise<PollVideoStatusResult> {
  console.log('[Activity:pollVideoStatus] Polling video status', {
    taskId: params.taskId
  })

  try {
    const apiConfig: FangzhouApiConfig = {
      apiKey: params.apiKey,
      baseUrl: params.baseUrl,
      model: params.model
    }

    const response = await queryVideoGenerationTask(params.taskId, apiConfig)

    console.log('[Activity:pollVideoStatus] Status retrieved', {
      taskId: params.taskId,
      status: response.status,
      hasVideoUrl: !!response.content?.video_url
    })

    return {
      status: response.status,
      videoUrl: response.content?.video_url,
      error: response.error?.message
    }
  } catch (error: any) {
    console.error('[Activity:pollVideoStatus] Failed to poll status', {
      taskId: params.taskId,
      error: error.message
    })

    // Return error as failed status
    return {
      status: 'failed',
      error: error.message
    }
  }
}

// ============================================
// Activity: Report Status to Main Component
// ============================================

/**
 * Report to main parameters
 * 
 * Status values:
 * - 'queued': First event when worker picks up task (requires apiCallId, no taskId yet)
 * - 'processing': After external API call returns taskId (requires apiCallId + taskId for debugging)
 * - 'completed': Task completed successfully (requires apiCallId, includes videoUrl)
 * - 'failed': Task failed (requires apiCallId, includes error message)
 * 
 * ALL events MUST have apiCallId (entityId) for state machine matching.
 */
export type ReportToMainParams = {
  callbackUrl: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  // APICall entity ID (required for ALL events for state machine matching)
  apiCallId: string
  // External task ID from Fangzhou API (externalId, optional - included in 'processing' event for debugging)
  taskId?: string
  videoUrl?: string
  error?: string
}

/**
 * Report to main response
 */
export type ReportToMainResponse = {
  success: boolean
  message?: string
  error?: string
}

/**
 * Activity: Report status to main component via callback API
 *
 * This activity is called by the workflow to notify the main component:
 * - After workflow is picked up: status='queued' with apiCallId
 * - After external API call: status='processing' with apiCallId and taskId
 * - After task completion: status='completed' or 'failed' with apiCallId
 * 
 * ALL events MUST have apiCallId (entityId) for state machine matching.
 */
export async function reportToMain(params: ReportToMainParams): Promise<ReportToMainResponse> {
  console.log('[Activity:reportToMain] Reporting to main component', {
    callbackUrl: params.callbackUrl,
    status: params.status,
    apiCallId: params.apiCallId,
    taskId: params.taskId,
    hasVideoUrl: !!params.videoUrl,
    hasError: !!params.error
  })

  try {
    // Build request body - apiCallId is always required for state machine matching
    const requestBody: Record<string, any> = {
      apiCallId: params.apiCallId,
      status: params.status
    }

    // Include taskId for 'processing' status (externalId for debugging)
    if (params.taskId) {
      requestBody.taskId = params.taskId
    }

    if (params.videoUrl) {
      requestBody.videoUrl = params.videoUrl
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
      apiCallId: params.apiCallId,
      result
    })

    return {
      success: true,
      message: result.message || 'Status reported successfully'
    }
  } catch (error: any) {
    console.error('[Activity:reportToMain] Failed to report status', {
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
