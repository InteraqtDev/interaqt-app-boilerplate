/**
 * Nanobanana2 Image Generation Integration Zod Schemas
 *
 * Defines request/response schemas for image generation APIs:
 * - Status query API
 * - Result callback API (called by Temporal workflow)
 */

import { z } from 'zod'

// ============================================
// Query Status API Schemas
// ============================================

export const QueryStatusRequestSchema = z.object({
  apiCallId: z.string().min(1, 'apiCallId is required')
})

export const QueryStatusResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional()
})

// ============================================
// Report Result Callback API Schemas
// ============================================

/**
 * Request schema for result callback API
 * Called by Temporal workflow or TaskProcessor to report task status:
 * - 'queued': First event when task is picked up by TaskProcessor (apiCallId only, no workflowId yet)
 * - 'processing': When external API call starts (apiCallId + workflowId + externalId)
 * - 'completed': Task completed successfully (apiCallId + workflowId)
 * - 'failed': Task failed (apiCallId, workflowId optional)
 * 
 * ALL events MUST have apiCallId (entityId) for state machine matching.
 * Note: 'queued' is reported by TaskProcessor before workflow starts, so workflowId is optional.
 */
export const ReportResultRequestSchema = z.object({
  // Workflow ID for tracing (optional for 'queued' status from TaskProcessor)
  workflowId: z.string().optional(),
  // Task status: queued, processing, completed or failed
  status: z.enum(['queued', 'processing', 'completed', 'failed']),
  // APICall entity ID (required for ALL events for state machine matching)
  apiCallId: z.string().min(1, 'apiCallId is required'),
  // External ID for debugging (optional, included in 'processing' event)
  externalId: z.string().optional(),
  // Image URLs (when status is completed)
  imageUrls: z.array(z.string()).optional(),
  // Error message (when status is failed)
  error: z.string().optional()
})

export const ReportResultResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional()
})

// ============================================
// Type Exports
// ============================================

export type QueryStatusRequest = z.infer<typeof QueryStatusRequestSchema>
export type QueryStatusResponse = z.infer<typeof QueryStatusResponseSchema>
export type ReportResultRequest = z.infer<typeof ReportResultRequestSchema>
export type ReportResultResponse = z.infer<typeof ReportResultResponseSchema>
