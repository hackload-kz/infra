import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { isOrganizer } from '@/lib/admin'
import { db } from '@/lib/db'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        
        if (!session?.user?.email || !isOrganizer(session.user.email)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: teamId } = await params
        const body = await request.json()
        const { participantId } = body

        if (!participantId) {
            return NextResponse.json({ error: 'Participant ID is required' }, { status: 400 })
        }

        // Check if team exists and has space
        const team = await db.team.findUnique({
            where: { id: teamId },
            include: { members: true },
        })

        if (!team) {
            return NextResponse.json({ error: 'Team not found' }, { status: 404 })
        }

        if (team.members.length >= 4) {
            return NextResponse.json({ error: 'Team is full (maximum 4 members)' }, { status: 400 })
        }

        // Check if participant exists and is available
        const participant = await db.participant.findUnique({
            where: { id: participantId },
        })

        if (!participant) {
            return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
        }

        if (participant.teamId && participant.teamId !== teamId) {
            return NextResponse.json({ error: 'Participant is already in another team' }, { status: 400 })
        }

        // Add participant to team
        await db.participant.update({
            where: { id: participantId },
            data: { teamId },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error adding team member:', error)
        return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 })
    }
}