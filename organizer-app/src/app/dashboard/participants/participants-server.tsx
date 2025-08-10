import { db } from '@/lib/db'
import { ParticipantsList } from './participants-client'

export async function ParticipantsServer() {
    const participants = await db.participant.findMany({
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    createdAt: true,
                    updatedAt: true,
                    password: true,
                }
            },
            team: {
                select: {
                    id: true,
                    name: true,
                    nickname: true,
                    createdAt: true,
                    updatedAt: true,
                    comment: true,
                    status: true,
                    level: true,
                    hackathonId: true,
                    leaderId: true,
                    acceptedLanguages: true,
                    techStack: true,
                    description: true,
                    k6EnvironmentVars: true,
                }
            },
        },
        take: 500, // Limit admin view to 500 participants
        orderBy: {
            createdAt: 'desc',
        },
    })

    return <ParticipantsList participants={participants} />
}