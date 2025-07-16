import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { EditParticipantForm } from '../edit-participant-form'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface EditParticipantPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function EditParticipantPage({ params }: EditParticipantPageProps) {
    const { id } = await params

    const [participant, teams] = await Promise.all([
        db.participant.findUnique({
            where: { id },
            include: {
                user: true,
                team: true,
                ledTeam: true,
                hackathonParticipations: {
                    include: {
                        hackathon: true
                    }
                }
            },
        }),
        db.team.findMany({
            select: {
                id: true,
                name: true,
                nickname: true,
                _count: {
                    select: {
                        members: true
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        })
    ])

    if (!participant) {
        notFound()
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link href={`/dashboard/participants/${participant.id}`}>
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Назад к профилю
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Редактирование участника: {participant.name}
                    </h1>
                </div>
            </div>

            {/* Edit Form */}
            <EditParticipantForm participant={participant} teams={teams} />
        </div>
    )
}