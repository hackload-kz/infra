import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { NextRequest, NextResponse } from 'next/server'
import { logger, LogAction } from '@/lib/logger'

// GET /api/dashboard/test-scenarios/[id] - Получить сценарий по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const organizer = await isOrganizer(session.user.email)
    if (!organizer) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    const scenario = await db.testScenario.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        },
        _count: {
          select: { steps: true }
        }
      }
    })

    if (!scenario) {
      return NextResponse.json({ error: 'Сценарий не найден' }, { status: 404 })
    }

    return NextResponse.json(scenario)
  } catch (error) {
    console.error('Error fetching test scenario:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении сценария' },
      { status: 500 }
    )
  }
}

// PUT /api/dashboard/test-scenarios/[id] - Обновить сценарий
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const organizer = await isOrganizer(session.user.email)
    if (!organizer) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    const body = await request.json()
    const { name, identifier, description, isActive } = body

    if (!name || !identifier) {
      return NextResponse.json(
        { error: 'Название и идентификатор обязательны' },
        { status: 400 }
      )
    }

    // Проверить существование сценария
    const existingScenario = await db.testScenario.findUnique({
      where: { id }
    })

    if (!existingScenario) {
      return NextResponse.json({ error: 'Сценарий не найден' }, { status: 404 })
    }

    // Проверить уникальность идентификатора (исключая текущий сценарий)
    const duplicateScenario = await db.testScenario.findFirst({
      where: {
        identifier,
        id: { not: id }
      }
    })

    if (duplicateScenario) {
      return NextResponse.json(
        { error: 'Сценарий с таким идентификатором уже существует' },
        { status: 409 }
      )
    }

    const scenario = await db.testScenario.update({
      where: { id },
      data: {
        name,
        identifier,
        description,
        isActive: isActive !== undefined ? isActive : existingScenario.isActive
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

    await logger.info(LogAction.UPDATE, 'TestScenario', `Обновлен сценарий тестирования: ${name} (${identifier})`, {
      userEmail: session.user.email,
      entityId: id
    })

    return NextResponse.json(scenario)
  } catch (error) {
    console.error('Error updating test scenario:', error)
    return NextResponse.json(
      { error: 'Ошибка при обновлении сценария' },
      { status: 500 }
    )
  }
}

// DELETE /api/dashboard/test-scenarios/[id] - Удалить сценарий
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const organizer = await isOrganizer(session.user.email)
    if (!organizer) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    // Проверить существование сценария
    const existingScenario = await db.testScenario.findUnique({
      where: { id },
      include: { _count: { select: { steps: true } } }
    })

    if (!existingScenario) {
      return NextResponse.json({ error: 'Сценарий не найден' }, { status: 404 })
    }

    await db.testScenario.delete({
      where: { id }
    })

    await logger.info(LogAction.DELETE, 'TestScenario', `Удален сценарий тестирования: ${existingScenario.name} (${existingScenario.identifier})`, {
      userEmail: session.user.email,
      entityId: id
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting test scenario:', error)
    return NextResponse.json(
      { error: 'Ошибка при удалении сценария' },
      { status: 500 }
    )
  }
}