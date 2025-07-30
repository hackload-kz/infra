'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  Users, 
  Play, 
  Clock, 
  CheckCircle, 
  XCircle,
  Activity,
  ArrowRight
} from 'lucide-react'

interface Team {
  id: string
  name: string
  nickname: string
  status: string
  level: string | null
  description: string | null
  createdAt: string
  _count: {
    members: number
    testRuns: number
  }
  leader: {
    id: string
    name: string
    email: string
  } | null
  hackathon: {
    id: string
    name: string
  }
}

export default function LoadTestingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch('/api/auth/check-admin')
          const data = await response.json()
          setIsAdmin(data.isAdmin)
        } catch (error) {
          console.error('Error checking admin status:', error)
          setIsAdmin(false)
        }
      }
      setCheckingAdmin(false)
    }

    if (session) {
      checkAdminStatus()
    }
  }, [session])

  useEffect(() => {
    if (!checkingAdmin && session && !isAdmin) {
      router.push('/dashboard')
    }
  }, [checkingAdmin, session, isAdmin, router])

  useEffect(() => {
    if (isAdmin) {
      fetchTeams()
    }
  }, [isAdmin])

  useEffect(() => {
    const filtered = teams.filter(team =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (team.leader?.name.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    )
    setFilteredTeams(filtered)
  }, [teams, searchTerm])

  const fetchTeams = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard/load-testing/teams')
      if (response.ok) {
        const data = await response.json()
        setTeams(data)
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle size={16} className="text-green-400" />
      case 'IN_REVIEW':
        return <Clock size={16} className="text-yellow-400" />
      case 'FINISHED':
        return <CheckCircle size={16} className="text-blue-400" />
      case 'CANCELED':
      case 'REJECTED':
        return <XCircle size={16} className="text-red-400" />
      default:
        return <Activity size={16} className="text-slate-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'IN_REVIEW':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'FINISHED':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'CANCELED':
      case 'REJECTED':
        return 'bg-red-500/20 text-red-300 border-red-500/30'
      case 'NEW':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'INCOMPLETED':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    }
  }

  if (status === 'loading' || checkingAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-slate-300">Загрузка...</div>
      </div>
    )
  }

  if (!session) {
    router.push('/login')
    return null
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">Доступ запрещен. Требуются права организатора.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Нагрузочное тестирование</h1>
        <p className="mt-2 text-slate-500">
          Управление нагрузочным тестированием команд хакатона
        </p>
      </div>

      {/* Поиск */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Поиск команд..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-700/70 border-slate-600/50 text-white placeholder-slate-400"
          />
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/70 backdrop-blur-sm border-slate-600/40 p-4">
          <div className="flex items-center gap-3">
            <Users size={24} className="text-amber-400" />
            <div>
              <p className="text-sm text-slate-300">Всего команд</p>
              <p className="text-xl font-bold text-white">{teams.length}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-slate-800/70 backdrop-blur-sm border-slate-600/40 p-4">
          <div className="flex items-center gap-3">
            <Play size={24} className="text-green-400" />
            <div>
              <p className="text-sm text-slate-300">Запусков тестов</p>
              <p className="text-xl font-bold text-white">
                {teams.reduce((acc, team) => acc + team._count.testRuns, 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-slate-800/70 backdrop-blur-sm border-slate-600/40 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle size={24} className="text-blue-400" />
            <div>
              <p className="text-sm text-slate-300">Активных команд</p>
              <p className="text-xl font-bold text-white">
                {teams.filter(team => ['APPROVED', 'FINISHED'].includes(team.status)).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-slate-800/70 backdrop-blur-sm border-slate-600/40 p-4">
          <div className="flex items-center gap-3">
            <Activity size={24} className="text-purple-400" />
            <div>
              <p className="text-sm text-slate-300">Участников</p>
              <p className="text-xl font-bold text-white">
                {teams.reduce((acc, team) => acc + team._count.members, 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Список команд */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-slate-300">Загрузка команд...</div>
          </div>
        ) : filteredTeams.length === 0 ? (
          <Card className="bg-slate-800/70 backdrop-blur-sm border-slate-600/40 p-8 text-center">
            <Users size={48} className="mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              {searchTerm ? 'Команды не найдены' : 'Нет команд'}
            </h3>
            <p className="text-slate-200">
              {searchTerm ? 'Попробуйте изменить параметры поиска' : 'Команды появятся здесь после регистрации участников'}
            </p>
          </Card>
        ) : (
          filteredTeams.map((team) => (
            <Card key={team.id} className="bg-slate-800/70 backdrop-blur-sm border-slate-600/40 p-6 hover:bg-slate-700/80 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-medium text-white">{team.name}</h3>
                    <span className="text-sm text-slate-300">@{team.nickname}</span>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(team.status)}`}>
                      {getStatusIcon(team.status)}
                      {team.status}
                    </div>
                    {team.level && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        team.level === 'BEGINNER' 
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {team.level === 'BEGINNER' ? 'Начинающие' : 'Продвинутые'}
                      </span>
                    )}
                  </div>
                  
                  {team.description && (
                    <p className="text-sm text-slate-200 mb-3">{team.description}</p>
                  )}
                  
                  <div className="flex items-center gap-6 text-sm text-slate-300">
                    <div className="flex items-center gap-1">
                      <Users size={14} />
                      <span>{team._count.members} участников</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Play size={14} />
                      <span>{team._count.testRuns} тестов</span>
                    </div>
                    {team.leader && (
                      <div>
                        <span>Лидер: {team.leader.name}</span>
                      </div>
                    )}
                    <div>
                      <span>Хакатон: {team.hackathon.name}</span>
                    </div>
                  </div>
                </div>
                
                <Button
                  onClick={() => router.push(`/dashboard/load-testing/teams/${team.id}`)}
                  className="bg-amber-400 hover:bg-amber-500 text-black font-medium flex items-center gap-2"
                >
                  Управление тестами
                  <ArrowRight size={16} />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}