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
      select: { id: true, name: true, nickname: true, k6EnvironmentVars: true }
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

    // Fetch creator information for participant-created tests
    const testRunsWithCreators = await Promise.all(
      testRuns.map(async (testRun) => {
        if (testRun.createdBy) {
          const creator = await db.participant.findUnique({
            where: { id: testRun.createdBy },
            select: {
              id: true,
              name: true,
              user: {
                select: {
                  email: true
                }
              }
            }
          })
          return { ...testRun, creator }
        }
        return { ...testRun, creator: null }
      })
    )

    await logger.info(LogAction.READ, 'TestRun', `Получен список запусков тестов для команды ${team.name} (${testRuns.length})`, {
      userEmail: session.user.email,
      entityId: teamId
    })

    return NextResponse.json({
      team,
      testRuns: testRunsWithCreators
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
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        nickname: true,
        k6EnvironmentVars: true
      }
    })

    if (!team) {
      return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })
    }

    const body = await request.json()
    const { scenarioId, comment, parallelism } = body

    if (!scenarioId) {
      return NextResponse.json(
        { error: 'Сценарий тестирования обязателен' },
        { status: 400 }
      )
    }

    // Validate parallelism parameter
    const parsedParallelism = parallelism ? parseInt(parallelism, 10) : 1
    if (parallelism && (isNaN(parsedParallelism) || parsedParallelism < 1 || parsedParallelism > 10)) {
      return NextResponse.json(
        { error: 'Parallelism должно быть числом от 1 до 10' },
        { status: 400 }
      )
    }

    // Проверить существование сценария и получить его шаги
    const scenario = await db.testScenario.findUnique({
      where: { id: scenarioId },
      include: {
        steps: {
          where: { isActive: true },
          orderBy: { stepOrder: 'asc' }
        }
      }
    })

    if (!scenario) {
      return NextResponse.json({ error: 'Сценарий не найден' }, { status: 404 })
    }

    // Получить следующий сквозной номер запуска
    const lastTestRun = await db.testRun.findFirst({
      orderBy: { runNumber: 'desc' }
    })
    
    const runNumber = lastTestRun ? lastTestRun.runNumber + 1 : 1

    // Создать запуск теста в базе данных  
    const testRun = await db.testRun.create({
      data: {
        scenarioId,
        teamId,
        runNumber,
        comment,
        status: 'PENDING',
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

    // Импортировать K6 функции
    const { createK6TestRun } = await import('@/lib/k6')

    const k6TestNames: string[] = []
    const failedSteps: string[] = []

    // Создать отдельный K6 TestRun для каждого шага
    for (const step of scenario.steps) {
      let k6Script = ''
      
      if (step.stepType === 'k6_script') {
        // Использовать K6 скрипт как есть
        const stepConfig = step.config as Record<string, unknown>
        if (stepConfig.script && typeof stepConfig.script === 'string') {
          k6Script = stepConfig.script
        }
      } else if (step.stepType === 'http_request') {
        // Создать базовый K6 скрипт для HTTP запроса
        const stepConfig = step.config as Record<string, unknown>
        if (stepConfig.url && typeof stepConfig.url === 'string') {
          k6Script = `
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 },
  ],
};

export default function() {
  let response = http.get('${stepConfig.url}');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });${stepConfig.delay && typeof stepConfig.delay === 'number' ? `\n  sleep(${stepConfig.delay});` : ''}
}
`
        }
      }

      // Пропустить шаги без скрипта
      if (!k6Script.trim()) {
        continue
      }

      // Создать запись шага в базе данных
      const testRunStep = await db.testRunStep.create({
        data: {
          testRunId: testRun.id,
          scenarioStepId: step.id,
          stepName: step.name,
          stepOrder: step.stepOrder,
          stepType: step.stepType,
          status: 'PENDING'
        }
      })

      try {
        // Get parallelism from step config, fallback to global parallelism, then default to 1
        const stepConfig = step.config as Record<string, unknown>
        const stepParallelism = (stepConfig.parallelism as number) || parsedParallelism || 1
        
        // Создать K6 TestRun для этого шага
        const k6TestName = await createK6TestRun({
          teamId,
          teamNickname: testRun.team.nickname,
          scenarioId,
          scenarioIdentifier: testRun.scenario.identifier,
          stepName: step.name,
          stepOrder: step.stepOrder,
          runNumber,
          k6Script,
          parallelism: stepParallelism,
          environmentVars: team.k6EnvironmentVars ? team.k6EnvironmentVars as Record<string, string> : undefined
        })

        // Обновить запись шага с именем K6 теста
        await db.testRunStep.update({
          where: { id: testRunStep.id },
          data: {
            k6TestName,
            status: 'RUNNING',
            startedAt: new Date()
          }
        })

        k6TestNames.push(k6TestName)
      } catch (error) {
        console.error(`Failed to create K6 TestRun for step ${step.name}:`, error)
        
        // Обновить статус шага на FAILED
        await db.testRunStep.update({
          where: { id: testRunStep.id },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        })
        
        failedSteps.push(step.name)
      }
    }

    // Определить финальный статус на основе результатов
    let finalStatus: 'RUNNING' | 'FAILED' = 'RUNNING'
    if (k6TestNames.length === 0) {
      finalStatus = 'FAILED'
    }

    try {
      // Обновить запись в базе данных
      const updatedTestRun = await db.testRun.update({
        where: { id: testRun.id },
        data: {
          k6TestName: k6TestNames.join(','), // Сохранить все имена тестов через запятую
          status: finalStatus,
          startedAt: finalStatus === 'RUNNING' ? new Date() : undefined
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

      await logger.info(LogAction.CREATE, 'TestRun', `Запущено ${k6TestNames.length} K6 тестов: ${scenario.name} для команды ${team.name} (запуск #${runNumber})`, {
        userEmail: session.user.email,
        entityId: testRun.id
      })

      // Вернуть результат с информацией об успешных и неудачных шагах
      const result = {
        ...updatedTestRun,
        k6TestNames,
        failedSteps,
        totalSteps: scenario.steps.filter(step => step.stepType === 'k6_script' || step.stepType === 'http_request').length,
        successfulSteps: k6TestNames.length
      }

      if (failedSteps.length > 0) {
        return NextResponse.json(result, { status: 207 }) // 207 Multi-Status для частично успешного выполнения
      }

      if (finalStatus === 'FAILED') {
        return NextResponse.json(
          { ...result, error: 'Не удалось создать ни одного K6 теста' },
          { status: 500 }
        )
      }

      return NextResponse.json(result, { status: 201 })
    } catch (k6Error) {
      // Если обновление базы данных не удалось
      console.error('Database update failed:', k6Error)
      return NextResponse.json(
        { error: 'Не удалось обновить статус теста' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error creating test run:', error)
    return NextResponse.json(
      { error: 'Ошибка при создании запуска теста' },
      { status: 500 }
    )
  }
}