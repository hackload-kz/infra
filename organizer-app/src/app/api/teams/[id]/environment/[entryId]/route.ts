import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { logger, LogAction } from '@/lib/logger'
import { environmentDataSchema, teamLeaderEnvironmentUpdateSchema } from '@/lib/validations/environment'
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

    // Get user for authorization and audit logging
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { participant: true }
    })

    if (!user?.participant) {
      return NextResponse.json({ error: 'Participant profile not found' }, { status: 404 })
    }

    // Check if user is organizer or team leader
    const isOrganizerUser = isOrganizer(session.user.email)
    
    // Get team information to check leadership
    const team = await db.team.findUnique({
      where: { id: teamId },
      include: { 
        leader: true,
        members: { where: { id: user.participant.id } }
      }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const isTeamLeader = team.leader?.id === user.participant.id

    if (!isOrganizerUser && !isTeamLeader) {
      return NextResponse.json({ error: 'Access denied: Only organizers and team leaders can edit environment data' }, { status: 403 })
    }

    // Get existing entry for validation
    const existingEntry = await db.teamEnvironmentData.findUnique({
      where: { id: entryId, teamId }
    })

    if (!existingEntry) {
      return NextResponse.json({ error: 'Environment data entry not found' }, { status: 404 })
    }

    // Team leaders can only edit editable entries, organizers can edit all
    if (isTeamLeader && !isOrganizerUser && !existingEntry.isEditable) {
      return NextResponse.json({ error: 'This environment variable is read-only' }, { status: 403 })
    }

    // Validate request body based on user role
    const body = await request.json()
    let validatedData
    let updateData

    // Determine validation schema based on request content and user role
    // If the request only contains 'value' field, use team leader validation
    // This handles the case where organizers edit from team space vs admin dashboard
    const requestKeys = Object.keys(body)
    const isTeamLeaderRequest = requestKeys.length === 1 && requestKeys[0] === 'value'

    if (isOrganizerUser && !isTeamLeaderRequest) {
      // Organizers can update all fields (when using admin dashboard)
      validatedData = environmentDataSchema.parse(body)
      updateData = {
        ...validatedData,
        updatedBy: user.participant.id
      }
    } else {
      // Team leaders can only update value (or organizers using team interface)
      validatedData = teamLeaderEnvironmentUpdateSchema.parse(body)
      updateData = {
        value: validatedData.value,
        updatedBy: user.participant.id
      }
    }

    // Update environment data entry
    const updatedData = await db.teamEnvironmentData.update({
      where: { id: entryId },
      data: updateData
    })

    // Log audit trail
    await logger.info(LogAction.UPDATE, 'TeamEnvironment', 
      `Environment data updated for team ${teamId}`, {
        metadata: { 
          teamId, 
          key: existingEntry.key, 
          isOrganizerUpdate: isOrganizerUser,
          isTeamLeaderUpdate: isTeamLeader,
          updatedBy: user.participant.id,
          previousValue: 'REDACTED', // Never log actual values
          newValue: 'REDACTED'
        }
      })

    // Notify team members
    await notifyTeamEnvironmentUpdate(teamId, [existingEntry.key])

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