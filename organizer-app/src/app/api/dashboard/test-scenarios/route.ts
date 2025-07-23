import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { NextRequest, NextResponse } from 'next/server'
import { logger, LogAction } from '@/lib/logger'

// GET /api/dashboard/test-scenarios - Получить все сценарии
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

    const scenarios = await db.testScenario.findMany({
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        },
        _count: {
          select: { steps: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    await logger.info(LogAction.READ, 'TestScenario', `Получен список сценариев тестирования (${scenarios.length})`, {
      userEmail: session.user.email
    })

    return NextResponse.json(scenarios)
  } catch (error) {
    console.error('Error fetching test scenarios:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении сценариев' },
      { status: 500 }
    )
  }
}

// POST /api/dashboard/test-scenarios - Создать новый сценарий
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const organizer = await isOrganizer(session.user.email)
    if (!organizer) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    // Для создания сценариев достаточно быть организатором
    // Получаем пользователя для логирования, но participant не обязателен
    const user = await db.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    const body = await request.json()
    const { name, identifier, description } = body

    if (!name || !identifier) {
      return NextResponse.json(
        { error: 'Название и идентификатор обязательны' },
        { status: 400 }
      )
    }

    // Проверить уникальность идентификатора
    const existingScenario = await db.testScenario.findUnique({
      where: { identifier }
    })

    if (existingScenario) {
      return NextResponse.json(
        { error: 'Сценарий с таким идентификатором уже существует' },
        { status: 409 }
      )
    }

    const scenario = await db.testScenario.create({
      data: {
        name,
        identifier,
        description,
        createdBy: null // Организатор создает сценарии без привязки к participant
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        },
        _count: {
          select: { steps: true }
        }
      }
    })

    await logger.info(LogAction.CREATE, 'TestScenario', `Создан сценарий тестирования: ${name} (${identifier})`, {
      userEmail: session.user.email,
      entityId: scenario.id
    })

    return NextResponse.json(scenario, { status: 201 })
  } catch (error) {
    console.error('Error creating test scenario:', error)
    return NextResponse.json(
      { error: 'Ошибка при создании сценария' },
      { status: 500 }
    )
  }
}