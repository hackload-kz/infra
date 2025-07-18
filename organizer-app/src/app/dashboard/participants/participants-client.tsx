'use client'

import Link from 'next/link'
import { User, Participant, Team } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Edit, Eye } from 'lucide-react'

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
                                    GitHub
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    LinkedIn
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Языки программирования
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Базы данных
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Действия
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {participants.map((participant) => (
                                <tr key={participant.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
                                        {participant.userId}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                                        {participant.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {participant.email}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {participant.team ? (
                                            <Link 
                                                href={`/dashboard/teams/${participant.team.nickname}`}
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                {participant.team.name}
                                            </Link>
                                        ) : (
                                            <span className="text-gray-500">Не назначена</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {participant.city || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {participant.company || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {participant.githubUrl ? (
                                            <a 
                                                href={participant.githubUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                Профиль
                                            </a>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {participant.linkedinUrl ? (
                                            <a 
                                                href={participant.linkedinUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                Профиль
                                            </a>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        <div className="flex flex-wrap gap-1">
                                            {participant.programmingLanguages && participant.programmingLanguages.length > 0 ? (
                                                participant.programmingLanguages.slice(0, 3).map((lang, index) => (
                                                    <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                                        {lang}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-gray-500">-</span>
                                            )}
                                            {participant.programmingLanguages && participant.programmingLanguages.length > 3 && (
                                                <span className="text-gray-500 text-xs">+{participant.programmingLanguages.length - 3}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        <div className="flex flex-wrap gap-1">
                                            {participant.databases && participant.databases.length > 0 ? (
                                                participant.databases.slice(0, 3).map((db, index) => (
                                                    <span key={index} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                                        {db}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-gray-500">-</span>
                                            )}
                                            {participant.databases && participant.databases.length > 3 && (
                                                <span className="text-gray-500 text-xs">+{participant.databases.length - 3}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        <div className="flex space-x-2">
                                            <Link href={`/dashboard/participants/${participant.id}`}>
                                                <Button variant="outline" size="sm" title="View Profile">
                                                    <Eye className="w-4 h-4 mr-1" />
                                                    Просмотр
                                                </Button>
                                            </Link>
                                            <Link href={`/dashboard/participants/${participant.id}/edit`}>
                                                <Button variant="outline" size="sm" title="Edit Profile">
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