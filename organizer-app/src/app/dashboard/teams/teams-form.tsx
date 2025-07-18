'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Edit, Trash2, Eye, Filter, Users, Trophy, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { createTeam, updateTeam, deleteTeam } from '@/lib/actions'
import { TeamStatus, TeamLevel } from '@prisma/client'

interface Participant {
    id: string
    name: string
    email: string
}

interface Team {
    id: string
    name: string
    nickname: string
    status?: TeamStatus
    level?: TeamLevel | null
    comment?: string | null
    createdAt: string | Date
    updatedAt: string | Date
    members?: Participant[]
    leader?: Participant | null
    _count?: {
        members: number
    }
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

const levelColors: Record<TeamLevel, string> = {
    BEGINNER: 'bg-green-100 text-green-800',
    ADVANCED: 'bg-orange-100 text-orange-800',
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

interface TeamStats {
    totalTeams: number
    beginnerTeams: number
    advancedTeams: number
    fullTeams: number
    completedTeams: number
    notCompletedTeams: number
    statusBreakdown: Record<TeamStatus, number>
}

interface TeamsFormProps {
    teams: Team[]
    stats: TeamStats
}

function TeamsForm({ teams, stats }: TeamsFormProps) {
    const [showForm, setShowForm] = useState(false)
    const [editingTeam, setEditingTeam] = useState<Team | null>(null)
    const [statusFilter, setStatusFilter] = useState<TeamStatus | 'ALL'>('ALL')
    const [levelFilter, setLevelFilter] = useState<TeamLevel | 'ALL'>('ALL')
    const [memberFilter, setMemberFilter] = useState<'ALL' | 'FULL' | 'PARTIAL'>('ALL')
    const [completionFilter, setCompletionFilter] = useState<'ALL' | 'COMPLETED' | 'NOT_COMPLETED'>('ALL')
    const [searchTerm, setSearchTerm] = useState('')

    // Keep for future use if needed
    // const handleEdit = (team: Team) => {
    //     setEditingTeam(team)
    //     setShowForm(true)
    // }

    const resetForm = () => {
        setShowForm(false)
        setEditingTeam(null)
    }

    // Helper function to determine if a team is completed
    const isTeamCompleted = (team: Team) => {
        const memberCount = team._count?.members || 0;
        return memberCount >= 3;
    };

    // Filter teams based on current filters
    const filteredTeams = teams.filter(team => {
        const matchesStatus = statusFilter === 'ALL' || team.status === statusFilter
        const matchesLevel = levelFilter === 'ALL' || team.level === levelFilter
        const matchesMembers = memberFilter === 'ALL' || 
            (memberFilter === 'FULL' && (team._count?.members || 0) >= 4) ||
            (memberFilter === 'PARTIAL' && (team._count?.members || 0) < 4)
        const matchesCompletion = completionFilter === 'ALL' ||
            (completionFilter === 'COMPLETED' && isTeamCompleted(team)) ||
            (completionFilter === 'NOT_COMPLETED' && !isTeamCompleted(team))
        const matchesSearch = searchTerm === '' || 
            team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            team.nickname.toLowerCase().includes(searchTerm.toLowerCase())
        
        return matchesStatus && matchesLevel && matchesMembers && matchesCompletion && matchesSearch
    })


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
                <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Team
                </Button>
            </div>

            {/* Statistics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Teams</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalTeams}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Completed Teams (3+ members)</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.completedTeams}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <Users className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Incomplete Teams (&lt; 3 members)</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.notCompletedTeams}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <Trophy className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Beginner Teams</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.beginnerTeams}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Trophy className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Advanced Teams</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.advancedTeams}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Full Teams (4+ members)</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.fullTeams}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-4">
                    <Filter className="w-5 h-5 text-gray-500" />
                    <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-2">Search</label>
                        <Input
                            type="text"
                            placeholder="Search teams..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-2">Completion Status</label>
                        <select 
                            value={completionFilter} 
                            onChange={(e) => setCompletionFilter(e.target.value as 'ALL' | 'COMPLETED' | 'NOT_COMPLETED')}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="ALL">All Teams</option>
                            <option value="COMPLETED">Completed (3+ members)</option>
                            <option value="NOT_COMPLETED">Incomplete (&lt; 3 members)</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-2">Status</label>
                        <select 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value as TeamStatus | 'ALL')}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="ALL">All Statuses</option>
                            {Object.entries(statusLabels).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-2">Level</label>
                        <select 
                            value={levelFilter} 
                            onChange={(e) => setLevelFilter(e.target.value as TeamLevel | 'ALL')}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="ALL">All Levels</option>
                            {Object.entries(levelLabels).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-2">Team Size</label>
                        <select 
                            value={memberFilter} 
                            onChange={(e) => setMemberFilter(e.target.value as 'ALL' | 'FULL' | 'PARTIAL')}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="ALL">All Sizes</option>
                            <option value="FULL">Full Teams (4 members)</option>
                            <option value="PARTIAL">Partial Teams (&lt; 4 members)</option>
                        </select>
                    </div>
                </div>
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
                            <label className="block text-sm font-medium text-gray-500 mb-1">
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
                            <label className="block text-sm font-medium text-gray-500 mb-1">
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
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Teams List</h3>
                        <span className="text-sm text-gray-500">
                            Showing {filteredTeams.length} of {teams.length} teams
                        </span>
                    </div>
                </div>
                
                {filteredTeams.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        {teams.length === 0 ? 'No teams found. Create your first team.' : 'No teams match the current filters.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Nickname
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Level
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Members
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Completion
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredTeams.map((team) => (
                                    <tr key={team.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {team.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {team.nickname}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {team.status && (
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[team.status]}`}>
                                                    {statusLabels[team.status]}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {team.level && (
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${levelColors[team.level]}`}>
                                                    {levelLabels[team.level]}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            <span className={`${(team._count?.members || 0) >= 4 ? 'text-green-600 font-semibold' : 'text-gray-900'}`}>
                                                {team._count?.members || team.members?.length || 0} / 4
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {isTeamCompleted(team) ? (
                                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    Completed
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                                    <Users className="w-3 h-3 mr-1" />
                                                    Incomplete
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {new Date(team.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            <div className="flex space-x-2">
                                                <Link href={`/dashboard/teams/${team.nickname}`}>
                                                    <Button variant="outline" size="sm" title="View Team">
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                </Link>
                                                <Link href={`/dashboard/teams/${team.nickname}/edit`}>
                                                    <Button variant="outline" size="sm" title="Edit Team">
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                </Link>
                                                <form action={deleteTeam} style={{ display: 'inline' }}>
                                                    <input type="hidden" name="id" value={team.id} />
                                                    <Button
                                                        type="submit"
                                                        variant="outline"
                                                        size="sm"
                                                        title="Delete Team"
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
