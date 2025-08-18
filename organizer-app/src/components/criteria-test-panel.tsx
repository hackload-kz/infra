'use client'

import React, { useState } from 'react'
import { CriteriaType, CriteriaStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Play, RefreshCw } from 'lucide-react'

interface CriteriaTestPanelProps {
  teams: Array<{
    id: string
    name: string
    nickname: string
  }>
}

export function CriteriaTestPanel({ teams }: CriteriaTestPanelProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const sampleCriteriaData = {
    CODE_REPO: {
      status: 'PASSED' as CriteriaStatus,
      score: 1,
      metrics: {
        commitsCount: 15,
        lastCommitTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        repositoryUrl: 'https://github.com/team/repo',
        hasRecentActivity: true,
        confirmationUrl: 'https://github.com/hackload-team/solution',
        confirmationTitle: 'Репозиторий',
        confirmationDescription: 'Исходный код решения'
      }
    },
    DEPLOYED_SOLUTION: {
      status: 'PASSED' as CriteriaStatus,
      score: 1,
      metrics: {
        endpointUrl: 'https://team.hackload.app',
        responseTime: 245,
        statusCode: 200,
        lastChecked: new Date().toISOString(),
        isAccessible: true,
        confirmationUrl: 'https://demo.hackload.app',
        confirmationTitle: 'Демо',
        confirmationDescription: 'Развернутое решение'
      }
    },
    EVENT_SEARCH: {
      status: 'PASSED' as CriteriaStatus,
      score: 3,
      metrics: {
        p95: 1.8,
        successRate: 0.97,
        testDuration: 600,
        userLoads: {
          '5000': { p95: 1.2, successRate: 0.98 },
          '25000': { p95: 1.8, successRate: 0.97 },
          '50000': { p95: 1.9, successRate: 0.95 }
        },
        confirmationUrl: 'https://grafana.hackload.kz/d/search-performance',
        confirmationTitle: 'Метрики',
        confirmationDescription: 'Результаты тестирования поиска'
      }
    },
    ARCHIVE_SEARCH: {
      status: 'PASSED' as CriteriaStatus,
      score: 1,
      metrics: {
        p95: 0.8,
        successRate: 0.995,
        testDuration: 600,
        userLoad: 5000,
        confirmationUrl: 'https://grafana.hackload.kz/d/archive-performance',
        confirmationTitle: 'Отчет',
        confirmationDescription: 'Метрики архивного поиска'
      }
    },
    AUTH_PERFORMANCE: {
      status: 'PASSED' as CriteriaStatus,
      score: 1,
      metrics: {
        p95: 0.9,
        successRate: 0.996,
        testDuration: 600,
        userLoad: 50000,
        authenticationsPerformed: 49800,
        confirmationUrl: 'https://grafana.hackload.kz/d/auth-performance',
        confirmationTitle: 'Аутентификация',
        confirmationDescription: 'Результаты нагрузочного тестирования'
      }
    },
    TICKET_BOOKING: {
      status: 'PASSED' as CriteriaStatus,
      score: 3,
      metrics: {
        p95ResponseTime: 2.5,
        successRate: 0.994,
        bookedTickets: 100000,
        testDuration: 900,
        confirmationUrl: 'https://grafana.hackload.kz/d/booking-stats',
        confirmationTitle: 'Бронирования',
        confirmationDescription: 'Статистика бронирований'
      }
    },
    TICKET_CANCELLATION: {
      status: 'PASSED' as CriteriaStatus,
      score: 1,
      metrics: {
        p95ResponseTime: 2.1,
        successRate: 0.997,
        bookedTickets: 90000,
        cancelledTickets: 10000,
        testDuration: 600,
        confirmationUrl: 'https://grafana.hackload.kz/d/cancellation-stats',
        confirmationTitle: 'Отмены',
        confirmationDescription: 'Статистика отмен билетов'
      }
    },
    BUDGET_TRACKING: {
      status: 'NO_DATA' as CriteriaStatus,
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
        confirmationUrl: 'https://billing.hackload.kz/team-expenses',
        confirmationTitle: 'Расходы',
        confirmationDescription: 'Детализация расходов команды'
      }
    }
  }

  const generateTestData = async () => {
    setLoading(true)
    setMessage('')

    try {
      // Get current hackathon
      const hackathonResponse = await fetch('/api/hackathons/current')
      if (!hackathonResponse.ok) {
        throw new Error('Failed to get current hackathon')
      }
      const hackathon = await hackathonResponse.json()

      // Generate updates for first few teams
      const updates = teams.slice(0, 3).flatMap(team => 
        Object.entries(sampleCriteriaData).map(([criteriaType, data]) => ({
          teamSlug: team.nickname,
          hackathonId: hackathon.id,
          criteriaType: criteriaType as CriteriaType,
          ...data,
          updatedBy: 'admin-test-panel'
        }))
      )

      const response = await fetch('/api/service/team-criteria', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'sk_dbdf02bf5cba2929978d2fb429fc3bd23f7c436aba6f12739e3f444d7766948f'
        },
        body: JSON.stringify({ updates })
      })

      if (!response.ok) {
        throw new Error(`Failed to update criteria: ${response.statusText}`)
      }

      const result = await response.json()
      setMessage(`✅ Successfully updated ${result.updatedEntries + result.createdEntries} criteria entries`)
      
      // Refresh the page after a short delay
      setTimeout(() => window.location.reload(), 2000)
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30 mb-8">
      <h3 className="text-lg font-semibold text-white mb-4">🧪 Test Panel (Admin Only)</h3>
      <p className="text-slate-400 text-sm mb-4">
        Generate sample criteria data for testing the dashboard. This will populate the first 3 teams with sample data across all criteria.
      </p>
      
      <div className="flex items-center space-x-4">
        <Button 
          onClick={generateTestData}
          disabled={loading}
          className="bg-amber-400 hover:bg-amber-500 text-slate-900"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Generate Test Data
            </>
          )}
        </Button>
        
        <Button 
          onClick={() => window.location.reload()}
          variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Dashboard
        </Button>
      </div>
      
      {message && (
        <div className="mt-4 p-3 rounded-lg bg-slate-700/30 text-sm">
          {message}
        </div>
      )}
      
      <div className="mt-4 text-xs text-slate-500">
        <strong>Note:</strong> In production, criteria are updated by external monitoring services via authenticated API calls.
      </div>
    </div>
  )
}