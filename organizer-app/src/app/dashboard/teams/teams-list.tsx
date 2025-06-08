'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Edit, Trash2, Eye } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Team {
    id: string
    name: string
    nickname: string
    createdAt: Date
    updatedAt: Date
}

interface TeamsListProps {
    initialTeams: Team[]
}

export function TeamsList({ initialTeams }: TeamsListProps) {
    const [showForm, setShowForm] = useState(false)
    const [editingTeam, setEditingTeam] = useState<Team | null>(null)
    const [formData, setFormData] = useState({ name: '', nickname: '' })
    const [submitting, setSubmitting] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            const url = editingTeam ? `/api/teams/${editingTeam.id}` : '/api/teams'
            const method = editingTeam ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (response.ok) {
                router.refresh() // Обновляем данные с сервера
                setShowForm(false)
                setEditingTeam(null)
                setFormData({ name: '', nickname: '' })
            } else {
                const error = await response.json()
                alert(error.error || 'Произошла ошибка')
            }
        } catch (error) {
            console.error('Error submitting form:', error)
            alert('Произошла ошибка')
        } finally {
            setSubmitting(false)
        }
    }

    const handleEdit = (team: Team) => {
        setEditingTeam(team)
        setFormData({ name: team.name, nickname: team.nickname })
        setShowForm(true)
    }

    const handleDelete = async (teamId: string) => {
        if (!confirm('Вы уверены, что хотите удалить эту команду?')) return

        try {
            const response = await fetch(`/api/teams/${teamId}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                router.refresh() // Обновляем данные с сервера
            } else {
                alert('Ошибка при удалении команды')
            }
        } catch (error) {
            console.error('Error deleting team:', error)
            alert('Ошибка при удалении команды')
        }
    }

    const resetForm = () => {
        setShowForm(false)
        setEditingTeam(null)
        setFormData({ name: '', nickname: '' })
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Команды</h1>
                <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить команду
                </Button>
            </div>

            {showForm && (
                <div className="bg-white p-6 rounded-lg border border-gray-300 shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">
                        {editingTeam ? 'Редактировать команду' : 'Создать команду'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-800 mb-1">
                                Название
                            </label>
                            <Input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="Название команды"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-800 mb-1">
                                Никнейм (для URL)
                            </label>
                            <Input
                                type="text"
                                value={formData.nickname}
                                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                                required
                                placeholder="team-nickname"
                                pattern="[a-zA-Z0-9-_]+"
                                title="Только буквы, цифры, дефисы и подчеркивания"
                            />
                        </div>
                        <div className="flex space-x-2">
                            <Button type="submit" disabled={submitting}>
                                {submitting ? 'Сохранение...' : 'Сохранить'}
                            </Button>
                            <Button type="button" variant="outline" onClick={resetForm}>
                                Отмена
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-lg border border-gray-300 shadow-sm">
                {initialTeams.length === 0 ? (
                    <div className="p-8 text-center text-gray-700">
                        Команды не найдены. Создайте первую команду.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">
                                        Название
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">
                                        Никнейм
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">
                                        Создана
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">
                                        Действия
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {initialTeams.map((team) => (
                                    <tr key={team.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {team.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {team.nickname}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {new Date(team.createdAt).toLocaleDateString('ru-RU')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            <div className="flex space-x-2">
                                                <Link href={`/dashboard/teams/${team.nickname}`}>
                                                    <Button variant="outline" size="sm">
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEdit(team)}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDelete(team.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
