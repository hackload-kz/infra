import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { logger, LogAction } from '@/lib/logger'
import { serviceKeyUpdateSchema } from '@/lib/validations/environment'

export async function PUT(
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

    // Validate request body
    const body = await request.json()
    const validatedData = serviceKeyUpdateSchema.parse(body)

    // Check if service key exists
    const existingKey = await db.serviceApiKey.findUnique({
      where: { id: keyId }
    })

    if (!existingKey) {
      return NextResponse.json({ error: 'Service key not found' }, { status: 404 })
    }

    // Update service key
    const updatedKey = await db.serviceApiKey.update({
      where: { id: keyId },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.permissions && { permissions: validatedData.permissions }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
        ...(validatedData.expiresAt !== undefined && { 
          expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null 
        })
      }
    })

    // Log audit trail
    await logger.info(LogAction.UPDATE, 'ServiceApiKey', 
      `Service API key updated: ${updatedKey.name}`, {
        metadata: { 
          keyId,
          keyName: updatedKey.name,
          permissions: updatedKey.permissions,
          isActive: updatedKey.isActive,
          updatedBy: user?.participant?.id
        }
      })

    return NextResponse.json({
      id: updatedKey.id,
      name: updatedKey.name,
      keyPrefix: updatedKey.keyPrefix,
      description: updatedKey.description,
      permissions: updatedKey.permissions,
      isActive: updatedKey.isActive,
      lastUsedAt: updatedKey.lastUsedAt,
      expiresAt: updatedKey.expiresAt,
      createdAt: updatedKey.createdAt,
      updatedAt: updatedKey.updatedAt
    })

  } catch (error) {
    await logger.error(LogAction.UPDATE, 'ServiceApiKey', 
      `Error updating service key: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        metadata: { error: error instanceof Error ? error.stack : error }
      })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Get existing key for audit logging
    const existingKey = await db.serviceApiKey.findUnique({
      where: { id: keyId }
    })

    if (!existingKey) {
      return NextResponse.json({ error: 'Service key not found' }, { status: 404 })
    }

    // Delete service key (usage logs will be cascade deleted)
    await db.serviceApiKey.delete({
      where: { id: keyId }
    })

    // Log audit trail
    await logger.info(LogAction.DELETE, 'ServiceApiKey', 
      `Service API key deleted: ${existingKey.name}`, {
        metadata: { 
          keyId,
          keyName: existingKey.name,
          deletedBy: user?.participant?.id
        }
      })

    return NextResponse.json({ message: 'API key deleted successfully' })

  } catch (error) {
    await logger.error(LogAction.DELETE, 'ServiceApiKey', 
      `Error deleting service key: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        metadata: { error: error instanceof Error ? error.stack : error }
      })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}