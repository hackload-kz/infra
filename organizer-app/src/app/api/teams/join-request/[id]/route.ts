import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { messageService } from '@/lib/messages'
import { generateJoinRequestResponseMessage } from '@/lib/message-templates'
import { logger, LogAction } from '@/lib/logger'
import { urlBuilder } from '@/lib/urls'

const updateJoinRequestSchema = z.object({
  action: z.enum(['approve', 'decline'])
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const resolvedParams = await params
    
    await logger.logApiCall('PUT', `/api/teams/join-request/${resolvedParams.id}`, session?.user?.email || undefined);
    
    if (!session?.user?.email) {
      await logger.warn(LogAction.READ, 'API', 'Unauthorized access attempt', {
        userEmail: session?.user?.email || undefined,
        entityId: resolvedParams.id,
        metadata: { endpoint: `/api/teams/join-request/${resolvedParams.id}`, method: 'PUT' }
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = updateJoinRequestSchema.parse(body)

    // Get the participant (team leader)
    const participant = await db.participant.findFirst({
      where: { user: { email: session.user.email } }
    })

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    // Get the join request
    const joinRequest = await db.joinRequest.findUnique({
      where: { id: resolvedParams.id },
      include: {
        participant: true,
        team: {
          include: {
            members: true,
            leader: true
          }
        }
      }
    })

    if (!joinRequest) {
      return NextResponse.json({ error: 'Join request not found' }, { status: 404 })
    }

    // Check if the current user is the team leader
    if (joinRequest.team.leaderId !== participant.id) {
      return NextResponse.json({ error: 'Only team leaders can manage join requests' }, { status: 403 })
    }

    // Check if request is still pending
    if (joinRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Join request is no longer pending' }, { status: 400 })
    }

    if (action === 'approve') {
      // Check if team has space
      if (joinRequest.team.members.length >= 4) {
        return NextResponse.json({ error: 'Team is full' }, { status: 400 })
      }

      // Check if participant is still available (not in another team) and is active
      const currentParticipant = await db.participant.findUnique({
        where: { id: joinRequest.participantId }
      })

      if (!currentParticipant) {
        return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
      }

      if (!currentParticipant.isActive) {
        return NextResponse.json({ error: 'Cannot approve join request - participant account is inactive' }, { status: 403 })
      }

      if (currentParticipant.teamId) {
        return NextResponse.json({ error: 'Participant has already joined another team' }, { status: 400 })
      }

      // Approve the request and add participant to team
      await db.$transaction([
        db.joinRequest.update({
          where: { id: resolvedParams.id },
          data: { status: 'APPROVED' }
        }),
        db.participant.update({
          where: { id: joinRequest.participantId },
          data: { teamId: joinRequest.teamId }
        })
      ])
    } else {
      // Decline the request
      await db.joinRequest.update({
        where: { id: resolvedParams.id },
        data: { status: 'DECLINED' }
      })
    }

    await logger.logStatusChange('JoinRequest', resolvedParams.id, session.user.email, 'PENDING', action === 'approve' ? 'APPROVED' : 'DECLINED');
    
    if (action === 'approve') {
      await logger.logUpdate('Participant', joinRequest.participantId, session.user.email, 'Participant joined team', {
        teamId: joinRequest.teamId,
        teamName: joinRequest.team.name
      });
      await logger.info(LogAction.UPDATE, 'JoinRequest', `Join request approved: ${session.user.email} approved ${joinRequest.participant.name} to join team ${joinRequest.team.name}`, { userEmail: session.user.email, entityId: resolvedParams.id });
    } else {
      await logger.info(LogAction.UPDATE, 'JoinRequest', `Join request declined: ${session.user.email} declined ${joinRequest.participant.name} from team ${joinRequest.team.name}`, { userEmail: session.user.email, entityId: resolvedParams.id });
    }

    // Send result message to participant
    try {
      const joinRequestUrl = urlBuilder.space.teams()
      
      const messageTemplate = generateJoinRequestResponseMessage({
        participant: joinRequest.participant,
        team: joinRequest.team,
        joinRequest,
        joinRequestUrl,
        decision: action === 'approve' ? 'approved' : 'declined'
      })

      const messageSubject = action === 'approve' 
        ? `🎉 Ваша заявка на вступление в команду "${joinRequest.team.name}" одобрена!`
        : `❌ Ваша заявка на вступление в команду "${joinRequest.team.name}" отклонена`

      await messageService.createMessage({
        subject: messageSubject,
        body: messageTemplate.text,
        senderId: undefined, // system message
        recipientId: joinRequest.participant.id,
        hackathonId: joinRequest.hackathonId
      })
    } catch (error) {
      await logger.error(LogAction.CREATE, 'Message', `Failed to send join request response notification: ${error instanceof Error ? error.message : 'Unknown error'}`, { userEmail: session.user.email, entityId: resolvedParams.id, metadata: { error: error instanceof Error ? error.stack : error } });
      // Don't fail the request update if notification fails
    }

    // Return updated join request
    const updatedJoinRequest = await db.joinRequest.findUnique({
      where: { id: resolvedParams.id },
      include: {
        participant: true,
        team: true
      }
    })

    return NextResponse.json(updatedJoinRequest)
  } catch (error) {
    await logger.error(LogAction.UPDATE, 'JoinRequest', `Error updating join request: ${error instanceof Error ? error.message : 'Unknown error'}`, { userEmail: session?.user?.email, entityId: resolvedParams.id, metadata: { error: error instanceof Error ? error.stack : error } });
    
    const session = await auth();
    const resolvedParams = await params;
    await logger.logApiError('PUT', `/api/teams/join-request/${resolvedParams.id}`, error as Error, session?.user?.email || undefined);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}