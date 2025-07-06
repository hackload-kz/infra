'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateTeamInfo, removeTeamMember } from '@/lib/actions'
import { 
  Edit3,
  Save,
  X,
  AlertCircle,
  Users,
  UserX,
  Crown
} from 'lucide-react'

interface TeamMember {
  id: string
  name: string
  email: string
  company?: string | null
  city?: string | null
}

interface Team {
  id: string
  name: string
  nickname: string
  status: string
  members: TeamMember[]
  leader?: {
    id: string
    name: string
  } | null
}

interface TeamEditFormProps {
  team: Team
  leaderId: string
  isEditing: boolean
  onToggleEdit: () => void
}

export function TeamEditForm({ team, leaderId, isEditing, onToggleEdit }: TeamEditFormProps) {
  const [name, setName] = useState(team.name)
  const [nickname, setNickname] = useState(team.nickname)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removingMember, setRemovingMember] = useState<string | null>(null)
  const router = useRouter()

  const canEdit = ['NEW', 'INCOMPLETED', 'FINISHED', 'IN_REVIEW'].includes(team.status)
  const isLeader = team.leader?.id === leaderId

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await updateTeamInfo(team.id, name, nickname, leaderId)
      onToggleEdit()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка при сохранении')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого участника из команды?')) {
      return
    }

    setRemovingMember(memberId)
    setError(null)

    try {
      await removeTeamMember(team.id, memberId, leaderId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка при удалении участника')
    } finally {
      setRemovingMember(null)
    }
  }

  const handleCancel = () => {
    setName(team.name)
    setNickname(team.nickname)
    setError(null)
    onToggleEdit()
  }

  if (!isLeader) {
    return null
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white flex items-center">
          <Edit3 className="w-5 h-5 text-amber-400 mr-2" />
          Управление командой
        </h3>
        {!isEditing && canEdit && (
          <button
            onClick={onToggleEdit}
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 flex items-center space-x-2"
          >
            <Edit3 className="w-4 h-4" />
            <span>Редактировать</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      {!canEdit && (
        <div className="bg-slate-700/30 rounded-lg p-4 mb-6">
          <p className="text-slate-400 text-sm">
            Команда в статусе &quot;{team.status}&quot; не может быть отредактирована
          </p>
        </div>
      )}

      {isEditing && canEdit ? (
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Название команды *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите название команды"
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Никнейм команды *
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="team-nickname"
              pattern="^[a-zA-Z0-9_-]+$"
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50"
              required
            />
            <p className="text-slate-500 text-xs mt-1">
              Только буквы, цифры, дефисы и подчеркивания
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading || !name || !nickname}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-150 flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Сохранение...' : 'Сохранить'}</span>
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-150 flex items-center justify-center space-x-2"
            >
              <X className="w-4 h-4" />
              <span>Отмена</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Название команды
              </label>
              <p className="text-white font-medium">{team.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Никнейм команды
              </label>
              <p className="text-white font-medium">@{team.nickname}</p>
            </div>
          </div>

          {/* Team Members Management */}
          <div>
            <h4 className="text-white font-medium mb-4 flex items-center">
              <Users className="w-4 h-4 text-amber-400 mr-2" />
              Управление участниками
            </h4>
            <div className="space-y-3">
              {team.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between bg-slate-700/30 p-4 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full flex items-center justify-center">
                      <span className="text-slate-900 font-bold text-sm">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-white font-medium">{member.name}</p>
                        {member.id === team.leader?.id && (
                          <Crown className="w-3 h-3 text-amber-400" />
                        )}
                      </div>
                      <p className="text-slate-400 text-sm">{member.email}</p>
                      {(member.company || member.city) && (
                        <p className="text-slate-500 text-xs">
                          {[member.company, member.city].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {member.id !== leaderId && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removingMember === member.id}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 flex items-center space-x-2"
                    >
                      <UserX className="w-4 h-4" />
                      <span>{removingMember === member.id ? 'Удаление...' : 'Удалить'}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}