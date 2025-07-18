import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { logger, LogAction } from '@/lib/logger'
import { trackJoinRequestWithdrawn } from '@/lib/journal'
import { messageService } from '@/lib/messages'
import { getCurrentHackathon } from '@/lib/hackathon'

interface Props {
  params: Promise<{
    id: string
  }>
}

export async function DELETE(_request: NextRequest, { params }: Props) {
  try {
    const resolvedParams = await params
    const session = await auth()
    
    await logger.logApiCall('DELETE', `/api/teams/join-request/${resolvedParams.id}/withdraw`, session?.user?.email || undefined)
    
    if (!session?.user?.email) {
      await logger.warn(LogAction.DELETE, 'API', 'Unauthorized withdrawal attempt', {
        userEmail: session?.user?.email || undefined,
        metadata: { joinRequestId: resolvedParams.id }
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the participant
    const participant = await db.participant.findFirst({
      where: { user: { email: session.user.email } }
    })

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    // Find the join request
    const joinRequest = await db.joinRequest.findUnique({
      where: { id: resolvedParams.id },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            nickname: true,
            leaderId: true
          }
        }
      }
    })

    if (!joinRequest) {
      return NextResponse.json({ error: 'Join request not found' }, { status: 404 })
    }

    // Check if the participant owns this join request
    if (joinRequest.participantId !== participant.id) {
      await logger.warn(LogAction.DELETE, 'JoinRequest', 'Unauthorized withdrawal attempt', {
        userEmail: session.user.email,
        metadata: { 
          joinRequestId: resolvedParams.id,
          participantId: participant.id,
          requestParticipantId: joinRequest.participantId
        }
      })
      return NextResponse.json({ error: 'Unauthorized to withdraw this request' }, { status: 403 })
    }

    // Check if the request is in a withdrawable state
    if (joinRequest.status !== 'PENDING') {
      return NextResponse.json({ 
        error: 'Only pending requests can be withdrawn',
        currentStatus: joinRequest.status 
      }, { status: 400 })
    }

    // Delete the join request
    await db.joinRequest.delete({
      where: { id: resolvedParams.id }
    })

    await logger.logDelete('JoinRequest', resolvedParams.id, session.user.email, 'Join request withdrawn by participant')

    // Add journal entry for the participant
    await trackJoinRequestWithdrawn(participant.id, resolvedParams.id, joinRequest.team.name)

    // Get current hackathon for messaging
    const hackathon = await getCurrentHackathon()
    if (!hackathon) {
      await logger.warn(LogAction.READ, 'Hackathon', 'Active hackathon not found for withdrawal notification', {})
    }

    try {
      // Send notification to participant (requestor)
      await messageService.createMessage({
        subject: 'Заявка на вступление отозвана',
        body: `Вы отозвали заявку на вступление в команду **${joinRequest.team.name}** (@${joinRequest.team.nickname}).\n\nЕсли вы передумаете, вы можете подать новую заявку в любое время.`,
        recipientId: participant.id,
        hackathonId: hackathon?.id || '',
        teamId: joinRequest.team.id
      })

      // Send notification to team leader if exists
      if (joinRequest.team.leaderId) {
        await messageService.createMessage({
          subject: 'Заявка на вступление отозвана',
          body: `Участник **${participant.name}** отозвал заявку на вступление в команду **${joinRequest.team.name}** (@${joinRequest.team.nickname}).\n\nЗаявка была удалена из списка ожидающих рассмотрения.`,
          recipientId: joinRequest.team.leaderId,
          hackathonId: hackathon?.id || '',
          teamId: joinRequest.team.id
        })
      }
    } catch (messageError) {
      await logger.error(LogAction.CREATE, 'Message', `Failed to send withdrawal notification: ${messageError instanceof Error ? messageError.message : 'Unknown error'}`, {
        metadata: { 
          joinRequestId: resolvedParams.id,
          teamId: joinRequest.team.id,
          participantId: participant.id,
          error: messageError instanceof Error ? messageError.stack : messageError
        }
      })
      // Don't fail the withdrawal if messaging fails
    }

    console.info(`🔄 Join request withdrawn: ${session.user.email} withdrew request to join team ${joinRequest.team.name} (@${joinRequest.team.nickname})`)

    return NextResponse.json({ 
      success: true, 
      message: 'Join request withdrawn successfully',
      teamId: joinRequest.team.id 
    })
  } catch (error) {
    console.error('Error withdrawing join request:', error)
    
    const session = await auth()
    await logger.logApiError('DELETE', `/api/teams/join-request/${(await params).id}/withdraw`, error as Error, session?.user?.email || undefined)
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}