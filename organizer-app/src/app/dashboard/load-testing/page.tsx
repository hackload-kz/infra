'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  recentTestRuns?: TestRun[]
}

interface TestRun {
  id: string
  runNumber: number
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
  comment: string | null
  createdAt: string
  completedAt: string | null
  scenario: {
    name: string
    identifier: string
  }
  team: {
    id: string
    name: string
    nickname: string
  }
}

export default function LoadTestingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([])
  const [recentTestRuns, setRecentTestRuns] = useState<TestRun[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingTestRuns, setLoadingTestRuns] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [view, setView] = useState<'teams' | 'testRuns'>('teams')
  const [statusFilter, setStatusFilter] = useState('APPROVED')

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
      fetchRecentTestRuns()
    }
  }, [isAdmin])

  useEffect(() => {
    const filtered = teams.filter(team => {
      const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (team.leader?.name.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
      
      const matchesStatus = statusFilter === 'ALL' || team.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
    setFilteredTeams(filtered)
  }, [teams, searchTerm, statusFilter])

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

  const fetchRecentTestRuns = async () => {
    try {
      setLoadingTestRuns(true)
      // We'll fetch recent test runs from all teams
      const response = await fetch('/api/dashboard/load-testing/teams')
      if (response.ok) {
        const teams = await response.json()
        const allTestRuns: TestRun[] = []
        
        // Get recent test runs from each team
        for (const team of teams) {
          try {
            const testRunsResponse = await fetch(`/api/dashboard/load-testing/teams/${team.id}/test-runs`)
            if (testRunsResponse.ok) {
              const teamData = await testRunsResponse.json()
              // Add team info to each test run and take only recent ones
              const teamTestRuns = teamData.testRuns.slice(0, 3).map((run: { id: string; runNumber: number; k6TestName: string; status: string; createdAt: string; scenario: { name: string; id: string } }) => ({
                ...run,
                team: {
                  id: team.id,
                  name: team.name,
                  nickname: team.nickname
                }
              }))
              allTestRuns.push(...teamTestRuns)
            }
          } catch (error) {
            console.error(`Error fetching test runs for team ${team.id}:`, error)
          }
        }
        
        // Sort by creation date and take the most recent 20
        allTestRuns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setRecentTestRuns(allTestRuns.slice(0, 20))
      }
    } catch (error) {
      console.error('Error fetching recent test runs:', error)
    } finally {
      setLoadingTestRuns(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle size={16} className="text-green-600" />
      case 'IN_REVIEW':
        return <Clock size={16} className="text-yellow-600" />
      case 'FINISHED':
        return <CheckCircle size={16} className="text-blue-600" />
      case 'CANCELED':
      case 'REJECTED':
        return <XCircle size={16} className="text-red-600" />
      default:
        return <Activity size={16} className="text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'IN_REVIEW':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'FINISHED':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'CANCELED':
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'NEW':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'INCOMPLETED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  if (status === 'loading' || checkingAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Загрузка...</div>
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
        <div className="text-red-600">Доступ запрещен. Требуются права организатора.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Нагрузочное тестирование</h1>
        <p className="mt-2 text-gray-700">
          Управление нагрузочным тестированием команд хакатона
        </p>
      </div>

      {/* Поиск и переключение вида */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={view === 'teams' ? "Поиск команд..." : "Поиск тестов..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white border-gray-300 text-gray-900 placeholder-gray-500"
          />
        </div>
        {view === 'teams' && (
          <div className="min-w-[180px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                <SelectValue placeholder="Статус команды" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Все статусы</SelectItem>
                <SelectItem value="APPROVED">Одобренные</SelectItem>
                <SelectItem value="IN_REVIEW">На рассмотрении</SelectItem>
                <SelectItem value="FINISHED">Завершенные</SelectItem>
                <SelectItem value="NEW">Новые</SelectItem>
                <SelectItem value="INCOMPLETED">Незавершенные</SelectItem>
                <SelectItem value="CANCELED">Отмененные</SelectItem>
                <SelectItem value="REJECTED">Отклоненные</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex rounded-lg border border-gray-300 bg-white">
          <Button
            onClick={() => setView('teams')}
            variant={view === 'teams' ? 'default' : 'ghost'}
            size="sm"
            className={view === 'teams' ? 'bg-blue-600 text-white' : 'text-gray-600'}
          >
            <Users size={16} className="mr-2" />
            Команды
          </Button>
          <Button
            onClick={() => setView('testRuns')}
            variant={view === 'testRuns' ? 'default' : 'ghost'}
            size="sm"
            className={view === 'testRuns' ? 'bg-blue-600 text-white' : 'text-gray-600'}
          >
            <Activity size={16} className="mr-2" />
            Запуски тестов
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-gray-300 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Всего команд</p>
              <p className="text-2xl font-bold text-gray-900">{teams.length}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white border-gray-300 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Play size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Запусков тестов</p>
              <p className="text-2xl font-bold text-gray-900">
                {teams.reduce((acc, team) => acc + team._count.testRuns, 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-white border-gray-300 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <CheckCircle size={24} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Активных команд</p>
              <p className="text-2xl font-bold text-gray-900">
                {teams.filter(team => ['APPROVED', 'FINISHED'].includes(team.status)).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-white border-gray-300 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Участников</p>
              <p className="text-2xl font-bold text-gray-900">
                {teams.reduce((acc, team) => acc + team._count.members, 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Условное отображение */}
      {view === 'teams' ? (
        /* Список команд */
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-600">Загрузка команд...</div>
            </div>
          ) : filteredTeams.length === 0 ? (
            <Card className="bg-white border-gray-300 shadow-sm p-8 text-center">
              <Users size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Команды не найдены' : 'Нет команд'}
              </h3>
              <p className="text-gray-600">
                {searchTerm ? 'Попробуйте изменить параметры поиска' : 'Команды появятся здесь после регистрации участников'}
              </p>
            </Card>
          ) : (
            filteredTeams.map((team) => (
              <Card key={team.id} className="bg-white border-gray-300 shadow-sm p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{team.name}</h3>
                      <span className="text-sm text-gray-600">@{team.nickname}</span>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(team.status)}`}>
                        {getStatusIcon(team.status)}
                        {team.status}
                      </div>
                      {team.level && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          team.level === 'BEGINNER' 
                            ? 'bg-green-100 text-green-800 border-green-300'
                            : 'bg-blue-100 text-blue-800 border-blue-300'
                        }`}>
                          {team.level === 'BEGINNER' ? 'Начинающие' : 'Продвинутые'}
                        </span>
                      )}
                    </div>
                    
                    {team.description && (
                      <p className="text-sm text-gray-600 mb-3">{team.description}</p>
                    )}
                    
                    <div className="flex items-center gap-6 text-sm text-gray-600">
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
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-2"
                  >
                    Управление тестами
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* Список запусков тестов */
        <div className="space-y-3">
          {loadingTestRuns ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-600">Загрузка запусков тестов...</div>
            </div>
          ) : recentTestRuns.filter(run =>
              run.scenario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              run.scenario.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
              run.team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (run.comment && run.comment.toLowerCase().includes(searchTerm.toLowerCase()))
            ).length === 0 ? (
            <Card className="bg-white border-gray-300 shadow-sm p-8 text-center">
              <Activity size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Запуски тестов не найдены' : 'Нет запусков тестов'}
              </h3>
              <p className="text-gray-600">
                {searchTerm ? 'Попробуйте изменить параметры поиска' : 'Запуски тестов появятся здесь после создания тестов командами'}
              </p>
            </Card>
          ) : (
            recentTestRuns.filter(run =>
              run.scenario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              run.scenario.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
              run.team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (run.comment && run.comment.toLowerCase().includes(searchTerm.toLowerCase()))
            ).map((run) => (
              <Card key={run.id} className="bg-white border-gray-300 shadow-sm p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2 py-1 rounded-md text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                        #{run.runNumber}
                      </span>
                      <h3 className="text-lg font-medium text-gray-900">{run.scenario.name}</h3>
                      <span className="text-sm text-gray-600">({run.scenario.identifier})</span>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${
                        run.status === 'SUCCEEDED' ? 'bg-green-100 text-green-800 border-green-300' :
                        run.status === 'RUNNING' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                        run.status === 'FAILED' ? 'bg-red-100 text-red-800 border-red-300' :
                        run.status === 'CANCELLED' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                        'bg-gray-100 text-gray-800 border-gray-300'
                      }`}>
                        {run.status === 'RUNNING' && <Play size={14} />}
                        {run.status === 'SUCCEEDED' && <CheckCircle size={14} />}
                        {run.status === 'FAILED' && <XCircle size={14} />}
                        {run.status === 'PENDING' && <Clock size={14} />}
                        {run.status === 'SUCCEEDED' ? 'Завершен' :
                         run.status === 'RUNNING' ? 'Выполняется' :
                         run.status === 'FAILED' ? 'Ошибка' :
                         run.status === 'PENDING' ? 'Ожидание' :
                         run.status}
                      </div>
                    </div>
                    
                    {run.comment && (
                      <p className="text-sm text-gray-600 mb-3">{run.comment}</p>
                    )}
                    
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users size={14} />
                        <span>Команда: {run.team.name} (@{run.team.nickname})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>Создан: {new Date(run.createdAt).toLocaleDateString('ru-RU')}</span>
                      </div>
                      {run.completedAt && (
                        <div className="flex items-center gap-1">
                          <CheckCircle size={14} />
                          <span>Завершен: {new Date(run.completedAt).toLocaleDateString('ru-RU')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => router.push(`/dashboard/load-testing/teams/${run.team.id}/test-runs/${run.id}`)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-2"
                  >
                    Подробности
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}