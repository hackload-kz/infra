import { auth } from '@/auth'
import { isOrganizer } from '@/lib/admin'
import { NextRequest, NextResponse } from 'next/server'
import { distributedLockManager } from '@/lib/distributed-lock'

// GET /api/dashboard/load-testing/distributed-locks - Get all active locks
export async function GET(_request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const organizer = await isOrganizer(session.user.email)
    if (!organizer) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    const activeLocks = await distributedLockManager.getAllActiveLocks()
    const currentInstanceId = distributedLockManager.getInstanceId()

    return NextResponse.json({
      success: true,
      currentInstanceId,
      activeLocks: activeLocks.map(lock => ({
        ...lock,
        isOwnedByCurrentInstance: lock.instanceId === currentInstanceId,
        isExpired: lock.expiresAt < new Date(),
        timeToExpiry: lock.expiresAt.getTime() - Date.now()
      })),
      totalActiveLocks: activeLocks.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error getting distributed locks:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении информации о блокировках' },
      { status: 500 }
    )
  }
}

// DELETE /api/dashboard/load-testing/distributed-locks - Clean up expired locks
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const organizer = await isOrganizer(session.user.email)
    if (!organizer) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { action, lockName } = body

    let result: { message: string; count?: number; lockName?: string } = { message: '' }

    if (action === 'cleanup-expired') {
      // Clean up all expired locks
      const cleanedCount = await distributedLockManager.cleanupExpiredLocks()
      result = {
        message: `Удалено ${cleanedCount} истекших блокировок`,
        count: cleanedCount
      }
    } else if (action === 'release-own-locks') {
      // Release all locks held by current instance
      const releasedCount = await distributedLockManager.releaseAllLocks()
      result = {
        message: `Освобождено ${releasedCount} блокировок текущего экземпляра`,
        count: releasedCount
      }
    } else if (action === 'force-release' && lockName) {
      // Force release specific lock (admin only)
      try {
        await distributedLockManager.releaseLock(lockName)
        result = {
          message: `Блокировка ${lockName} принудительно освобождена`,
          lockName
        }
      } catch (error) {
        result = {
          message: `Ошибка при освобождении блокировки ${lockName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          lockName
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Неверное действие. Допустимые: cleanup-expired, release-own-locks, force-release' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error managing distributed locks:', error)
    return NextResponse.json(
      { error: 'Ошибка при управлении блокировками' },
      { status: 500 }
    )
  }
}