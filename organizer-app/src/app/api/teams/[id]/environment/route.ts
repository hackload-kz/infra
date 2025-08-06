import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { logger, LogAction } from '@/lib/logger'
import { environmentDataSchema } from '@/lib/validations/environment'
import { maskSensitiveValue } from '@/lib/service-keys'
import { notifyTeamEnvironmentUpdate } from '@/lib/journal'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId } = await params

    // Get user and check team membership or organizer status
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { participant: true }
    })

    if (!user?.participant) {
      return NextResponse.json({ error: 'Participant profile not found' }, { status: 404 })
    }

    const isOrganizerUser = await isOrganizer(session.user.email)
    
    // Check if user is team member or organizer
    const team = await db.team.findUnique({
      where: { id: teamId },
      include: { 
        members: { where: { id: user.participant.id } },
        leader: true
      }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const isTeamMember = team.members.length > 0 || team.leader?.id === user.participant.id
    
    if (!isTeamMember && !isOrganizerUser) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch environment data
    const environmentData = await db.teamEnvironmentData.findMany({
      where: { teamId },
      orderBy: [
        { category: 'asc' },
        { key: 'asc' }
      ]
    })

    // Get unique categories for filtering
    const categories = [...new Set(environmentData.map(item => item.category).filter(Boolean))]

    // Mask sensitive data for non-organizers
    const maskedData = environmentData.map(item => ({
      ...item,
      value: maskSensitiveValue(item.value, item.isSecure, isOrganizerUser)
    }))

    await logger.info(LogAction.READ, 'TeamEnvironment', 
      `Environment data accessed for team ${teamId}`, {
        metadata: { 
          teamId, 
          userId: user.id, 
          isOrganizer: isOrganizerUser, 
          dataKeys: environmentData.map(d => d.key)
        }
      })

    return NextResponse.json({
      data: maskedData,
      categories
    })

  } catch (error) {
    await logger.error(LogAction.READ, 'TeamEnvironment', 
      `Error fetching environment data: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        metadata: { error: error instanceof Error ? error.stack : error }
      })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId } = await params

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

    // Check if team exists
    const team = await db.team.findUnique({
      where: { id: teamId }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Create environment data entry
    const environmentData = await db.teamEnvironmentData.create({
      data: {
        ...validatedData,
        teamId,
        createdBy: user?.participant?.id
      }
    })

    // Log audit trail
    await logger.info(LogAction.CREATE, 'TeamEnvironment', 
      `Environment data created for team ${teamId}`, {
        metadata: { 
          teamId, 
          key: validatedData.key, 
          category: validatedData.category, 
          isSecure: validatedData.isSecure, 
          createdBy: user?.participant?.id 
        }
      })

    // Notify team members
    await notifyTeamEnvironmentUpdate(teamId, [validatedData.key])

    return NextResponse.json(environmentData, { status: 201 })

  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Key already exists for this team' },
        { status: 409 }
      )
    }

    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const validationError = error as { issues: Array<{ path: string[], code: string, message: string }> }
      if (validationError.issues && Array.isArray(validationError.issues)) {
        const firstIssue = validationError.issues[0]
        if (firstIssue?.path?.includes('key') && firstIssue?.code === 'invalid_string') {
          return NextResponse.json(
            { error: 'Ключ должен содержать только буквы, цифры, подчеркивания и дефисы' },
            { status: 400 }
          )
        }
        return NextResponse.json(
          { error: firstIssue?.message || 'Validation error' },
          { status: 400 }
        )
      }
    }

    await logger.error(LogAction.CREATE, 'TeamEnvironment', 
      `Error creating environment data: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        metadata: { error: error instanceof Error ? error.stack : error }
      })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}