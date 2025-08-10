import { NextResponse } from 'next/server'
import { syncK6TestRunSteps } from '@/lib/k6-status-sync'

/**
 * POST /api/dashboard/load-testing/sync-status-steps
 * Manually trigger step-level K6 TestRun status synchronization
 * This endpoint can be called by cron jobs or monitoring systems
 */
export async function POST(request: Request) {
  try {
    const { authorization } = Object.fromEntries(request.headers.entries())
    
    // Simple API key check for automated calls
    const apiKey = process.env.K6_SYNC_API_KEY
    if (apiKey && authorization !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting manual K6 TestRun steps synchronization...')
    const startTime = Date.now()
    
    const result = await syncK6TestRunSteps()
    
    const duration = Date.now() - startTime
    console.log(`K6 steps sync completed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      summary: {
        totalSteps: result.totalSteps,
        updatedSteps: result.updatedSteps,
        errorSteps: result.errorSteps,
        stepsWithNewLogs: result.results.filter(r => r.logsUpdated).length
      },
      details: result.results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Manual K6 steps sync failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/dashboard/load-testing/sync-status-steps
 * Get information about step synchronization without running it
 */
export async function GET() {
  try {
    // Get count of active steps that need syncing
    const { db } = await import('@/lib/db')
    
    const activeSteps = await db.testRunStep.findMany({
      where: {
        status: {
          in: ['PENDING', 'RUNNING']
        },
        k6TestName: {
          not: null
        }
      },
      select: {
        id: true,
        stepName: true,
        status: true,
        lastStatusCheck: true,
        k6TestName: true
      },
      orderBy: {
        lastStatusCheck: 'asc'
      }
    })

    const now = new Date()
    const staleSteps = activeSteps.filter(step => {
      if (!step.lastStatusCheck) return true
      const timeSinceCheck = now.getTime() - step.lastStatusCheck.getTime()
      return timeSinceCheck > 60000 // More than 1 minute
    })

    return NextResponse.json({
      activeSteps: activeSteps.length,
      staleSteps: staleSteps.length,
      oldestCheck: activeSteps.length > 0 ? activeSteps[0].lastStatusCheck : null,
      nextSyncRecommended: staleSteps.length > 0,
      apiKeyConfigured: !!process.env.K6_SYNC_API_KEY,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to get sync status:', error)
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    )
  }
}