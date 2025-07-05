'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Crown, 
  LogOut, 
  Plus, 
  Search, 
  Copy, 
  CheckCircle,
  Info,
  AlertCircle,
  Clock,
  XCircle,
  UserPlus
} from 'lucide-react'
import { leaveTeam, createAndJoinTeam, joinTeam } from '@/lib/actions'

interface Participant {
  id: string
  name: string
  email: string
  team?: {
    id: string
    name: string
    nickname: string
    status: string
    members: {
      id: string
      name: string
      email: string
    }[]
    leader?: {
      id: string
      name: string
    } | null
  } | null
  ledTeam?: {
    id: string
    name: string
    nickname: string
  } | null
}

interface AvailableTeam {
  id: string
  name: string
  nickname: string
  status: string
  _count: {
    members: number
  }
}

interface SpaceTeamManagementProps {
  participant: Participant
  availableTeams: AvailableTeam[]
}

export function SpaceTeamManagement({ participant, availableTeams }: SpaceTeamManagementProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  
  // Form states
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamNickname, setNewTeamNickname] = useState('')
  const [selectedNewLeader, setSelectedNewLeader] = useState('')

  const router = useRouter()
  const isLeader = !!participant.ledTeam
  const currentTeam = participant.team
  const teamMembers = currentTeam?.members || []
  const otherMembers = teamMembers.filter(m => m.id !== participant.id)
  
  // Filter available teams that have space and are not user's current team
  const joinableTeams = availableTeams.filter(team => 
    team.id !== currentTeam?.id && 
    team._count.members < 4 &&
    ['NEW', 'INCOMPLETED'].includes(team.status)
  )

  const handleAction = async (action: string, data?: { teamId?: string; teamName?: string; teamNickname?: string; newLeaderId?: string | null }) => {
    setLoading(true)
    setError(null)
    
    try {
      switch (action) {
        case 'leave':
          await leaveTeam(participant.id, data?.newLeaderId)
          break
        case 'create':
          if (data?.teamName && data?.teamNickname) {
            await createAndJoinTeam(
              participant.id,
              data.teamName,
              data.teamNickname,
              data.newLeaderId || null
            )
          }
          break
        case 'join':
          if (data?.teamId) {
            await joinTeam(participant.id, data.teamId, data.newLeaderId || null)
          }
          break
      }
      setActiveAction(null)
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Произошла ошибка')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setActiveAction(null)
    setSelectedTeamId('')
    setNewTeamName('')
    setNewTeamNickname('')
    setSelectedNewLeader('')
    setError(null)
  }

  const copyReferralLink = async () => {
    if (!currentTeam) return
    
    const referralLink = `${window.location.origin}/teams/${currentTeam.nickname}`
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const statusInfo = {
    NEW: {
      icon: <Clock className="w-4 h-4 text-blue-400" />,
      label: 'Новая',
      description: 'Команда только что создана и готова принимать участников'
    },
    INCOMPLETED: {
      icon: <AlertCircle className="w-4 h-4 text-yellow-400" />,
      label: 'Не завершена',
      description: 'Команда в процессе формирования или подготовки'
    },
    FINISHED: {
      icon: <CheckCircle className="w-4 h-4 text-green-400" />,
      label: 'Завершена',
      description: 'Команда завершила свой проект'
    },
    IN_REVIEW: {
      icon: <Info className="w-4 h-4 text-purple-400" />,
      label: 'На рассмотрении',
      description: 'Проект команды находится на оценке жюри'
    },
    APPROVED: {
      icon: <CheckCircle className="w-4 h-4 text-green-400" />,
      label: 'Одобрена',
      description: 'Команда прошла отбор и допущена к хакатону'
    },
    CANCELED: {
      icon: <XCircle className="w-4 h-4 text-gray-400" />,
      label: 'Отменена',
      description: 'Участие команды отменено'
    },
    REJECTED: {
      icon: <XCircle className="w-4 h-4 text-red-400" />,
      label: 'Отклонена',
      description: 'Команда не прошла отбор'
    }
  }

  if (activeAction === 'help') {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Справка по командам</h3>
          <button
            onClick={() => setActiveAction(null)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-medium text-white mb-4">Статусы команд</h4>
            <div className="space-y-3">
              {Object.entries(statusInfo).map(([status, info]) => (
                <div key={status} className="flex items-start space-x-3 p-3 bg-slate-700/30 rounded-lg">
                  {info.icon}
                  <div>
                    <p className="text-white font-medium">{info.label}</p>
                    <p className="text-slate-400 text-sm">{info.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-lg font-medium text-white mb-4">Роли в команде</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-slate-700/30 rounded-lg">
                <Crown className="w-4 h-4 text-amber-400 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Лидер команды</p>
                  <p className="text-slate-400 text-sm">
                    Может приглашать новых участников, управлять командой и назначать нового лидера при выходе
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-slate-700/30 rounded-lg">
                <Users className="w-4 h-4 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Участник команды</p>
                  <p className="text-slate-400 text-sm">
                    Может участвовать в проекте, покинуть команду или создать новую команду
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-medium text-white mb-4">Ограничения</h4>
            <div className="space-y-2 text-slate-400 text-sm">
              <p>• Максимум 4 участника в команде</p>
              <p>• Один участник может быть только в одной команде</p>
              <p>• Лидер должен назначить преемника перед выходом из команды</p>
              <p>• Если лидер - единственный участник, команда удаляется при его выходе</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (activeAction === 'leave') {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
        <h3 className="text-xl font-semibold text-white mb-4">Покинуть команду</h3>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <p className="text-yellow-200 text-sm mb-3">
            Вы собираетесь покинуть команду <strong>{currentTeam?.name}</strong>.
          </p>
          
          {isLeader && otherMembers.length > 0 && (
            <div>
              <p className="text-yellow-200 text-sm font-medium mb-3">
                Выберите нового лидера команды:
              </p>
              <select
                value={selectedNewLeader}
                onChange={(e) => setSelectedNewLeader(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                required
              >
                <option value="">Выберите нового лидера</option>
                {otherMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {isLeader && otherMembers.length === 0 && (
            <p className="text-yellow-200 text-sm">
              ⚠️ Команда будет удалена, так как вы единственный участник.
            </p>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => handleAction('leave', { newLeaderId: selectedNewLeader || null })}
            disabled={loading || (isLeader && otherMembers.length > 0 && !selectedNewLeader)}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-150"
          >
            {loading ? 'Выход...' : 'Покинуть команду'}
          </button>
          <button
            onClick={resetForm}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-150"
          >
            Отмена
          </button>
        </div>
      </div>
    )
  }

  if (activeAction === 'create') {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
        <h3 className="text-xl font-semibold text-white mb-4">
          {currentTeam ? 'Покинуть и создать новую команду' : 'Создать новую команду'}
        </h3>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {currentTeam && (
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-6">
            <p className="text-blue-200 text-sm mb-3">
              Вы покинете команду <strong>{currentTeam.name}</strong> и создадите новую команду.
            </p>
            
            {isLeader && otherMembers.length > 0 && (
              <div>
                <p className="text-blue-200 text-sm font-medium mb-3">
                  Выберите нового лидера для текущей команды:
                </p>
                <select
                  value={selectedNewLeader}
                  onChange={(e) => setSelectedNewLeader(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  required
                >
                  <option value="">Выберите нового лидера</option>
                  {otherMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Название команды *
            </label>
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Введите название команды"
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Никнейм команды *
            </label>
            <input
              type="text"
              value={newTeamNickname}
              onChange={(e) => setNewTeamNickname(e.target.value)}
              placeholder="team-nickname"
              pattern="^[a-zA-Z0-9_-]+$"
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              required
            />
            <p className="text-slate-500 text-xs mt-1">
              Только буквы, цифры, дефисы и подчеркивания
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => handleAction('create', {
              teamName: newTeamName,
              teamNickname: newTeamNickname,
              newLeaderId: selectedNewLeader || null
            })}
            disabled={loading || !newTeamName || !newTeamNickname || 
                      Boolean(currentTeam && isLeader && otherMembers.length > 0 && !selectedNewLeader)}
            className="flex-1 bg-amber-400 hover:bg-amber-500 disabled:bg-amber-400/50 text-slate-900 px-6 py-3 rounded-lg font-medium transition-colors duration-150"
          >
            {loading ? 'Создание...' : 'Создать команду'}
          </button>
          <button
            onClick={resetForm}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-150"
          >
            Отмена
          </button>
        </div>
      </div>
    )
  }

  if (activeAction === 'join') {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
        <h3 className="text-xl font-semibold text-white mb-4">
          {currentTeam ? 'Сменить команду' : 'Присоединиться к команде'}
        </h3>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {currentTeam && (
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-6">
            <p className="text-blue-200 text-sm mb-3">
              Вы покинете команду <strong>{currentTeam.name}</strong> и присоединитесь к новой команде.
            </p>
            
            {isLeader && otherMembers.length > 0 && (
              <div>
                <p className="text-blue-200 text-sm font-medium mb-3">
                  Выберите нового лидера для текущей команды:
                </p>
                <select
                  value={selectedNewLeader}
                  onChange={(e) => setSelectedNewLeader(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  required
                >
                  <option value="">Выберите нового лидера</option>
                  {otherMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Выберите команду
          </label>
          {joinableTeams.length > 0 ? (
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              required
            >
              <option value="">Выберите команду</option>
              {joinableTeams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.name} (@{team.nickname}) - {team._count.members}/4 участников
                </option>
              ))}
            </select>
          ) : (
            <div className="bg-slate-700/30 p-4 rounded-lg text-center">
              <p className="text-slate-400 text-sm">
                Нет доступных команд для присоединения
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => handleAction('join', {
              teamId: selectedTeamId,
              newLeaderId: selectedNewLeader || null
            })}
            disabled={loading || !selectedTeamId || 
                      Boolean(currentTeam && isLeader && otherMembers.length > 0 && !selectedNewLeader)}
            className="flex-1 bg-amber-400 hover:bg-amber-500 disabled:bg-amber-400/50 text-slate-900 px-6 py-3 rounded-lg font-medium transition-colors duration-150"
          >
            {loading ? 'Присоединение...' : 'Присоединиться'}
          </button>
          <button
            onClick={resetForm}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-150"
          >
            Отмена
          </button>
        </div>
      </div>
    )
  }

  if (activeAction === 'find-teams') {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Найти команду</h3>
          <button
            onClick={() => setActiveAction(null)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {joinableTeams.length > 0 ? (
            joinableTeams.map(team => (
              <div key={team.id} className="bg-slate-700/30 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium">{team.name}</h4>
                  <div className="flex items-center space-x-1">
                    {statusInfo[team.status as keyof typeof statusInfo]?.icon}
                    <span className="text-slate-400 text-sm">
                      {statusInfo[team.status as keyof typeof statusInfo]?.label}
                    </span>
                  </div>
                </div>
                <p className="text-slate-400 text-sm mb-3">@{team.nickname}</p>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">
                    {team._count.members}/4 участников
                  </span>
                  <button
                    onClick={() => {
                      setSelectedTeamId(team.id)
                      setActiveAction('join')
                    }}
                    className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-2 rounded text-sm font-medium transition-colors duration-150"
                  >
                    Присоединиться
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-400 text-sm">
                Нет доступных команд для присоединения
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Default team actions view
  return (
    <div className="space-y-6">
      {/* Help Section */}
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Управление командой</h3>
          <button
            onClick={() => setActiveAction('help')}
            className="text-slate-400 hover:text-amber-400 transition-colors"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>

        {currentTeam && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm">Ваша роль:</p>
                <div className="flex items-center space-x-2">
                  {isLeader ? (
                    <>
                      <Crown className="w-4 h-4 text-amber-400" />
                      <span className="text-white font-medium">Лидер команды</span>
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-medium">Участник команды</span>
                    </>
                  )}
                </div>
              </div>
              {currentTeam.members.length < 4 && (
                <button
                  onClick={copyReferralLink}
                  className="flex items-center space-x-2 bg-amber-400/20 hover:bg-amber-400/30 text-amber-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Скопировано!' : 'Пригласить участников'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {!currentTeam ? (
            <>
              <button
                onClick={() => setActiveAction('create')}
                className="flex items-center space-x-3 p-4 bg-amber-400/20 hover:bg-amber-400/30 rounded-lg transition-all duration-150 border border-amber-400/30"
              >
                <Plus className="w-5 h-5 text-amber-400" />
                <span className="text-white font-medium">Создать команду</span>
              </button>
              
              {joinableTeams.length > 0 && (
                <button
                  onClick={() => setActiveAction('find-teams')}
                  className="flex items-center space-x-3 p-4 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-all duration-150 border border-blue-500/30"
                >
                  <Search className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-medium">Найти команду</span>
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveAction('leave')}
                className="flex items-center space-x-3 p-4 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-all duration-150 border border-red-500/30"
              >
                <LogOut className="w-5 h-5 text-red-400" />
                <span className="text-white font-medium">Покинуть команду</span>
              </button>

              <button
                onClick={() => setActiveAction('create')}
                className="flex items-center space-x-3 p-4 bg-amber-400/20 hover:bg-amber-400/30 rounded-lg transition-all duration-150 border border-amber-400/30"
              >
                <Plus className="w-5 h-5 text-amber-400" />
                <span className="text-white font-medium">Создать новую</span>
              </button>

              {(currentTeam.members.length < 4 || joinableTeams.length > 0) && (
                <button
                  onClick={() => setActiveAction('find-teams')}
                  className="flex items-center space-x-3 p-4 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-all duration-150 border border-blue-500/30"
                >
                  {currentTeam.members.length < 4 ? (
                    <>
                      <UserPlus className="w-5 h-5 text-blue-400" />
                      <span className="text-white font-medium">Найти участников</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 text-blue-400" />
                      <span className="text-white font-medium">Найти команду</span>
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}