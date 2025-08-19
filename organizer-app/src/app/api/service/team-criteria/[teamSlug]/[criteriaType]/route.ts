import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger, LogAction } from '@/lib/logger'
import { singleCriteriaUpdateSchema } from '@/lib/validations/team-criteria'
import { CriteriaType } from '@prisma/client'
import { 
  authenticateServiceAccount, 
  logApiKeyUsage, 
  getClientIP, 
  hasPermission 
} from '@/lib/service-keys'

interface RouteParams {
  params: Promise<{
    teamSlug: string
    criteriaType: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { teamSlug, criteriaType } = await params
  let authResult: { keyId: string; permissions: string[] } | null = null
  
  try {
    // Authenticate service account
    const apiKey = request.headers.get('X-API-Key')
    authResult = await authenticateServiceAccount(apiKey)
    
    if (!authResult) {
      await logApiKeyUsage({
        keyId: 'unknown',
        endpoint: `/api/service/team-criteria/${teamSlug}/${criteriaType}`,
        method: 'GET',
        userAgent: request.headers.get('User-Agent') || undefined,
        ipAddress: getClientIP(request.headers) || undefined,
        success: false
      })
      
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    // Check permissions
    if (!hasPermission(authResult.permissions, 'environment:read')) {
      await logApiKeyUsage({
        keyId: authResult.keyId,
        endpoint: `/api/service/team-criteria/${teamSlug}/${criteriaType}`,
        method: 'GET',
        userAgent: request.headers.get('User-Agent') || undefined,
        ipAddress: getClientIP(request.headers) || undefined,
        success: false
      })
      
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Validate criteria type
    if (!Object.values(CriteriaType).includes(criteriaType as CriteriaType)) {
      return NextResponse.json({ error: 'Invalid criteria type' }, { status: 400 })
    }

    // Find team by slug
    const team = await db.team.findUnique({
      where: { nickname: teamSlug },
      include: { hackathon: true }
    })

    if (!team) {
      await logApiKeyUsage({
        keyId: authResult.keyId,
        endpoint: `/api/service/team-criteria/${teamSlug}/${criteriaType}`,
        method: 'GET',
        userAgent: request.headers.get('User-Agent') || undefined,
        ipAddress: getClientIP(request.headers) || undefined,
        success: false
      })
      
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Find criteria
    const criteria = await db.teamCriteria.findUnique({
      where: {
        teamId_hackathonId_criteriaType: {
          teamId: team.id,
          hackathonId: team.hackathonId,
          criteriaType: criteriaType as CriteriaType
        }
      },
      include: {
        history: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Last 10 updates
        }
      }
    })

    // Log successful usage
    await logApiKeyUsage({
      keyId: authResult.keyId,
      endpoint: `/api/service/team-criteria/${teamSlug}/${criteriaType}`,
      method: 'GET',
      userAgent: request.headers.get('User-Agent') || undefined,
      ipAddress: getClientIP(request.headers) || undefined,
      teamId: team.id,
      success: true
    })

    // Log audit trail
    await logger.info(LogAction.READ, 'TeamCriteria', 
      `Individual team criteria accessed via service API`, {
        metadata: { 
          teamId: team.id,
          teamSlug: teamSlug,
          criteriaType: criteriaType,
          found: !!criteria,
          serviceKeyId: authResult.keyId
        }
      })

    const response = {
      teamId: team.id,
      teamSlug: team.nickname,
      teamName: team.name,
      hackathonId: team.hackathonId,
      criteriaType: criteriaType,
      criteria: criteria || null
    }

    return NextResponse.json(response)

  } catch (error) {
    // Log failed usage if we have auth info
    if (authResult) {
      await logApiKeyUsage({
        keyId: authResult.keyId,
        endpoint: `/api/service/team-criteria/${teamSlug}/${criteriaType}`,
        method: 'GET',
        userAgent: request.headers.get('User-Agent') || undefined,
        ipAddress: getClientIP(request.headers) || undefined,
        success: false
      })
    }

    await logger.error(LogAction.READ, 'TeamCriteria', 
      `Error in individual team criteria read: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        metadata: { 
          teamSlug: teamSlug,
          criteriaType: criteriaType,
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

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { teamSlug, criteriaType } = await params
  let authResult: { keyId: string; permissions: string[] } | null = null
  
  try {
    // Authenticate service account
    const apiKey = request.headers.get('X-API-Key')
    authResult = await authenticateServiceAccount(apiKey)
    
    if (!authResult) {
      await logApiKeyUsage({
        keyId: 'unknown',
        endpoint: `/api/service/team-criteria/${teamSlug}/${criteriaType}`,
        method: 'PUT',
        userAgent: request.headers.get('User-Agent') || undefined,
        ipAddress: getClientIP(request.headers) || undefined,
        success: false
      })
      
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    // Check permissions
    if (!hasPermission(authResult.permissions, 'environment:write')) {
      await logApiKeyUsage({
        keyId: authResult.keyId,
        endpoint: `/api/service/team-criteria/${teamSlug}/${criteriaType}`,
        method: 'PUT',
        userAgent: request.headers.get('User-Agent') || undefined,
        ipAddress: getClientIP(request.headers) || undefined,
        success: false
      })
      
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Validate criteria type
    if (!Object.values(CriteriaType).includes(criteriaType as CriteriaType)) {
      return NextResponse.json({ error: 'Invalid criteria type' }, { status: 400 })
    }

    // Validate request body
    const body = await request.json()
    console.log(`[${new Date().toISOString()}] [TEAM_CRITERIA_API] Received update for ${teamSlug}/${criteriaType}:`, JSON.stringify(body, null, 2))
    const validatedData = singleCriteriaUpdateSchema.parse(body)

    // Find team by slug
    const team = await db.team.findUnique({
      where: { nickname: teamSlug },
      include: { hackathon: true }
    })

    if (!team) {
      await logApiKeyUsage({
        keyId: authResult.keyId,
        endpoint: `/api/service/team-criteria/${teamSlug}/${criteriaType}`,
        method: 'PUT',
        userAgent: request.headers.get('User-Agent') || undefined,
        ipAddress: getClientIP(request.headers) || undefined,
        success: false
      })
      
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Check if criteria entry exists
    const existingCriteria = await db.teamCriteria.findUnique({
      where: {
        teamId_hackathonId_criteriaType: {
          teamId: team.id,
          hackathonId: team.hackathonId,
          criteriaType: criteriaType as CriteriaType
        }
      }
    })

    let updatedCriteria

    if (existingCriteria) {
      // Update existing criteria
      updatedCriteria = await db.$transaction(async (tx) => {
        // Update main record
        const updated = await tx.teamCriteria.update({
          where: { id: existingCriteria.id },
          data: {
            status: validatedData.status,
            score: validatedData.score,
            metrics: validatedData.metrics,
            lastUpdated: new Date(),
            updatedBy: validatedData.updatedBy
          }
        })

        // Create history entry
        await tx.teamCriteriaHistory.create({
          data: {
            teamCriteriaId: existingCriteria.id,
            status: validatedData.status,
            score: validatedData.score,
            metrics: validatedData.metrics,
            updatedBy: validatedData.updatedBy
          }
        })

        console.log(`[${new Date().toISOString()}] [TEAM_CRITERIA_API] Updated existing criteria for ${teamSlug}/${criteriaType}:`, {
          oldStatus: existingCriteria.status,
          oldScore: existingCriteria.score,
          newStatus: validatedData.status,
          newScore: validatedData.score
        })

        return updated
      })
    } else {
      // Create new criteria entry
      updatedCriteria = await db.$transaction(async (tx) => {
        const newCriteria = await tx.teamCriteria.create({
          data: {
            teamId: team.id,
            hackathonId: team.hackathonId,
            criteriaType: criteriaType as CriteriaType,
            status: validatedData.status,
            score: validatedData.score,
            metrics: validatedData.metrics,
            updatedBy: validatedData.updatedBy
          }
        })

        // Create initial history entry
        await tx.teamCriteriaHistory.create({
          data: {
            teamCriteriaId: newCriteria.id,
            status: validatedData.status,
            score: validatedData.score,
            metrics: validatedData.metrics,
            updatedBy: validatedData.updatedBy
          }
        })

        console.log(`[${new Date().toISOString()}] [TEAM_CRITERIA_API] Created new criteria for ${teamSlug}/${criteriaType}:`, {
          status: validatedData.status,
          score: validatedData.score
        })

        return newCriteria
      })
    }

    // Log successful usage
    await logApiKeyUsage({
      keyId: authResult.keyId,
      endpoint: `/api/service/team-criteria/${teamSlug}/${criteriaType}`,
      method: 'PUT',
      userAgent: request.headers.get('User-Agent') || undefined,
      ipAddress: getClientIP(request.headers) || undefined,
      teamId: team.id,
      success: true
    })

    // Log audit trail
    await logger.info(LogAction.UPDATE, 'TeamCriteria', 
      `Individual team criteria updated via service API`, {
        metadata: { 
          teamId: team.id,
          teamSlug: teamSlug,
          criteriaType: criteriaType,
          status: validatedData.status,
          score: validatedData.score,
          wasCreated: !existingCriteria,
          serviceKeyId: authResult.keyId
        }
      })

    const response = {
      teamId: team.id,
      teamSlug: team.nickname,
      teamName: team.name,
      hackathonId: team.hackathonId,
      criteriaType: criteriaType,
      criteria: updatedCriteria,
      action: existingCriteria ? 'updated' : 'created'
    }

    console.log(`[${new Date().toISOString()}] [TEAM_CRITERIA_API] Sending response for ${teamSlug}/${criteriaType} with status 200:`, {
      action: response.action,
      finalStatus: updatedCriteria.status,
      finalScore: updatedCriteria.score,
      responseSize: JSON.stringify(response).length
    })

    return NextResponse.json(response)

  } catch (error) {
    // Log failed usage if we have auth info
    if (authResult) {
      await logApiKeyUsage({
        keyId: authResult.keyId,
        endpoint: `/api/service/team-criteria/${teamSlug}/${criteriaType}`,
        method: 'PUT',
        userAgent: request.headers.get('User-Agent') || undefined,
        ipAddress: getClientIP(request.headers) || undefined,
        success: false
      })
    }

    console.log(`[${new Date().toISOString()}] [TEAM_CRITERIA_API] ERROR in ${teamSlug}/${criteriaType} update:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : error
    })

    await logger.error(LogAction.UPDATE, 'TeamCriteria', 
      `Error in individual team criteria update: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        metadata: { 
          teamSlug: teamSlug,
          criteriaType: criteriaType,
          error: error instanceof Error ? error.stack : error,
          serviceKeyId: authResult?.keyId
        }
      })
    
    console.log(`[${new Date().toISOString()}] [TEAM_CRITERIA_API] Sending error response for ${teamSlug}/${criteriaType} with status 500`)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}