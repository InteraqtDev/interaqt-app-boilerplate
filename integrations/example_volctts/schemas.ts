/**
 * Example Volcengine TTS Integration Zod Schemas
 * 
 * Defines request/response schemas for TTS status query API
 */

import { z } from 'zod'

// ============================================
// Query Status API Schemas
// ============================================

export const QueryStatusRequestSchema = z.object({
  volcTTSCallId: z.string().min(1, 'volcTTSCallId is required')
})

export const QueryStatusResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  apiCall: z.object({
    id: z.string(),
    status: z.string(),
    externalId: z.string().optional(),
    responseData: z.any().optional(),
    error: z.any().optional(),
    completedAt: z.number().optional()
  }).optional()
})

// ============================================
// Type Exports
// ============================================

export type QueryStatusRequest = z.infer<typeof QueryStatusRequestSchema>
export type QueryStatusResponse = z.infer<typeof QueryStatusResponseSchema>

