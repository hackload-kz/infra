import { db } from '@/lib/db'
import { logger, LogAction } from '@/lib/logger'

export interface CleanupOptions {
  maxAge?: number // in milliseconds, default: 7 days
  batchSize?: number // default: 100
  dryRun?: boolean // default: false
}

export async function cleanupOldDeclinedRequests(options: CleanupOptions = {}) {
  const {
    maxAge = 7 * 24 * 60 * 60 * 1000, // 7 days
    batchSize = 100,
    dryRun = false
  } = options

  const cutoffDate = new Date(Date.now() - maxAge)

  try {
    // Find old declined requests
    const oldRequests = await db.joinRequest.findMany({
      where: {
        status: 'DECLINED',
        createdAt: { lt: cutoffDate }
      },
      take: batchSize,
      select: {
        id: true,
        createdAt: true,
        participant: {
          select: {
            id: true,
            name: true,
            email: true
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

    if (oldRequests.length === 0) {
      console.log('🧹 No old declined requests to clean up')
      return { deleted: 0, found: 0 }
    }

    console.log(`🧹 Found ${oldRequests.length} old declined requests to clean up`)

    if (dryRun) {
      console.log('🧹 DRY RUN: Would delete the following requests:')
      oldRequests.forEach(request => {
        console.log(`  - ${request.id}: ${request.participant.name} -> ${request.team.name} (${request.createdAt.toISOString()})`)
      })
      return { deleted: 0, found: oldRequests.length }
    }

    // Delete old declined requests
    const deleteResult = await db.joinRequest.deleteMany({
      where: {
        id: { in: oldRequests.map(r => r.id) }
      }
    })

    // Log cleanup action
    await logger.info(LogAction.DELETE, 'JoinRequest', `Cleaned up ${deleteResult.count} old declined join requests`, {
      metadata: {
        deletedCount: deleteResult.count,
        cutoffDate: cutoffDate.toISOString(),
        maxAge: maxAge,
        batchSize: batchSize
      }
    })

    console.log(`🧹 Successfully cleaned up ${deleteResult.count} old declined requests`)

    return { deleted: deleteResult.count, found: oldRequests.length }
  } catch (error) {
    await logger.error(LogAction.DELETE, 'JoinRequest', `Error cleaning up old declined requests: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      metadata: { error: error instanceof Error ? error.stack : error }
    })
    throw error
  }
}

export async function cleanupOldRequestsForParticipant(participantId: string, options: CleanupOptions = {}) {
  const {
    maxAge = 24 * 60 * 60 * 1000, // 24 hours for participant-specific cleanup
    dryRun = false
  } = options

  const cutoffDate = new Date(Date.now() - maxAge)

  try {
    // Find old declined requests for this participant
    const oldRequests = await db.joinRequest.findMany({
      where: {
        participantId,
        status: 'DECLINED',
        createdAt: { lt: cutoffDate }
      },
      select: {
        id: true,
        createdAt: true,
        team: {
          select: {
            id: true,
            name: true,
            nickname: true
          }
        }
      }
    })

    if (oldRequests.length === 0) {
      return { deleted: 0, found: 0 }
    }

    console.log(`🧹 Found ${oldRequests.length} old declined requests for participant ${participantId}`)

    if (dryRun) {
      console.log('🧹 DRY RUN: Would delete the following requests:')
      oldRequests.forEach(request => {
        console.log(`  - ${request.id}: -> ${request.team.name} (${request.createdAt.toISOString()})`)
      })
      return { deleted: 0, found: oldRequests.length }
    }

    // Delete old declined requests for this participant
    const deleteResult = await db.joinRequest.deleteMany({
      where: {
        id: { in: oldRequests.map(r => r.id) }
      }
    })

    console.log(`🧹 Cleaned up ${deleteResult.count} old declined requests for participant ${participantId}`)

    return { deleted: deleteResult.count, found: oldRequests.length }
  } catch (error) {
    await logger.error(LogAction.DELETE, 'JoinRequest', `Error cleaning up old declined requests for participant ${participantId}: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      metadata: { participantId, error: error instanceof Error ? error.stack : error }
    })
    throw error
  }
}

export async function getCleanupStats() {
  try {
    const stats = await db.joinRequest.groupBy({
      by: ['status'],
      _count: { status: true },
      where: {
        createdAt: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        }
      }
    })

    const result = {
      total: 0,
      declined: 0,
      pending: 0,
      approved: 0
    }

    stats.forEach(stat => {
      result.total += stat._count.status
      result[stat.status.toLowerCase() as keyof typeof result] = stat._count.status
    })

    return result
  } catch (error) {
    await logger.error(LogAction.READ, 'JoinRequest', `Error getting cleanup stats: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      metadata: { error: error instanceof Error ? error.stack : error }
    })
    throw error
  }
}

export async function scheduleCleanup() {
  console.log('🧹 Starting scheduled cleanup of old declined join requests...')
  
  try {
    const stats = await getCleanupStats()
    console.log('🧹 Cleanup stats:', stats)
    
    if (stats.declined > 0) {
      const result = await cleanupOldDeclinedRequests({
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        batchSize: 100,
        dryRun: false
      })
      
      console.log(`🧹 Cleanup completed: ${result.deleted} requests deleted`)
      return result
    } else {
      console.log('🧹 No old declined requests to clean up')
      return { deleted: 0, found: 0 }
    }
  } catch (error) {
    console.error('🧹 Scheduled cleanup failed:', error)
    throw error
  }
}