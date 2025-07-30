import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { NextResponse } from 'next/server'
import { logger, LogAction } from '@/lib/logger'

// GET /api/dashboard/load-testing/teams - Получить список команд для нагрузочного тестирования
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const organizer = await isOrganizer(session.user.email)
    if (!organizer) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    const teams = await db.team.findMany({
      select: {
        id: true,
        name: true,
        nickname: true,
        status: true,
        level: true,
        description: true,
        createdAt: true,
        _count: {
          select: {
            members: true,
            testRuns: true
          }
        },
        leader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        hackathon: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    await logger.info(LogAction.READ, 'LoadTesting', `Получен список команд для нагрузочного тестирования (${teams.length})`, {
      userEmail: session.user.email
    })

    return NextResponse.json(teams)
  } catch (error) {
    console.error('Error fetching teams for load testing:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении списка команд' },
      { status: 500 }
    )
  }
}