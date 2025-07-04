'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Save, UserPlus, UserMinus } from 'lucide-react'
import { TeamStatus, TeamLevel } from '@prisma/client'

interface Participant {
    id: string
    name: string
    email: string
    city: string | null
    company: string | null
    teamId: string | null
    ledTeamId: string | null
    user?: {
        id: string
        email: string
    }
}

interface Team {
    id: string
    name: string
    nickname: string
    status: TeamStatus
    level: TeamLevel | null
    comment: string | null
    createdAt: Date
    updatedAt: Date
    leaderId: string | null
    leader: Participant | null
    members: Participant[]
}

interface TeamEditFormProps {
    team: Team
    allParticipants: Participant[]
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

const levelLabels: Record<TeamLevel, string> = {
    BEGINNER: 'Начинающий',
    ADVANCED: 'Продвинутый',
}

export default function TeamEditForm({ team, allParticipants }: TeamEditFormProps) {
    const router = useRouter()
    const [formData, setFormData] = useState({
        name: team.name,
        nickname: team.nickname,
        status: team.status,
        level: team.level || '',
        comment: team.comment || '',
        leaderId: team.leaderId || '',
    })
    const [submitting, setSubmitting] = useState(false)

    // Available participants (not already in this team, except current leader)
    const availableParticipants = allParticipants.filter(p => 
        !p.teamId || p.teamId === team.id || p.id === team.leaderId
    )

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        // Validate required fields
        if (!formData.leaderId) {
            alert('Лидер команды обязателен для заполнения')
            setSubmitting(false)
            return
        }

        if (!formData.status) {
            alert('Статус команды обязателен для заполнения')
            setSubmitting(false)
            return
        }

        try {
            const response = await fetch(`/api/teams/${team.id}/edit`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    level: formData.level || null,
                }),
            })

            if (response.ok) {
                router.push(`/dashboard/teams/${team.nickname}`)
                router.refresh()
            } else {
                const error = await response.json()
                alert(error.error || 'Произошла ошибка при сохранении')
            }
        } catch (error) {
            console.error('Error updating team:', error)
            alert('Произошла ошибка при сохранении')
        } finally {
            setSubmitting(false)
        }
    }

    const handleAddMember = async (participantId: string) => {
        try {
            const response = await fetch(`/api/teams/${team.id}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ participantId }),
            })

            if (response.ok) {
                router.refresh()
            } else {
                const error = await response.json()
                alert(error.error || 'Ошибка при добавлении участника')
            }
        } catch (error) {
            console.error('Error adding member:', error)
            alert('Ошибка при добавлении участника')
        }
    }

    const handleRemoveMember = async (participantId: string) => {
        if (!confirm('Вы уверены, что хотите исключить этого участника из команды?')) return

        try {
            const response = await fetch(`/api/teams/${team.id}/members/${participantId}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                router.refresh()
            } else {
                const error = await response.json()
                alert(error.error || 'Ошибка при удалении участника')
            }
        } catch (error) {
            console.error('Error removing member:', error)
            alert('Ошибка при удалении участника')
        }
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
                    <h1 className="text-2xl font-bold text-gray-900">Редактирование команды</h1>
                </div>
            </div>

            {/* Edit Form */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                        <span className="text-red-500">*</span> - обязательные поля
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Название команды
                            </label>
                            <Input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Никнейм (для URL)
                            </label>
                            <Input
                                type="text"
                                value={formData.nickname}
                                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                                required
                                pattern="[a-zA-Z0-9-_]+"
                                title="Только буквы, цифры, дефисы и подчеркивания"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Статус <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as TeamStatus })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                {Object.entries(statusLabels).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Уровень команды
                            </label>
                            <select
                                value={formData.level}
                                onChange={(e) => setFormData({ ...formData, level: e.target.value as TeamLevel })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Не выбран</option>
                                {Object.entries(levelLabels).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Лидер команды <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.leaderId}
                                onChange={(e) => setFormData({ ...formData, leaderId: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Выберите лидера команды</option>
                                {availableParticipants.map((participant) => (
                                    <option key={participant.id} value={participant.id}>
                                        {participant.name} ({participant.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Комментарий (только для админов)
                        </label>
                        <textarea
                            value={formData.comment}
                            onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                            rows={4}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Комментарий для внутреннего использования..."
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button 
                            type="submit" 
                            disabled={submitting || !formData.leaderId || !formData.status}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {submitting ? 'Сохранение...' : 'Сохранить изменения'}
                        </Button>
                    </div>
                </form>
            </div>

            {/* Team Members Management */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Current Members */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">Участники команды</h2>
                    {team.members.length > 0 ? (
                        <div className="space-y-3">
                            {team.members.map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                                    <div>
                                        <p className="font-medium">{member.name}</p>
                                        <p className="text-sm text-gray-600">{member.email}</p>
                                        {member.id === team.leaderId && (
                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Лидер</span>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRemoveMember(member.id)}
                                        disabled={member.id === team.leaderId}
                                    >
                                        <UserMinus className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">В команде пока нет участников</p>
                    )}
                </div>

                {/* Available Participants */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">Доступные участники</h2>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {availableParticipants
                            .filter(p => !team.members.some(m => m.id === p.id))
                            .map((participant) => (
                                <div key={participant.id} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                                    <div>
                                        <p className="font-medium">{participant.name}</p>
                                        <p className="text-sm text-gray-600">{participant.email}</p>
                                        {participant.company && (
                                            <p className="text-xs text-gray-500">{participant.company}</p>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddMember(participant.id)}
                                        disabled={team.members.length >= 4}
                                    >
                                        <UserPlus className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                    </div>
                    {team.members.length >= 4 && (
                        <p className="text-sm text-orange-600 mt-2">Команда уже заполнена (максимум 4 участника)</p>
                    )}
                </div>
            </div>
        </div>
    )
}