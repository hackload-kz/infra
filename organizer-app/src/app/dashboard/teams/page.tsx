import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import TeamsForm from '@/app/dashboard/teams/teams-form'

// Force dynamic rendering since this page requires authentication and database access
export const dynamic = 'force-dynamic'

export default async function TeamsPage() {
    const session = await auth()

    if (!session) {
        redirect('/login')
    }

    // Получаем команды напрямую из БД на сервере
    const teams = await db.team.findMany({
        select: {
            id: true,
            name: true,
            nickname: true,
            status: true,
            level: true,
            createdAt: true,
            updatedAt: true,
            _count: {
                select: {
                    members: true
                }
            },
            leader: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                }
            },
            // Don't load all members data - just count
            members: false,
        },
        take: 200, // Limit admin teams view
        orderBy: { createdAt: 'desc' },
    });

    // Calculate statistics
    const stats = {
        totalTeams: teams.length,
        beginnerTeams: teams.filter(t => t.level === 'BEGINNER').length,
        advancedTeams: teams.filter(t => t.level === 'ADVANCED').length,
        fullTeams: teams.filter(t => (t._count?.members || 0) >= 4).length,
        statusBreakdown: {
            NEW: teams.filter(t => t.status === 'NEW').length,
            INCOMPLETED: teams.filter(t => t.status === 'INCOMPLETED').length,
            FINISHED: teams.filter(t => t.status === 'FINISHED').length,
            IN_REVIEW: teams.filter(t => t.status === 'IN_REVIEW').length,
            APPROVED: teams.filter(t => t.status === 'APPROVED').length,
            CANCELED: teams.filter(t => t.status === 'CANCELED').length,
            REJECTED: teams.filter(t => t.status === 'REJECTED').length,
        }
    };

    return <TeamsForm teams={teams} stats={stats} />
}
