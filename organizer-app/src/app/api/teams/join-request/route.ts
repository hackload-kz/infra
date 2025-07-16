import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { messageService } from '@/lib/messages'
import { generateJoinRequestNotificationMessage } from '@/lib/message-templates'
import { logger, LogAction } from '@/lib/logger'
import { urlBuilder } from '@/lib/urls'

const createJoinRequestSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
  message: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    await logger.logApiCall('POST', '/api/teams/join-request', session?.user?.email || undefined);
    
    if (!session?.user?.email) {
      await logger.warn(LogAction.READ, 'API', 'Unauthorized access attempt', {
        userEmail: session?.user?.email || undefined,
        metadata: { endpoint: '/api/teams/join-request', method: 'POST' }
      });
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

    // Check if participant is active
    if (!participant.isActive) {
      return NextResponse.json({ error: 'Your account is inactive and cannot join teams' }, { status: 403 })
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

    // Get current hackathon (using same logic as dashboard)
    const hackathon = await db.hackathon.findFirst({
      where: { slug: 'hackload-2025' }
    })
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
        team: {
          include: {
            leader: true
          }
        }
      }
    })

    await logger.logCreate('JoinRequest', joinRequest.id, session.user.email, 'Join request created', {
      teamId: teamId,
      participantId: participant.id,
      hackathonId: hackathon.id
    });

    console.info(`📩 Join request sent: ${session.user.email} sent join request to team ${joinRequest.team.name} (@${joinRequest.team.nickname})`);

    // Send notification message to team
    try {
      console.log('📧 Starting join request notification process...')
      console.log('📧 Team ID:', teamId)
      console.log('📧 Team members count:', team.members.length)
      console.log('📧 Hackathon ID:', hackathon.id)
      console.log('📧 Participant ID:', participant.id)
      
      const joinRequestUrl = urlBuilder.space.team()
      const participantProfileUrl = urlBuilder.space.participants(participant.id)
      
      const messageTemplate = generateJoinRequestNotificationMessage({
        participant,
        team: joinRequest.team,
        joinRequest,
        joinRequestUrl,
        participantProfileUrl
      })

      console.log('📧 Generated message body length:', messageTemplate.text.length)
      console.log('📧 Message subject:', `🔔 Новая заявка на вступление в команду "${team.name}"`)

      const messages = await messageService.sendToTeam(
        teamId,
        `🔔 Новая заявка на вступление в команду "${team.name}"`,
        messageTemplate.text,
        undefined, // system message
        hackathon.id
      )

      console.log('📧 Successfully sent notifications to team members:', messages.length)
      console.log('📧 Message IDs:', messages.map(m => m.id))
    } catch (error) {
      console.error('❌ Failed to send join request notification:', error)
      console.error('❌ Error details:', {
        teamId,
        participantId: participant.id,
        hackathonId: hackathon.id,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      // Don't fail the request creation if notification fails
    }

    return NextResponse.json(joinRequest, { status: 201 })
  } catch (error) {
    console.error('Error creating join request:', error)
    
    const session = await auth();
    await logger.logApiError('POST', '/api/teams/join-request', error as Error, session?.user?.email || undefined);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}