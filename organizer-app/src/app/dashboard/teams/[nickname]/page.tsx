import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { auth } from '@/auth'
import { isOrganizer } from '@/lib/admin'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Users } from 'lucide-react'
import { TeamStatus, TeamLevel } from '@prisma/client'

interface TeamPageProps {
    params: Promise<{
        nickname: string
    }>
}

const statusLabels: Record<TeamStatus, string> = {
    NEW: 'Новая',
    INCOMPLETED: 'Не завершена',
    FINISHED: 'Завершена',
    IN_REVIEW: 'На рассмотрении',
    APPROVED: 'Одобрена',
    CANCELED: 'Отменена',
    REJECTED: 'Отклонена',
}

const statusColors: Record<TeamStatus, string> = {
    NEW: 'bg-blue-100 text-blue-800',
    INCOMPLETED: 'bg-yellow-100 text-yellow-800',
    FINISHED: 'bg-green-100 text-green-800',
    IN_REVIEW: 'bg-purple-100 text-purple-800',
    APPROVED: 'bg-green-100 text-green-800',
    CANCELED: 'bg-gray-100 text-gray-800',
    REJECTED: 'bg-red-100 text-red-800',
}

const levelLabels: Record<TeamLevel, string> = {
    BEGINNER: 'Начинающий',
    ADVANCED: 'Продвинутый',
}

const levelColors: Record<TeamLevel, string> = {
    BEGINNER: 'bg-green-100 text-green-800',
    ADVANCED: 'bg-orange-100 text-orange-800',
}

export default async function TeamPage({ params }: TeamPageProps) {
    const { nickname } = await params
    const session = await auth()
    const isAdmin = session?.user?.email ? isOrganizer(session.user.email) : false

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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link href="/dashboard/teams">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Назад к командам
                        </Button>
                    </Link>
                </div>
                {isAdmin && (
                    <Link href={`/dashboard/teams/${team.nickname}/edit`}>
                        <Button>
                            <Edit className="w-4 h-4 mr-2" />
                            Редактировать
                        </Button>
                    </Link>
                )}
            </div>

            {/* Team Header */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
                        <p className="text-gray-600 text-lg">@{team.nickname}</p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[team.status]}`}>
                            {statusLabels[team.status]}
                        </span>
                        {team.level && (
                            <span className={`px-3 py-1 text-sm font-medium rounded-full ${levelColors[team.level]}`}>
                                {levelLabels[team.level]}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Team Information */}
            <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">Информация о команде</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-500">Создана</label>
                            <p className="text-gray-900">
                                {team.createdAt.toLocaleDateString('ru-RU', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500">Последнее обновление</label>
                            <p className="text-gray-900">
                                {team.updatedAt.toLocaleDateString('ru-RU', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500">Количество участников</label>
                            <p className="text-gray-900 flex items-center">
                                <Users className="w-4 h-4 mr-2" />
                                {team.members.length} / 4
                            </p>
                        </div>
                        {team.level && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Уровень команды</label>
                                <p className="text-gray-900">{levelLabels[team.level]}</p>
                            </div>
                        )}
                        {isAdmin && team.comment && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Комментарий (только для админов)</label>
                                <p className="text-gray-900 bg-yellow-50 p-3 rounded border">{team.comment}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Team Leader */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">Лидер команды</h2>
                    {team.leader ? (
                        <div className="space-y-2">
                            <Link 
                                href={`/dashboard/participants/${team.leader.id}`}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                                {team.leader.name}
                            </Link>
                            <p className="text-sm text-gray-600">{team.leader.email}</p>
                            {team.leader.company && (
                                <p className="text-sm text-gray-600">{team.leader.company}</p>
                            )}
                            {team.leader.city && (
                                <p className="text-sm text-gray-600">{team.leader.city}</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-500">Лидер не назначен</p>
                    )}
                </div>
            </div>

            {/* Team Members */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Участники команды</h2>
                {team.members.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {team.members.map((member) => (
                            <div key={member.id} className="p-4 border border-gray-200 rounded-lg">
                                <Link 
                                    href={`/dashboard/participants/${member.id}`}
                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    {member.name}
                                </Link>
                                <p className="text-sm text-gray-600">{member.email}</p>
                                {member.company && (
                                    <p className="text-sm text-gray-600">{member.company}</p>
                                )}
                                {member.city && (
                                    <p className="text-sm text-gray-600">{member.city}</p>
                                )}
                                {member.experienceLevel && (
                                    <p className="text-xs text-gray-500 mt-1">Опыт: {member.experienceLevel}</p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">В команде пока нет участников</p>
                )}
            </div>
        </div>
    )
}
