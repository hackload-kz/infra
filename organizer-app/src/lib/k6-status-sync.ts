import { db } from '@/lib/db'
import { getK6TestRunLogs, getK6TestRunStatus, mapK6StageToStatus, getK6TestRunActualStatus } from '@/lib/k6'
import { logger, LogAction } from '@/lib/logger'

export interface K6TestRunStatus {
  metadata: {
    name: string
    namespace: string
    labels?: {
      team?: string
      scenario?: string
    }
  }
  status?: {
    stage?: string
    conditions?: Array<{
      type: string
      status: string
      lastTransitionTime: string
    }>
  }
}

interface StepSyncResult {
  stepId: string
  stepName: string
  k6TestName: string | null
  oldStatus: string
  newStatus: string
  updated: boolean
  logsUpdated: boolean
  error?: string
}

interface SyncSummary {
  totalSteps: number
  updatedSteps: number
  errorSteps: number
  results: StepSyncResult[]
}

export async function syncK6TestRunStatuses(): Promise<void> {
  try {
    console.log('Starting K6 TestRun status synchronization...')
    
    // Получить все активные TestRun из базы данных
    const activeTestRuns = await db.testRun.findMany({
      where: {
        status: {
          in: ['PENDING', 'RUNNING']
        },
        k6TestName: {
          not: null
        }
      },
      include: {
        team: { select: { name: true } },
        scenario: { select: { name: true } }
      }
    })

    console.log(`Found ${activeTestRuns.length} active test runs to sync`)

    let syncedCount = 0
    let errorCount = 0

    for (const testRun of activeTestRuns) {
      if (!testRun.k6TestName) continue

      try {
        // Получить статус K6 TestRun из Kubernetes
        const k6Status = await getK6TestRunStatus(testRun.k6TestName) as K6TestRunStatus
        
        if (!k6Status.status?.stage) {
          continue // Пропустить если статус не определен
        }

        // Преобразовать K6 статус в статус базы данных
        const newStatus = mapK6StageToStatus(k6Status.status.stage)
        
        // Обновить только если статус изменился
        if (testRun.status !== newStatus) {
          const updateData: {
            status: typeof newStatus
            completedAt?: Date
            startedAt?: Date
          } = {
            status: newStatus
          }

          // Установить время завершения для финальных статусов
          if (['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(newStatus) && !testRun.completedAt) {
            updateData.completedAt = new Date()
          }

          // Установить время начала для статуса RUNNING
          if (newStatus === 'RUNNING' && !testRun.startedAt) {
            updateData.startedAt = new Date()
          }

          await db.testRun.update({
            where: { id: testRun.id },
            data: updateData
          })

          await logger.info(LogAction.UPDATE, 'TestRun', 
            `Синхронизирован статус K6 теста: ${testRun.scenario.name} для команды ${testRun.team.name} (${testRun.status} → ${newStatus})`, 
            {
              userEmail: 'system',
              entityId: testRun.id
            }
          )

          syncedCount++
        }

      } catch (error) {
        console.error(`Error syncing test run ${testRun.id} (${testRun.k6TestName}):`, error)
        errorCount++

        // Если K6 TestRun не найден (404), пометить как FAILED
        if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
          await db.testRun.update({
            where: { id: testRun.id },
            data: {
              status: 'FAILED',
              completedAt: new Date()
            }
          })

          await logger.info(LogAction.UPDATE, 'TestRun', 
            `K6 тест не найден, помечен как FAILED: ${testRun.scenario.name} для команды ${testRun.team.name}`, 
            {
              userEmail: 'system',
              entityId: testRun.id
            }
          )
        }
      }
    }

    console.log(`K6 TestRun status sync completed: ${syncedCount} synced, ${errorCount} errors`)

  } catch (error) {
    console.error('Error during K6 TestRun status synchronization:', error)
    throw error
  }
}

/**
 * Синхронизирует статусы активных шагов TestRun с ресурсами K6 в Kubernetes
 * Проверяет все шаги со статусами PENDING, RUNNING
 */
export async function syncK6TestRunSteps(): Promise<SyncSummary> {
  const summary: SyncSummary = {
    totalSteps: 0,
    updatedSteps: 0,
    errorSteps: 0,
    results: []
  }

  try {
    // Получить все активные шаги (PENDING, RUNNING) и недавно завершенные без логов
    const activeSteps = await db.testRunStep.findMany({
      where: {
        OR: [
          // Активные шаги
          {
            status: {
              in: ['PENDING', 'RUNNING']
            }
          },
          // Завершенные шаги без логов (за последние 2 часа)
          {
            status: {
              in: ['SUCCEEDED', 'FAILED', 'CANCELLED']
            },
            containerLogs: null,
            completedAt: {
              gte: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 часа назад
            }
          }
        ],
        k6TestName: {
          not: null
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    summary.totalSteps = activeSteps.length
    
    if (activeSteps.length > 0) {
      console.log(`📊 Found ${activeSteps.length} step(s) to process:`)
      activeSteps.forEach(step => {
        const logStatus = step.containerLogs ? `${step.containerLogs.length} chars` : 'no logs'
        console.log(`   - ${step.stepName} (${step.status}) K6:${step.k6TestName} [${logStatus}]`)
      })
    }

    for (const step of activeSteps) {
      const result: StepSyncResult = {
        stepId: step.id,
        stepName: step.stepName,
        k6TestName: step.k6TestName,
        oldStatus: step.status,
        newStatus: step.status,
        updated: false,
        logsUpdated: false
      }

      try {
        if (!step.k6TestName) {
          result.error = 'K6 test name is null'
          summary.errorSteps++
          summary.results.push(result)
          continue
        }

        // Проверить статус K6 TestRun с проверкой статусов подов для finished тестов
        const newStatus = await getK6TestRunActualStatus(step.k6TestName)
        
        result.newStatus = newStatus

        // Обновить статус и время завершения если изменился
        const updateData: {
          lastStatusCheck: Date
          status?: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'DELETED'
          completedAt?: Date
          containerLogs?: string
        } = {
          lastStatusCheck: new Date()
        }

        if (newStatus !== step.status) {
          updateData.status = newStatus
          result.updated = true
          summary.updatedSteps++

          // Установить время завершения для финальных статусов
          if (['SUCCEEDED', 'FAILED', 'CANCELLED', 'DELETED'].includes(newStatus)) {
            updateData.completedAt = new Date()
          }
        }

        // Получить и обновить логи (всегда обновляем при изменении статуса или если логи пустые)
        try {
          console.log(`🔍 Attempting to collect logs for step: ${step.stepName} (K6: ${step.k6TestName})`)
          console.log(`   Current log status: ${step.containerLogs ? `${step.containerLogs.length} chars` : 'no logs'}`)
          
          const logs = await getK6TestRunLogs(step.k6TestName, 1000)
          
          if (logs) {
            console.log(`📋 Retrieved logs: ${logs.length} characters`)
            if (logs !== step.containerLogs || result.updated || !step.containerLogs) {
              updateData.containerLogs = logs
              result.logsUpdated = true
              console.log(`✅ Logs will be updated in database`)
            } else {
              console.log(`ℹ️  Logs unchanged, skipping database update`)
            }
          } else {
            console.log(`❌ No logs retrieved for ${step.k6TestName}`)
          }
        } catch (logError) {
          console.warn(`Failed to get logs for step ${step.stepName}:`, logError)
        }

        // Обновить запись в базе данных
        await db.testRunStep.update({
          where: { id: step.id },
          data: updateData
        })

      } catch (error) {
        result.error = error instanceof Error ? error.message : 'Unknown error'
        summary.errorSteps++
        console.error(`Failed to sync step ${step.stepName}:`, error)
      }

      summary.results.push(result)
    }

    // Обновить статус родительских TestRun на основе статусов шагов
    await updateTestRunStatuses()

  } catch (error) {
    console.error('Failed to sync K6 test run steps:', error)
    throw error
  }

  return summary
}

/**
 * Обновляет статусы TestRun на основе статусов их шагов
 */
async function updateTestRunStatuses(): Promise<void> {
  try {
    // Получить все TestRun с активными шагами
    const testRuns = await db.testRun.findMany({
      where: {
        status: {
          in: ['PENDING', 'RUNNING']
        }
      },
      include: {
        steps: true
      }
    })

    for (const testRun of testRuns) {
      if (testRun.steps.length === 0) {
        continue
      }

      const stepStatuses = testRun.steps.map(step => step.status)
      let newStatus = testRun.status

      // Определить новый статус на основе статусов шагов
      if (stepStatuses.every(status => ['SUCCEEDED', 'FAILED', 'CANCELLED', 'DELETED'].includes(status))) {
        // Все шаги завершены
        if (stepStatuses.every(status => status === 'SUCCEEDED')) {
          newStatus = 'SUCCEEDED'
        } else {
          newStatus = 'FAILED'
        }
      } else if (stepStatuses.some(status => status === 'RUNNING')) {
        // Есть запущенные шаги
        newStatus = 'RUNNING'
      }

      // Обновить статус если изменился
      if (newStatus !== testRun.status) {
        const updateData: {
          status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
          completedAt?: Date
        } = {
          status: newStatus as 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
        }

        if (['SUCCEEDED', 'FAILED'].includes(newStatus)) {
          updateData.completedAt = new Date()
        }

        await db.testRun.update({
          where: { id: testRun.id },
          data: updateData
        })
      }
    }
  } catch (error) {
    console.error('Failed to update test run statuses:', error)
  }
}

/**
 * Получить детальную информацию о шаге с логами
 */
export async function getTestRunStepDetails(stepId: string) {
  try {
    const step = await db.testRunStep.findUnique({
      where: { id: stepId },
      include: {
        testRun: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                nickname: true
              }
            },
            scenario: {
              select: {
                id: true,
                name: true,
                identifier: true
              }
            }
          }
        }
      }
    })

    if (!step) {
      return null
    }

    // Попытаться получить свежие логи если шаг активен
    let currentLogs = step.containerLogs
    if (step.k6TestName && ['PENDING', 'RUNNING'].includes(step.status)) {
      try {
        const freshLogs = await getK6TestRunLogs(step.k6TestName, 1000)
        if (freshLogs) {
          currentLogs = freshLogs
          
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

    return {
      ...step,
      containerLogs: currentLogs
    }
  } catch (error) {
    console.error(`Failed to get step details for ${stepId}:`, error)
    throw error
  }
}

// Функция для запуска синхронизации через API endpoint
export async function runK6StatusSync(): Promise<{ syncedCount: number; errorCount: number; message: string }> {
  try {
    // Запустить как синхронизацию шагов, так и старую синхронизацию TestRun
    const stepSyncResult = await syncK6TestRunSteps()
    await syncK6TestRunStatuses()
    
    return {
      syncedCount: stepSyncResult.updatedSteps,
      errorCount: stepSyncResult.errorSteps,
      message: `K6 status synchronization completed: ${stepSyncResult.updatedSteps} steps updated, ${stepSyncResult.errorSteps} errors`
    }
  } catch (error) {
    console.error('K6 status sync failed:', error)
    return {
      syncedCount: 0,
      errorCount: 1,
      message: `K6 status sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}