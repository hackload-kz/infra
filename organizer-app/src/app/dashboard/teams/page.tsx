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
        include: {
            members: true,
            leader: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    return <TeamsForm teams={teams} />
}
