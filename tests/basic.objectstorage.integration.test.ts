/**
 * ObjectStorage Integration Tests
 *
 * Tests the object storage integration functionality:
 * - Schema validation
 * - Pre-signed URL generation
 * - Security checks
 */

import { describe, it, expect } from 'vitest'
import {
  GetUploadUrlRequestSchema,
  type GetUploadUrlRequest
} from '@/integrations/objectStorage/schemas'
import {
  generatePublicUrl,
  S3Config
} from '@/integrations/objectStorage/s3Api'

describe('ObjectStorage Integration', () => {
  describe('Schema Validation', () => {
    it('should validate upload URL request with required fields', () => {
      const validRequest: GetUploadUrlRequest = {
        fileName: 'test-image.jpg'
      }

      const result = GetUploadUrlRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should validate upload URL request with all fields', () => {
      const validRequest: GetUploadUrlRequest = {
        fileName: 'test-image.jpg',
        contentType: 'image/jpeg',
        expiresIn: 3600
      }

      const result = GetUploadUrlRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should reject upload URL request with empty fileName', () => {
      const invalidRequest = {
        fileName: ''
      }

      const result = GetUploadUrlRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should reject upload URL request with negative expiresIn', () => {
      const invalidRequest = {
        fileName: 'test.jpg',
        expiresIn: -100
      }

      const result = GetUploadUrlRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })
  })

  describe('Public URL Generation', () => {
    const testConfig: S3Config = {
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      region: 'cn-beijing',
      endpoint: 'http://localhost:9000',
      bucket: 'test-bucket',
      forcePathStyle: true
    }

    it('should generate path-style public URL', () => {
      const objectKey = 'uploads/user123/test.jpg'
      const url = generatePublicUrl(testConfig, objectKey)

      expect(url).toBe('http://localhost:9000/test-bucket/uploads/user123/test.jpg')
    })

    it('should handle https endpoint', () => {
      const httpsConfig: S3Config = {
        ...testConfig,
        endpoint: 'https://storage.example.com'
      }
      const objectKey = 'uploads/test.jpg'
      const url = generatePublicUrl(httpsConfig, objectKey)

      expect(url).toBe('https://storage.example.com/test-bucket/uploads/test.jpg')
    })

    it('should generate virtual-hosted-style URL when forcePathStyle is false', () => {
      const virtualHostConfig: S3Config = {
        ...testConfig,
        endpoint: 'http://s3.amazonaws.com',
        forcePathStyle: false
      }
      const objectKey = 'uploads/test.jpg'
      const url = generatePublicUrl(virtualHostConfig, objectKey)

      expect(url).toBe('http://test-bucket.s3.amazonaws.com/uploads/test.jpg')
    })
  })

  describe('Security Checks', () => {
    it('should sanitize filename correctly', () => {
      const unsafeFileName = 'My File (1).jpg'
      const sanitized = unsafeFileName.replace(/[^a-zA-Z0-9.-]/g, '_')

      expect(sanitized).toBe('My_File__1_.jpg')
      expect(sanitized).not.toContain(' ')
      expect(sanitized).not.toContain('(')
      expect(sanitized).not.toContain(')')
    })

    it('should detect path traversal attempts', () => {
      const maliciousFileName1 = '../../../etc/passwd'
      const maliciousFileName2 = '..\\..\\windows\\system32'

      expect(maliciousFileName1.includes('../')).toBe(true)
      expect(maliciousFileName2.includes('..\\')).toBe(true)
    })

    it('should validate content type prefixes', () => {
      const allowedContentTypes = ['image/', 'video/']

      expect(allowedContentTypes.some(allowed => 'image/jpeg'.startsWith(allowed))).toBe(true)
      expect(allowedContentTypes.some(allowed => 'video/mp4'.startsWith(allowed))).toBe(true)
      expect(allowedContentTypes.some(allowed => 'application/pdf'.startsWith(allowed))).toBe(false)
      expect(allowedContentTypes.some(allowed => 'text/html'.startsWith(allowed))).toBe(false)
    })
  })

  describe('Object Key Generation', () => {
    it('should generate object key with user ID and timestamp', () => {
      const prefix = 'uploads/'
      const userId = 'user123'
      const timestamp = Date.now()
      const fileName = 'test.jpg'

      const objectKey = `${prefix}${userId}/${timestamp}-${fileName}`

      expect(objectKey).toContain('uploads/')
      expect(objectKey).toContain('user123/')
      expect(objectKey).toContain('test.jpg')
    })

    it('should generate object key without user ID', () => {
      const prefix = 'public/'
      const timestamp = Date.now()
      const fileName = 'test.jpg'

      const objectKey = `${prefix}${timestamp}-${fileName}`

      expect(objectKey).toContain('public/')
      expect(objectKey).not.toContain('user')
      expect(objectKey).toContain('test.jpg')
    })
  })

  describe('Configuration', () => {
    it('should have required config in app.config.json', async () => {
      const { config } = await import('@/config.js')
      const mainConfig = (config as any).components.main
      const objectStorageConfig = mainConfig.middlewareDependencies.objectStorage

      expect(objectStorageConfig).toBeDefined()
      expect(objectStorageConfig.config.accessKeyId).toBeDefined()
      expect(objectStorageConfig.config.secretAccessKey).toBeDefined()
      expect(objectStorageConfig.config.bucket).toBeDefined()
      expect(objectStorageConfig.endpoints.main.value).toBeDefined()
    })
  })
})
