import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { NextResponse } from 'next/server'
import { getTestRunStepDetails } from '@/lib/k6-status-sync'

// GET /api/dashboard/load-testing/test-run-steps/[stepId] - Get step details with logs
export async function GET(
  request: Request,
  context: { params: Promise<{ stepId: string }> }
) {
  const params = await context.params
  const { stepId } = params

  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Проверить права организатора
    if (!(await isOrganizer(session.user.email))) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    // Получить детали шага с логами
    const stepDetails = await getTestRunStepDetails(stepId)
    
    if (!stepDetails) {
      return NextResponse.json({ error: 'Шаг не найден' }, { status: 404 })
    }

    return NextResponse.json(stepDetails)
  } catch (error) {
    console.error('Error getting test run step details:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении данных шага' },
      { status: 500 }
    )
  }
}

// GET /api/dashboard/load-testing/test-run-steps/[stepId]/logs - Get only logs for a step
export async function POST(
  request: Request,
  context: { params: Promise<{ stepId: string }> }
) {
  const params = await context.params
  const { stepId } = params

  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Проверить права организатора
    if (!(await isOrganizer(session.user.email))) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const { tailLines = 100 } = await request.json()

    // Получить шаг из базы данных
    const step = await db.testRunStep.findUnique({
      where: { id: stepId },
      select: {
        id: true,
        stepName: true,
        k6TestName: true,
        status: true,
        containerLogs: true
      }
    })
    
    if (!step) {
      return NextResponse.json({ error: 'Шаг не найден' }, { status: 404 })
    }

    // Если шаг активен, попытаться получить свежие логи
    let logs = step.containerLogs
    if (step.k6TestName && ['PENDING', 'RUNNING'].includes(step.status)) {
      try {
        const { getK6TestRunLogs } = await import('@/lib/k6')
        const freshLogs = await getK6TestRunLogs(step.k6TestName, tailLines)
        if (freshLogs) {
          logs = freshLogs
          
          // Обновить логи в базе данных
          await db.testRunStep.update({
            where: { id: stepId },
            data: { containerLogs: freshLogs }
          })
        }
      } catch (error) {
        console.warn(`Failed to get fresh logs for step ${stepId}:`, error)
      }
    }

    return NextResponse.json({
      stepId: step.id,
      stepName: step.stepName,
      k6TestName: step.k6TestName,
      status: step.status,
      logs: logs || '',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error getting test run step logs:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении логов шага' },
      { status: 500 }
    )
  }
}