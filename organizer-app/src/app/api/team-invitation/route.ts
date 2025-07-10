import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { messageService } from '@/lib/messages'
import { generateTeamInvitationMessage } from '@/lib/message-templates'

const teamInvitationSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
  targetParticipantId: z.string().min(1, 'Target participant ID is required'),
  customMessage: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { teamId, targetParticipantId, customMessage } = teamInvitationSchema.parse(body)

    // Get the current participant (team leader)
    const teamLeader = await db.participant.findFirst({
      where: { user: { email: session.user.email } },
      include: {
        ledTeam: true
      }
    })

    if (!teamLeader) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    // Verify the user is a leader of the specified team
    if (!teamLeader.ledTeam || teamLeader.ledTeam.id !== teamId) {
      return NextResponse.json({ error: 'You are not the leader of this team' }, { status: 403 })
    }

    // Get the team details
    const team = await db.team.findUnique({
      where: { id: teamId },
      include: {
        members: true,
        leader: true
      }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Check if team has space
    if (team.members.length >= 4) {
      return NextResponse.json({ error: 'Team is full' }, { status: 400 })
    }

    // Get the target participant
    const targetParticipant = await db.participant.findUnique({
      where: { id: targetParticipantId }
    })

    if (!targetParticipant) {
      return NextResponse.json({ error: 'Target participant not found' }, { status: 404 })
    }

    // Check if target participant is already in a team
    if (targetParticipant.teamId) {
      return NextResponse.json({ error: 'Participant is already in a team' }, { status: 400 })
    }

    // Get current hackathon (using same logic as dashboard)
    const hackathon = await db.hackathon.findFirst({
      where: { slug: 'hackload-2025' }
    })
    if (!hackathon) {
      return NextResponse.json({ error: 'No active hackathon found' }, { status: 400 })
    }

    // Generate and send invitation message
    const teamUrl = `https://hub.hackload.kz/space/teams/${team.id}`
    
    const messageTemplate = generateTeamInvitationMessage({
      team,
      teamLeader,
      targetParticipant,
      teamUrl,
      customMessage
    })

    await messageService.createMessage({
      subject: `🎯 Приглашение в команду "${team.name}"`,
      body: messageTemplate.text,
      senderId: teamLeader.id,
      recipientId: targetParticipant.id,
      hackathonId: hackathon.id,
      htmlBody: messageTemplate.html
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Error sending team invitation:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}