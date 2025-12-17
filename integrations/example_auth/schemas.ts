/**
 * Example Auth Integration Zod Schemas
 * 
 * Defines request/response schemas for authentication APIs
 */

import { z } from 'zod'

// ============================================
// Register API Schemas
// ============================================

export const RegisterRequestSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

export const RegisterResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  userId: z.string()
})

// ============================================
// Login API Schemas
// ============================================

export const LoginRequestSchema = z.object({
  identifier: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required')
})

export const LoginResponseSchema = z.object({
  token: z.string(),
  storageType: z.enum(['cookie', 'header']).optional(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    email: z.string(),
    name: z.string().optional()
  }).passthrough()
})

// ============================================
// Type Exports
// ============================================

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>
export type LoginRequest = z.infer<typeof LoginRequestSchema>
export type LoginResponse = z.infer<typeof LoginResponseSchema>

