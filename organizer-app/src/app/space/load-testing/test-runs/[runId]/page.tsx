'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { 
  ArrowLeft,
  Clock, 
  CheckCircle, 
  XCircle,
  Play,
  Pause,
  Calendar,
  MessageSquare,
  Activity,
  Eye,
  EyeOff,
  RefreshCw,
  Code2,
  Copy,
  BarChart3,
  ExternalLink,
  User
} from 'lucide-react'
import { generateGrafanaLink, isGrafanaLinkAvailable } from '@/lib/grafana'

interface TestRunDetails {
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
  scenario: {
    id: string
    name: string
    identifier: string
    description: string | null
    steps?: Array<{
      id: string
      name: string
      stepOrder: number
      stepType: string
      config: Record<string, unknown>
      description: string | null
    }>
  }
  team: {
    id: string
    name: string
    nickname: string
  }
  creator: {
    id: string
    name: string
    user: {
      email: string
    }
  } | null
  steps: Array<{
    id: string
    stepName: string
    stepOrder: number
    stepType: string
    k6TestName: string | null
    status: string
    startedAt: string | null
    completedAt: string | null
    containerLogs: string | null
    errorMessage: string | null
  }>
}

export default function ParticipantTestRunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<TestRunDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLogs, setShowLogs] = useState<Record<string, boolean>>({})
  const [participant, setParticipant] = useState<{ name: string; email?: string; image?: string } | null>(null)
  const [runId, setRunId] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [showScripts, setShowScripts] = useState<Record<string, boolean>>({})

  // Resolve params promise
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params
      setRunId(resolvedParams.runId)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (session?.user?.email) {
      fetchParticipantData()
    }
  }, [session])

  useEffect(() => {
    if (runId && session?.user?.email) {
      fetchTestRunDetails()
    }
  }, [runId, session])

  // Автоматическое обновление отключено для участников
  // Пользователи могут обновлять страницу вручную при необходимости

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

  const fetchTestRunDetails = async () => {
    if (!runId) return
    
    try {
      setLoading(true)
      // Используем специальный API для участников
      const response = await fetch(`/api/space/teams/test-runs/${runId}`)
      if (response.ok) {
        const testRunDetails = await response.json()
        setData(testRunDetails)
      } else if (response.status === 404) {
        // Тест не найден или нет доступа
        router.push('/space/load-testing')
      } else {
        console.error('Failed to fetch test run details')
      }
    } catch (error) {
      console.error('Error fetching test run details:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleLogs = (stepId: string) => {
    setShowLogs(prev => ({ ...prev, [stepId]: !prev[stepId] }))
  }

  const toggleScripts = (stepId: string) => {
    setShowScripts(prev => ({ ...prev, [stepId]: !prev[stepId] }))
  }

  const refreshTestRun = () => {
    fetchTestRunDetails()
  }

  const generateK6Script = (step: { id: string; stepType: string; config: Record<string, unknown>; name: string }) => {
    const stepConfig = step.config as Record<string, unknown>
    
    if (step.stepType === 'k6_script' && stepConfig.script && typeof stepConfig.script === 'string') {
      return stepConfig.script
    } else if (step.stepType === 'http_request' && stepConfig.url && typeof stepConfig.url === 'string') {
      return `import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 },
  ],
};

export default function() {
  let response = http.get('${stepConfig.url}');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });${stepConfig.delay && typeof stepConfig.delay === 'number' ? `\n  sleep(${stepConfig.delay});` : ''}
}`
    }
    return null
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <Play size={16} className="text-blue-400" />
      case 'SUCCEEDED':
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

  if (status === 'loading' || loading) {
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

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">Тест не найден или у вас нет доступа</div>
      </div>
    )
  }

  return (
    <PersonalCabinetLayout user={participant} hasTeam={true}>
      <div className="space-y-6">
        {/* Заголовок */}
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push('/space/load-testing')}
            variant="ghost"
            className="text-slate-300 hover:text-white"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">
                Тест <span className="text-amber-400">#{data.runNumber}</span>
              </h1>
              <div className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-2 ${getStatusColor(data.status)}`}>
                {getStatusIcon(data.status)}
                {getStatusText(data.status)}
              </div>
            </div>
            <div className="w-16 h-1 bg-amber-400 rounded-full mb-2"></div>
            <p className="text-slate-400">
              {data.scenario.name} • Команда: {data.team.name} (@{data.team.nickname})
            </p>
          </div>
          <Button
            onClick={refreshTestRun}
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:text-white hover:bg-slate-800/50 border border-slate-600/30"
          >
            <RefreshCw size={16} className="mr-2" />
            Обновить
          </Button>
        </div>

        {/* Информация о тесте */}
        <Card className="bg-slate-800/50 border-slate-700/30 p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Activity className="w-5 h-5 text-amber-400 mr-2" />
            Информация о тесте
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-400">Сценарий</label>
                <p className="text-white">{data.scenario.name}</p>
                <p className="text-sm text-slate-400">({data.scenario.identifier})</p>
              </div>
              
              {data.scenario.description && (
                <div>
                  <label className="text-sm font-medium text-slate-400">Описание</label>
                  <p className="text-slate-300">{data.scenario.description}</p>
                </div>
              )}
              
              {data.comment && (
                <div>
                  <label className="text-sm font-medium text-slate-400">Комментарий</label>
                  <div className="flex items-start gap-2">
                    <MessageSquare size={16} className="text-slate-500 mt-1" />
                    <p className="text-slate-300">{data.comment}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              {data.creator && (
                <div>
                  <label className="text-sm font-medium text-slate-400">Автор</label>
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-slate-500" />
                    <p className="text-white">{data.creator.name}</p>
                  </div>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-slate-400">Создан</label>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-slate-500" />
                  <p className="text-white">{formatDateTime(data.createdAt)}</p>
                </div>
              </div>
              
              {data.startedAt && (
                <div>
                  <label className="text-sm font-medium text-slate-400">Запущен</label>
                  <div className="flex items-center gap-2">
                    <Play size={16} className="text-slate-500" />
                    <p className="text-white">{formatDateTime(data.startedAt)}</p>
                  </div>
                </div>
              )}
              
              {data.completedAt && (
                <div>
                  <label className="text-sm font-medium text-slate-400">Завершен</label>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-slate-500" />
                    <p className="text-white">{formatDateTime(data.completedAt)}</p>
                  </div>
                </div>
              )}
              
              {data.k6TestName && (
                <div>
                  <label className="text-sm font-medium text-slate-400">K6 Test Name</label>
                  <p className="text-sm font-mono bg-slate-700/50 px-2 py-1 rounded text-slate-300">
                    {data.k6TestName}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Шаги тестирования */}
        {data.steps && data.steps.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <Activity className="w-5 h-5 text-amber-400 mr-2" />
                Шаги тестирования ({data.steps.length})
              </h2>
              <div className="text-sm text-slate-400">
                {(() => {
                  const completedSteps = data.steps.filter(step => step.status === 'SUCCEEDED').length
                  const failedSteps = data.steps.filter(step => step.status === 'FAILED').length
                  const runningSteps = data.steps.filter(step => step.status === 'RUNNING').length
                  
                  return (
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <CheckCircle size={14} className="text-green-400" />
                        {completedSteps} завершено
                      </span>
                      {runningSteps > 0 && (
                        <span className="flex items-center gap-1">
                          <Play size={14} className="text-blue-400" />
                          {runningSteps} выполняется
                        </span>
                      )}
                      {failedSteps > 0 && (
                        <span className="flex items-center gap-1">
                          <XCircle size={14} className="text-red-400" />
                          {failedSteps} ошибок
                        </span>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>
            
            {/* Прогресс-бар */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                <span>Прогресс выполнения</span>
                <span>
                  {data.steps.filter(step => ['SUCCEEDED', 'FAILED'].includes(step.status)).length} / {data.steps.length}
                </span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-amber-400 to-amber-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(data.steps.filter(step => ['SUCCEEDED', 'FAILED'].includes(step.status)).length / data.steps.length) * 100}%`
                  }}
                ></div>
              </div>
            </div>
            
            <div className="space-y-4">
              {data.steps.map((step) => (
                <div key={step.id} className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 rounded-md text-xs font-bold bg-indigo-400/20 text-indigo-300 border border-indigo-400/30">
                        #{step.stepOrder}
                      </span>
                      <h3 className="text-lg font-medium text-white">{step.stepName}</h3>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(step.status)}`}>
                        {getStatusIcon(step.status)}
                        {getStatusText(step.status)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isGrafanaLinkAvailable(step.k6TestName, step.status) && (
                        <Button
                          onClick={() => {
                            const grafanaUrl = generateGrafanaLink({
                              testId: step.k6TestName!,
                              startedAt: step.startedAt,
                              completedAt: step.completedAt
                            })
                            window.open(grafanaUrl, '_blank')
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-green-400 hover:text-green-300 hover:bg-green-400/10"
                          title="Открыть метрики в Grafana"
                        >
                          <BarChart3 size={16} />
                          <ExternalLink size={12} className="ml-1" />
                          Grafana
                        </Button>
                      )}
                      {(() => {
                        // Найти соответствующий шаг сценария для получения скрипта
                        const scenarioStep = data.scenario.steps?.find(s => s.stepOrder === step.stepOrder)
                        return scenarioStep && generateK6Script(scenarioStep) ? (
                          <Button
                            onClick={() => toggleScripts(step.id)}
                            variant="ghost"
                            size="sm"
                            className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                          >
                            <Code2 size={16} />
                            {showScripts[step.id] ? 'Скрыть скрипт' : 'K6 скрипт'}
                          </Button>
                        ) : null
                      })()}
                      <Button
                        onClick={() => toggleLogs(step.id)}
                        variant="ghost"
                        size="sm"
                        className="text-slate-300 hover:text-white"
                      >
                        {showLogs[step.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                        {showLogs[step.id] ? 'Скрыть логи' : 'Показать логи'}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-slate-400 mb-3">
                    <div>
                      <span className="font-medium">Тип:</span> {step.stepType}
                    </div>
                    {step.startedAt && (
                      <div>
                        <span className="font-medium">Запущен:</span> {formatDateTime(step.startedAt)}
                      </div>
                    )}
                    {step.completedAt && (
                      <div>
                        <span className="font-medium">Завершен:</span> {formatDateTime(step.completedAt)}
                      </div>
                    )}
                    {step.startedAt && step.completedAt && (
                      <div>
                        <span className="font-medium">Длительность:</span> {
                          (() => {
                            const start = new Date(step.startedAt)
                            const end = new Date(step.completedAt)
                            const durationMs = end.getTime() - start.getTime()
                            const seconds = Math.round(durationMs / 1000)
                            if (seconds < 60) {
                              return `${seconds}с`
                            } else {
                              const minutes = Math.floor(seconds / 60)
                              const remainingSeconds = seconds % 60
                              return `${minutes}м ${remainingSeconds}с`
                            }
                          })()
                        }
                      </div>
                    )}
                  </div>
                  
                  {step.k6TestName && (
                    <div className="mb-3">
                      <span className="text-sm font-medium text-slate-400">K6 Test:</span>
                      <span className="text-xs font-mono bg-slate-700/50 px-2 py-1 rounded text-slate-300 ml-2">
                        {step.k6TestName}
                      </span>
                    </div>
                  )}
                  
                  {step.errorMessage && (
                    <div className="bg-red-500/20 border border-red-500/30 rounded p-3 mb-3">
                      <span className="text-sm font-medium text-red-300">Ошибка:</span>
                      <p className="text-red-200 text-sm">{step.errorMessage}</p>
                    </div>
                  )}
                  
                  {/* K6 Скрипт шага */}
                  {showScripts[step.id] && (() => {
                    const scenarioStep = data.scenario.steps?.find(s => s.stepOrder === step.stepOrder)
                    const script = scenarioStep ? generateK6Script(scenarioStep) : null
                    
                    return script ? (
                      <div className="bg-slate-900/50 border border-slate-600/30 rounded-lg p-4 mb-3">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                            <Code2 size={16} className="text-amber-400" />
                            K6 Скрипт шага #{step.stepOrder}
                          </h4>
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(script)
                            }}
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-white text-xs"
                            title="Скопировать скрипт"
                          >
                            <Copy size={12} />
                          </Button>
                        </div>
                        <div className="bg-slate-950/50 rounded border border-slate-700/50 p-3 max-h-96 overflow-y-auto">
                          <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap leading-relaxed">
                            {script}
                          </pre>
                        </div>
                        {scenarioStep?.description && (
                          <p className="text-xs text-slate-400 mt-2 italic">
                            {scenarioStep.description}
                          </p>
                        )}
                      </div>
                    ) : null
                  })()}
                  
                  {showLogs[step.id] && (
                    <div className="bg-slate-900/50 border border-slate-600/30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                          <Activity size={16} className="text-amber-400" />
                          Логи выполнения K6
                        </h4>
                        <div className="flex items-center gap-2">
                          {step.containerLogs && (
                            <Button
                              onClick={() => {
                                navigator.clipboard.writeText(step.containerLogs || '')
                                // Можно добавить уведомление о копировании
                              }}
                              variant="ghost"
                              size="sm"
                              className="text-slate-400 hover:text-white text-xs"
                              title="Скопировать логи"
                            >
                              Копировать
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {step.containerLogs ? (
                        <div className="max-h-96 overflow-y-auto bg-slate-950/50 rounded border border-slate-700/50 p-3">
                          <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                            {step.containerLogs}
                          </pre>
                        </div>
                      ) : (
                        <div className="bg-slate-950/50 rounded border border-slate-700/50 p-6">
                          <div className="text-center text-slate-400">
                            <Activity size={24} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm mb-2">
                              {step.status === 'PENDING' ? 'Ожидание запуска шага' : 
                               step.status === 'RUNNING' ? 'Шаг выполняется...' :
                               'Логи недоступны'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {step.status === 'PENDING' ? 'Логи появятся после запуска K6 теста' : 
                               step.status === 'RUNNING' ? 'Обновите страницу для получения последних логов' :
                               'Логи не были сохранены для этого шага'}
                            </p>
                            {step.status === 'RUNNING' && (
                              <Button
                                onClick={refreshTestRun}
                                variant="ghost"
                                size="sm"
                                className="mt-3 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                              >
                                <RefreshCw size={14} className="mr-2" />
                                Обновить сейчас
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </PersonalCabinetLayout>
  )
}