import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger, LogAction } from '@/lib/logger'
import { environmentDataSchema } from '@/lib/validations/environment'
import { 
  authenticateServiceAccount, 
  logApiKeyUsage, 
  getClientIP, 
  hasPermission 
} from '@/lib/service-keys'
import { notifyTeamEnvironmentUpdate } from '@/lib/journal'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamSlug: string; key: string }> }
) {
  let authResult: { keyId: string; permissions: string[] } | null = null
  
  try {
    const { teamSlug, key } = await params

    // Authenticate service account
    const apiKey = request.headers.get('X-API-Key')
    authResult = await authenticateServiceAccount(apiKey)
    
    if (!authResult) {
      await logApiKeyUsage({
        keyId: 'unknown',
        endpoint: `/api/service/teams/${teamSlug}/environment/${key}`,
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
        endpoint: `/api/service/teams/${teamSlug}/environment/${key}`,
        method: 'PUT',
        userAgent: request.headers.get('User-Agent') || undefined,
        ipAddress: getClientIP(request.headers) || undefined,
        success: false
      })
      
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Find team by slug
    const team = await db.team.findUnique({
      where: { nickname: teamSlug }
    })

    if (!team) {
      await logApiKeyUsage({
        keyId: authResult.keyId,
        endpoint: `/api/service/teams/${teamSlug}/environment/${key}`,
        method: 'PUT',
        userAgent: request.headers.get('User-Agent') || undefined,
        ipAddress: getClientIP(request.headers) || undefined,
        success: false
      })
      
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Validate request body
    const body = await request.json()
    const updateData = {
      key,
      value: body.value,
      description: body.description,
      category: body.category,
      isSecure: body.isSecure
    }
    const validatedData = environmentDataSchema.parse(updateData)

    // Check if entry exists
    const existingEntry = await db.teamEnvironmentData.findUnique({
      where: {
        teamId_key: {
          teamId: team.id,
          key
        }
      }
    })

    let environmentData
    if (existingEntry) {
      // Update existing entry
      environmentData = await db.teamEnvironmentData.update({
        where: { id: existingEntry.id },
        data: {
          value: validatedData.value,
          description: validatedData.description,
          category: validatedData.category,
          isSecure: validatedData.isSecure
        }
      })
    } else {
      // Create new entry
      environmentData = await db.teamEnvironmentData.create({
        data: {
          teamId: team.id,
          key: validatedData.key,
          value: validatedData.value,
          description: validatedData.description,
          category: validatedData.category,
          isSecure: validatedData.isSecure
        }
      })
    }

    // Log successful usage
    await logApiKeyUsage({
      keyId: authResult.keyId,
      endpoint: `/api/service/teams/${teamSlug}/environment/${key}`,
      method: 'PUT',
      userAgent: request.headers.get('User-Agent') || undefined,
      ipAddress: getClientIP(request.headers) || undefined,
      teamId: team.id,
      success: true
    })

    // Log audit trail
    await logger.info(LogAction.UPDATE, 'TeamEnvironment', 
      `Environment data updated via service API for team ${team.id}`, {
        metadata: { 
          teamId: team.id, 
          teamSlug,
          key,
          category: validatedData.category,
          isSecure: validatedData.isSecure,
          serviceKeyId: authResult.keyId,
          operation: existingEntry ? 'update' : 'create'
        }
      })

    // Notify team members
    await notifyTeamEnvironmentUpdate(team.id, [key])

    return NextResponse.json(environmentData)

  } catch (error) {
    // Log failed usage if we have auth info
    if (authResult) {
      const { teamSlug, key } = await params
      await logApiKeyUsage({
        keyId: authResult.keyId,
        endpoint: `/api/service/teams/${teamSlug}/environment/${key}`,
        method: 'PUT',
        userAgent: request.headers.get('User-Agent') || undefined,
        ipAddress: getClientIP(request.headers) || undefined,
        success: false
      })
    }

    await logger.error(LogAction.UPDATE, 'TeamEnvironment', 
      `Error in single environment data update: ${error instanceof Error ? error.message : 'Unknown error'}`, {
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