import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { NextRequest, NextResponse } from 'next/server'
import { logger, LogAction } from '@/lib/logger'

// GET /api/dashboard/test-scenarios/[id]/steps/[stepId] - Получить шаг по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { id: scenarioId, stepId } = await params
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const organizer = await isOrganizer(session.user.email)
    if (!organizer) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    const step = await db.testScenarioStep.findFirst({
      where: { 
        id: stepId,
        scenarioId 
      },
      include: {
        scenario: true
      }
    })

    if (!step) {
      return NextResponse.json({ error: 'Шаг сценария не найден' }, { status: 404 })
    }

    return NextResponse.json(step)
  } catch (error) {
    console.error('Error fetching scenario step:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении шага сценария' },
      { status: 500 }
    )
  }
}

// PUT /api/dashboard/test-scenarios/[id]/steps/[stepId] - Обновить шаг
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { id: scenarioId, stepId } = await params
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const organizer = await isOrganizer(session.user.email)
    if (!organizer) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, stepType, config, stepOrder, isActive } = body

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

    // Проверить существование шага
    const existingStep = await db.testScenarioStep.findFirst({
      where: { 
        id: stepId,
        scenarioId 
      }
    })

    if (!existingStep) {
      return NextResponse.json({ error: 'Шаг сценария не найден' }, { status: 404 })
    }

    // Если изменяется порядок, проверить уникальность
    if (stepOrder !== undefined && stepOrder !== existingStep.stepOrder) {
      const duplicateStep = await db.testScenarioStep.findFirst({
        where: {
          scenarioId,
          stepOrder,
          id: { not: stepId }
        }
      })

      if (duplicateStep) {
        return NextResponse.json(
          { error: 'Шаг с таким порядком уже существует' },
          { status: 409 }
        )
      }
    }

    const step = await db.testScenarioStep.update({
      where: { id: stepId },
      data: {
        name,
        description,
        stepType,
        config,
        stepOrder: stepOrder !== undefined ? stepOrder : existingStep.stepOrder,
        isActive: isActive !== undefined ? isActive : existingStep.isActive
      }
    })

    await logger.info(LogAction.UPDATE, 'TestScenarioStep', `Обновлен шаг сценария: ${name}`, {
      userEmail: session.user.email,
      entityId: stepId
    })

    return NextResponse.json(step)
  } catch (error) {
    console.error('Error updating scenario step:', error)
    return NextResponse.json(
      { error: 'Ошибка при обновлении шага сценария' },
      { status: 500 }
    )
  }
}

// DELETE /api/dashboard/test-scenarios/[id]/steps/[stepId] - Удалить шаг
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { id: scenarioId, stepId } = await params
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const organizer = await isOrganizer(session.user.email)
    if (!organizer) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    // Проверить существование шага
    const existingStep = await db.testScenarioStep.findFirst({
      where: { 
        id: stepId,
        scenarioId 
      }
    })

    if (!existingStep) {
      return NextResponse.json({ error: 'Шаг сценария не найден' }, { status: 404 })
    }

    await db.testScenarioStep.delete({
      where: { id: stepId }
    })

    await logger.info(LogAction.DELETE, 'TestScenarioStep', `Удален шаг сценария: ${existingStep.name}`, {
      userEmail: session.user.email,
      entityId: stepId
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting scenario step:', error)
    return NextResponse.json(
      { error: 'Ошибка при удалении шага сценария' },
      { status: 500 }
    )
  }
}

// PATCH /api/dashboard/test-scenarios/[id]/steps/[stepId] - Переупорядочить шаги
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { id: scenarioId, stepId } = await params
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const organizer = await isOrganizer(session.user.email)
    if (!organizer) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    const body = await request.json()
    const { newOrder } = body

    if (newOrder === undefined || newOrder < 1) {
      return NextResponse.json(
        { error: 'Неверный порядок шага' },
        { status: 400 }
      )
    }

    // Получить все шаги сценария
    const steps = await db.testScenarioStep.findMany({
      where: { scenarioId },
      orderBy: { stepOrder: 'asc' }
    })

    const currentStep = steps.find(step => step.id === stepId)
    if (!currentStep) {
      return NextResponse.json({ error: 'Шаг сценария не найден' }, { status: 404 })
    }

    // Использовать транзакцию для безопасного переупорядочивания
    await db.$transaction(async (tx) => {
      // 1. Присвоить временные уникальные значения (большие числа)
      for (let i = 0; i < steps.length; i++) {
        await tx.testScenarioStep.update({
          where: { id: steps[i].id },
          data: { stepOrder: 1000 + i }
        })
      }

      // 2. Переупорядочить шаги логически
      const updatedSteps = steps.filter(step => step.id !== stepId)
      updatedSteps.splice(newOrder - 1, 0, currentStep)

      // 3. Установить правильные порядковые номера
      for (let i = 0; i < updatedSteps.length; i++) {
        await tx.testScenarioStep.update({
          where: { id: updatedSteps[i].id },
          data: { stepOrder: i + 1 }
        })
      }
    })

    await logger.info(LogAction.UPDATE, 'TestScenarioStep', `Переупорядочены шаги сценария`, {
      userEmail: session.user.email,
      entityId: scenarioId
    })

    // Вернуть обновленные шаги
    const reorderedSteps = await db.testScenarioStep.findMany({
      where: { scenarioId },
      orderBy: { stepOrder: 'asc' }
    })

    return NextResponse.json(reorderedSteps)
  } catch (error) {
    console.error('Error reordering scenario steps:', error)
    return NextResponse.json(
      { error: 'Ошибка при переупорядочивании шагов' },
      { status: 500 }
    )
  }
}