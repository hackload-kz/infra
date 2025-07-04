import { notFound } from 'next/navigation'
import { db } from '@/lib/db'

interface TeamPageProps {
    params: Promise<{
        nickname: string
    }>
}

export default async function TeamPage({ params }: TeamPageProps) {
    const { nickname } = await params

    const team = await db.team.findFirst({
        where: {
            nickname,
        },
    });

    if (!team) {
        notFound()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">{team.name}</h1>
                    <p className="text-gray-700 text-lg">@{team.nickname}</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-white p-6 rounded-lg border border-gray-300 shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">Информация о команде</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-800">Название</label>
                            <p className="text-lg text-gray-900">{team.name}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-800">Никнейм</label>
                            <p className="text-lg text-gray-900">{team.nickname}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-800">Создана</label>
                            <p className="text-lg text-gray-900">{new Date(team.createdAt).toLocaleDateString('ru-RU')}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-300 shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">Нагрузочное тестирование</h2>
                    <p className="text-gray-700">Функции нагрузочного тестирования скоро будут доступны.</p>
                </div>
            </div>
        </div>
    )
}
