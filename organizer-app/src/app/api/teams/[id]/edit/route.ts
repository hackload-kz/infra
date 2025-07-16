import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { isOrganizer } from '@/lib/admin'
import { db } from '@/lib/db'
import { TeamStatus, TeamLevel } from '@prisma/client'

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        
        if (!session?.user?.email || !isOrganizer(session.user.email)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { name, nickname, status, level, comment, leaderId } = body

        // Validate required fields
        if (!name || !nickname || !status || !leaderId) {
            return NextResponse.json({ error: 'Name, nickname, status, and leader are required' }, { status: 400 })
        }

        // Check if nickname is already taken by another team
        const existingTeam = await db.team.findFirst({
            where: {
                nickname,
                NOT: { id },
            },
        })

        if (existingTeam) {
            return NextResponse.json({ error: 'Nickname already exists' }, { status: 400 })
        }

        // Update team
        const updatedTeam = await db.$transaction(async (tx) => {
            // If leader is changing, update participant relations
            if (leaderId) {
                // Remove current leader's ledTeamId
                await tx.participant.updateMany({
                    where: { ledTeamId: id },
                    data: { ledTeamId: null },
                })

                // Set new leader
                await tx.participant.update({
                    where: { id: leaderId },
                    data: { 
                        ledTeamId: id,
                        teamId: id, // Ensure leader is also a team member
                    },
                })
            }

            // Update team
            return await tx.team.update({
                where: { id },
                data: {
                    name,
                    nickname,
                    status: status as TeamStatus,
                    level: level && level !== '' ? level as TeamLevel : null,
                    comment,
                    leaderId: leaderId || null,
                },
            })
        })

        console.info(`✏️ Team edited: ${session.user.email} updated team ${updatedTeam.name} (@${updatedTeam.nickname})`)

        return NextResponse.json(updatedTeam)
    } catch (error) {
        console.error('Error updating team:', error)
        return NextResponse.json({ error: 'Failed to update team' }, { status: 500 })
    }
}