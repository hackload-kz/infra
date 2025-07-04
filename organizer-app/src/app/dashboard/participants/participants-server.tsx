import { db } from '@/lib/db'
import { ParticipantsList } from './participants-client'

export async function ParticipantsServer() {
    const participants = await db.participant.findMany({
        include: {
            user: true,
            team: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    })

    return <ParticipantsList participants={participants} />
}