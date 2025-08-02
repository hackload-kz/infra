import { auth } from '@/auth'
import { isOrganizer } from '@/lib/admin'
import { NextRequest, NextResponse } from 'next/server'
import { runK6StatusSync } from '@/lib/k6-status-sync'

// POST /api/dashboard/load-testing/sync-status - Синхронизировать статусы K6 тестов
export async function POST(_request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const organizer = await isOrganizer(session.user.email)
    if (!organizer) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    console.log(`K6 status sync triggered by ${session.user.email}`)
    
    const result = await runK6StatusSync()
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error during manual K6 status sync:', error)
    return NextResponse.json(
      { error: 'Ошибка при синхронизации статусов K6 тестов' },
      { status: 500 }
    )
  }
}

// GET /api/dashboard/load-testing/sync-status - Получить информацию о синхронизации
export async function GET(_request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const organizer = await isOrganizer(session.user.email)
    if (!organizer) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    // Получить статистику по активным тестам
    const { db } = await import('@/lib/db')
    
    const activeTests = await db.testRun.count({
      where: {
        status: {
          in: ['PENDING', 'RUNNING']
        },
        k6TestName: {
          not: null
        }
      }
    })

    const totalTests = await db.testRun.count({
      where: {
        k6TestName: {
          not: null
        }
      }
    })

    return NextResponse.json({
      activeTests,
      totalTests,
      message: 'Sync status information retrieved successfully'
    })
  } catch (error) {
    console.error('Error getting sync status info:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении информации о синхронизации' },
      { status: 500 }
    )
  }
}