/**
 * Example ObjectStorage Integration Zod Schemas
 * 
 * Defines request/response schemas for object storage APIs
 */

import { z } from 'zod'

// ============================================
// GetUploadUrl API Schemas
// ============================================

export const GetUploadUrlRequestSchema = z.object({
  fileName: z.string().min(1, 'fileName is required'),
  contentType: z.string().optional(),
  expiresIn: z.number().positive().optional()
})

export const GetUploadUrlResponseSchema = z.object({
  success: z.boolean(),
  uploadUrl: z.string(),
  objectKey: z.string(),
  downloadUrl: z.string(),
  expiresAt: z.number()
})

// ============================================
// Type Exports
// ============================================

export type GetUploadUrlRequest = z.infer<typeof GetUploadUrlRequestSchema>
export type GetUploadUrlResponse = z.infer<typeof GetUploadUrlResponseSchema>

