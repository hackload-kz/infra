import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { Users, Calendar, TrendingUp, Activity, UserCheck } from 'lucide-react'
import Link from 'next/link'
import { isOrganizer } from '@/lib/admin'

export default async function DashboardPage() {
    const session = await auth()

    if (!session) {
        redirect('/login')
    }

    // Check if user is an organizer
    if (!isOrganizer(session.user?.email)) {
        redirect('/')
    }

    // Get team statistics
    const totalTeams = await db.team.count();

    const recentTeams = await db.team.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
            id: true,
            name: true,
            nickname: true,
            createdAt: true
        }
    });

    const teamsThisWeek = await db.team.count({
        where: {
            createdAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
        }
    });

    // Get participant statistics
    const totalParticipants = await db.participant.count();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Панель управления</h1>
                <p className="text-gray-700 mt-2">Добро пожаловать в систему управления командами HackLoad 2025</p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg border border-gray-300 shadow-sm">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-800">Всего команд</p>
                            <p className="text-2xl font-bold text-gray-900">{totalTeams}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-300 shadow-sm">
                    <div className="flex items-center">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <UserCheck className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-800">Всего участников</p>
                            <p className="text-2xl font-bold text-gray-900">{totalParticipants}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-300 shadow-sm">
                    <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-800">Команд за неделю</p>
                            <p className="text-2xl font-bold text-gray-900">{teamsThisWeek}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-300 shadow-sm">
                    <div className="flex items-center">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Calendar className="h-6 w-6 text-orange-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-800">Дней до хакатона</p>
                            <p className="text-2xl font-bold text-gray-900">30</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Teams */}
            <div className="bg-white rounded-lg border border-gray-300 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Последние команды</h2>
                </div>
                <div className="p-6">
                    {recentTeams.length === 0 ? (
                        <p className="text-gray-700 text-center py-4">
                            Команды пока не созданы. <Link href="/dashboard/teams" className="text-blue-600 hover:text-blue-800">Создать первую команду</Link>
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {recentTeams.map((team) => (
                                <div key={team.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg">
                                    <div>
                                        <h3 className="font-medium text-gray-900">{team.name}</h3>
                                        <p className="text-sm text-gray-700">@{team.nickname}</p>
                                    </div>
                                    <div className="text-sm text-gray-700">
                                        {new Date(team.createdAt).toLocaleDateString('ru-RU')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-300 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Быстрые действия</h2>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Link
                            href="/dashboard/teams"
                            className="block p-4 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                        >
                            <div className="flex items-center">
                                <Users className="h-5 w-5 text-blue-600 mr-3" />
                                <div>
                                    <h3 className="font-medium text-gray-900">Управление командами</h3>
                                    <p className="text-sm text-gray-700">Просмотр, создание и редактирование команд</p>
                                </div>
                            </div>
                        </Link>
                        <Link
                            href="/dashboard/participants"
                            className="block p-4 border border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                        >
                            <div className="flex items-center">
                                <UserCheck className="h-5 w-5 text-indigo-600 mr-3" />
                                <div>
                                    <h3 className="font-medium text-gray-900">Управление участниками</h3>
                                    <p className="text-sm text-gray-700">Просмотр и редактирование участников</p>
                                </div>
                            </div>
                        </Link>
                        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed">
                            <div className="flex items-center opacity-50">
                                <Activity className="h-5 w-5 text-gray-400 mr-3" />
                                <div>
                                    <h3 className="font-medium text-gray-700">Нагрузочные тесты</h3>
                                    <p className="text-sm text-gray-600">Скоро будет доступно</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
