'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft,
  Play, 
  Clock, 
  CheckCircle, 
  XCircle,
  Pause,
  Activity,
  FileText,
  RefreshCw,
  Trash2,
  Terminal,
  ChevronDown,
  ChevronUp,
  Calendar,
  Timer,
  AlertTriangle
} from 'lucide-react'

interface TestRunStep {
  id: string
  stepName: string
  stepOrder: number
  stepType: 'k6_script' | 'http_request'
  k6TestName: string | null
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'DELETED'
  startedAt: string | null
  completedAt: string | null
  lastStatusCheck: string | null
  containerLogs: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
  hasLogs: boolean
  logsLength: number
  isActive: boolean
  duration: number | null
}

interface TestRunDetails {
  testRun: {
    id: string
    runNumber: number
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
    comment: string | null
    startedAt: string | null
    completedAt: string | null
    createdAt: string
    scenario: {
      id: string
      name: string
      identifier: string
    }
    team: {
      id: string
      name: string
      nickname: string
    }
  }
  steps: TestRunStep[]
  summary: {
    totalSteps: number
    pendingSteps: number
    runningSteps: number
    completedSteps: number
    failedSteps: number
    cancelledSteps: number
    deletedSteps: number
    stepsWithLogs: number
  }
}

export default function TestRunDetailsPage({ 
  params 
}: { 
  params: Promise<{ teamId: string; runId: string }> 
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<TestRunDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())
  const [stepLogs, setStepLogs] = useState<Record<string, string>>({})
  const [loadingLogs, setLoadingLogs] = useState<Set<string>>(new Set())
  const [resolvedParams, setResolvedParams] = useState<{ teamId: string; runId: string } | null>(null)

  // Resolve params promise
  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params
      setResolvedParams(resolved)
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

  const fetchTestRunDetails = useCallback(async () => {
    if (!resolvedParams) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/dashboard/load-testing/teams/${resolvedParams.teamId}/test-runs/${resolvedParams.runId}/steps`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      } else if (response.status === 404) {
        router.push(`/dashboard/load-testing/teams/${resolvedParams.teamId}`)
      }
    } catch (error) {
      console.error('Error fetching test run details:', error)
    } finally {
      setLoading(false)
    }
  }, [resolvedParams, router])

  useEffect(() => {
    if (isAdmin && resolvedParams?.teamId && resolvedParams?.runId) {
      fetchTestRunDetails()
    }
  }, [isAdmin, resolvedParams, fetchTestRunDetails])

  const loadStepLogs = async (stepId: string) => {
    if (loadingLogs.has(stepId)) return

    setLoadingLogs(prev => new Set(prev).add(stepId))
    
    try {
      const response = await fetch(`/api/dashboard/load-testing/test-run-steps/${stepId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tailLines: 500 })
      })

      if (response.ok) {
        const result = await response.json()
        setStepLogs(prev => ({ ...prev, [stepId]: result.logs }))
      }
    } catch (error) {
      console.error('Error loading step logs:', error)
    } finally {
      setLoadingLogs(prev => {
        const newSet = new Set(prev)
        newSet.delete(stepId)
        return newSet
      })
    }
  }

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId)
    } else {
      newExpanded.add(stepId)
      // Load logs when expanding
      if (!stepLogs[stepId]) {
        loadStepLogs(stepId)
      }
    }
    setExpandedSteps(newExpanded)
  }

  const refreshStepLogs = (stepId: string) => {
    loadStepLogs(stepId)
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
      case 'DELETED':
        return <Trash2 size={16} className="text-gray-400" />
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
      case 'DELETED':
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU')
  }

  const formatDuration = (duration: number) => {
    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}ч ${minutes % 60}м ${seconds % 60}с`
    } else if (minutes > 0) {
      return `${minutes}м ${seconds % 60}с`
    } else {
      return `${seconds}с`
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
      {/* Заголовок */}
      <div className="flex items-center gap-4">
        <Button
          onClick={() => resolvedParams && router.push(`/dashboard/load-testing/teams/${resolvedParams.teamId}`)}
          variant="ghost"
          className="text-slate-300 hover:text-white"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {data ? `Запуск #${data.testRun.runNumber}: ${data.testRun.scenario.name}` : 'Загрузка...'}
          </h1>
          <p className="mt-2 text-slate-500">
            {data ? `${data.testRun.team.name} (@${data.testRun.team.nickname}) • ${data.testRun.scenario.identifier}` : ''}
          </p>
        </div>
        {data && (
          <div className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-2 ${getStatusColor(data.testRun.status)}`}>
            {getStatusIcon(data.testRun.status)}
            {data.testRun.status}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-slate-300">Загрузка деталей...</div>
        </div>
      ) : data ? (
        <>
          {/* Общая информация */}
          <Card className="bg-slate-800/70 backdrop-blur-sm border-slate-600/40 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-center gap-3">
                <Calendar size={20} className="text-slate-400" />
                <div>
                  <p className="text-sm text-slate-300">Создан</p>
                  <p className="font-medium text-white">{formatDateTime(data.testRun.createdAt)}</p>
                </div>
              </div>
              {data.testRun.startedAt && (
                <div className="flex items-center gap-3">
                  <Play size={20} className="text-blue-400" />
                  <div>
                    <p className="text-sm text-slate-300">Запущен</p>
                    <p className="font-medium text-white">{formatDateTime(data.testRun.startedAt)}</p>
                  </div>
                </div>
              )}
              {data.testRun.completedAt && (
                <div className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-green-400" />
                  <div>
                    <p className="text-sm text-slate-300">Завершен</p>
                    <p className="font-medium text-white">{formatDateTime(data.testRun.completedAt)}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Activity size={20} className="text-amber-400" />
                <div>
                  <p className="text-sm text-slate-300">Всего шагов</p>
                  <p className="font-medium text-white">{data.summary.totalSteps}</p>
                </div>
              </div>
            </div>
            
            {data.testRun.comment && (
              <div className="mt-4 pt-4 border-t border-slate-600/40">
                <p className="text-sm text-slate-300 mb-1">Комментарий:</p>
                <p className="text-white">{data.testRun.comment}</p>
              </div>
            )}
          </Card>

          {/* Статистика шагов */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <Card className="bg-slate-800/70 backdrop-blur-sm border-slate-600/40 p-4">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-slate-400" />
                <div>
                  <p className="text-xs text-slate-300">Ожидание</p>
                  <p className="text-lg font-bold text-white">{data.summary.pendingSteps}</p>
                </div>
              </div>
            </Card>
            <Card className="bg-slate-800/70 backdrop-blur-sm border-slate-600/40 p-4">
              <div className="flex items-center gap-2">
                <Play size={16} className="text-blue-400" />
                <div>
                  <p className="text-xs text-slate-300">Выполняется</p>
                  <p className="text-lg font-bold text-white">{data.summary.runningSteps}</p>
                </div>
              </div>
            </Card>
            <Card className="bg-slate-800/70 backdrop-blur-sm border-slate-600/40 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-400" />
                <div>
                  <p className="text-xs text-slate-300">Завершено</p>
                  <p className="text-lg font-bold text-white">{data.summary.completedSteps}</p>
                </div>
              </div>
            </Card>
            <Card className="bg-slate-800/70 backdrop-blur-sm border-slate-600/40 p-4">
              <div className="flex items-center gap-2">
                <XCircle size={16} className="text-red-400" />
                <div>
                  <p className="text-xs text-slate-300">Ошибки</p>
                  <p className="text-lg font-bold text-white">{data.summary.failedSteps}</p>
                </div>
              </div>
            </Card>
            <Card className="bg-slate-800/70 backdrop-blur-sm border-slate-600/40 p-4">
              <div className="flex items-center gap-2">
                <Pause size={16} className="text-yellow-400" />
                <div>
                  <p className="text-xs text-slate-300">Отменено</p>
                  <p className="text-lg font-bold text-white">{data.summary.cancelledSteps}</p>
                </div>
              </div>
            </Card>
            <Card className="bg-slate-800/70 backdrop-blur-sm border-slate-600/40 p-4">
              <div className="flex items-center gap-2">
                <Trash2 size={16} className="text-gray-400" />
                <div>
                  <p className="text-xs text-slate-300">Удалено</p>
                  <p className="text-lg font-bold text-white">{data.summary.deletedSteps}</p>
                </div>
              </div>
            </Card>
            <Card className="bg-slate-800/70 backdrop-blur-sm border-slate-600/40 p-4">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-amber-400" />
                <div>
                  <p className="text-xs text-slate-300">С логами</p>
                  <p className="text-lg font-bold text-white">{data.summary.stepsWithLogs}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Список шагов */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity size={20} />
              Шаги выполнения
            </h2>
            
            {data.steps.length === 0 ? (
              <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/30 p-8 text-center">
                <Activity size={48} className="mx-auto text-slate-500 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Нет шагов</h3>
                <p className="text-slate-400">В этом запуске теста нет шагов для выполнения</p>
              </Card>
            ) : (
              data.steps.map((step) => (
                <Card key={step.id} className="bg-slate-800/70 backdrop-blur-sm border-slate-600/40">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2 py-1 rounded-md text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            #{step.stepOrder}
                          </span>
                          <h3 className="text-lg font-medium text-white">{step.stepName}</h3>
                          <span className="text-sm text-slate-300 bg-slate-700/50 px-2 py-1 rounded">
                            {step.stepType}
                          </span>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(step.status)}`}>
                            {getStatusIcon(step.status)}
                            {step.status}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-slate-300 mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>Создан: {formatDateTime(step.createdAt)}</span>
                          </div>
                          {step.startedAt && (
                            <div className="flex items-center gap-1">
                              <Play size={14} />
                              <span>Запущен: {formatDateTime(step.startedAt)}</span>
                            </div>
                          )}
                          {step.completedAt && (
                            <div className="flex items-center gap-1">
                              <CheckCircle size={14} />
                              <span>Завершен: {formatDateTime(step.completedAt)}</span>
                            </div>
                          )}
                          {step.duration && (
                            <div className="flex items-center gap-1">
                              <Timer size={14} />
                              <span>Длительность: {formatDuration(step.duration)}</span>
                            </div>
                          )}
                        </div>

                        {step.k6TestName && (
                          <div className="flex items-center gap-1 mb-2">
                            <Activity size={14} className="text-slate-400" />
                            <span className="text-xs font-mono bg-slate-700/50 px-2 py-1 rounded text-slate-300">
                              K6: {step.k6TestName}
                            </span>
                          </div>
                        )}

                        {step.errorMessage && (
                          <div className="flex items-start gap-2 mb-3 p-3 bg-red-900/20 border border-red-500/30 rounded">
                            <AlertTriangle size={16} className="text-red-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-red-300 mb-1">Ошибка:</p>
                              <p className="text-sm text-red-200">{step.errorMessage}</p>
                            </div>
                          </div>
                        )}

                        {step.lastStatusCheck && (
                          <div className="text-xs text-slate-400">
                            Последняя проверка: {formatDateTime(step.lastStatusCheck)}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {step.hasLogs && (
                          <Button
                            onClick={() => toggleStepExpansion(step.id)}
                            size="sm"
                            variant="ghost"
                            className="text-slate-300 hover:text-white"
                          >
                            <Terminal size={14} className="mr-1" />
                            Логи
                            {expandedSteps.has(step.id) ? (
                              <ChevronUp size={14} className="ml-1" />
                            ) : (
                              <ChevronDown size={14} className="ml-1" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Логи шага */}
                  {expandedSteps.has(step.id) && (
                    <div className="border-t border-slate-600/40 bg-slate-900/50">
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-white flex items-center gap-2">
                            <Terminal size={16} />
                            Логи контейнера
                          </h4>
                          <Button
                            onClick={() => refreshStepLogs(step.id)}
                            size="sm"
                            variant="ghost"
                            disabled={loadingLogs.has(step.id)}
                            className="text-slate-300 hover:text-white"
                          >
                            <RefreshCw size={14} className={loadingLogs.has(step.id) ? 'animate-spin' : ''} />
                          </Button>
                        </div>
                        
                        <div className="bg-black/40 rounded border border-slate-600/40 p-4 max-h-96 overflow-y-auto">
                          {loadingLogs.has(step.id) ? (
                            <div className="text-slate-400 text-sm">Загрузка логов...</div>
                          ) : stepLogs[step.id] ? (
                            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                              {stepLogs[step.id]}
                            </pre>
                          ) : step.containerLogs ? (
                            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                              {step.containerLogs}
                            </pre>
                          ) : (
                            <div className="text-slate-400 text-sm">Логи пока не доступны</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center py-8">
          <div className="text-red-400">Запуск теста не найден</div>
        </div>
      )}
    </div>
  )
}