/**
 * Example Sora2 Video Generation Integration Zod Schemas
 * 
 * Defines request/response schemas for video generation status query API
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
// Type Exports
// ============================================

export type QueryStatusRequest = z.infer<typeof QueryStatusRequestSchema>
export type QueryStatusResponse = z.infer<typeof QueryStatusResponseSchema>

