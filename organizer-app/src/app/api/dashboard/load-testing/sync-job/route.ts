import { auth } from '@/auth'
import { isOrganizer } from '@/lib/admin'
import { NextResponse } from 'next/server'
import { 
  startK6StepsSyncJob, 
  stopK6StepsSyncJob, 
  isK6StepsSyncJobRunning,
  getK6StepsSyncJobInfo
} from '@/lib/cron-jobs'

/**
 * GET /api/dashboard/load-testing/sync-job
 * Получить информацию о джобе синхронизации
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    if (!(await isOrganizer(session.user.email))) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const jobInfo = await getK6StepsSyncJobInfo()
    
    return NextResponse.json({
      success: true,
      job: {
        ...jobInfo,
        autoSyncEnabled: process.env.K6_AUTO_SYNC_ENABLED !== 'false',
        apiKeyConfigured: !!process.env.K6_SYNC_API_KEY
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error getting sync job info:', error)
    return NextResponse.json(
      { error: 'Ошибка получения информации о джобе' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/dashboard/load-testing/sync-job
 * Управление джобой синхронизации
 * 
 * Body: { "action": "start" | "stop" | "restart", "intervalSeconds"?: number }
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    if (!(await isOrganizer(session.user.email))) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const { action, intervalSeconds } = await request.json()

    if (!['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json(
        { error: 'Неверное действие. Допустимые: start, stop, restart' },
        { status: 400 }
      )
    }

    // Validate interval if provided
    let customIntervalMs: number | undefined
    if (intervalSeconds !== undefined) {
      const parsed = parseInt(intervalSeconds, 10)
      if (isNaN(parsed) || parsed < 5 || parsed > 300) {
        return NextResponse.json(
          { error: 'intervalSeconds должно быть от 5 до 300 секунд' },
          { status: 400 }
        )
      }
      customIntervalMs = parsed * 1000
    }

    let result = ''
    const wasRunning = isK6StepsSyncJobRunning()

    switch (action) {
      case 'start':
        if (wasRunning) {
          result = 'Джоба уже запущена'
        } else {
          startK6StepsSyncJob(customIntervalMs)
          result = customIntervalMs ? 
            `Джоба запущена с интервалом ${Math.round(customIntervalMs / 1000)} секунд` :
            'Джоба запущена с настройками по умолчанию'
        }
        break

      case 'stop':
        if (wasRunning) {
          stopK6StepsSyncJob()
          result = 'Джоба остановлена'
        } else {
          result = 'Джоба уже остановлена'
        }
        break

      case 'restart':
        if (wasRunning) {
          stopK6StepsSyncJob()
        }
        startK6StepsSyncJob(customIntervalMs)
        result = customIntervalMs ? 
          `Джоба перезапущена с интервалом ${Math.round(customIntervalMs / 1000)} секунд` :
          'Джоба перезапущена с настройками по умолчанию'
        break
    }

    const jobInfo = await getK6StepsSyncJobInfo()

    return NextResponse.json({
      success: true,
      action,
      result,
      job: jobInfo,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error managing sync job:', error)
    return NextResponse.json(
      { error: 'Ошибка управления джобой' },
      { status: 500 }
    )
  }
}