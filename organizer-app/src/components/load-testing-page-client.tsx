'use client'

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
  User,
  TrendingUp,
  BarChart3
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

interface ParticipantTestRunsData {
  team: Team | null
  testRuns: TestRun[]
}

interface LoadTestingPageClientProps {
  user: {
    name: string
    email: string
    image?: string
  }
  hasTeam: boolean
  isAdmin: boolean
}

export function LoadTestingPageClient({ user, hasTeam, isAdmin }: LoadTestingPageClientProps) {
  const router = useRouter()
  const [data, setData] = useState<ParticipantTestRunsData | null>(null)
  const [filteredRuns, setFilteredRuns] = useState<TestRun[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)

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
    fetchTestRuns()
  }, [fetchTestRuns])

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

  const getStatistics = () => {
    if (!data?.testRuns) {
      return { totalRuns: 0, successfulRuns: 0, failedRuns: 0, runningRuns: 0, successRate: 0 }
    }

    const totalRuns = data.testRuns.length
    const successfulRuns = data.testRuns.filter(run => run.status === 'SUCCEEDED').length
    const failedRuns = data.testRuns.filter(run => run.status === 'FAILED').length
    const runningRuns = data.testRuns.filter(run => run.status === 'RUNNING').length
    const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0

    return { totalRuns, successfulRuns, failedRuns, runningRuns, successRate }
  }

  if (loading) {
    return (
      <PersonalCabinetLayout user={user} hasTeam={hasTeam} isAdmin={isAdmin}>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-slate-300">Загрузка...</div>
        </div>
      </PersonalCabinetLayout>
    )
  }

  if (showForm && data?.team) {
    return (
      <PersonalCabinetLayout user={user} hasTeam={hasTeam} isAdmin={isAdmin}>
        {/* Navigation */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад к нагрузочному тестированию
          </Button>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-amber-400/20 rounded-lg flex items-center justify-center">
              <Plus className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Создание нового <span className="text-amber-400">теста</span>
              </h1>
              <p className="text-slate-400">
                Настройка параметров нагрузочного тестирования
              </p>
            </div>
          </div>
          <div className="w-16 h-1 bg-amber-400 rounded-full"></div>
        </div>

        {/* Form Content */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/30 p-8">
          <TestRunForm
            onSuccess={handleRunCreated}
            onCancel={() => setShowForm(false)}
            initialEnvironmentVars={data.team.k6EnvironmentVars}
            isParticipant={true}
          />
        </div>
      </PersonalCabinetLayout>
    )
  }

  return (
    <PersonalCabinetLayout user={user} hasTeam={hasTeam} isAdmin={isAdmin}>
      {/* Navigation */}
      <div className="mb-6">
        <Button
          onClick={() => router.push('/space/tasks')}
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад к заданиям
        </Button>
      </div>

      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-amber-400/20 rounded-lg flex items-center justify-center">
            <Activity className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">
              Нагрузочное <span className="text-amber-400">тестирование</span>
            </h1>
            <p className="text-slate-400">
              Создание и мониторинг тестов производительности
            </p>
          </div>
        </div>
        <div className="w-16 h-1 bg-amber-400 rounded-full"></div>
      </div>

      <div className="space-y-6">

        {/* Проверка команды */}
        {!data?.team ? (
          <Card className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/30 p-8">
            <div className="text-center">
              <User className="mx-auto h-16 w-16 text-slate-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Команда не найдена</h3>
              <p className="text-slate-300 mb-6">
                Для участия в нагрузочном тестировании необходимо состоять в команде.
              </p>
              <Link href="/space/team">
                <Button className="bg-amber-400 hover:bg-amber-500 text-slate-900">
                  Управление командой
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <>
            {/* Информация о команде */}
            <Card className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/30 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">{data.team.name}</h2>
                  <p className="text-slate-400">@{data.team.nickname}</p>
                </div>
                <Button 
                  onClick={handleCreateRun}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-900"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Новый тест
                </Button>
              </div>
            </Card>

            {/* Статистика */}
            {(() => {
              const stats = getStatistics()
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Всего запусков */}
                  <Card className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/30 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-400/20 p-2 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Всего запусков</p>
                        <p className="text-xl font-bold text-white">{stats.totalRuns}</p>
                      </div>
                    </div>
                  </Card>

                  {/* Успешные */}
                  <Card className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/30 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-green-400/20 p-2 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Успешно</p>
                        <p className="text-xl font-bold text-white">{stats.successfulRuns}</p>
                      </div>
                    </div>
                  </Card>

                  {/* С ошибками */}
                  <Card className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/30 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-red-400/20 p-2 rounded-lg">
                        <XCircle className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">С ошибками</p>
                        <p className="text-xl font-bold text-white">{stats.failedRuns}</p>
                      </div>
                    </div>
                  </Card>

                  {/* Процент успешности */}
                  <Card className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/30 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-amber-400/20 p-2 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Успешность</p>
                        <p className="text-xl font-bold text-white">{stats.successRate}%</p>
                      </div>
                    </div>
                  </Card>
                </div>
              )
            })()}

            {/* Поиск */}
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Поиск по тестам..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-700 text-white"
                />
              </div>
            </div>

            {/* Список тестов */}
            <div className="space-y-4">
              {filteredRuns.length === 0 ? (
                <Card className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/30 p-8">
                  <div className="text-center">
                    <Activity className="mx-auto h-16 w-16 text-slate-400 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {data.testRuns.length === 0 ? 'Нет тестов' : 'Ничего не найдено'}
                    </h3>
                    <p className="text-slate-300">
                      {data.testRuns.length === 0 
                        ? 'Создайте свой первый тест для начала работы'
                        : 'Попробуйте изменить критерии поиска'
                      }
                    </p>
                  </div>
                </Card>
              ) : (
                filteredRuns.map((run) => (
                  <Card key={run.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/30 p-6 hover:bg-slate-800/70 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(run.status)}
                          <h3 className="text-lg font-semibold text-white">
                            {run.scenario.name} #{run.runNumber}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(run.status)}`}>
                            {getStatusText(run.status)}
                          </span>
                        </div>
                        <p className="text-slate-400">
                          {run.scenario.description || 'Без описания'}
                        </p>
                        {run.comment && (
                          <p className="text-slate-300 text-sm">
                            <MessageSquare className="inline h-4 w-4 mr-1" />
                            {run.comment}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-slate-400">
                          <span className="flex items-center">
                            <Calendar className="mr-1 h-4 w-4" />
                            {formatDateTime(run.createdAt)}
                          </span>
                          {run.startedAt && (
                            <span className="flex items-center">
                              <Zap className="mr-1 h-4 w-4" />
                              Запущен {formatDateTime(run.startedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Link href={`/space/load-testing/test-runs/${run.id}`}>
                          <Button variant="ghost" size="sm" className="bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white border border-slate-600">
                            <Eye className="mr-2 h-4 w-4" />
                            Подробнее
                          </Button>
                        </Link>
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