import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger, LogAction } from '@/lib/logger'
import { 
  authenticateServiceAccount, 
  logApiKeyUsage, 
  getClientIP, 
  hasPermission 
} from '@/lib/service-keys'

export async function GET(request: NextRequest) {
  let authResult: { keyId: string; permissions: string[] } | null = null
  
  try {
    // Authenticate service account
    const apiKey = request.headers.get('X-API-Key')
    authResult = await authenticateServiceAccount(apiKey)
    
    if (!authResult) {
      await logApiKeyUsage({
        keyId: 'unknown',
        endpoint: '/api/service/teams',
        method: 'GET',
        userAgent: request.headers.get('User-Agent') || undefined,
        ipAddress: getClientIP(request.headers) || undefined,
        success: false
      })
      
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    // Check permissions
    if (!hasPermission(authResult.permissions, 'teams:read')) {
      await logApiKeyUsage({
        keyId: authResult.keyId,
        endpoint: '/api/service/teams',
        method: 'GET',
        userAgent: request.headers.get('User-Agent') || undefined,
        ipAddress: getClientIP(request.headers) || undefined,
        success: false
      })
      
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const hackathonId = searchParams.get('hackathonId')
    const status = searchParams.get('status') || 'APPROVED' // Default to APPROVED teams only
    
    // Build where clause
    const whereClause: Record<string, unknown> = {
      status: status, // Filter by team status (APPROVED by default)
    }
    
    if (hackathonId) {
      whereClause.hackathonId = hackathonId
    }

    // Fetch teams with APPROVED status (or specified status)
    const teams = await db.team.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        nickname: true,
        hackathonId: true,
        status: true,
        level: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        nickname: 'asc'
      }
    })

    // Log successful usage
    await logApiKeyUsage({
      keyId: authResult.keyId,
      endpoint: '/api/service/teams',
      method: 'GET',
      userAgent: request.headers.get('User-Agent') || undefined,
      ipAddress: getClientIP(request.headers) || undefined,
      success: true
    })

    // Log audit trail
    await logger.info(LogAction.READ, 'Team', 
      `Teams accessed via service API`, {
        metadata: { 
          status,
          hackathonId,
          teamsCount: teams.length,
          serviceKeyId: authResult.keyId
        }
      })

    return NextResponse.json({
      teams,
      count: teams.length,
      status: status
    })

  } catch (error) {
    // Log failed usage if we have auth info
    if (authResult) {
      await logApiKeyUsage({
        keyId: authResult.keyId,
        endpoint: '/api/service/teams',
        method: 'GET',
        userAgent: request.headers.get('User-Agent') || undefined,
        ipAddress: getClientIP(request.headers) || undefined,
        success: false
      })
    }

    await logger.error(LogAction.READ, 'Team', 
      `Error in teams read: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        metadata: { 
          error: error instanceof Error ? error.stack : error,
          serviceKeyId: authResult?.keyId
        }
      })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}