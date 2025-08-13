import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger, LogAction } from '@/lib/logger'
import { bulkEnvironmentUpdateSchema } from '@/lib/validations/environment'
import { 
  authenticateServiceAccount, 
  logApiKeyUsage, 
  getClientIP, 
  hasPermission 
} from '@/lib/service-keys'
import { notifyTeamEnvironmentUpdate } from '@/lib/journal'
import { maskSensitiveValue } from '@/lib/service-keys'

export async function GET(request: NextRequest) {
  let authResult: { keyId: string; permissions: string[] } | null = null
  
  try {
    // Authenticate service account
    const apiKey = request.headers.get('X-API-Key')
    authResult = await authenticateServiceAccount(apiKey)
    
    if (!authResult) {
      await logApiKeyUsage({
        keyId: 'unknown',
        endpoint: '/api/service/teams/environment',
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
        endpoint: '/api/service/teams/environment',
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
    const category = searchParams.get('category')
    
    let teams: Array<{ id: string; nickname: string; name: string }>
    
    if (teamSlug) {
      // Get specific team
      const team = await db.team.findUnique({
        where: { nickname: teamSlug },
        select: { id: true, nickname: true, name: true }
      })
      
      if (!team) {
        await logApiKeyUsage({
          keyId: authResult.keyId,
          endpoint: '/api/service/teams/environment',
          method: 'GET',
          userAgent: request.headers.get('User-Agent') || undefined,
          ipAddress: getClientIP(request.headers) || undefined,
          success: false
        })
        
        return NextResponse.json({ error: 'Team not found' }, { status: 404 })
      }
      
      teams = [team]
    } else {
      // Get all teams
      teams = await db.team.findMany({
        select: { id: true, nickname: true, name: true },
        orderBy: { nickname: 'asc' }
      })
    }

    const teamsWithEnvironment = []
    
    for (const team of teams) {
      // Fetch environment data for this team
      const environmentData = await db.teamEnvironmentData.findMany({
        where: {
          teamId: team.id,
          ...(category && { category })
        },
        orderBy: [
          { category: 'asc' },
          { key: 'asc' }
        ]
      })

      // Service API always masks sensitive data
      const maskedData = environmentData.map(item => ({
        ...item,
        value: maskSensitiveValue(item.value, item.isSecure, false)
      }))

      teamsWithEnvironment.push({
        teamId: team.id,
        teamSlug: team.nickname,
        teamName: team.name,
        environment: maskedData,
        categories: [...new Set(environmentData.map(item => item.category).filter(Boolean))]
      })
    }

    // Log successful usage
    await logApiKeyUsage({
      keyId: authResult.keyId,
      endpoint: '/api/service/teams/environment',
      method: 'GET',
      userAgent: request.headers.get('User-Agent') || undefined,
      ipAddress: getClientIP(request.headers) || undefined,
      success: true
    })

    // Log audit trail
    await logger.info(LogAction.READ, 'TeamEnvironment', 
      `Environment data accessed via service API`, {
        metadata: { 
          teamSlug: teamSlug || 'all',
          category,
          teamsCount: teams.length,
          serviceKeyId: authResult.keyId
        }
      })

    const response = {
      teams: teamsWithEnvironment,
      ...(teamSlug && { team: teamsWithEnvironment[0] })
    }

    return NextResponse.json(response)

  } catch (error) {
    // Log failed usage if we have auth info
    if (authResult) {
      await logApiKeyUsage({
        keyId: authResult.keyId,
        endpoint: '/api/service/teams/environment',
        method: 'GET',
        userAgent: request.headers.get('User-Agent') || undefined,
        ipAddress: getClientIP(request.headers) || undefined,
        success: false
      })
    }

    await logger.error(LogAction.READ, 'TeamEnvironment', 
      `Error in environment data read: ${error instanceof Error ? error.message : 'Unknown error'}`, {
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

export async function PUT(request: NextRequest) {
  let authResult: { keyId: string; permissions: string[] } | null = null
  
  try {
    // Authenticate service account
    const apiKey = request.headers.get('X-API-Key')
    authResult = await authenticateServiceAccount(apiKey)
    
    if (!authResult) {
      await logApiKeyUsage({
        keyId: 'unknown',
        endpoint: '/api/service/teams/environment',
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
        endpoint: '/api/service/teams/environment',
        method: 'PUT',
        userAgent: request.headers.get('User-Agent') || undefined,
        ipAddress: getClientIP(request.headers) || undefined,
        success: false
      })
      
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Validate request body
    const body = await request.json()
    const validatedData = bulkEnvironmentUpdateSchema.parse(body)

    // Find team by slug
    const team = await db.team.findUnique({
      where: { nickname: validatedData.teamSlug }
    })

    if (!team) {
      await logApiKeyUsage({
        keyId: authResult.keyId,
        endpoint: '/api/service/teams/environment',
        method: 'PUT',
        userAgent: request.headers.get('User-Agent') || undefined,
        ipAddress: getClientIP(request.headers) || undefined,
        success: false
      })
      
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    let updatedEntries = 0
    let createdEntries = 0
    const errors: Array<{ key: string; error: string }> = []
    const changedKeys: string[] = []

    // Process each update
    for (const update of validatedData.updates) {
      try {
        const existingEntry = await db.teamEnvironmentData.findUnique({
          where: {
            teamId_key: {
              teamId: team.id,
              key: update.key
            }
          }
        })

        if (existingEntry) {
          // Update existing entry
          await db.teamEnvironmentData.update({
            where: { id: existingEntry.id },
            data: {
              value: update.value,
              description: update.description,
              category: update.category,
              isSecure: update.isSecure
            }
          })
          updatedEntries++
        } else {
          // Create new entry
          await db.teamEnvironmentData.create({
            data: {
              teamId: team.id,
              key: update.key,
              value: update.value,
              description: update.description,
              category: update.category,
              isSecure: update.isSecure
            }
          })
          createdEntries++
        }

        changedKeys.push(update.key)

      } catch (error) {
        errors.push({
          key: update.key,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Log successful usage
    await logApiKeyUsage({
      keyId: authResult.keyId,
      endpoint: '/api/service/teams/environment',
      method: 'PUT',
      userAgent: request.headers.get('User-Agent') || undefined,
      ipAddress: getClientIP(request.headers) || undefined,
      teamId: team.id,
      success: true
    })

    // Log audit trail
    await logger.info(LogAction.UPDATE, 'TeamEnvironment', 
      `Bulk environment data update via service API for team ${team.id}`, {
        metadata: { 
          teamId: team.id, 
          teamSlug: validatedData.teamSlug,
          updatedEntries,
          createdEntries,
          changedKeys,
          serviceKeyId: authResult.keyId
        }
      })

    // Notify team members if there were any changes
    if (changedKeys.length > 0) {
      await notifyTeamEnvironmentUpdate(team.id, changedKeys)
    }

    const response = {
      teamId: team.id,
      updatedEntries,
      createdEntries,
      ...(errors.length > 0 && { errors })
    }

    return NextResponse.json(response)

  } catch (error) {
    // Log failed usage if we have auth info
    if (authResult) {
      await logApiKeyUsage({
        keyId: authResult.keyId,
        endpoint: '/api/service/teams/environment',
        method: 'PUT',
        userAgent: request.headers.get('User-Agent') || undefined,
        ipAddress: getClientIP(request.headers) || undefined,
        success: false
      })
    }

    await logger.error(LogAction.UPDATE, 'TeamEnvironment', 
      `Error in bulk environment data update: ${error instanceof Error ? error.message : 'Unknown error'}`, {
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