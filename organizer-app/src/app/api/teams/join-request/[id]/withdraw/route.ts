import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { logger, LogAction } from '@/lib/logger'

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
            nickname: true
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