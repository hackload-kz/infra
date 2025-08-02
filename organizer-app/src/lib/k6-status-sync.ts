import { db } from '@/lib/db'
import { getK6TestRunStatus, mapK6StageToStatus } from '@/lib/k6'
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
          if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(newStatus) && !testRun.completedAt) {
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

// Функция для запуска синхронизации через API endpoint
export async function runK6StatusSync(): Promise<{ syncedCount: number; errorCount: number; message: string }> {
  try {
    await syncK6TestRunStatuses()
    return {
      syncedCount: 0, // TODO: возвращать реальные счетчики
      errorCount: 0,
      message: 'K6 TestRun status synchronization completed successfully'
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