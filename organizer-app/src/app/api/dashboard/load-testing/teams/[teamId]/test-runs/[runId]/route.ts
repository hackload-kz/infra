import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { NextRequest, NextResponse } from 'next/server'
import { logger, LogAction } from '@/lib/logger'
import { TestRunStatus, type Prisma } from '@prisma/client'

// GET /api/dashboard/load-testing/teams/[teamId]/test-runs/[runId] - Получить запуск теста
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; runId: string }> }
) {
  try {
    const { teamId, runId } = await params
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const organizer = await isOrganizer(session.user.email)
    if (!organizer) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    const testRun = await db.testRun.findFirst({
      where: { 
        id: runId,
        teamId 
      },
      include: {
        scenario: {
          include: {
            steps: {
              orderBy: { stepOrder: 'asc' }
            }
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

    if (!testRun) {
      return NextResponse.json({ error: 'Запуск теста не найден' }, { status: 404 })
    }

    return NextResponse.json(testRun)
  } catch (error) {
    console.error('Error fetching test run:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении запуска теста' },
      { status: 500 }
    )
  }
}

// PUT /api/dashboard/load-testing/teams/[teamId]/test-runs/[runId] - Обновить статус запуска
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; runId: string }> }
) {
  try {
    const { teamId, runId } = await params
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const organizer = await isOrganizer(session.user.email)
    if (!organizer) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    const body = await request.json()
    const { status, results, comment } = body

    // Проверить существование запуска
    const existingRun = await db.testRun.findFirst({
      where: { 
        id: runId,
        teamId 
      },
      include: {
        scenario: { select: { name: true } },
        team: { select: { name: true } }
      }
    })

    if (!existingRun) {
      return NextResponse.json({ error: 'Запуск теста не найден' }, { status: 404 })
    }

    // Подготовить данные для обновления
    const updateData: {
      status?: TestRunStatus
      startedAt?: Date
      completedAt?: Date
      results?: Prisma.InputJsonValue
      comment?: string
    } = {}
    if (status !== undefined) {
      updateData.status = status
      if (status === TestRunStatus.RUNNING && !existingRun.startedAt) {
        updateData.startedAt = new Date()
      }
      if ((status === TestRunStatus.COMPLETED || status === TestRunStatus.FAILED || status === TestRunStatus.CANCELLED) && !existingRun.completedAt) {
        updateData.completedAt = new Date()
      }
    }
    if (results !== undefined) updateData.results = results
    if (comment !== undefined) updateData.comment = comment

    const testRun = await db.testRun.update({
      where: { id: runId },
      data: updateData,
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

    await logger.info(LogAction.UPDATE, 'TestRun', `Обновлен запуск теста: ${existingRun.scenario.name} для команды ${existingRun.team.name}${status ? ` (статус: ${status})` : ''}`, {
      userEmail: session.user.email,
      entityId: runId
    })

    return NextResponse.json(testRun)
  } catch (error) {
    console.error('Error updating test run:', error)
    return NextResponse.json(
      { error: 'Ошибка при обновлении запуска теста' },
      { status: 500 }
    )
  }
}

// DELETE /api/dashboard/load-testing/teams/[teamId]/test-runs/[runId] - Удалить запуск теста
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ teamId: string; runId: string }> }
) {
  try {
    const { teamId, runId } = await params
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const organizer = await isOrganizer(session.user.email)
    if (!organizer) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    // Проверить существование запуска
    const existingRun = await db.testRun.findFirst({
      where: { 
        id: runId,
        teamId 
      },
      include: {
        scenario: { select: { name: true } },
        team: { select: { name: true } }
      }
    })

    if (!existingRun) {
      return NextResponse.json({ error: 'Запуск теста не найден' }, { status: 404 })
    }

    await db.testRun.delete({
      where: { id: runId }
    })

    await logger.info(LogAction.DELETE, 'TestRun', `Удален запуск теста: ${existingRun.scenario.name} для команды ${existingRun.team.name}`, {
      userEmail: session.user.email,
      entityId: runId
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting test run:', error)
    return NextResponse.json(
      { error: 'Ошибка при удалении запуска теста' },
      { status: 500 }
    )
  }
}