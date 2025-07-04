'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TeamStatus } from '@prisma/client'

interface Participant {
    id: string
    name: string
    email: string
}

interface Team {
    id: string
    name: string
    nickname: string
    status: TeamStatus
    createdAt: Date
    updatedAt: Date
    members: Participant[]
    leader: Participant | null
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

interface TeamDetailProps {
    team: Team
}

export function TeamDetail({ team }: TeamDetailProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <Link href="/dashboard/teams">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Назад к командам
                    </Button>
                </Link>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="space-y-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
                        <p className="text-gray-600">Никнейм: {team.nickname}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Статус</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[team.status]}`}>
                                {statusLabels[team.status]}
                            </span>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Участники</h3>
                            <p className="text-sm text-gray-900">
                                {team.members.length} / 4
                            </p>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Лидер</h3>
                            <p className="text-sm text-gray-900">
                                {team.leader ? team.leader.name : 'Не назначен'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Создана</h3>
                            <p className="text-sm text-gray-900">
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
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Обновлена</h3>
                            <p className="text-sm text-gray-900">
                                {team.updatedAt.toLocaleDateString('ru-RU', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Нагрузочные тесты
                </h2>
                <p className="text-gray-600">
                    Функциональность нагрузочных тестов будет добавлена в следующих версиях.
                </p>
            </div>
        </div>
    )
}
