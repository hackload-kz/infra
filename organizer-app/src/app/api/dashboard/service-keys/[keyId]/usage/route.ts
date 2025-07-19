import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { logger, LogAction } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { keyId } = await params

    // Check if user is organizer
    const isOrganizerUser = await isOrganizer(session.user.email)
    if (!isOrganizerUser) {
      return NextResponse.json({ error: 'Organizer access required' }, { status: 403 })
    }

    // Get days parameter from query string (default 30)
    const url = new URL(request.url)
    const days = parseInt(url.searchParams.get('days') || '30', 10)
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Check if service key exists
    const serviceKey = await db.serviceApiKey.findUnique({
      where: { id: keyId }
    })

    if (!serviceKey) {
      return NextResponse.json({ error: 'Service key not found' }, { status: 404 })
    }

    // Get usage logs
    const usageLogs = await db.serviceApiKeyUsage.findMany({
      where: {
        keyId,
        createdAt: {
          gte: startDate
        }
      },
      include: {
        apiKey: {
          select: {
            name: true,
            keyPrefix: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 1000 // Limit to last 1000 entries
    })

    // Calculate summary statistics
    const totalRequests = usageLogs.length
    const successfulRequests = usageLogs.filter(log => log.success).length
    const failedRequests = totalRequests - successfulRequests
    const teamsAffected = new Set(usageLogs.map(log => log.teamId).filter(Boolean)).size

    // Group by endpoint for insights
    const endpointStats = usageLogs.reduce((acc, log) => {
      const endpoint = log.endpoint
      if (!acc[endpoint]) {
        acc[endpoint] = { total: 0, successful: 0, failed: 0 }
      }
      acc[endpoint].total++
      if (log.success) {
        acc[endpoint].successful++
      } else {
        acc[endpoint].failed++
      }
      return acc
    }, {} as Record<string, { total: number; successful: number; failed: number }>)

    const usage = usageLogs.map(log => ({
      id: log.id,
      endpoint: log.endpoint,
      method: log.method,
      teamId: log.teamId,
      success: log.success,
      createdAt: log.createdAt,
      userAgent: log.userAgent,
      ipAddress: log.ipAddress
    }))

    const summary = {
      totalRequests,
      successfulRequests,
      failedRequests,
      teamsAffected,
      successRate: totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 0,
      endpointStats
    }

    return NextResponse.json({
      keyId,
      keyName: serviceKey.name,
      keyPrefix: serviceKey.keyPrefix,
      usage,
      summary,
      periodDays: days
    })

  } catch (error) {
    await logger.error(LogAction.READ, 'ServiceApiKeyUsage', 
      `Error fetching service key usage: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        metadata: { error: error instanceof Error ? error.stack : error }
      })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}