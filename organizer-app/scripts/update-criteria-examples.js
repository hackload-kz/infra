#!/usr/bin/env node

/**
 * Example scripts showing how to update team criteria via API
 * These would typically be called by external monitoring services
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'
const SERVICE_TOKEN = process.env.SERVICE_API_KEY || 'your-service-token-here'

async function updateTeamCriteria(teamSlug, criteriaType, data) {
  const response = await fetch(`${API_BASE_URL}/api/service/team-criteria/${teamSlug}/${criteriaType}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': SERVICE_TOKEN
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    throw new Error(`Failed to update criteria: ${response.statusText}`)
  }

  return response.json()
}

async function bulkUpdateCriteria(updates) {
  const response = await fetch(`${API_BASE_URL}/api/service/team-criteria`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': SERVICE_TOKEN
    },
    body: JSON.stringify({ updates })
  })

  if (!response.ok) {
    throw new Error(`Failed to bulk update criteria: ${response.statusText}`)
  }

  return response.json()
}

// Example 1: Code Repository Check (Criteria 1)
async function updateCodeRepositoryCheck() {
  console.log('🔍 Updating Code Repository checks...')
  
  const updates = [
    {
      teamSlug: 'team-alpha',
      hackathonId: 'hackload-2025-id',
      criteriaType: 'CODE_REPO',
      status: 'PASSED',
      score: 1,
      metrics: {
        commitsCount: 15,
        lastCommitTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        repositoryUrl: 'https://github.com/team-alpha/project',
        hasRecentActivity: true,
        confirmationUrl: 'https://github.com/team-alpha/hackload-solution',
        confirmationTitle: 'Репозиторий',
        confirmationDescription: 'Исходный код решения команды'
      },
      updatedBy: 'git-monitor-service'
    },
    {
      teamSlug: 'team-beta',
      hackathonId: 'hackload-2025-id',
      criteriaType: 'CODE_REPO',
      status: 'FAILED',
      score: 0,
      metrics: {
        commitsCount: 3,
        lastCommitTime: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(), // 30 hours ago
        repositoryUrl: 'https://github.com/team-beta/project',
        hasRecentActivity: false,
        confirmationUrl: 'https://github.com/team-beta/hackload-solution',
        confirmationTitle: 'Репозиторий',
        confirmationDescription: 'Исходный код решения команды'
      },
      updatedBy: 'git-monitor-service'
    }
  ]

  try {
    const result = await bulkUpdateCriteria(updates)
    console.log('✅ Code repository checks updated:', result)
  } catch (error) {
    console.error('❌ Failed to update code repository checks:', error.message)
  }
}

// Example 2: Deployed Solution Check (Criteria 2)
async function updateDeployedSolutionCheck() {
  console.log('🌐 Updating Deployed Solution checks...')
  
  try {
    const result = await updateTeamCriteria('team-alpha', 'DEPLOYED_SOLUTION', {
      status: 'PASSED',
      score: 1,
      metrics: {
        endpointUrl: 'https://team-alpha.hackload.app',
        responseTime: 245,
        statusCode: 200,
        lastChecked: new Date().toISOString(),
        isAccessible: true,
        confirmationUrl: 'https://team-alpha.hackload.app',
        confirmationTitle: 'Демо',
        confirmationDescription: 'Развернутое решение команды'
      },
      updatedBy: 'deployment-monitor-service'
    })
    console.log('✅ Deployed solution check updated:', result)
  } catch (error) {
    console.error('❌ Failed to update deployed solution check:', error.message)
  }
}

// Example 3: Performance Test Results (Criteria 3)
async function updateEventSearchPerformance() {
  console.log('⚡ Updating Event Search Performance...')
  
  try {
    const result = await updateTeamCriteria('team-alpha', 'EVENT_SEARCH', {
      status: 'PASSED',
      score: 3,
      metrics: {
        p95: 1.8,
        successRate: 0.97,
        testDuration: 600, // 10 minutes
        userLoads: {
          '5000': { p95: 1.2, successRate: 0.98 },
          '25000': { p95: 1.8, successRate: 0.97 },
          '50000': { p95: 1.9, successRate: 0.95 }
        },
        passedCriteria: {
          p95UnderTwoSeconds: true,
          successRateAbove95Percent: true
        },
        confirmationUrl: 'https://grafana.hackload.kz/d/search-performance/team-alpha',
        confirmationTitle: 'Метрики',
        confirmationDescription: 'Результаты тестирования поиска событий'
      },
      updatedBy: 'k6-load-testing-service'
    })
    console.log('✅ Event search performance updated:', result)
  } catch (error) {
    console.error('❌ Failed to update event search performance:', error.message)
  }
}

// Example 4: Budget Tracking (Criteria 8)
async function updateBudgetTracking() {
  console.log('💰 Updating Budget Tracking...')
  
  const updates = [
    {
      teamSlug: 'team-alpha',
      hackathonId: 'hackload-2025-id',
      criteriaType: 'BUDGET_TRACKING',
      status: 'NO_DATA', // This is informational, not pass/fail
      score: 0,
      metrics: {
        totalSpent: 156.78,
        currency: 'USD',
        breakdown: {
          cloudCompute: 89.45,
          storage: 23.12,
          networking: 15.67,
          apis: 28.54
        },
        lastUpdated: new Date().toISOString(),
        hackathonStartDate: '2025-08-01T00:00:00Z',
        confirmationUrl: 'https://billing.hackload.kz/team-expenses/team-alpha',
        confirmationTitle: 'Расходы',
        confirmationDescription: 'Детализация расходов команды'
      },
      updatedBy: 'cost-tracking-service'
    }
  ]

  try {
    const result = await bulkUpdateCriteria(updates)
    console.log('✅ Budget tracking updated:', result)
  } catch (error) {
    console.error('❌ Failed to update budget tracking:', error.message)
  }
}

// Example 5: Authentication Performance (Criteria 5)
async function updateAuthPerformance() {
  console.log('🔐 Updating Authentication Performance...')
  
  try {
    const result = await updateTeamCriteria('team-alpha', 'AUTH_PERFORMANCE', {
      status: 'PASSED',
      score: 1,
      metrics: {
        p95: 0.9,
        successRate: 0.996,
        testDuration: 600,
        userLoad: 50000,
        authenticationsPerformed: 49800,
        confirmationUrl: 'https://grafana.hackload.kz/d/auth-performance/team-alpha',
        confirmationTitle: 'Аутентификация',
        confirmationDescription: 'Результаты нагрузочного тестирования аутентификации'
      },
      updatedBy: 'k6-auth-testing-service'
    })
    console.log('✅ Authentication performance updated:', result)
  } catch (error) {
    console.error('❌ Failed to update authentication performance:', error.message)
  }
}

// Example 6: Ticket Booking Performance (Criteria 6)
async function updateTicketBookingPerformance() {
  console.log('🎫 Updating Ticket Booking Performance...')
  
  try {
    const result = await updateTeamCriteria('team-alpha', 'TICKET_BOOKING', {
      status: 'PASSED',
      score: 3,
      metrics: {
        p95: 2.5,
        successRate: 0.994,
        bookedTickets: 100000,
        testDuration: 900,
        confirmationUrl: 'https://grafana.hackload.kz/d/booking-stats/team-alpha',
        confirmationTitle: 'Бронирования',
        confirmationDescription: 'Статистика и метрики бронирования билетов'
      },
      updatedBy: 'k6-booking-testing-service'
    })
    console.log('✅ Ticket booking performance updated:', result)
  } catch (error) {
    console.error('❌ Failed to update ticket booking performance:', error.message)
  }
}

// Example 7: Archive Search Performance (Criteria 4)  
async function updateArchiveSearchPerformance() {
  console.log('📚 Updating Archive Search Performance...')
  
  try {
    const result = await updateTeamCriteria('team-alpha', 'ARCHIVE_SEARCH', {
      status: 'PASSED',
      score: 1,
      metrics: {
        p95: 0.8,
        successRate: 0.995,
        testDuration: 600,
        userLoad: 5000,
        confirmationUrl: 'https://grafana.hackload.kz/d/archive-performance/team-alpha',
        confirmationTitle: 'Архивный поиск',
        confirmationDescription: 'Метрики производительности архивного поиска'
      },
      updatedBy: 'k6-archive-testing-service'
    })
    console.log('✅ Archive search performance updated:', result)
  } catch (error) {
    console.error('❌ Failed to update archive search performance:', error.message)
  }
}

// Main function to run all examples
async function runExamples() {
  console.log('🚀 Running Team Criteria Update Examples\n')
  
  await updateCodeRepositoryCheck()
  console.log()
  
  await updateDeployedSolutionCheck()
  console.log()
  
  await updateEventSearchPerformance()
  console.log()
  
  await updateArchiveSearchPerformance()
  console.log()
  
  await updateAuthPerformance()
  console.log()
  
  await updateTicketBookingPerformance()
  console.log()
  
  await updateBudgetTracking()
  console.log()
  
  console.log('✨ All examples completed!')
}

// Run examples if this script is executed directly
if (require.main === module) {
  runExamples().catch(console.error)
}

module.exports = {
  updateTeamCriteria,
  bulkUpdateCriteria,
  updateCodeRepositoryCheck,
  updateDeployedSolutionCheck,
  updateEventSearchPerformance,
  updateArchiveSearchPerformance,
  updateAuthPerformance,
  updateTicketBookingPerformance,
  updateBudgetTracking
}