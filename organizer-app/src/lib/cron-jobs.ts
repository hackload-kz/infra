import { syncK6TestRunSteps } from './k6-status-sync'
import { withLock, distributedLockManager } from './distributed-lock'

let syncInterval: NodeJS.Timeout | null = null
let cleanupInterval: NodeJS.Timeout | null = null

// Configurable sync interval - default 20 seconds, can be overridden by environment variable
const getSyncIntervalMs = (): number => {
  const envInterval = process.env.K6_SYNC_INTERVAL_SECONDS
  if (envInterval) {
    const parsed = parseInt(envInterval, 10)
    if (!isNaN(parsed) && parsed >= 5 && parsed <= 300) {
      return parsed * 1000
    }
  }
  return 20000 // 20 seconds default
}

/**
 * Запустить автоматическую синхронизацию K6 шагов с настраиваемым интервалом
 */
export function startK6StepsSyncJob(customIntervalMs?: number) {
  if (syncInterval) {
    console.log('K6 steps sync job already running')
    return
  }

  const intervalMs = customIntervalMs || getSyncIntervalMs()
  const intervalSeconds = Math.round(intervalMs / 1000)

  console.log(`Starting K6 steps sync job (every ${intervalSeconds} seconds)`)
  
  // Запустить немедленно
  runSyncWithErrorHandling()
  
  // Затем по расписанию
  syncInterval = setInterval(() => {
    runSyncWithErrorHandling()
  }, intervalMs)
}

/**
 * Остановить автоматическую синхронизацию
 */
export function stopK6StepsSyncJob() {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
    console.log('K6 steps sync job stopped')
  }
}

/**
 * Запустить автоматическую очистку истекших блокировок
 */
export function startLockCleanupJob() {
  if (cleanupInterval) {
    console.log('Lock cleanup job already running')
    return
  }

  // Run cleanup every 5 minutes
  const cleanupIntervalMs = 5 * 60 * 1000 // 5 minutes
  
  console.log('Starting distributed lock cleanup job (every 5 minutes)')
  
  // Run immediately
  runLockCleanupWithErrorHandling()
  
  // Then every 5 minutes
  cleanupInterval = setInterval(() => {
    runLockCleanupWithErrorHandling()
  }, cleanupIntervalMs)
}

/**
 * Остановить автоматическую очистку блокировок
 */
export function stopLockCleanupJob() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
    console.log('Lock cleanup job stopped')
  }
}

/**
 * Проверить, запущена ли джоба очистки блокировок
 */
export function isLockCleanupJobRunning(): boolean {
  return cleanupInterval !== null
}

/**
 * Выполнить очистку истекших блокировок с обработкой ошибок
 */
async function runLockCleanupWithErrorHandling() {
  try {
    const startTime = Date.now()
    const timestamp = new Date().toISOString()
    const instanceId = distributedLockManager.getInstanceId()
    
    const cleanedCount = await distributedLockManager.cleanupExpiredLocks()
    
    const duration = Date.now() - startTime
    
    if (cleanedCount > 0) {
      console.log(`🧹 [${timestamp}] [${instanceId}] Cleaned up ${cleanedCount} expired locks (${duration}ms)`)
    } else {
      console.log(`🧹 [${timestamp}] [${instanceId}] No expired locks to clean up (${duration}ms)`)
    }
    
  } catch (error) {
    const timestamp = new Date().toISOString()
    const instanceId = distributedLockManager.getInstanceId()
    console.error(`💥 [${timestamp}] [${instanceId}] Lock cleanup failed:`, error)
  }
}

/**
 * Проверить, запущена ли джоба
 */
export function isK6StepsSyncJobRunning(): boolean {
  return syncInterval !== null
}

/**
 * Выполнить синхронизацию с обработкой ошибок и распределенной блокировкой
 */
async function runSyncWithErrorHandling() {
  const lockName = 'k6-steps-sync'
  const instanceId = distributedLockManager.getInstanceId()
  
  try {
    const startTime = Date.now()
    const timestamp = new Date().toISOString()
    console.log(`⏰ [${timestamp}] [${instanceId}] Attempting to acquire sync lock...`)
    
    // Execute sync within distributed lock
    const result = await withLock(
      lockName,
      async () => {
        const syncStartTime = Date.now()
        const syncTimestamp = new Date().toISOString()
        console.log(`🔒 [${syncTimestamp}] [${instanceId}] Lock acquired, starting K6 steps sync...`)
        
        const syncResult = await syncK6TestRunSteps()
        
        const syncDuration = Date.now() - syncStartTime
        const summary = {
          total: syncResult.totalSteps,
          updated: syncResult.updatedSteps,
          errors: syncResult.errorSteps,
          logsUpdated: syncResult.results.filter(r => r.logsUpdated).length,
          duration: `${syncDuration}ms`,
          instance: instanceId
        }
        
        console.log(`✅ [${new Date().toISOString()}] [${instanceId}] K6 steps sync completed:`, summary)
        
        // Логировать ошибки, если есть
        if (syncResult.errorSteps > 0) {
          const errorSteps = syncResult.results.filter(r => r.error)
          console.warn(`❌ [${new Date().toISOString()}] [${instanceId}] Steps with errors:`, errorSteps.map(s => ({
            step: s.stepName,
            k6TestName: s.k6TestName,
            error: s.error
          })))
        }
        
        // Логировать обновленные логи
        if (summary.logsUpdated > 0) {
          console.log(`📋 [${new Date().toISOString()}] [${instanceId}] Updated logs for ${summary.logsUpdated} steps`)
        }
        
        // Если нет активных шагов
        if (syncResult.totalSteps === 0) {
          console.log(`😴 [${new Date().toISOString()}] [${instanceId}] No active K6 steps to sync`)
        }
        
        return syncResult
      },
      {
        ttlMs: 90000, // 90 seconds TTL (longer than default sync interval)
        heartbeatIntervalMs: 20000, // 20 seconds heartbeat
        acquireTimeoutMs: 2000, // 2 seconds timeout for lock acquisition
        metadata: {
          operation: 'k6-steps-sync',
          instanceId,
          startedAt: new Date().toISOString()
        }
      }
    )
    
    if (result === null) {
      // Failed to acquire lock - another replica is probably running the sync
      const duration = Date.now() - startTime
      console.log(`🔒 [${new Date().toISOString()}] [${instanceId}] Sync skipped - lock held by another instance (${duration}ms)`)
    }
    
  } catch (error) {
    const timestamp = new Date().toISOString()
    console.error(`💥 [${timestamp}] [${instanceId}] Scheduled K6 sync failed:`, error)
    
    // Можно добавить алерты или отправку в мониторинг
    // await sendAlertToSlack('K6 sync failed', error.message)
    // await sendMetricToPrometheus('k6_sync_failures_total', 1)
  }
}

/**
 * Получить статистику работы джобы
 */
export async function getK6StepsSyncJobInfo() {
  const intervalMs = getSyncIntervalMs()
  const intervalSeconds = Math.round(intervalMs / 1000)
  const instanceId = distributedLockManager.getInstanceId()
  
  // Get lock information
  let lockInfo = null
  try {
    lockInfo = await distributedLockManager.getLockInfo('k6-steps-sync')
  } catch (error) {
    console.warn('Failed to get lock info:', error)
  }
  
  return {
    isRunning: isK6StepsSyncJobRunning(),
    intervalMs: intervalMs,
    intervalSeconds: intervalSeconds,
    nextRunIn: syncInterval ? `< ${intervalSeconds}s` : 'not scheduled',
    configuredVia: process.env.K6_SYNC_INTERVAL_SECONDS ? 'environment variable' : 'default (20s)',
    instanceId: instanceId,
    distributedLock: lockInfo ? {
      currentHolder: lockInfo.instanceId,
      isOwnedByThisInstance: lockInfo.instanceId === instanceId,
      acquiredAt: lockInfo.acquiredAt,
      expiresAt: lockInfo.expiresAt,
      lastHeartbeat: lockInfo.heartbeatAt
    } : null
  }
}