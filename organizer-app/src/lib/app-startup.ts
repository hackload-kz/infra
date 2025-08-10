import { 
  startK6StepsSyncJob, 
  isK6StepsSyncJobRunning, 
  stopK6StepsSyncJob,
  startLockCleanupJob,
  isLockCleanupJobRunning,
  stopLockCleanupJob
} from './cron-jobs'
import { distributedLockManager } from './distributed-lock'

let isInitialized = false

/**
 * Инициализация фоновых процессов при запуске приложения
 */
export function initializeBackgroundJobs() {
  // Предотвратить множественную инициализацию
  if (isInitialized) {
    console.info('⚠️  Background jobs already initialized')
    return
  }

  console.info('🚀 Initializing background jobs...')
  
  // Проверить, включена ли автоматическая синхронизация (по умолчанию включена)
  const autoSyncEnabled = process.env.K6_AUTO_SYNC_ENABLED !== 'false'
  
  if (autoSyncEnabled) {
    if (!isK6StepsSyncJobRunning()) {
      startK6StepsSyncJob()
      const intervalSeconds = process.env.K6_SYNC_INTERVAL_SECONDS ? parseInt(process.env.K6_SYNC_INTERVAL_SECONDS, 10) : 20
      console.info(`✅ K6 steps auto-sync enabled (every ${intervalSeconds} seconds)`)
    } else {
      console.info('✅ K6 steps auto-sync already running')
    }
  } else {
    console.info('⏸️  K6 steps auto-sync disabled (K6_AUTO_SYNC_ENABLED=false)')
  }

  // Запустить автоматическую очистку блокировок (всегда включена)
  if (!isLockCleanupJobRunning()) {
    startLockCleanupJob()
    console.info('✅ Distributed lock cleanup enabled (every 5 minutes)')
  } else {
    console.info('✅ Distributed lock cleanup already running')
  }
  
  isInitialized = true
  console.info('🎯 Background jobs initialization completed')
}

/**
 * Остановка фоновых процессов при завершении приложения
 */
export async function shutdownBackgroundJobs() {
  console.info('🛑 Shutting down background jobs...')
  
  try {
    // Stop all background jobs first
    stopK6StepsSyncJob()
    console.info('✓ K6 sync job stopped')
    
    stopLockCleanupJob()
    console.info('✓ Lock cleanup job stopped')
    
    // Release all distributed locks held by this instance
    const releasedCount = await distributedLockManager.releaseAllLocks()
    if (releasedCount > 0) {
      console.info(`✓ Released ${releasedCount} distributed locks`)
    }
    
    // Clean up expired locks
    const cleanedCount = await distributedLockManager.cleanupExpiredLocks()
    if (cleanedCount > 0) {
      console.info(`✓ Cleaned up ${cleanedCount} expired locks`)
    }
    
  } catch (error) {
    console.error('❌ Error stopping background jobs:', error)
  }
  
  console.info('✅ Background jobs stopped')
}

// Обработчики для graceful shutdown
process.on('SIGTERM', async () => {
  console.info('Received SIGTERM, shutting down gracefully')
  await shutdownBackgroundJobs()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.info('Received SIGINT, shutting down gracefully')
  await shutdownBackgroundJobs()
  process.exit(0)
})

process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception, shutting down gracefully:', error)
  await shutdownBackgroundJobs()
  process.exit(1)
})

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled rejection, shutting down gracefully:', reason, promise)
  await shutdownBackgroundJobs()
  process.exit(1)
})