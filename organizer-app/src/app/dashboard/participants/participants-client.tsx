'use client'

import Link from 'next/link'
import { useState } from 'react'
import { User, Participant, Team } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Edit, Eye, Download, FileText } from 'lucide-react'

type ParticipantWithRelations = Participant & {
    user: User
    team: (Team & {
        _count?: {
            members: number
        }
    }) | null
}

interface ParticipantsListProps {
    participants: ParticipantWithRelations[]
}

export function ParticipantsList({ participants }: ParticipantsListProps) {
    const [isExporting, setIsExporting] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [previewData, setPreviewData] = useState<ParticipantWithRelations[]>([])

    const handleExportCSV = async () => {
        setIsExporting(true)
        try {
            const response = await fetch('/api/participants/export?format=csv')
            if (response.ok) {
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                const filename = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'participants-export.csv'
                a.download = filename
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
            } else {
                alert('Ошибка при экспорте данных')
            }
        } catch (error) {
            console.error('Export error:', error)
            alert('Ошибка при экспорте данных')
        } finally {
            setIsExporting(false)
        }
    }

    const handlePreviewData = async () => {
        try {
            const response = await fetch('/api/participants/export?format=json')
            if (response.ok) {
                const data = await response.json()
                setPreviewData(data.participants)
                setShowPreview(true)
            } else {
                alert('Ошибка при загрузке данных для предварительного просмотра')
            }
        } catch (error) {
            console.error('Preview error:', error)
            alert('Ошибка при загрузке данных для предварительного просмотра')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">
                    Участники ({participants.length})
                </h1>
                <div className="flex space-x-2">
                    <Button
                        onClick={handlePreviewData}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4" />
                        Команды 3+ участников (HTML)
                    </Button>
                    <Button
                        onClick={handleExportCSV}
                        disabled={isExporting}
                        className="flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        {isExporting ? 'Экспорт...' : 'Экспорт команд 3+ участников (CSV)'}
                    </Button>
                </div>
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

            {/* HTML Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-xl font-bold">Участники команд с 3+ участниками</h2>
                            <Button
                                onClick={() => setShowPreview(false)}
                                variant="outline"
                                size="sm"
                            >
                                Закрыть
                            </Button>
                        </div>
                        <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
                            {previewData.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">
                                    Нет команд с 3+ участниками
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Имя</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Команда</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Участников</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Город</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Компания</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Опыт</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Языки</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {previewData.map((participant: ParticipantWithRelations) => (
                                                <tr key={participant.id} className="hover:bg-gray-50">
                                                    <td className="px-3 py-2 text-sm font-medium text-gray-900">
                                                        {participant.name}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-gray-700">
                                                        {participant.email}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-gray-700">
                                                        {participant.team?.name || 'Нет команды'}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-gray-700">
                                                        {participant.team?._count?.members || 0}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-gray-700">
                                                        {participant.city || '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-gray-700">
                                                        {participant.company || '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-gray-700">
                                                        {participant.experienceLevel || '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-gray-700">
                                                        <div className="flex flex-wrap gap-1">
                                                            {participant.programmingLanguages && participant.programmingLanguages.length > 0 ? (
                                                                participant.programmingLanguages.slice(0, 2).map((lang: string, index: number) => (
                                                                    <span key={index} className="bg-blue-100 text-blue-800 text-xs px-1 py-0.5 rounded">
                                                                        {lang}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-gray-500 text-xs">-</span>
                                                            )}
                                                            {participant.programmingLanguages && participant.programmingLanguages.length > 2 && (
                                                                <span className="text-gray-500 text-xs">+{participant.programmingLanguages.length - 2}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
                                <p><strong>Найдено:</strong> {previewData.length} участников из команд с 3+ участниками</p>
                                <p><strong>Экспортировано:</strong> {new Date().toLocaleString('ru-RU')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}