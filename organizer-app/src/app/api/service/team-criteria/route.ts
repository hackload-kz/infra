import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger, LogAction } from '@/lib/logger'
import { bulkCriteriaUpdateSchema } from '@/lib/validations/team-criteria'
import { CriteriaType } from '@prisma/client'
import { 
  authenticateServiceAccount, 
  logApiKeyUsage, 
  getClientIP, 
  hasPermission 
} from '@/lib/service-keys'

export async function POST(request: NextRequest) {
  let authResult: { keyId: string; permissions: string[] } | null = null
  
  try {
    // Authenticate service account
    const apiKey = request.headers.get('X-API-Key')
    authResult = await authenticateServiceAccount(apiKey)
    
    if (!authResult) {
      await logApiKeyUsage({
        keyId: 'unknown',
        endpoint: '/api/service/team-criteria',
        method: 'POST',
        userAgent: request.headers.get('User-Agent') || undefined,
        ipAddress: getClientIP(request.headers) || undefined,
        success: false
      })
      
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    // Check permissions - use environment:write as criteria permissions
    if (!hasPermission(authResult.permissions, 'environment:write')) {
      await logApiKeyUsage({
        keyId: authResult.keyId,
        endpoint: '/api/service/team-criteria',
        method: 'POST',
        userAgent: request.headers.get('User-Agent') || undefined,
        ipAddress: getClientIP(request.headers) || undefined,
        success: false
      })
      
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Validate request body
    const body = await request.json()
    const validatedData = bulkCriteriaUpdateSchema.parse(body)

    let updatedEntries = 0
    let createdEntries = 0
    const errors: Array<{ teamSlug: string; criteriaType: string; error: string }> = []
    const processedTeams: string[] = []

    // Process each update
    for (const update of validatedData.updates) {
      try {
        // Find team by slug
        const team = await db.team.findUnique({
          where: { nickname: update.teamSlug },
          include: { hackathon: true }
        })

        if (!team) {
          errors.push({
            teamSlug: update.teamSlug,
            criteriaType: update.criteriaType,
            error: 'Team not found'
          })
          continue
        }

        // Validate hackathon ID matches
        if (team.hackathonId !== update.hackathonId) {
          errors.push({
            teamSlug: update.teamSlug,
            criteriaType: update.criteriaType,
            error: 'Hackathon ID mismatch'
          })
          continue
        }

        // Check if criteria entry exists
        const existingCriteria = await db.teamCriteria.findUnique({
          where: {
            teamId_hackathonId_criteriaType: {
              teamId: team.id,
              hackathonId: update.hackathonId,
              criteriaType: update.criteriaType
            }
          }
        })

        if (existingCriteria) {
          // Update existing criteria
          await db.$transaction(async (tx) => {
            // Update main record
            await tx.teamCriteria.update({
              where: { id: existingCriteria.id },
              data: {
                status: update.status,
                score: update.score,
                metrics: update.metrics,
                lastUpdated: new Date(),
                updatedBy: update.updatedBy
              }
            })

            // Create history entry
            await tx.teamCriteriaHistory.create({
              data: {
                teamCriteriaId: existingCriteria.id,
                status: update.status,
                score: update.score,
                metrics: update.metrics,
                updatedBy: update.updatedBy
              }
            })
          })
          
          updatedEntries++
        } else {
          // Create new criteria entry
          await db.$transaction(async (tx) => {
            const newCriteria = await tx.teamCriteria.create({
              data: {
                teamId: team.id,
                hackathonId: update.hackathonId,
                criteriaType: update.criteriaType,
                status: update.status,
                score: update.score,
                metrics: update.metrics,
                updatedBy: update.updatedBy
              }
            })

            // Create initial history entry
            await tx.teamCriteriaHistory.create({
              data: {
                teamCriteriaId: newCriteria.id,
                status: update.status,
                score: update.score,
                metrics: update.metrics,
                updatedBy: update.updatedBy
              }
            })
          })
          
          createdEntries++
        }

        if (!processedTeams.includes(team.id)) {
          processedTeams.push(team.id)
        }

      } catch (error) {
        errors.push({
          teamSlug: update.teamSlug,
          criteriaType: update.criteriaType,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Log successful usage
    await logApiKeyUsage({
      keyId: authResult.keyId,
      endpoint: '/api/service/team-criteria',
      method: 'POST',
      userAgent: request.headers.get('User-Agent') || undefined,
      ipAddress: getClientIP(request.headers) || undefined,
      success: true
    })

    // Log audit trail
    await logger.info(LogAction.UPDATE, 'TeamCriteria', 
      `Bulk team criteria update via service API`, {
        metadata: { 
          updatedEntries,
          createdEntries,
          processedTeams: processedTeams.length,
          serviceKeyId: authResult.keyId,
          totalUpdates: validatedData.updates.length
        }
      })

    const response = {
      updatedEntries,
      createdEntries,
      processedTeams: processedTeams.length,
      totalRequests: validatedData.updates.length,
      ...(errors.length > 0 && { errors })
    }

    return NextResponse.json(response)

  } catch (error) {
    // Log failed usage if we have auth info
    if (authResult) {
      await logApiKeyUsage({
        keyId: authResult.keyId,
        endpoint: '/api/service/team-criteria',
        method: 'POST',
        userAgent: request.headers.get('User-Agent') || undefined,
        ipAddress: getClientIP(request.headers) || undefined,
        success: false
      })
    }

    await logger.error(LogAction.UPDATE, 'TeamCriteria', 
      `Error in bulk team criteria update: ${error instanceof Error ? error.message : 'Unknown error'}`, {
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

export async function GET(request: NextRequest) {
  let authResult: { keyId: string; permissions: string[] } | null = null
  
  try {
    // Authenticate service account
    const apiKey = request.headers.get('X-API-Key')
    authResult = await authenticateServiceAccount(apiKey)
    
    if (!authResult) {
      await logApiKeyUsage({
        keyId: 'unknown',
        endpoint: '/api/service/team-criteria',
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
        endpoint: '/api/service/team-criteria',
        method: 'GET',
        userAgent: request.headers.get('User-Agent') || undefined,
        ipAddress: getClientIP(request.headers) || undefined,
        success: false
      })
      
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const teamSlug = searchParams.get('team')
    const hackathonId = searchParams.get('hackathon')
    const criteriaType = searchParams.get('criteriaType')
    
    // Build where clause
    const whereClause: {
      teamId?: string
      hackathonId?: string
      criteriaType?: CriteriaType
    } = {}
    
    if (teamSlug) {
      const team = await db.team.findUnique({
        where: { nickname: teamSlug },
        select: { id: true }
      })
      
      if (!team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 })
      }
      
      whereClause.teamId = team.id
    }
    
    if (hackathonId) {
      whereClause.hackathonId = hackathonId
    }
    
    if (criteriaType && Object.values(CriteriaType).includes(criteriaType as CriteriaType)) {
      whereClause.criteriaType = criteriaType as CriteriaType
    }

    // Fetch criteria data
    const criteria = await db.teamCriteria.findMany({
      where: whereClause,
      include: {
        team: {
          select: { id: true, nickname: true, name: true }
        },
        hackathon: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { hackathonId: 'desc' },
        { team: { nickname: 'asc' } },
        { criteriaType: 'asc' }
      ]
    })

    // Log successful usage
    await logApiKeyUsage({
      keyId: authResult.keyId,
      endpoint: '/api/service/team-criteria',
      method: 'GET',
      userAgent: request.headers.get('User-Agent') || undefined,
      ipAddress: getClientIP(request.headers) || undefined,
      success: true
    })

    // Log audit trail
    await logger.info(LogAction.READ, 'TeamCriteria', 
      `Team criteria data accessed via service API`, {
        metadata: { 
          teamSlug: teamSlug || 'all',
          hackathonId: hackathonId || 'all',
          criteriaType: criteriaType || 'all',
          resultsCount: criteria.length,
          serviceKeyId: authResult.keyId
        }
      })

    return NextResponse.json({ criteria })

  } catch (error) {
    // Log failed usage if we have auth info
    if (authResult) {
      await logApiKeyUsage({
        keyId: authResult.keyId,
        endpoint: '/api/service/team-criteria',
        method: 'GET',
        userAgent: request.headers.get('User-Agent') || undefined,
        ipAddress: getClientIP(request.headers) || undefined,
        success: false
      })
    }

    await logger.error(LogAction.READ, 'TeamCriteria', 
      `Error in team criteria read: ${error instanceof Error ? error.message : 'Unknown error'}`, {
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