import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { messageService } from '@/lib/messages'
import { generateJoinRequestResponseMessage } from '@/lib/message-templates'

const updateJoinRequestSchema = z.object({
  action: z.enum(['approve', 'decline'])
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
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

      // Check if participant is still available (not in another team)
      const currentParticipant = await db.participant.findUnique({
        where: { id: joinRequest.participantId }
      })

      if (currentParticipant?.teamId) {
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

    // Send result message to participant
    try {
      const joinRequestUrl = `https://hub.hackload.kz/space/teams`
      
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
        hackathonId: joinRequest.hackathonId,
        htmlBody: messageTemplate.html
      })
    } catch (error) {
      console.error('Failed to send join request response notification:', error)
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
    console.error('Error updating join request:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}