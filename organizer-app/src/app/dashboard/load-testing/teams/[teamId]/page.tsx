'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  Activity,
  Eye,
  Settings,
  Save,
  X
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
}

interface TeamTestRunsData {
  team: Team
  testRuns: TestRun[]
}

export default function TeamLoadTestingPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<TeamTestRunsData | null>(null)
  const [filteredRuns, setFilteredRuns] = useState<TestRun[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [showEnvVars, setShowEnvVars] = useState(false)
  const [envVarsText, setEnvVarsText] = useState('')
  const [savingEnvVars, setSavingEnvVars] = useState(false)

  // Resolve params promise
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params
      setTeamId(resolvedParams.teamId)
    }
    resolveParams()
  }, [params])

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
    if (!teamId) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/dashboard/load-testing/teams/${teamId}/test-runs`)
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
  }, [teamId, router])

  useEffect(() => {
    if (isAdmin && teamId) {
      fetchTestRuns()
    }
  }, [isAdmin, teamId, fetchTestRuns])

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

  const handleUpdateStatus = async (runId: string, newStatus: string) => {
    if (!teamId) return
    
    try {
      const response = await fetch(`/api/dashboard/load-testing/teams/${teamId}/test-runs/${runId}`, {
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

  const handleStopK6Test = async (runId: string) => {
    if (!teamId) return
    if (!confirm('Вы уверены, что хотите остановить K6 тест?')) return

    try {
      const response = await fetch(`/api/dashboard/load-testing/teams/${teamId}/test-runs/${runId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      })

      if (response.ok) {
        const updatedRun = await response.json()
        if (data) {
          setData({
            ...data,
            testRuns: data.testRuns.map(run => run.id === runId ? updatedRun : run)
          })
        }
      } else {
        const errorData = await response.json()
        alert(`Ошибка остановки теста: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error stopping K6 test:', error)
      alert('Ошибка при остановке K6 теста')
    }
  }

  const handleDeleteRun = async (runId: string) => {
    if (!teamId) return
    if (!confirm('Вы уверены, что хотите удалить этот запуск теста?')) return

    try {
      const response = await fetch(`/api/dashboard/load-testing/teams/${teamId}/test-runs/${runId}`, {
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

  const handleShowEnvVars = () => {
    if (data?.team) {
      // Initialize the text area with existing environment variables
      const envVars = data.team.k6EnvironmentVars || {}
      setEnvVarsText(JSON.stringify(envVars, null, 2))
      setShowEnvVars(true)
    }
  }

  const handleSaveEnvVars = async () => {
    if (!teamId) return

    try {
      setSavingEnvVars(true)
      
      // Parse and validate JSON
      let envVarsObject: Record<string, string> = {}
      if (envVarsText.trim()) {
        envVarsObject = JSON.parse(envVarsText)
        
        // Validate that all values are strings
        for (const [key, value] of Object.entries(envVarsObject)) {
          if (typeof value !== 'string') {
            throw new Error(`Environment variable "${key}" must have a string value`)
          }
        }
      }

      const response = await fetch(`/api/dashboard/load-testing/teams/${teamId}/environment-variables`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environmentVars: envVarsObject })
      })

      if (response.ok) {
        const updatedTeam = await response.json()
        if (data) {
          setData({
            ...data,
            team: { ...data.team, k6EnvironmentVars: updatedTeam.k6EnvironmentVars }
          })
        }
        setShowEnvVars(false)
        alert('Environment variables saved successfully!')
      } else {
        const errorData = await response.json()
        alert(`Error saving environment variables: ${errorData.error}`)
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        alert('Invalid JSON format. Please check your syntax.')
      } else if (error instanceof Error) {
        alert(`Error: ${error.message}`)
      } else {
        alert('Unknown error occurred while saving environment variables')
      }
    } finally {
      setSavingEnvVars(false)
    }
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
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'SUCCEEDED':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'FAILED':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'CANCELLED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU')
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

  if (showForm && teamId) {
    return (
      <TestRunForm
        teamId={teamId}
        onSuccess={handleRunCreated}
        onCancel={() => setShowForm(false)}
      />
    )
  }

  if (showEnvVars) {
    return (
      <div className="space-y-6">
        {/* Заголовок */}
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setShowEnvVars(false)}
            variant="ghost"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Переменные окружения K6
            </h1>
            <p className="mt-2 text-gray-600">
              {data ? `${data.team.name} (@${data.team.nickname}) • Настройка переменных окружения для K6 тестов` : ''}
            </p>
          </div>
        </div>

        {/* Environment Variables Form */}
        <Card className="bg-white border-gray-300 shadow-sm p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Environment Variables (JSON)
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Введите переменные окружения в формате JSON. Эти переменные будут доступны во всех K6 тестах команды.
              </p>
              <p className="text-sm text-gray-600 mb-3">
                <strong>Использование в K6 скриптах:</strong> <code>__ENV.API_URL</code>, <code>__ENV.API_VERSION</code>
              </p>
              <p className="text-sm text-gray-600 mb-3">
                Пример переменных:
                <code className="block mt-1 p-2 bg-gray-100 rounded text-xs">
{`{
  "API_URL": "https://api.example.com",
  "API_VERSION": "v1",
  "TIMEOUT": "30s"
}`}
                </code>
              </p>
              <p className="text-sm text-gray-600 mb-3">
                Пример использования в K6 скрипте:
                <code className="block mt-1 p-2 bg-gray-100 rounded text-xs">
{`import http from 'k6/http';

export default function () {
  const response = http.get(\`\${__ENV.API_URL}/\${__ENV.API_VERSION}/users\`);
  // ...
}`}
                </code>
              </p>
              <Textarea
                value={envVarsText}
                onChange={(e) => setEnvVarsText(e.target.value)}
                placeholder='{\n  "API_URL": "https://api.example.com",\n  "API_VERSION": "v1"\n}'
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setShowEnvVars(false)}
                variant="outline"
                className="text-gray-700 border-gray-300"
              >
                <X size={16} className="mr-2" />
                Отмена
              </Button>
              <Button
                onClick={handleSaveEnvVars}
                disabled={savingEnvVars}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save size={16} className="mr-2" />
                {savingEnvVars ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Current Environment Variables Display */}
        {data?.team.k6EnvironmentVars && Object.keys(data.team.k6EnvironmentVars).length > 0 && (
          <Card className="bg-white border-gray-300 shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Текущие переменные</h3>
            <div className="space-y-2">
              {Object.entries(data.team.k6EnvironmentVars).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="font-mono text-sm text-gray-900">{key}</span>
                  <span className="font-mono text-sm text-gray-600">{value}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center gap-4">
        <Button
          onClick={() => router.push('/dashboard/load-testing')}
          variant="ghost"
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {data ? `Тестирование команды "${data.team.name}"` : 'Загрузка...'}
          </h1>
          <p className="mt-2 text-gray-600">
            {data ? `@${data.team.nickname} • Управление запусками нагрузочного тестирования` : ''}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-600">Загрузка тестов...</div>
        </div>
      ) : data ? (
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
            <Button
              onClick={handleShowEnvVars}
              variant="outline"
              className="text-gray-700 border-gray-300 hover:bg-gray-50 flex items-center gap-2"
            >
              <Settings size={16} />
              Переменные окружения
            </Button>
            <div className="relative flex-1">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Поиск тестов..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white border-gray-300 text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="bg-white border-gray-300 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Activity size={24} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Всего тестов</p>
                  <p className="text-2xl font-bold text-gray-900">{data.testRuns.length}</p>
                </div>
              </div>
            </Card>
            <Card className="bg-white border-gray-300 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Play size={24} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Выполняется</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.testRuns.filter(run => run.status === 'RUNNING').length}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="bg-white border-gray-300 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle size={24} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Завершено</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.testRuns.filter(run => run.status === 'SUCCEEDED').length}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="bg-white border-gray-300 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle size={24} className="text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Ошибки</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.testRuns.filter(run => run.status === 'FAILED').length}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="bg-white border-gray-300 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Clock size={24} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Ожидание</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.testRuns.filter(run => run.status === 'PENDING').length}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Список запусков */}
          <div className="space-y-3">
            {filteredRuns.length === 0 ? (
              <Card className="bg-white border-gray-300 shadow-sm p-8 text-center">
                <Activity size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'Тесты не найдены' : 'Нет запусков тестов'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? 'Попробуйте изменить параметры поиска' : 'Создайте первый запуск теста для этой команды'}
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
                <Card key={run.id} className="bg-white border-gray-300 shadow-sm p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded-md text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                            #{run.runNumber}
                          </span>
                          <h3 className="text-lg font-medium text-gray-900">{run.scenario.name}</h3>
                        </div>
                        <span className="text-sm text-gray-600">({run.scenario.identifier})</span>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(run.status)}`}>
                          {getStatusIcon(run.status)}
                          {run.status}
                        </div>
                      </div>
                      
                      {run.scenario.description && (
                        <p className="text-sm text-gray-700 mb-2">{run.scenario.description}</p>
                      )}
                      
                      {run.comment && (
                        <div className="flex items-start gap-2 mb-3">
                          <MessageSquare size={14} className="text-gray-500 mt-0.5" />
                          <p className="text-sm text-gray-700">{run.comment}</p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-6 text-sm text-gray-600">
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
                            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">K6: {run.k6TestName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => router.push(`/dashboard/load-testing/teams/${teamId}/test-runs/${run.id}`)}
                        size="sm"
                        variant="ghost"
                        className="text-slate-300 hover:text-white"
                        title="Посмотреть детали и логи"
                      >
                        <Eye size={14} />
                      </Button>
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
                            onClick={() => handleUpdateStatus(run.id, 'SUCCEEDED')}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            title="Отметить как завершенный"
                          >
                            <CheckCircle size={14} />
                          </Button>
                          <Button
                            onClick={() => run.k6TestName ? handleStopK6Test(run.id) : handleUpdateStatus(run.id, 'CANCELLED')}
                            size="sm"
                            className="bg-yellow-600 hover:bg-yellow-700 text-white"
                            title={run.k6TestName ? "Остановить K6 тест" : "Отметить как отмененный"}
                          >
                            <Pause size={14} />
                          </Button>
                        </>
                      )}
                      {['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(run.status) && (
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
                        className="text-red-600 hover:text-red-700 hover:bg-red-100"
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
          <div className="text-red-600">Команда не найдена</div>
        </div>
      )}
    </div>
  )
}