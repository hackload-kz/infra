'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft,
  Plus,
  Search, 
  Play, 
  Clock, 
  CheckCircle, 
  XCircle,
  Pause,
  RotateCcw,
  Trash2,
  Calendar,
  MessageSquare,
  Activity
} from 'lucide-react'
import TestRunForm from '@/components/test-run-form'

interface Team {
  id: string
  name: string
  nickname: string
}

interface TestScenario {
  id: string
  name: string
  identifier: string
  description: string | null
}

interface TestRun {
  id: string
  comment: string | null
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  startedAt: string | null
  completedAt: string | null
  results: Record<string, any> | null
  createdAt: string
  updatedAt: string
  scenario: TestScenario
  team: Team
}

interface TeamTestRunsData {
  team: Team
  testRuns: TestRun[]
}

export default function TeamLoadTestingPage({ params }: { params: { teamId: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<TeamTestRunsData | null>(null)
  const [filteredRuns, setFilteredRuns] = useState<TestRun[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
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

  const fetchTestRuns = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/dashboard/load-testing/teams/${params.teamId}/test-runs`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      } else if (response.status === 404) {
        router.push('/dashboard/load-testing')
      }
    } catch (error) {
      console.error('Error fetching test runs:', error)
    } finally {
      setLoading(false)
    }
  }, [params.teamId, router])

  useEffect(() => {
    if (isAdmin && params.teamId) {
      fetchTestRuns()
    }
  }, [isAdmin, params.teamId, fetchTestRuns])

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

  const handleRunCreated = (newRun: TestRun) => {
    if (data) {
      setData({
        ...data,
        testRuns: [newRun, ...data.testRuns]
      })
    }
    setShowForm(false)
  }

  const handleUpdateStatus = async (runId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/dashboard/load-testing/teams/${params.teamId}/test-runs/${runId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        const updatedRun = await response.json()
        if (data) {
          setData({
            ...data,
            testRuns: data.testRuns.map(run => run.id === runId ? updatedRun : run)
          })
        }
      }
    } catch (error) {
      console.error('Error updating test run status:', error)
    }
  }

  const handleDeleteRun = async (runId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот запуск теста?')) return

    try {
      const response = await fetch(`/api/dashboard/load-testing/teams/${params.teamId}/test-runs/${runId}`, {
        method: 'DELETE'
      })

      if (response.ok && data) {
        setData({
          ...data,
          testRuns: data.testRuns.filter(run => run.id !== runId)
        })
      }
    } catch (error) {
      console.error('Error deleting test run:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <Play size={16} className="text-blue-400" />
      case 'COMPLETED':
        return <CheckCircle size={16} className="text-green-400" />
      case 'FAILED':
        return <XCircle size={16} className="text-red-400" />
      case 'CANCELLED':
        return <Pause size={16} className="text-yellow-400" />
      default:
        return <Clock size={16} className="text-slate-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'COMPLETED':
        return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'FAILED':
        return 'bg-red-500/20 text-red-300 border-red-500/30'
      case 'CANCELLED':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU')
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

  if (showForm) {
    return (
      <TestRunForm
        teamId={params.teamId}
        onSuccess={handleRunCreated}
        onCancel={() => setShowForm(false)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center gap-4">
        <Button
          onClick={() => router.push('/dashboard/load-testing')}
          variant="ghost"
          className="text-slate-300 hover:text-white"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {data ? `Тестирование команды "${data.team.name}"` : 'Загрузка...'}
          </h1>
          <p className="mt-2 text-slate-500">
            {data ? `@${data.team.nickname} • Управление запусками нагрузочного тестирования` : ''}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-slate-300">Загрузка тестов...</div>
        </div>
      ) : data ? (
        <>
          {/* Действия и поиск */}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleCreateRun}
              className="bg-amber-400 hover:bg-amber-500 text-black font-medium flex items-center gap-2"
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
                className="pl-10 bg-slate-700/70 border-slate-600/50 text-white placeholder-slate-400"
              />
            </div>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="bg-slate-800/70 backdrop-blur-sm border-slate-600/40 p-4">
              <div className="flex items-center gap-3">
                <Activity size={24} className="text-amber-400" />
                <div>
                  <p className="text-sm text-slate-300">Всего тестов</p>
                  <p className="text-xl font-bold text-white">{data.testRuns.length}</p>
                </div>
              </div>
            </Card>
            <Card className="bg-slate-800/70 backdrop-blur-sm border-slate-600/40 p-4">
              <div className="flex items-center gap-3">
                <Play size={24} className="text-blue-400" />
                <div>
                  <p className="text-sm text-slate-300">Выполняется</p>
                  <p className="text-xl font-bold text-white">
                    {data.testRuns.filter(run => run.status === 'RUNNING').length}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="bg-slate-800/70 backdrop-blur-sm border-slate-600/40 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle size={24} className="text-green-400" />
                <div>
                  <p className="text-sm text-slate-300">Завершено</p>
                  <p className="text-xl font-bold text-white">
                    {data.testRuns.filter(run => run.status === 'COMPLETED').length}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="bg-slate-800/70 backdrop-blur-sm border-slate-600/40 p-4">
              <div className="flex items-center gap-3">
                <XCircle size={24} className="text-red-400" />
                <div>
                  <p className="text-sm text-slate-300">Ошибки</p>
                  <p className="text-xl font-bold text-white">
                    {data.testRuns.filter(run => run.status === 'FAILED').length}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="bg-slate-800/70 backdrop-blur-sm border-slate-600/40 p-4">
              <div className="flex items-center gap-3">
                <Clock size={24} className="text-slate-400" />
                <div>
                  <p className="text-sm text-slate-300">Ожидание</p>
                  <p className="text-xl font-bold text-white">
                    {data.testRuns.filter(run => run.status === 'PENDING').length}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Список запусков */}
          <div className="space-y-3">
            {filteredRuns.length === 0 ? (
              <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/30 p-8 text-center">
                <Activity size={48} className="mx-auto text-slate-500 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  {searchTerm ? 'Тесты не найдены' : 'Нет запусков тестов'}
                </h3>
                <p className="text-slate-400 mb-4">
                  {searchTerm ? 'Попробуйте изменить параметры поиска' : 'Создайте первый запуск теста для этой команды'}
                </p>
                {!searchTerm && (
                  <Button
                    onClick={handleCreateRun}
                    className="bg-amber-400 hover:bg-amber-500 text-black font-medium"
                  >
                    <Plus size={16} className="mr-2" />
                    Создать тест
                  </Button>
                )}
              </Card>
            ) : (
              filteredRuns.map((run) => (
                <Card key={run.id} className="bg-slate-800/70 backdrop-blur-sm border-slate-600/40 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-white">{run.scenario.name}</h3>
                        <span className="text-sm text-slate-300">({run.scenario.identifier})</span>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(run.status)}`}>
                          {getStatusIcon(run.status)}
                          {run.status}
                        </div>
                      </div>
                      
                      {run.scenario.description && (
                        <p className="text-sm text-slate-200 mb-2">{run.scenario.description}</p>
                      )}
                      
                      {run.comment && (
                        <div className="flex items-start gap-2 mb-3">
                          <MessageSquare size={14} className="text-slate-300 mt-0.5" />
                          <p className="text-sm text-slate-200">{run.comment}</p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-6 text-sm text-slate-300">
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
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {run.status === 'PENDING' && (
                        <Button
                          onClick={() => handleUpdateStatus(run.id, 'RUNNING')}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Play size={14} />
                        </Button>
                      )}
                      {run.status === 'RUNNING' && (
                        <>
                          <Button
                            onClick={() => handleUpdateStatus(run.id, 'COMPLETED')}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle size={14} />
                          </Button>
                          <Button
                            onClick={() => handleUpdateStatus(run.id, 'CANCELLED')}
                            size="sm"
                            className="bg-yellow-600 hover:bg-yellow-700 text-white"
                          >
                            <Pause size={14} />
                          </Button>
                        </>
                      )}
                      {['COMPLETED', 'FAILED', 'CANCELLED'].includes(run.status) && (
                        <Button
                          onClick={() => handleUpdateStatus(run.id, 'PENDING')}
                          size="sm"
                          className="bg-slate-600 hover:bg-slate-700 text-white"
                        >
                          <RotateCcw size={14} />
                        </Button>
                      )}
                      <Button
                        onClick={() => handleDeleteRun(run.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center py-8">
          <div className="text-red-400">Команда не найдена</div>
        </div>
      )}
    </div>
  )
}