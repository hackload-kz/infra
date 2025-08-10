import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { NextResponse } from 'next/server'

// GET /api/dashboard/load-testing/teams/[teamId]/test-runs/[runId]/steps - Get all steps for a test run
export async function GET(
  request: Request,
  context: { params: Promise<{ teamId: string; runId: string }> }
) {
  const params = await context.params
  const { teamId, runId } = params

  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Проверить права организатора
    if (!(await isOrganizer(session.user.email))) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    // Проверить что команда существует
    const team = await db.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true, nickname: true }
    })

    if (!team) {
      return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })
    }

    // Получить test run с шагами
    const testRun = await db.testRun.findUnique({
      where: { 
        id: runId,
        teamId: teamId
      },
      include: {
        steps: {
          orderBy: {
            stepOrder: 'asc'
          }
        },
        scenario: {
          select: {
            id: true,
            name: true,
            identifier: true
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

    // Добавить информацию о статусах
    const stepsWithSummary = testRun.steps.map(step => ({
      ...step,
      hasLogs: !!step.containerLogs,
      logsLength: step.containerLogs?.length || 0,
      isActive: ['PENDING', 'RUNNING'].includes(step.status),
      duration: step.startedAt && step.completedAt 
        ? new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()
        : null
    }))

    const summary = {
      totalSteps: testRun.steps.length,
      pendingSteps: testRun.steps.filter(s => s.status === 'PENDING').length,
      runningSteps: testRun.steps.filter(s => s.status === 'RUNNING').length,
      completedSteps: testRun.steps.filter(s => s.status === 'SUCCEEDED').length,
      failedSteps: testRun.steps.filter(s => s.status === 'FAILED').length,
      cancelledSteps: testRun.steps.filter(s => s.status === 'CANCELLED').length,
      deletedSteps: testRun.steps.filter(s => s.status === 'DELETED').length,
      stepsWithLogs: testRun.steps.filter(s => !!s.containerLogs).length
    }

    return NextResponse.json({
      testRun: {
        id: testRun.id,
        runNumber: testRun.runNumber,
        status: testRun.status,
        comment: testRun.comment,
        startedAt: testRun.startedAt,
        completedAt: testRun.completedAt,
        createdAt: testRun.createdAt,
        scenario: testRun.scenario,
        team: testRun.team
      },
      steps: stepsWithSummary,
      summary
    })
  } catch (error) {
    console.error('Error getting test run steps:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении шагов теста' },
      { status: 500 }
    )
  }
}