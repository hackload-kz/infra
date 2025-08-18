#!/usr/bin/env tsx

import { db } from '../src/lib/db'
import { hashApiKey, generateApiKey, getKeyPrefix } from '../src/lib/service-keys'

async function createTestApiKey() {
  try {
    console.log('🔑 Creating test API key...')
    
    // Generate a new API key
    const apiKey = generateApiKey()
    const keyHash = await hashApiKey(apiKey)
    const keyPrefix = getKeyPrefix(apiKey)
    
    // Check if test key already exists
    const existingKey = await db.serviceApiKey.findFirst({
      where: { name: 'Test Key - Team Criteria' }
    })
    
    if (existingKey) {
      console.log('⚠️ Test API key already exists, deleting old one...')
      await db.serviceApiKey.delete({
        where: { id: existingKey.id }
      })
    }
    
    // Create new test API key
    const serviceKey = await db.serviceApiKey.create({
      data: {
        name: 'Test Key - Team Criteria',
        keyHash,
        keyPrefix,
        description: 'Test API key for team criteria updates and dashboard testing',
        permissions: ['environment:read', 'environment:write'],
        isActive: true,
        createdBy: 'admin-script'
      }
    })
    
    console.log('✅ Test API key created successfully!')
    console.log('\n📋 Details:')
    console.log(`   ID: ${serviceKey.id}`)
    console.log(`   Name: ${serviceKey.name}`)
    console.log(`   Prefix: ${keyPrefix}`)
    console.log(`   Permissions: ${serviceKey.permissions.join(', ')}`)
    
    console.log('\n🔐 API Key (save this securely):')
    console.log(`   ${apiKey}`)
    
    console.log('\n⚙️ Environment Variable:')
    console.log(`   NEXT_PUBLIC_TEST_API_KEY=${apiKey}`)
    
    console.log('\n📝 Usage Example:')
    console.log(`   curl -X PUT http://localhost:3000/api/service/team-criteria/team-slug/CODE_REPO \\`)
    console.log(`     -H "X-API-Key: ${apiKey}" \\`)
    console.log(`     -H "Content-Type: application/json" \\`)
    console.log(`     -d '{"status": "PASSED", "score": 1, "updatedBy": "test"}'`)
    
  } catch (error) {
    console.error('❌ Error creating test API key:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  createTestApiKey()
}

export { createTestApiKey }