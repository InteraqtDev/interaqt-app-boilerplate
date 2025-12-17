/**
 * Example Centrifugo Integration Zod Schemas
 * 
 * Defines request/response schemas for Centrifugo APIs
 */

import { z } from 'zod'

// ============================================
// Generate Connection Token API Schemas
// ============================================

export const GenerateConnectionTokenRequestSchema = z.object({})

export const GenerateConnectionTokenResponseSchema = z.object({
  token: z.string()
})

// ============================================
// Generate Channel Subscription Token API Schemas
// ============================================

export const GenerateChannelSubscriptionTokenRequestSchema = z.object({
  chatRoomId: z.string().min(1, 'chatRoomId is required')
})

export const GenerateChannelSubscriptionTokenResponseSchema = z.object({
  token: z.string(),
  channel: z.string()
})

// ============================================
// Type Exports
// ============================================

export type GenerateConnectionTokenRequest = z.infer<typeof GenerateConnectionTokenRequestSchema>
export type GenerateConnectionTokenResponse = z.infer<typeof GenerateConnectionTokenResponseSchema>
export type GenerateChannelSubscriptionTokenRequest = z.infer<typeof GenerateChannelSubscriptionTokenRequestSchema>
export type GenerateChannelSubscriptionTokenResponse = z.infer<typeof GenerateChannelSubscriptionTokenResponseSchema>

