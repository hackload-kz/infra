import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { createJournalEntry } from '@/lib/journal'
import { JournalEventType } from '@prisma/client'
import { logger, LogAction } from '@/lib/logger'

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const isAdmin = await isOrganizer(session.user.email)
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const resolvedParams = await params
        const data = await request.json()
        const { 
            name, 
            city, 
            company,
            githubUrl,
            linkedinUrl,
            experienceLevel, 
            technologies, 
            cloudServices, 
            cloudProviders, 
            otherTechnologies, 
            otherCloudServices, 
            otherCloudProviders,
            teamId,
            isActive
        } = data

        // Find the participant with team information
        const participant = await db.participant.findUnique({
            where: { id: resolvedParams.id },
            include: {
                team: true,
                ledTeam: true,
                hackathonParticipations: {
                    include: { hackathon: true },
                    where: { isActive: true }
                }
            }
        })

        if (!participant) {
            return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
        }

        // Get the active hackathon
        const activeHackathon = participant.hackathonParticipations[0]?.hackathon
        if (!activeHackathon) {
            return NextResponse.json({ error: 'No active hackathon found' }, { status: 400 })
        }

        const wasActive = participant.isActive
        const isBeingDeactivated = wasActive && !isActive

        // Handle team removal if participant is being deactivated
        let teamLeaderId = null
        if (isBeingDeactivated && participant.team) {
            // Get team leader ID for notification
            const team = await db.team.findUnique({
                where: { id: participant.team.id },
                include: { leader: true }
            })
            teamLeaderId = team?.leader?.id
        }

        // Update participant
        const updatedParticipant = await db.participant.update({
            where: { id: resolvedParams.id },
            data: {
                name,
                city,
                company,
                githubUrl: githubUrl || null,
                linkedinUrl: linkedinUrl || null,
                experienceLevel,
                technologies: JSON.stringify(technologies),
                cloudServices: JSON.stringify(cloudServices),
                cloudProviders: JSON.stringify(cloudProviders),
                otherTechnologies,
                otherCloudServices,
                otherCloudProviders,
                isActive: isActive,
                // Remove from team if being deactivated, otherwise use the provided teamId
                teamId: isBeingDeactivated ? null : (teamId || null),
                // Remove leadership if being deactivated
                ledTeamId: isBeingDeactivated ? null : participant.ledTeamId,
            },
        })

        await logger.info(LogAction.UPDATE, 'Participant', `Profile edited: Admin ${session.user.email} updated profile for ${updatedParticipant.name} (${updatedParticipant.email})`, { userEmail: session.user.email, entityId: updatedParticipant.id });

        // Send notification to team leader if participant was removed from team
        if (isBeingDeactivated && teamLeaderId && teamLeaderId !== participant.id) {
            await createJournalEntry({
                participantId: teamLeaderId,
                eventType: JournalEventType.LEFT_TEAM,
                title: 'Участник покинул команду',
                description: `${participant.name} был деактивирован и автоматически исключен из команды`,
                entityId: participant.id,
                entityType: 'participant'
            })
        }

        // Create journal entry for participant deactivation
        if (isBeingDeactivated) {
            await createJournalEntry({
                participantId: participant.id,
                eventType: JournalEventType.SYSTEM_EVENT,
                title: 'Аккаунт деактивирован',
                description: 'Ваш аккаунт был деактивирован администратором',
                entityId: participant.id,
                entityType: 'participant'
            })
        } else if (!wasActive && isActive) {
            // Create journal entry for participant reactivation
            await createJournalEntry({
                participantId: participant.id,
                eventType: JournalEventType.SYSTEM_EVENT,
                title: 'Аккаунт активирован',
                description: 'Ваш аккаунт был активирован администратором',
                entityId: participant.id,
                entityType: 'participant'
            })
        }

        return NextResponse.json(updatedParticipant)
    } catch (error) {
        const errorSession = await auth()
        await logger.error(LogAction.UPDATE, 'Participant', `Error updating participant: ${error instanceof Error ? error.message : 'Unknown error'}`, { userEmail: errorSession?.user?.email || undefined, metadata: { error: error instanceof Error ? error.stack : error } });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}