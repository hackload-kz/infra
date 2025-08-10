import { db } from '@/lib/db'
import { randomBytes } from 'crypto'

/**
 * Distributed lock manager using database for coordination between multiple app replicas
 */

// Generate unique instance ID for this app replica
const INSTANCE_ID = `${process.env.NODE_ENV || 'development'}-${process.env.HOSTNAME || 'localhost'}-${process.pid}-${randomBytes(4).toString('hex')}`

export interface LockOptions {
  lockName: string
  ttlMs?: number // Time-to-live in milliseconds (default: 60 seconds)
  heartbeatIntervalMs?: number // Heartbeat interval (default: 15 seconds)
  acquireTimeoutMs?: number // Max time to wait for lock acquisition (default: 5 seconds)
  metadata?: Record<string, unknown>
}

export interface DistributedLockResult {
  acquired: boolean
  instanceId?: string
  expiresAt?: Date
  error?: string
}

export class DistributedLockManager {
  private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Attempt to acquire a distributed lock
   */
  async acquireLock(options: LockOptions): Promise<DistributedLockResult> {
    const {
      lockName,
      ttlMs = 60000, // 60 seconds default
      heartbeatIntervalMs = 15000, // 15 seconds default
      acquireTimeoutMs = 5000, // 5 seconds default
      metadata = {}
    } = options

    const expiresAt = new Date(Date.now() + ttlMs)
    const timeoutAt = Date.now() + acquireTimeoutMs

    // Try to acquire lock with retry logic
    while (Date.now() < timeoutAt) {
      try {
        // Clean up expired locks first
        await this.cleanupExpiredLocks()

        // Try to create new lock (will fail if lock already exists and is active)
        const lock = await db.distributedLock.create({
          data: {
            lockName,
            instanceId: INSTANCE_ID,
            expiresAt,
            heartbeatAt: new Date(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            metadata: (metadata as any) || null
          }
        })

        // Start heartbeat to keep lock alive
        this.startHeartbeat(lockName, heartbeatIntervalMs)

        return {
          acquired: true,
          instanceId: INSTANCE_ID,
          expiresAt: lock.expiresAt
        }

      } catch (error: unknown) {
        // Check if it's a unique constraint violation (lock already exists)
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
          // Lock exists, check if it's expired or owned by us
          try {
            const existingLock = await db.distributedLock.findUnique({
              where: { lockName }
            })

            if (existingLock) {
              // Check if we already own this lock
              if (existingLock.instanceId === INSTANCE_ID) {
                // We already own the lock, extend it
                const updatedLock = await db.distributedLock.update({
                  where: { lockName },
                  data: {
                    expiresAt: new Date(Date.now() + ttlMs),
                    heartbeatAt: new Date(),
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
            metadata: (metadata as any) || null
                  }
                })

                // Start heartbeat if not already running
                if (!this.heartbeatTimers.has(lockName)) {
                  this.startHeartbeat(lockName, heartbeatIntervalMs)
                }

                return {
                  acquired: true,
                  instanceId: INSTANCE_ID,
                  expiresAt: updatedLock.expiresAt
                }
              }

              // Check if lock is expired
              if (existingLock.expiresAt < new Date()) {
                // Try to take over expired lock
                try {
                  const updatedLock = await db.distributedLock.update({
                    where: {
                      lockName,
                      expiresAt: existingLock.expiresAt // Optimistic locking
                    },
                    data: {
                      instanceId: INSTANCE_ID,
                      acquiredAt: new Date(),
                      expiresAt: new Date(Date.now() + ttlMs),
                      heartbeatAt: new Date(),
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
            metadata: (metadata as any) || null
                    }
                  })

                  this.startHeartbeat(lockName, heartbeatIntervalMs)

                  return {
                    acquired: true,
                    instanceId: INSTANCE_ID,
                    expiresAt: updatedLock.expiresAt
                  }
                } catch {
                  // Someone else took the lock, continue trying
                }
              }
            }
          } catch (findError) {
            console.warn(`Error checking existing lock for ${lockName}:`, findError)
          }
        } else {
          console.error(`Unexpected error acquiring lock ${lockName}:`, error)
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return {
      acquired: false,
      error: 'Lock acquisition timeout'
    }
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(lockName: string): Promise<boolean> {
    try {
      // Stop heartbeat first
      this.stopHeartbeat(lockName)

      // Delete the lock if we own it
      const result = await db.distributedLock.deleteMany({
        where: {
          lockName,
          instanceId: INSTANCE_ID
        }
      })

      return result.count > 0
    } catch (error) {
      console.error(`Error releasing lock ${lockName}:`, error)
      return false
    }
  }

  /**
   * Check if we currently hold a lock
   */
  async hasLock(lockName: string): Promise<boolean> {
    try {
      const lock = await db.distributedLock.findFirst({
        where: {
          lockName,
          instanceId: INSTANCE_ID,
          expiresAt: {
            gt: new Date()
          }
        }
      })

      return !!lock
    } catch (error) {
      console.error(`Error checking lock ${lockName}:`, error)
      return false
    }
  }

  /**
   * Get information about a lock
   */
  async getLockInfo(lockName: string) {
    try {
      return await db.distributedLock.findUnique({
        where: { lockName }
      })
    } catch (error) {
      console.error(`Error getting lock info for ${lockName}:`, error)
      return null
    }
  }

  /**
   * Clean up expired locks
   */
  async cleanupExpiredLocks(): Promise<number> {
    try {
      const result = await db.distributedLock.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      })

      if (result.count > 0) {
        console.log(`Cleaned up ${result.count} expired locks`)
      }

      return result.count
    } catch (error) {
      console.error('Error cleaning up expired locks:', error)
      return 0
    }
  }

  /**
   * Start heartbeat to keep lock alive
   */
  private startHeartbeat(lockName: string, intervalMs: number) {
    // Clear existing heartbeat if any
    this.stopHeartbeat(lockName)

    const heartbeatTimer = setInterval(async () => {
      try {
        // Update heartbeat timestamp
        await db.distributedLock.updateMany({
          where: {
            lockName,
            instanceId: INSTANCE_ID
          },
          data: {
            heartbeatAt: new Date()
          }
        })
      } catch (error) {
        console.warn(`Heartbeat failed for lock ${lockName}:`, error)
        // If heartbeat fails, stop the timer
        this.stopHeartbeat(lockName)
      }
    }, intervalMs)

    this.heartbeatTimers.set(lockName, heartbeatTimer)
  }

  /**
   * Stop heartbeat for a lock
   */
  private stopHeartbeat(lockName: string) {
    const timer = this.heartbeatTimers.get(lockName)
    if (timer) {
      clearInterval(timer)
      this.heartbeatTimers.delete(lockName)
    }
  }

  /**
   * Get current instance ID
   */
  getInstanceId(): string {
    return INSTANCE_ID
  }

  /**
   * Release all locks held by this instance
   */
  async releaseAllLocks(): Promise<number> {
    try {
      // Stop all heartbeats
      for (const [lockName] of this.heartbeatTimers) {
        this.stopHeartbeat(lockName)
      }

      // Release all locks held by this instance
      const result = await db.distributedLock.deleteMany({
        where: {
          instanceId: INSTANCE_ID
        }
      })

      console.log(`Released ${result.count} locks for instance ${INSTANCE_ID}`)
      return result.count
    } catch (error) {
      console.error('Error releasing all locks:', error)
      return 0
    }
  }

  /**
   * Get all active locks
   */
  async getAllActiveLocks() {
    try {
      return await db.distributedLock.findMany({
        where: {
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: {
          acquiredAt: 'asc'
        }
      })
    } catch (error) {
      console.error('Error getting all active locks:', error)
      return []
    }
  }
}

// Singleton instance
export const distributedLockManager = new DistributedLockManager()

// Utility functions for common lock operations
export async function withLock<T>(
  lockName: string,
  operation: () => Promise<T>,
  options?: Omit<LockOptions, 'lockName'>
): Promise<T | null> {
  const lockResult = await distributedLockManager.acquireLock({
    lockName,
    ...options
  })

  if (!lockResult.acquired) {
    console.warn(`Failed to acquire lock ${lockName}: ${lockResult.error}`)
    return null
  }

  try {
    console.log(`✓ Acquired lock ${lockName} (instance: ${lockResult.instanceId})`)
    return await operation()
  } finally {
    await distributedLockManager.releaseLock(lockName)
    console.log(`✓ Released lock ${lockName}`)
  }
}