import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { auth } from '@/auth'
import { isOrganizer } from '@/lib/admin'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { DashboardEnvironmentView } from '@/components/dashboard-environment-view'

interface EnvironmentPageProps {
    params: Promise<{
        nickname: string
    }>
}

export default async function TeamEnvironmentPage({ params }: EnvironmentPageProps) {
    const { nickname } = await params
    const session = await auth()
    const isAdmin = session?.user?.email ? isOrganizer(session.user.email) : false

    if (!isAdmin) {
        notFound()
    }

    const team = await db.team.findFirst({
        where: {
            nickname,
        },
        include: {
            leader: true,
            members: true,
            hackathon: true,
            environmentData: {
                orderBy: [
                    { category: 'asc' },
                    { key: 'asc' }
                ]
            },
        },
    });

    if (!team) {
        notFound()
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link href={`/dashboard/teams/${team.nickname}`}>
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Назад к команде
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Team Environment Header */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Данные окружения</h1>
                        <p className="text-gray-600 text-lg">Команда: {team.name} (@{team.nickname})</p>
                        <p className="text-sm text-gray-500 mt-2">
                            Управление переменными окружения, API ключами и другими данными для команды
                        </p>
                    </div>
                </div>
            </div>

            {/* Environment Data Management */}
            <DashboardEnvironmentView team={team} />
        </div>
    )
}