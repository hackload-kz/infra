import { notFound, redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { auth } from '@/auth'
import { isOrganizer } from '@/lib/admin'
import TeamEditForm from './team-edit-form'

interface TeamEditPageProps {
    params: Promise<{
        nickname: string
    }>
}

export default async function TeamEditPage({ params }: TeamEditPageProps) {
    const { nickname } = await params
    const session = await auth()
    
    if (!session?.user?.email || !isOrganizer(session.user.email)) {
        redirect('/dashboard/teams')
    }

    const team = await db.team.findFirst({
        where: {
            nickname,
        },
        include: {
            leader: true,
            members: true,
        },
    });

    if (!team) {
        notFound()
    }

    // Get all participants for leader selection and adding members
    const allParticipants = await db.participant.findMany({
        include: {
            user: true,
        },
        orderBy: {
            name: 'asc',
        },
    });

    return (
        <div className="space-y-6">
            <TeamEditForm team={team} allParticipants={allParticipants} />
        </div>
    )
}