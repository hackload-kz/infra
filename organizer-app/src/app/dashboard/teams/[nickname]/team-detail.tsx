'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface Team {
    id: string
    name: string
    nickname: string
    createdAt: Date
    updatedAt: Date
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
