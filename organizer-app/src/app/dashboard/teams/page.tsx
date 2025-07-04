import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import TeamsForm from '@/app/dashboard/teams/teams-form'

export default async function TeamsPage() {
    const session = await auth()

    if (!session) {
        redirect('/login')
    }

    // Получаем команды напрямую из БД на сервере
    const teams = await db.team.findMany({
        orderBy: { createdAt: 'desc' },
    });

    return <TeamsForm teams={teams} />
}
