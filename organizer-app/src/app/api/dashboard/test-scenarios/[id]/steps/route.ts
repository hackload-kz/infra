import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { NextRequest, NextResponse } from 'next/server'
import { logger, LogAction } from '@/lib/logger'

// GET /api/dashboard/test-scenarios/[id]/steps - Получить шаги сценария
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scenarioId } = await params
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Получить шаги сценария (доступно всем авторизованным пользователям для просмотра скриптов)
    const steps = await db.testScenarioStep.findMany({
      where: {
        scenarioId,
        isActive: true
      },
      orderBy: { stepOrder: 'asc' },
      select: {
        id: true,
        name: true,
        stepOrder: true,
        stepType: true,
        config: true,
        description: true,
        isActive: true
      }
    })

    await logger.info(LogAction.READ, 'TestScenarioStep', `Получены шаги сценария (${steps.length} шагов)`, {
      userEmail: session.user.email,
      entityId: scenarioId
    })

    return NextResponse.json(steps)
  } catch (error) {
    console.error('Error fetching scenario steps:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении шагов сценария' },
      { status: 500 }
    )
  }
}

// POST /api/dashboard/test-scenarios/[id]/steps - Создать новый шаг сценария
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scenarioId } = await params
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const organizer = await isOrganizer(session.user.email)
    if (!organizer) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    // Проверить существование сценария
    const scenario = await db.testScenario.findUnique({
      where: { id: scenarioId }
    })

    if (!scenario) {
      return NextResponse.json({ error: 'Сценарий не найден' }, { status: 404 })
    }

    const body = await request.json()
    const { name, description, stepType, config, stepOrder } = body

    if (!name || !stepType || !config) {
      return NextResponse.json(
        { error: 'Название, тип шага и конфигурация обязательны' },
        { status: 400 }
      )
    }

    if (!['k6_script', 'http_request'].includes(stepType)) {
      return NextResponse.json(
        { error: 'Неверный тип шага' },
        { status: 400 }
      )
    }

    // Определить порядок шага
    let order = stepOrder
    if (order === undefined || order === null) {
      // Автоматически назначить следующий порядок
      const maxOrder = await db.testScenarioStep.findFirst({
        where: { scenarioId },
        orderBy: { stepOrder: 'desc' },
        select: { stepOrder: true }
      })
      order = (maxOrder?.stepOrder || 0) + 1
    } else {
      // Проверить уникальность порядка
      const existingStep = await db.testScenarioStep.findFirst({
        where: { scenarioId, stepOrder: order }
      })
      if (existingStep) {
        return NextResponse.json(
          { error: 'Шаг с таким порядком уже существует' },
          { status: 409 }
        )
      }
    }

    const step = await db.testScenarioStep.create({
      data: {
        scenarioId,
        name,
        description,
        stepType,
        stepOrder: order,
        config
      }
    })

    await logger.info(LogAction.CREATE, 'TestScenarioStep', `Создан шаг сценария: ${name} (порядок ${order})`, {
      userEmail: session.user.email,
      entityId: step.id
    })

    return NextResponse.json(step, { status: 201 })
  } catch (error) {
    console.error('Error creating scenario step:', error)
    return NextResponse.json(
      { error: 'Ошибка при создании шага сценария' },
      { status: 500 }
    )
  }
}