import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const createJoinRequestSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
  message: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { teamId, message } = createJoinRequestSchema.parse(body)

    // Get the participant
    const participant = await db.participant.findFirst({
      where: { user: { email: session.user.email } }
    })

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    // Check if participant is already in a team
    if (participant.teamId) {
      return NextResponse.json({ error: 'You are already in a team' }, { status: 400 })
    }

    // Check if team exists and has space
    const team = await db.team.findUnique({
      where: { id: teamId },
      include: { 
        members: true,
        joinRequests: {
          where: { status: 'PENDING' }
        }
      }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    if (team.members.length >= 4) {
      return NextResponse.json({ error: 'Team is full' }, { status: 400 })
    }

    // Check if team is in a joinable status
    if (!['NEW', 'INCOMPLETED'].includes(team.status)) {
      return NextResponse.json({ error: 'Team is not accepting new members' }, { status: 400 })
    }

    // Get current hackathon
    const { getCurrentHackathon } = await import('@/lib/hackathon')
    const hackathon = await getCurrentHackathon()
    if (!hackathon) {
      return NextResponse.json({ error: 'No active hackathon found' }, { status: 400 })
    }

    // Check if participant already has a pending request for this team
    const existingRequest = await db.joinRequest.findUnique({
      where: {
        participantId_teamId_hackathonId: {
          participantId: participant.id,
          teamId: teamId,
          hackathonId: hackathon.id
        }
      }
    })

    if (existingRequest) {
      return NextResponse.json({ error: 'You already have a pending request for this team' }, { status: 400 })
    }

    // Create the join request
    const joinRequest = await db.joinRequest.create({
      data: {
        participantId: participant.id,
        teamId: teamId,
        hackathonId: hackathon.id,
        message: message || null
      },
      include: {
        participant: true,
        team: true
      }
    })

    return NextResponse.json(joinRequest, { status: 201 })
  } catch (error) {
    console.error('Error creating join request:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}