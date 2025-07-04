import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { EditParticipantForm } from './edit-participant-form'

interface EditParticipantPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function EditParticipantPage({ params }: EditParticipantPageProps) {
    const resolvedParams = await params
    const participant = await db.participant.findUnique({
        where: { id: resolvedParams.id },
        include: {
            user: true,
            team: true,
        },
    })

    if (!participant) {
        notFound()
    }

    const teams = await db.team.findMany({
        orderBy: { name: 'asc' },
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">
                    Редактирование участника
                </h1>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
                <EditParticipantForm participant={participant} teams={teams} />
            </div>
        </div>
    )
}