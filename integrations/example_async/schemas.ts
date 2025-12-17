/**
 * Fangzhou Video Generation Integration Zod Schemas
 *
 * Defines request/response schemas for video generation APIs:
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
 * Called by Temporal workflow to report task status changes
 * 
 * Status values:
 * - queued: Task picked up by worker (entityId only, no externalId yet)
 * - processing: External API task created (entityId + externalId)
 * - completed: Task succeeded, videoUrl available (entityId only)
 * - failed: Task failed, error message available (entityId only)
 * 
 * ALL events MUST have apiCallId (entityId) for state machine matching.
 * The taskId field is optional - used as externalId for debugging in 'processing' event.
 */
export const ReportResultRequestSchema = z.object({
  // APICall entity ID (required for ALL events for state machine matching)
  apiCallId: z.string().min(1, 'apiCallId is required'),
  // Task status: queued, processing, completed or failed
  status: z.enum(['queued', 'processing', 'completed', 'failed']),
  // External task ID from Fangzhou API (externalId, included in 'processing' event for debugging)
  taskId: z.string().optional(),
  // Video URL (when status is completed)
  videoUrl: z.string().optional(),
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
