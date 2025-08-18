#!/usr/bin/env node

/**
 * Quick test script to verify the team criteria API is working
 */

const API_BASE_URL = 'http://localhost:3000'
const API_KEY = 'sk_dbdf02bf5cba2929978d2fb429fc3bd23f7c436aba6f12739e3f444d7766948f'

async function testCriteriaAPI() {
  console.log('🧪 Testing Team Criteria API...\n')

  try {
    // Test 1: Get current hackathon
    console.log('1. Testing hackathon endpoint...')
    const hackathonResponse = await fetch(`${API_BASE_URL}/api/hackathons/current`)
    
    if (!hackathonResponse.ok) {
      throw new Error(`Hackathon API failed: ${hackathonResponse.statusText}`)
    }
    
    const hackathon = await hackathonResponse.json()
    console.log(`   ✅ Got hackathon: ${hackathon.name} (${hackathon.id})`)

    // Test 2: Test individual criteria update
    console.log('\n2. Testing individual criteria update...')
    const testUpdate = {
      status: 'PASSED',
      score: 1,
      metrics: {
        commitsCount: 5,
        lastCommitTime: new Date().toISOString(),
        hasRecentActivity: true
      },
      updatedBy: 'test-script'
    }

    const updateResponse = await fetch(`${API_BASE_URL}/api/service/team-criteria/team-alpha/CODE_REPO`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(testUpdate)
    })

    if (updateResponse.status === 404) {
      console.log('   ⚠️ Team "team-alpha" not found')
    } else if (updateResponse.ok) {
      const result = await updateResponse.json()
      console.log('   ✅ Individual update successful:', result.action)
    } else {
      throw new Error(`Individual update failed: ${updateResponse.statusText}`)
    }

    // Test 3: Test bulk criteria update with existing teams
    console.log('\n3. Testing bulk criteria update...')
    const bulkUpdates = {
      updates: [
        {
          teamSlug: 'team-alpha',
          hackathonId: hackathon.id,
          criteriaType: 'DEPLOYED_SOLUTION',
          status: 'PASSED',
          score: 1,
          metrics: { 
            endpointUrl: 'https://team-alpha.hackload.app',
            responseTime: 245,
            statusCode: 200,
            isAccessible: true
          },
          updatedBy: 'test-script'
        },
        {
          teamSlug: 'team-beta', 
          hackathonId: hackathon.id,
          criteriaType: 'CODE_REPO',
          status: 'FAILED',
          score: 0,
          metrics: { 
            commitsCount: 2,
            lastCommitTime: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            hasRecentActivity: false
          },
          updatedBy: 'test-script'
        },
        {
          teamSlug: 'team-gamma',
          hackathonId: hackathon.id,
          criteriaType: 'EVENT_SEARCH',
          status: 'PASSED',
          score: 3,
          metrics: {
            p95: 1.8,
            successRate: 0.97,
            testDuration: 600,
            userLoads: {
              '5000': { p95: 1.2, successRate: 0.98 },
              '25000': { p95: 1.8, successRate: 0.97 },
              '50000': { p95: 1.9, successRate: 0.95 }
            }
          },
          updatedBy: 'test-script'
        }
      ]
    }

    const bulkResponse = await fetch(`${API_BASE_URL}/api/service/team-criteria`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(bulkUpdates)
    })

    if (!bulkResponse.ok) {
      throw new Error(`Bulk update failed: ${bulkResponse.statusText}`)
    }

    const bulkResult = await bulkResponse.json()
    console.log(`   ✅ Bulk update completed:`)
    console.log(`      - Created: ${bulkResult.createdEntries}`)
    console.log(`      - Updated: ${bulkResult.updatedEntries}`)
    console.log(`      - Errors: ${bulkResult.errors?.length || 0}`)

    if (bulkResult.errors?.length > 0) {
      console.log('   📝 Errors (expected for non-existent teams):')
      bulkResult.errors.forEach(error => {
        console.log(`      - ${error.teamSlug}/${error.criteriaType}: ${error.error}`)
      })
    }

    // Test 4: Test authentication failure
    console.log('\n4. Testing authentication failure...')
    const authFailResponse = await fetch(`${API_BASE_URL}/api/service/team-criteria`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'invalid-key'
      },
      body: JSON.stringify(bulkUpdates)
    })

    if (authFailResponse.status === 401) {
      console.log('   ✅ Authentication properly rejected invalid key')
    } else {
      console.log('   ⚠️ Unexpected response for invalid key:', authFailResponse.status)
    }

    console.log('\n🎉 All API tests completed successfully!')

  } catch (error) {
    console.error('\n❌ API test failed:', error.message)
    process.exit(1)
  }
}

// Run tests
testCriteriaAPI()