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

    return <TeamsForm teams={teams} />
}
