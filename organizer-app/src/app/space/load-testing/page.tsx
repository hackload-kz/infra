'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { 
  ArrowLeft,
  Plus,
  Search, 
  Play, 
  Clock, 
  CheckCircle, 
  XCircle,
  Pause,
  Activity,
  Eye,
  Calendar,
  MessageSquare,
  Zap,
  AlertCircle,
  User
} from 'lucide-react'
import TestRunForm from '@/components/test-run-form'

interface Team {
  id: string
  name: string
  nickname: string
  k6EnvironmentVars: Record<string, string> | null
}

interface TestScenario {
  id: string
  name: string
  identifier: string
  description: string | null
}

interface TestRun {
  id: string
  runNumber: number
  comment: string | null
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
  startedAt: string | null
  completedAt: string | null
  results: Record<string, unknown> | null
  k6TestName: string | null
  createdAt: string
  updatedAt: string
  scenario: TestScenario
  team: Team
  creator: {
    id: string
    name: string
    user: {
      email: string
    }
  } | null
}

interface Participant {
  id?: string
  name: string
  email?: string
  image?: string
  team?: Team | null
  ledTeam?: Team | null
}

interface ParticipantTestRunsData {
  team: Team | null
  testRuns: TestRun[]
}

export default function ParticipantLoadTestingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<ParticipantTestRunsData | null>(null)
  const [filteredRuns, setFilteredRuns] = useState<TestRun[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [participant, setParticipant] = useState<Participant | null>(null)

  useEffect(() => {
    if (session?.user?.email) {
      fetchParticipantData()
      fetchTestRuns()
    }
  }, [session])

  const fetchParticipantData = async () => {
    try {
      // Получаем данные участника для построения интерфейса
      const response = await fetch('/api/auth/session')
      const sessionData = await response.json()
      setParticipant({
        name: sessionData?.user?.name || 'Участник',
        email: sessionData?.user?.email || '',
        image: sessionData?.user?.image || undefined
      })
    } catch (error) {
      console.error('Error fetching participant data:', error)
    }
  }

  const fetchTestRuns = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/space/teams/test-runs')
      if (response.ok) {
        const result = await response.json()
        setData(result)
      } else {
        console.error('Failed to fetch test runs')
      }
    } catch (error) {
      console.error('Error fetching test runs:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (data) {
      const filtered = data.testRuns.filter(run =>
        run.scenario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        run.scenario.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (run.comment && run.comment.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setFilteredRuns(filtered)
    }
  }, [data, searchTerm])

  const handleCreateRun = () => {
    setShowForm(true)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleRunCreated = (newRun: any) => {
    if (data) {
      setData({
        ...data,
        testRuns: [newRun, ...data.testRuns]
      })
    }
    setShowForm(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <Play size={16} className="text-blue-600" />
      case 'SUCCEEDED':
        return <CheckCircle size={16} className="text-green-600" />
      case 'FAILED':
        return <XCircle size={16} className="text-red-600" />
      case 'CANCELLED':
        return <Pause size={16} className="text-yellow-600" />
      default:
        return <Clock size={16} className="text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'SUCCEEDED':
        return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'FAILED':
        return 'bg-red-500/20 text-red-300 border-red-500/30'
      case 'CANCELLED':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return 'Выполняется'
      case 'SUCCEEDED':
        return 'Завершен'
      case 'FAILED':
        return 'Ошибка'
      case 'CANCELLED':
        return 'Отменен'
      case 'PENDING':
        return 'Ожидание'
      default:
        return status
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU')
  }

  if (status === 'loading') {
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

  if (showForm && data?.team) {
    return (
      <PersonalCabinetLayout user={participant} hasTeam={!!data.team}>
        <TestRunForm
          onSuccess={handleRunCreated}
          onCancel={() => setShowForm(false)}
          initialEnvironmentVars={data.team.k6EnvironmentVars}
          isParticipant={true}
        />
      </PersonalCabinetLayout>
    )
  }

  return (
    <PersonalCabinetLayout user={participant} hasTeam={!!data?.team}>
      <div className="space-y-6">
        {/* Заголовок */}
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push('/space/tasks')}
            variant="ghost"
            className="text-slate-300 hover:text-white"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Мои <span className="text-amber-400">тесты</span>
            </h1>
            <div className="w-16 h-1 bg-amber-400 rounded-full mb-2"></div>
            <p className="text-slate-400">
              {data?.team ? `Команда: ${data.team.name} (@${data.team.nickname})` : 'Управление вашими нагрузочными тестами'}
            </p>
          </div>
        </div>

        {!data?.team ? (
          /* Нет команды */
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/30 p-8 text-center">
            <div className="w-16 h-16 bg-amber-400/20 rounded-full mx-auto mb-4 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Команда не найдена
            </h2>
            <p className="text-slate-400 mb-6">
              Вы должны состоять в команде для создания и просмотра нагрузочных тестов
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" asChild>
                <Link href="/space/teams">Найти команду</Link>
              </Button>
              <Button asChild>
                <a href="/space/team">Создать команду</a>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Действия и поиск */}
            <div className="flex items-center gap-4">
              <Button
                onClick={handleCreateRun}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-2"
              >
                <Plus size={16} />
                Новый тест
              </Button>
              <div className="relative flex-1">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Поиск тестов..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-700/30 text-white placeholder-slate-400"
                />
              </div>
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-slate-800/50 border-slate-700/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-400/20 rounded-lg">
                    <Activity size={24} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-400">Всего тестов</p>
                    <p className="text-2xl font-bold text-white">{data.testRuns.length}</p>
                  </div>
                </div>
              </Card>
              <Card className="bg-slate-800/50 border-slate-700/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-400/20 rounded-lg">
                    <Play size={24} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-400">Выполняется</p>
                    <p className="text-2xl font-bold text-white">
                      {data.testRuns.filter(run => run.status === 'RUNNING').length}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="bg-slate-800/50 border-slate-700/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-400/20 rounded-lg">
                    <CheckCircle size={24} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-400">Завершено</p>
                    <p className="text-2xl font-bold text-white">
                      {data.testRuns.filter(run => run.status === 'SUCCEEDED').length}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="bg-slate-800/50 border-slate-700/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-400/20 rounded-lg">
                    <XCircle size={24} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-400">Ошибки</p>
                    <p className="text-2xl font-bold text-white">
                      {data.testRuns.filter(run => run.status === 'FAILED').length}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Список запусков */}
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-slate-300">Загрузка тестов...</div>
                </div>
              ) : filteredRuns.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700/30 p-8 text-center">
                  <Zap size={48} className="mx-auto text-slate-400 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    {searchTerm ? 'Тесты не найдены' : 'Нет запусков тестов'}
                  </h3>
                  <p className="text-slate-400 mb-4">
                    {searchTerm ? 'Попробуйте изменить параметры поиска' : 'Создайте первый тест для начала нагрузочного тестирования'}
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={handleCreateRun}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    >
                      <Plus size={16} className="mr-2" />
                      Создать тест
                    </Button>
                  )}
                </Card>
              ) : (
                filteredRuns.map((run) => (
                  <Card key={run.id} className="bg-slate-800/50 border-slate-700/30 p-6 hover:bg-slate-800/70 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded-md text-xs font-bold bg-indigo-400/20 text-indigo-300 border border-indigo-400/30">
                              #{run.runNumber}
                            </span>
                            <h3 className="text-lg font-medium text-white">{run.scenario.name}</h3>
                          </div>
                          <span className="text-sm text-slate-400">({run.scenario.identifier})</span>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(run.status)}`}>
                            {getStatusIcon(run.status)}
                            {getStatusText(run.status)}
                          </div>
                        </div>
                        
                        {run.scenario.description && (
                          <p className="text-sm text-slate-400 mb-2">{run.scenario.description}</p>
                        )}
                        
                        {run.comment && (
                          <div className="flex items-start gap-2 mb-3">
                            <MessageSquare size={14} className="text-slate-500 mt-0.5" />
                            <p className="text-sm text-slate-300">{run.comment}</p>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-6 text-sm text-slate-400">
                          {run.creator && (
                            <div className="flex items-center gap-1">
                              <User size={14} />
                              <span>Автор: {run.creator.name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>Создан: {formatDateTime(run.createdAt)}</span>
                          </div>
                          {run.startedAt && (
                            <div className="flex items-center gap-1">
                              <Play size={14} />
                              <span>Запущен: {formatDateTime(run.startedAt)}</span>
                            </div>
                          )}
                          {run.completedAt && (
                            <div className="flex items-center gap-1">
                              <CheckCircle size={14} />
                              <span>Завершен: {formatDateTime(run.completedAt)}</span>
                            </div>
                          )}
                          {run.k6TestName && (
                            <div className="flex items-center gap-1">
                              <Activity size={14} />
                              <span className="text-xs font-mono bg-slate-700/50 px-2 py-1 rounded">K6: {run.k6TestName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => router.push(`/space/load-testing/test-runs/${run.id}`)}
                          size="sm"
                          variant="ghost"
                          className="text-slate-300 hover:text-white"
                          title="Посмотреть детали и логи"
                        >
                          <Eye size={14} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </PersonalCabinetLayout>
  )
}