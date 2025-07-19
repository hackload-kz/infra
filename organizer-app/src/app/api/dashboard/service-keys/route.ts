import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { logger, LogAction } from '@/lib/logger'
import { serviceKeySchema } from '@/lib/validations/environment'
import { generateApiKey, hashApiKey, getKeyPrefix } from '@/lib/service-keys'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is organizer
    const isOrganizerUser = await isOrganizer(session.user.email)
    if (!isOrganizerUser) {
      return NextResponse.json({ error: 'Organizer access required' }, { status: 403 })
    }

    // Get all service keys with usage statistics
    const serviceKeys = await db.serviceApiKey.findMany({
      include: {
        _count: {
          select: {
            usageLogs: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const keys = serviceKeys.map(key => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      description: key.description,
      permissions: key.permissions,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
      usageCount: key._count.usageLogs
    }))

    return NextResponse.json({ keys })

  } catch (error) {
    await logger.error(LogAction.READ, 'ServiceApiKey', 
      `Error fetching service keys: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        metadata: { error: error instanceof Error ? error.stack : error }
      })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is organizer
    const isOrganizerUser = await isOrganizer(session.user.email)
    if (!isOrganizerUser) {
      return NextResponse.json({ error: 'Organizer access required' }, { status: 403 })
    }

    // Get user for audit logging
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { participant: true }
    })

    // Validate request body
    const body = await request.json()
    const validatedData = serviceKeySchema.parse(body)

    // Generate API key
    const apiKey = generateApiKey()
    const keyHash = await hashApiKey(apiKey)
    const keyPrefix = getKeyPrefix(apiKey)

    // Create service key
    const serviceKey = await db.serviceApiKey.create({
      data: {
        name: validatedData.name,
        keyHash,
        keyPrefix,
        description: validatedData.description,
        permissions: validatedData.permissions,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
        createdBy: user?.participant?.id
      }
    })

    // Log audit trail
    await logger.info(LogAction.CREATE, 'ServiceApiKey', 
      `Service API key created: ${validatedData.name}`, {
        metadata: { 
          keyId: serviceKey.id,
          keyName: validatedData.name,
          keyPrefix,
          permissions: validatedData.permissions,
          expiresAt: validatedData.expiresAt,
          createdBy: user?.participant?.id
        }
      })

    // Return response with full API key (only shown once!)
    return NextResponse.json({
      id: serviceKey.id,
      apiKey, // Full key - only shown once!
      keyPrefix,
      name: serviceKey.name,
      permissions: serviceKey.permissions,
      expiresAt: serviceKey.expiresAt
    }, { status: 201 })

  } catch (error) {
    await logger.error(LogAction.CREATE, 'ServiceApiKey', 
      `Error creating service key: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        metadata: { error: error instanceof Error ? error.stack : error }
      })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}