import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { logger, LogAction } from '@/lib/logger'
import { environmentDataSchema } from '@/lib/validations/environment'
import { notifyTeamEnvironmentUpdate, notifyTeamEnvironmentDelete } from '@/lib/journal'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId, entryId } = await params

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
    const validatedData = environmentDataSchema.parse(body)

    // Get existing entry for audit logging
    const existingEntry = await db.teamEnvironmentData.findUnique({
      where: { id: entryId, teamId }
    })

    if (!existingEntry) {
      return NextResponse.json({ error: 'Environment data entry not found' }, { status: 404 })
    }

    // Update environment data entry
    const updatedData = await db.teamEnvironmentData.update({
      where: { id: entryId },
      data: {
        ...validatedData,
        updatedBy: user?.participant?.id
      }
    })

    // Log audit trail
    await logger.info(LogAction.UPDATE, 'TeamEnvironment', 
      `Environment data updated for team ${teamId}`, {
        metadata: { 
          teamId, 
          key: validatedData.key, 
          category: validatedData.category, 
          isSecure: validatedData.isSecure, 
          updatedBy: user?.participant?.id,
          previousValue: 'REDACTED', // Never log actual values
          newValue: 'REDACTED'
        }
      })

    // Notify team members
    await notifyTeamEnvironmentUpdate(teamId, [validatedData.key])

    return NextResponse.json(updatedData)

  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Key already exists for this team' },
        { status: 409 }
      )
    }

    await logger.error(LogAction.UPDATE, 'TeamEnvironment', 
      `Error updating environment data: ${error instanceof Error ? error.message : 'Unknown error'}`, {
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
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId, entryId } = await params

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

    // Get existing entry for audit logging
    const existingEntry = await db.teamEnvironmentData.findUnique({
      where: { id: entryId, teamId }
    })

    if (!existingEntry) {
      return NextResponse.json({ error: 'Environment data entry not found' }, { status: 404 })
    }

    // Delete environment data entry
    await db.teamEnvironmentData.delete({
      where: { id: entryId }
    })

    // Log audit trail
    await logger.info(LogAction.DELETE, 'TeamEnvironment', 
      `Environment data deleted for team ${teamId}`, {
        metadata: { 
          teamId, 
          key: existingEntry.key, 
          category: existingEntry.category, 
          deletedBy: user?.participant?.id 
        }
      })

    // Notify team members
    await notifyTeamEnvironmentDelete(teamId, [existingEntry.key])

    return NextResponse.json({ message: 'Entry deleted successfully' })

  } catch (error) {
    await logger.error(LogAction.DELETE, 'TeamEnvironment', 
      `Error deleting environment data: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        metadata: { error: error instanceof Error ? error.stack : error }
      })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}