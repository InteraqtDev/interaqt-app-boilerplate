/**
 * Nanobanana2 Image Generation Workflows
 *
 * Temporal Workflows orchestrate image generation task flow
 *
 * Workflow features:
 * 1. Durable - workflow can resume from checkpoint after process restart
 * 2. Retriable - activities are automatically retried on failure
 * 3. Queryable - workflow status can be queried at any time
 */

import { proxyActivities } from '@temporalio/workflow'
import type * as activities from '../activities/index.js'

// Proxy activities - allows calling them from workflow
const { generateAndUploadImage, reportToMain } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes', // Image generation + upload may take time
  retry: {
    maximumAttempts: 3,
    initialInterval: '5 seconds',
    maximumInterval: '1 minute',
    backoffCoefficient: 2
  }
})

/**
 * Image Generation Workflow Parameters
 * 
 * Changed for Task 6: Added apiCallId for processing status callback
 */
export type ImageGenerationWorkflowParams = {
  // Workflow identification (for callback)
  workflowId: string
  // APICall entity ID (for reference in events)
  apiCallId: string
  // Callback URL for reporting result to main component
  callbackUrl: string
  // Request parameters
  prompt: string
  referenceImageUrl: string
  // API config
  apiKey: string
  baseUrl: string
  model: string
  // Storage config
  storage: {
    accessKeyId: string
    secretAccessKey: string
    region: string
    endpoint: string
    publicEndpoint: string // 用于生成公开访问的下载 URL
    bucket: string
    forcePathStyle?: boolean
  }
  objectKeyPrefix: string
}

/**
 * Image Generation Workflow Result
 */
export type ImageGenerationWorkflowResult = {
  success: boolean
  status: 'completed' | 'failed'
  imageUrls?: string[]
  error?: string
  completedAt: number
}

/**
 * Image Generation Workflow
 *
 * This workflow encapsulates the full image generation flow:
 * 1. Report 'processing' status to main component (before calling external API)
 * 2. Call nanobanana2 API to generate images
 * 3. Upload generated images to Object Storage
 * 4. Report result back to main component via callback API
 * 
 * NOTE: 'queued' status is reported by TaskProcessor BEFORE starting workflow.
 * This is the Pull Mode architecture - TaskProcessor owns the queued transition.
 */
export async function imageGenerationWorkflow(
  params: ImageGenerationWorkflowParams
): Promise<ImageGenerationWorkflowResult> {
  console.log('[Workflow:imageGenerationWorkflow] Starting', {
    workflowId: params.workflowId,
    apiCallId: params.apiCallId,
    prompt: params.prompt.substring(0, 50) + '...',
    hasReferenceImage: !!params.referenceImageUrl
  })

  // ============================================
  // NOTE: 'queued' status is reported by TaskProcessor BEFORE starting workflow
  // ============================================

  // ============================================
  // Step 1: Report 'processing' status before calling external API
  // For sync APIs, externalId is the apiCallId itself (for debugging)
  // ============================================
  console.log('[Workflow:imageGenerationWorkflow] Reporting processing status', {
    workflowId: params.workflowId,
    apiCallId: params.apiCallId
  })

  await reportToMain({
    workflowId: params.workflowId,
    callbackUrl: params.callbackUrl,
    status: 'processing',
    apiCallId: params.apiCallId,
    externalId: params.apiCallId // For sync APIs, use apiCallId as externalId for debugging
  })

  console.log('[Workflow:imageGenerationWorkflow] Processing status reported', {
    workflowId: params.workflowId,
    apiCallId: params.apiCallId
  })

  // ============================================
  // Step 2 & 3: Call API and upload images
  // ============================================
  try {
    // Call activity to execute full generation + upload flow
    const result = await generateAndUploadImage({
      prompt: params.prompt,
      referenceImageUrl: params.referenceImageUrl,
      apiKey: params.apiKey,
      baseUrl: params.baseUrl,
      model: params.model,
      storage: params.storage,
      objectKeyPrefix: params.objectKeyPrefix
    })

    if (result.success) {
      console.log('[Workflow:imageGenerationWorkflow] Completed successfully', {
        workflowId: params.workflowId,
        apiCallId: params.apiCallId,
        imageUrls: result.imageUrls
      })

      // Report success result to main component (with apiCallId for state machine matching)
      await reportToMain({
        workflowId: params.workflowId,
        callbackUrl: params.callbackUrl,
        status: 'completed',
        apiCallId: params.apiCallId,
        imageUrls: result.imageUrls
      })

      return {
        success: true,
        status: 'completed',
        imageUrls: result.imageUrls,
        completedAt: Date.now()
      }
    } else {
      console.error('[Workflow:imageGenerationWorkflow] Activity returned failure', {
        workflowId: params.workflowId,
        apiCallId: params.apiCallId,
        error: result.error
      })

      // Report failure result to main component (with apiCallId for state machine matching)
      await reportToMain({
        workflowId: params.workflowId,
        callbackUrl: params.callbackUrl,
        status: 'failed',
        apiCallId: params.apiCallId,
        error: result.error
      })

      return {
        success: false,
        status: 'failed',
        error: result.error,
        completedAt: Date.now()
      }
    }
  } catch (error: any) {
    console.error('[Workflow:imageGenerationWorkflow] Workflow failed', {
      workflowId: params.workflowId,
      apiCallId: params.apiCallId,
      error: error.message
    })

    // Report failure result to main component (with apiCallId for state machine matching)
    await reportToMain({
      workflowId: params.workflowId,
      callbackUrl: params.callbackUrl,
      status: 'failed',
      apiCallId: params.apiCallId,
      error: error.message
    })

    return {
      success: false,
      status: 'failed',
      error: error.message,
      completedAt: Date.now()
    }
  }
}
