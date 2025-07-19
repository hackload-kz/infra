import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { logger, LogAction } from '@/lib/logger'
import { generateApiKey, hashApiKey, getKeyPrefix } from '@/lib/service-keys'

export async function POST(
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

    // Get user for audit logging
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { participant: true }
    })

    // Check if service key exists
    const existingKey = await db.serviceApiKey.findUnique({
      where: { id: keyId }
    })

    if (!existingKey) {
      return NextResponse.json({ error: 'Service key not found' }, { status: 404 })
    }

    // Generate new API key
    const newApiKey = generateApiKey()
    const newKeyHash = await hashApiKey(newApiKey)
    const newKeyPrefix = getKeyPrefix(newApiKey)

    // Update service key with new hash and prefix
    const updatedKey = await db.serviceApiKey.update({
      where: { id: keyId },
      data: {
        keyHash: newKeyHash,
        keyPrefix: newKeyPrefix,
        lastUsedAt: null // Reset last used timestamp
      }
    })

    // Log audit trail
    await logger.info(LogAction.UPDATE, 'ServiceApiKey', 
      `Service API key regenerated: ${updatedKey.name}`, {
        metadata: { 
          keyId,
          keyName: updatedKey.name,
          newKeyPrefix,
          regeneratedBy: user?.participant?.id
        }
      })

    // Return response with new API key (only shown once!)
    return NextResponse.json({
      id: updatedKey.id,
      apiKey: newApiKey, // New key - only shown once!
      keyPrefix: newKeyPrefix
    })

  } catch (error) {
    await logger.error(LogAction.UPDATE, 'ServiceApiKey', 
      `Error regenerating service key: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        metadata: { error: error instanceof Error ? error.stack : error }
      })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}