/**
 * Test script to verify bucket auto-creation functionality
 */

import { ensureBucketExists } from '../integrations/objectstorage/s3Api'

async function testBucketCreation() {
  console.log('Testing bucket auto-creation...\n')
  
  const config = {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
    region: 'cn-beijing',
    endpoint: 'http://localhost:9000',
    bucket: 'test-bucket-' + Date.now(),
    forcePathStyle: true
  }
  
  try {
    console.log(`Creating test bucket: ${config.bucket}`)
    const result = await ensureBucketExists(config)
    
    if (result) {
      console.log('✅ Bucket creation test passed')
      
      // Test idempotency - calling again should succeed
      console.log('\nTesting idempotency...')
      const result2 = await ensureBucketExists(config)
      if (result2) {
        console.log('✅ Idempotency test passed')
      } else {
        console.log('❌ Idempotency test failed')
      }
    } else {
      console.log('❌ Bucket creation test failed')
    }
  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

testBucketCreation()

