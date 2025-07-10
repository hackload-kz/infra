'use client'

import Link from 'next/link'
import { User, Participant, Team } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Edit } from 'lucide-react'

type ParticipantWithRelations = Participant & {
    user: User
    team: Team | null
}

interface ParticipantsListProps {
    participants: ParticipantWithRelations[]
}

export function ParticipantsList({ participants }: ParticipantsListProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">
                    Участники ({participants.length})
                </h1>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Имя
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Команда
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Город
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Компания
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    GitHub/GitLab
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    LinkedIn
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Действия
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {participants.map((participant) => (
                                <tr key={participant.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                                        {participant.userId}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {participant.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {participant.email}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {participant.team ? (
                                            <Link 
                                                href={`/dashboard/teams/${participant.team.nickname}`}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                {participant.team.name}
                                            </Link>
                                        ) : (
                                            <span className="text-gray-400">Не назначена</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {participant.city || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {participant.company || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {participant.githubUrl ? (
                                            <a 
                                                href={participant.githubUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                Профиль
                                            </a>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {participant.linkedinUrl ? (
                                            <a 
                                                href={participant.linkedinUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                Профиль
                                            </a>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div className="flex space-x-2">
                                            <Link href={`/dashboard/participants/${participant.id}`}>
                                                <Button variant="outline" size="sm">
                                                    <Edit className="w-4 h-4 mr-1" />
                                                    Редактировать
                                                </Button>
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {participants.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Нет зарегистрированных участников</p>
                    </div>
                )}
            </div>
        </div>
    )
}