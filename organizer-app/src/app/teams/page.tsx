import { db } from '@/lib/db';
import Link from 'next/link';
import { auth } from '@/auth';
import { SignOutButton } from '@/components/sign-out-button';
import { isOrganizer } from '@/lib/admin';
import { getCurrentHackathon } from '@/lib/hackathon';

// Force dynamic rendering since this page requires database access
export const dynamic = 'force-dynamic'

export default async function TeamsPage() {
    const session = await auth();
    const userIsOrganizer = isOrganizer(session?.user?.email);

    // Get current hackathon
    const hackathon = await getCurrentHackathon();
    
    const teams = await db.team.findMany({
        where: hackathon ? {
            hackathonId: hackathon.id
        } : {},
        include: {
            leader: true,
            members: true,
            _count: {
                select: {
                    members: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="container mx-auto max-w-6xl">
                <div className="bg-white rounded-lg shadow-xl p-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Команды {hackathon?.name || 'хакатона'}
                            </h1>
                            <p className="text-gray-700 font-medium">
                                Все зарегистрированные команды участников
                            </p>
                            {hackathon?.theme && (
                                <p className="text-gray-600 text-sm mt-1">
                                    Тема: {hackathon.theme}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <Link
                                href="/"
                                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                На главную
                            </Link>
                            {session ? (
                                <>
                                    {userIsOrganizer ? (
                                        <Link
                                            href="/dashboard"
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            Панель управления
                                        </Link>
                                    ) : (
                                        <Link
                                            href="/profile"
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            Мой профиль
                                        </Link>
                                    )}
                                    <SignOutButton />
                                </>
                            ) : (
                                <Link
                                    href="/register"
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Присоединиться
                                </Link>
                            )}
                        </div>
                    </div>

                    {teams.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-600 text-lg">
                                Пока что команд нет. Станьте первыми!
                            </p>
                            {!session && (
                                <Link
                                    href="/register"
                                    className="mt-4 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Зарегистрироваться
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {teams.map((team) => (
                                <div
                                    key={team.id}
                                    className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow"
                                >
                                    <div className="mb-4">
                                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                            {team.name}
                                        </h3>
                                        <p className="text-gray-700 text-sm font-medium">
                                            @{team.nickname}
                                        </p>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        {team.leader && (
                                            <div>
                                                <span className="font-semibold text-gray-800">Лидер:</span> <span className="text-gray-700">{team.leader.name}</span>
                                            </div>
                                        )}
                                        <div>
                                            <span className="font-semibold text-gray-800">Участников:</span> <span className="text-gray-700">{team._count.members}</span>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-gray-800">Создана:</span>{' '}
                                            <span className="text-gray-700">{new Date(team.createdAt).toLocaleDateString('ru-RU')}</span>
                                        </div>
                                    </div>

                                    {team.members.length > 0 && (
                                        <div className="mt-4">
                                            <p className="text-sm font-semibold text-gray-800 mb-2">Участники:</p>
                                            <div className="space-y-1">
                                                {team.members.slice(0, 3).map((member) => (
                                                    <div key={member.id} className="text-sm text-gray-700">
                                                        {member.name}
                                                        {member.id === team.leaderId && (
                                                            <span className="ml-2 text-yellow-600">⭐</span>
                                                        )}
                                                    </div>
                                                ))}
                                                {team.members.length > 3 && (
                                                    <div className="text-sm text-gray-600">
                                                        +{team.members.length - 3} еще...
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
