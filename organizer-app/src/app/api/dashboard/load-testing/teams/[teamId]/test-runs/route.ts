import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { NextRequest, NextResponse } from 'next/server'
import { logger, LogAction } from '@/lib/logger'

// GET /api/dashboard/load-testing/teams/[teamId]/test-runs - Получить запуски тестов команды
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const organizer = await isOrganizer(session.user.email)
    if (!organizer) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    // Проверить существование команды
    const team = await db.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true, nickname: true }
    })

    if (!team) {
      return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })
    }

    const testRuns = await db.testRun.findMany({
      where: { teamId },
      include: {
        scenario: {
          select: {
            id: true,
            name: true,
            identifier: true,
            description: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            nickname: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    await logger.info(LogAction.READ, 'TestRun', `Получен список запусков тестов для команды ${team.name} (${testRuns.length})`, {
      userEmail: session.user.email,
      entityId: teamId
    })

    return NextResponse.json({
      team,
      testRuns
    })
  } catch (error) {
    console.error('Error fetching team test runs:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении запусков тестов' },
      { status: 500 }
    )
  }
}

// POST /api/dashboard/load-testing/teams/[teamId]/test-runs - Создать новый запуск теста
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const organizer = await isOrganizer(session.user.email)
    if (!organizer) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    // Проверить существование команды
    const team = await db.team.findUnique({
      where: { id: teamId }
    })

    if (!team) {
      return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })
    }

    const body = await request.json()
    const { scenarioId, comment } = body

    if (!scenarioId) {
      return NextResponse.json(
        { error: 'Сценарий тестирования обязателен' },
        { status: 400 }
      )
    }

    // Проверить существование сценария
    const scenario = await db.testScenario.findUnique({
      where: { id: scenarioId }
    })

    if (!scenario) {
      return NextResponse.json({ error: 'Сценарий не найден' }, { status: 404 })
    }

    // Создать запуск теста
    const testRun = await db.testRun.create({
      data: {
        scenarioId,
        teamId,
        comment,
        createdBy: null // Организатор создает тесты без привязки к participant
      },
      include: {
        scenario: {
          select: {
            id: true,
            name: true,
            identifier: true,
            description: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            nickname: true
          }
        }
      }
    })

    await logger.info(LogAction.CREATE, 'TestRun', `Создан запуск теста: ${scenario.name} для команды ${team.name}`, {
      userEmail: session.user.email,
      entityId: testRun.id
    })

    return NextResponse.json(testRun, { status: 201 })
  } catch (error) {
    console.error('Error creating test run:', error)
    return NextResponse.json(
      { error: 'Ошибка при создании запуска теста' },
      { status: 500 }
    )
  }
}