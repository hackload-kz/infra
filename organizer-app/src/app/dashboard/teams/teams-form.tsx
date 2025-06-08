'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Edit, Trash2, Eye } from 'lucide-react'
import Link from 'next/link'
import { createTeam, updateTeam, deleteTeam } from '@/lib/actions'

interface Team {
    id: string
    name: string
    nickname: string
    createdAt: string | Date
    updatedAt: string | Date
}

interface TeamsFormProps {
    teams: Team[]
}

function TeamsForm({ teams }: TeamsFormProps) {
    const [showForm, setShowForm] = useState(false)
    const [editingTeam, setEditingTeam] = useState<Team | null>(null)

    const handleEdit = (team: Team) => {
        setEditingTeam(team)
        setShowForm(true)
    }

    const resetForm = () => {
        setShowForm(false)
        setEditingTeam(null)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
                <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Team
                </Button>
            </div>

            {showForm && (
                <div className="bg-white p-6 rounded-lg border border-gray-300 shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">
                        {editingTeam ? 'Edit Team' : 'Create Team'}
                    </h2>
                    <form action={editingTeam ? updateTeam : createTeam} className="space-y-4">
                        {editingTeam && (
                            <input type="hidden" name="id" value={editingTeam.id} />
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-800 mb-1">
                                Name
                            </label>
                            <Input
                                type="text"
                                name="name"
                                defaultValue={editingTeam?.name || ''}
                                required
                                placeholder="Team name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-800 mb-1">
                                Nickname (for URL)
                            </label>
                            <Input
                                type="text"
                                name="nickname"
                                defaultValue={editingTeam?.nickname || ''}
                                required
                                placeholder="team-nickname"
                                pattern="[a-zA-Z0-9-_]+"
                                title="Only letters, numbers, hyphens and underscores"
                            />
                        </div>
                        <div className="flex space-x-2">
                            <Button type="submit">
                                {editingTeam ? 'Update' : 'Create'}
                            </Button>
                            <Button type="button" variant="outline" onClick={resetForm}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-lg border border-gray-300 shadow-sm">
                {teams.length === 0 ? (
                    <div className="p-8 text-center text-gray-700">
                        No teams found. Create your first team.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">
                                        Nickname
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {teams.map((team) => (
                                    <tr key={team.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {team.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {team.nickname}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {new Date(team.createdAt).toLocaleDateString()}
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
                                                <form action={deleteTeam} style={{ display: 'inline' }}>
                                                    <input type="hidden" name="id" value={team.id} />
                                                    <Button
                                                        type="submit"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            if (!confirm('Are you sure you want to delete this team?')) {
                                                                e.preventDefault()
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </form>
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

export default TeamsForm
