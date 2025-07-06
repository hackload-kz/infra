import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { isOrganizer } from '@/lib/admin'
import { db } from '@/lib/db'

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; participantId: string }> }
) {
    try {
        const session = await auth()
        
        if (!session?.user?.email || !isOrganizer(session.user.email)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: teamId, participantId } = await params

        // Check if participant is the team leader
        const team = await db.team.findUnique({
            where: { id: teamId },
        })

        if (!team) {
            return NextResponse.json({ error: 'Team not found' }, { status: 404 })
        }

        if (team.leaderId === participantId) {
            return NextResponse.json({ error: 'Cannot remove team leader. Change leader first.' }, { status: 400 })
        }

        // Remove participant from team
        await db.participant.update({
            where: { id: participantId },
            data: { 
                teamId: null,
                ledTeamId: null,
            },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error removing team member:', error)
        return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 })
    }
}