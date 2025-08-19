'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Save, 
  X, 
  AlertCircle,
  Edit2,
  Check,
  Code2,
  Copy
} from 'lucide-react'

interface TestScenario {
  id: string
  name: string
  identifier: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: {
    steps: number
  }
}

interface Team {
  id: string
  name: string
  nickname: string
}

interface TestRun {
  id: string
  runNumber: number
  comment: string | null
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  startedAt: string | null
  completedAt: string | null
  results: Record<string, unknown> | null
  k6TestName: string | null
  createdAt: string
  updatedAt: string
  scenario: TestScenario
  team: Team
}

interface TestRunFormProps {
  teamId?: string // Опционально для участников
  onSuccess: (testRun: TestRun) => void
  onCancel: () => void
  initialEnvironmentVars?: Record<string, string> | null
  isParticipant?: boolean // Флаг для определения типа пользователя
}

export default function TestRunForm({ teamId, onSuccess, onCancel, initialEnvironmentVars, isParticipant = false }: TestRunFormProps) {
  const [scenarios, setScenarios] = useState<TestScenario[]>([])
  const [selectedScenario, setSelectedScenario] = useState('')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingScenarios, setLoadingScenarios] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Environment variables state
  const [environmentVars, setEnvironmentVars] = useState<Record<string, string>>(initialEnvironmentVars || {})
  const [envVarKey, setEnvVarKey] = useState('')
  const [envVarValue, setEnvVarValue] = useState('')
  const [showEnvVars, setShowEnvVars] = useState(false)
  const [editingVar, setEditingVar] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [selectedScenarioSteps, setSelectedScenarioSteps] = useState<Array<{ id: string; name: string; stepType: string; stepOrder: number; description?: string; config: Record<string, unknown> }>>([])
  const [showScripts, setShowScripts] = useState(false)

  useEffect(() => {
    fetchScenarios()
  }, [])

  const fetchScenarios = async () => {
    try {
      setLoadingScenarios(true)
      // Use team-specific API for participants, admin API for organizers
      const apiUrl = isParticipant 
        ? '/api/space/teams/test-scenarios'
        : '/api/dashboard/test-scenarios'
        
      const response = await fetch(apiUrl)
      if (response.ok) {
        const data = await response.json()
        // Filter for active scenarios (team API already returns only active ones)
        setScenarios(isParticipant ? data : data.filter((scenario: TestScenario) => scenario.isActive))
      }
    } catch (error) {
      console.error('Error fetching scenarios:', error)
    } finally {
      setLoadingScenarios(false)
    }
  }

  const fetchScenarioSteps = async (scenarioId: string) => {
    try {
      // Use team-specific API for participants, admin API for organizers
      const apiUrl = isParticipant 
        ? `/api/space/teams/test-scenarios/${scenarioId}/steps`
        : `/api/dashboard/test-scenarios/${scenarioId}/steps`
        
      const response = await fetch(apiUrl)
      if (response.ok) {
        const steps = await response.json()
        setSelectedScenarioSteps(steps)
      } else {
        setSelectedScenarioSteps([])
      }
    } catch (error) {
      console.error('Error fetching scenario steps:', error)
      setSelectedScenarioSteps([])
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!selectedScenario) {
      newErrors.scenario = 'Сценарий тестирования обязателен'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddEnvVar = () => {
    if (!envVarKey.trim() || !envVarValue.trim()) {
      setErrors({ envVar: 'Введите ключ и значение переменной окружения' })
      return
    }

    // Validate environment variable key format
    if (!/^[A-Z_][A-Z0-9_]*$/i.test(envVarKey)) {
      setErrors({ envVar: 'Ключ должен содержать только буквы, цифры и подчеркивания, начинаться с буквы или подчеркивания' })
      return
    }

    // Запретить участникам добавлять переменную API_URL
    if (isParticipant && envVarKey.toUpperCase() === 'API_URL') {
      setErrors({ envVar: 'Переменная API_URL может быть изменена только организаторами' })
      return
    }

    setEnvironmentVars({ ...environmentVars, [envVarKey]: envVarValue })
    setEnvVarKey('')
    setEnvVarValue('')
    setErrors({ ...errors, envVar: '' })
  }

  const handleRemoveEnvVar = (key: string) => {
    // Запретить участникам удалять переменную API_URL
    if (isParticipant && key.toUpperCase() === 'API_URL') {
      setErrors({ envVar: 'Переменная API_URL может быть удалена только организаторами' })
      return
    }

    const newVars = { ...environmentVars }
    delete newVars[key]
    setEnvironmentVars(newVars)
  }

  const handleStartEdit = (key: string, value: string) => {
    // Запретить участникам редактировать переменную API_URL
    if (isParticipant && key.toUpperCase() === 'API_URL') {
      setErrors({ envVar: 'Переменная API_URL может быть изменена только организаторами' })
      return
    }

    setEditingVar(key)
    setEditingValue(value)
    setErrors({ ...errors, envVar: '' })
  }

  const handleSaveEdit = () => {
    if (!editingVar) return

    if (!editingValue.trim()) {
      setErrors({ envVar: 'Значение переменной не может быть пустым' })
      return
    }

    setEnvironmentVars({ ...environmentVars, [editingVar]: editingValue })
    setEditingVar(null)
    setEditingValue('')
    setErrors({ ...errors, envVar: '' })
  }

  const handleCancelEdit = () => {
    setEditingVar(null)
    setEditingValue('')
    setErrors({ ...errors, envVar: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    setErrors({})

    try {
      // First update environment variables if any are set
      if (Object.keys(environmentVars).length > 0) {
        // Для участников фильтруем переменные, исключая API_URL
        const filteredEnvVars = isParticipant 
          ? Object.fromEntries(Object.entries(environmentVars).filter(([key]) => key.toUpperCase() !== 'API_URL'))
          : environmentVars

        if (Object.keys(filteredEnvVars).length > 0) {
          const envEndpoint = isParticipant 
            ? '/api/space/teams/environment-variables'
            : `/api/dashboard/load-testing/teams/${teamId}/environment-variables`

          const envResponse = await fetch(envEndpoint, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ environmentVars: filteredEnvVars }),
          })

          if (!envResponse.ok) {
            const envError = await envResponse.json()
            setErrors({ submit: `Ошибка при сохранении переменных окружения: ${envError.error}` })
            return
          }
        }
      }

      // Create test run using appropriate API
      const apiUrl = isParticipant 
        ? '/api/space/teams/test-runs'
        : `/api/dashboard/load-testing/teams/${teamId}/test-runs`
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenarioId: selectedScenario,
          comment: comment.trim() || null
        }),
      })

      const result = await response.json()

      if (response.ok) {
        onSuccess(result)
      } else {
        setErrors({ submit: result.error || 'Ошибка при создании запуска теста' })
      }
    } catch (error) {
      console.error('Error creating test run:', error)
      setErrors({ submit: 'Ошибка сети. Попробуйте позже.' })
    } finally {
      setLoading(false)
    }
  }

  const getSelectedScenarioDetails = () => {
    return scenarios.find(s => s.id === selectedScenario)
  }

  return (
    <div className="space-y-6">

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-white mb-4">
            Параметры теста
          </h2>

          <div className="space-y-4">
            {/* Выбор сценария */}
            <div>
              <Label htmlFor="scenario" className="text-slate-300 font-medium">
                Сценарий тестирования *
              </Label>
              {loadingScenarios ? (
                <div className="mt-1 p-3 bg-slate-700/30 border border-slate-600 rounded-md text-slate-300">
                  Загрузка сценариев...
                </div>
              ) : scenarios.length === 0 ? (
                <div className="mt-1 p-3 bg-slate-700/30 border border-slate-600 rounded-md text-slate-300">
                  Нет доступных сценариев. Создайте сценарий в разделе &quot;Сценарии тестирования&quot;.
                </div>
              ) : (
                <select
                  id="scenario"
                  value={selectedScenario}
                  onChange={(e) => {
                    setSelectedScenario(e.target.value)
                    if (e.target.value) {
                      fetchScenarioSteps(e.target.value)
                    } else {
                      setSelectedScenarioSteps([])
                    }
                  }}
                  className="mt-1 block w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="">Выберите сценарий...</option>
                  {scenarios.map((scenario) => (
                    <option key={scenario.id} value={scenario.id}>
                      {scenario.name} ({scenario.identifier}) - {scenario._count.steps} шагов
                    </option>
                  ))}
                </select>
              )}
              {errors.scenario && (
                <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.scenario}
                </p>
              )}
            </div>

            {/* Детали выбранного сценария */}
            {selectedScenario && (
              <div className="bg-slate-700/30 p-4 rounded-md border border-slate-600">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-white">Детали сценария</h3>
                  {selectedScenarioSteps.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowScripts(!showScripts)}
                      className="text-amber-400 hover:text-amber-300"
                    >
                      <Code2 size={14} className="mr-1" />
                      {showScripts ? 'Скрыть скрипты' : 'Показать K6 скрипты'}
                    </Button>
                  )}
                </div>
                {(() => {
                  const scenario = getSelectedScenarioDetails()
                  return scenario ? (
                    <div className="space-y-2 text-sm text-slate-300">
                      <div>
                        <span className="font-medium text-white">Название:</span> {scenario.name}
                      </div>
                      <div>
                        <span className="font-medium text-white">Идентификатор:</span> {scenario.identifier}
                      </div>
                      {scenario.description && (
                        <div>
                          <span className="font-medium text-white">Описание:</span> {scenario.description}
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-white">Количество шагов:</span> {scenario._count.steps}
                      </div>
                      <div>
                        <span className="font-medium text-white">Создан:</span> {new Date(scenario.createdAt).toLocaleString('ru-RU')}
                      </div>
                    </div>
                  ) : null
                })()}
                
                {/* K6 Скрипты шагов */}
                {showScripts && selectedScenarioSteps.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <h4 className="text-sm font-medium text-white">K6 Скрипты шагов</h4>
                    {selectedScenarioSteps.map((step) => {
                      const stepConfig = step.config as Record<string, unknown>
                      let script = ''
                      
                      if (step.stepType === 'k6_script' && stepConfig.script && typeof stepConfig.script === 'string') {
                        script = stepConfig.script
                      } else if (step.stepType === 'http_request' && stepConfig.url && typeof stepConfig.url === 'string') {
                        // Генерируем базовый HTTP скрипт
                        script = `import http from 'k6/http';
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
                      
                      return script ? (
                        <div key={step.id} className="bg-slate-800 border border-slate-600 rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Шаг #{step.stepOrder}
                              </span>
                              <span className="text-sm font-medium text-white">{step.name}</span>
                              <span className="text-xs text-slate-500">({step.stepType})</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(script)
                              }}
                              className="text-slate-400 hover:text-slate-200 text-xs"
                              title="Скопировать скрипт"
                            >
                              <Copy size={12} />
                            </Button>
                          </div>
                          <div className="bg-gray-900 rounded border p-3 max-h-60 overflow-y-auto">
                            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                              {script}
                            </pre>
                          </div>
                          {step.description && (
                            <p className="text-xs text-slate-400 mt-2">{step.description}</p>
                          )}
                        </div>
                      ) : (
                        <div key={step.id} className="bg-slate-700/50 border border-slate-600 rounded p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium bg-gray-200 text-slate-300 px-2 py-1 rounded">
                              Шаг #{step.stepOrder}
                            </span>
                            <span className="text-sm font-medium text-white">{step.name}</span>
                            <span className="text-xs text-slate-500">({step.stepType})</span>
                          </div>
                          <p className="text-xs text-slate-400">
                            К6 скрипт недоступен для этого типа шага
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Комментарий */}
            <div>
              <Label htmlFor="comment" className="text-slate-300 font-medium">
                Комментарий
              </Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Описание цели теста, ожидаемых результатов или особых условий..."
                className="mt-1 bg-slate-800 border-slate-600 text-white placeholder-slate-400 focus:ring-amber-400 focus:border-transparent resize-none"
                rows={3}
                disabled={loading}
              />
              <p className="mt-1 text-sm text-slate-400">
                Необязательное поле для дополнительной информации о запуске
              </p>
            </div>

            {/* Переменные окружения */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-slate-300 font-medium">
                  Переменные окружения
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEnvVars(!showEnvVars)}
                  className="text-amber-400 hover:text-amber-300"
                >
                  {showEnvVars ? 'Скрыть' : 'Настроить'}
                </Button>
              </div>
              
              {showEnvVars && (
                <div className="bg-slate-700/30 border border-slate-600 rounded-md p-4 space-y-4">
                  {/* Добавление новой переменной */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="envKey" className="text-sm text-slate-400">
                        Ключ
                      </Label>
                      <input
                        id="envKey"
                        type="text"
                        value={envVarKey}
                        onChange={(e) => setEnvVarKey(e.target.value)}
                        placeholder="API_URL"
                        className="mt-1 block w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <Label htmlFor="envValue" className="text-sm text-slate-400">
                        Значение
                      </Label>
                      <input
                        id="envValue"
                        type="text"
                        value={envVarValue}
                        onChange={(e) => setEnvVarValue(e.target.value)}
                        placeholder="https://api.example.com"
                        className="mt-1 block w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                        disabled={loading}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={handleAddEnvVar}
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        disabled={loading}
                      >
                        Добавить
                      </Button>
                    </div>
                  </div>

                  {errors.envVar && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.envVar}
                    </p>
                  )}

                  {/* Список текущих переменных */}
                  {Object.keys(environmentVars).length > 0 && (
                    <div>
                      <Label className="text-sm text-slate-400 mb-2 block">
                        Текущие переменные ({Object.keys(environmentVars).length})
                      </Label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {Object.entries(environmentVars).map(([key, value]) => {
                          const isApiUrl = key.toUpperCase() === 'API_URL'
                          const isProtected = isParticipant && isApiUrl
                          const isEditing = editingVar === key
                          
                          return (
                            <div key={key} className={`flex items-center justify-between bg-slate-800 border rounded p-2 ${isProtected ? 'border-amber-200 bg-amber-50' : 'border-slate-600'}`}>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <code className={`text-sm font-medium px-2 py-1 rounded ${isProtected ? 'text-amber-900 bg-amber-100' : 'text-white bg-slate-700/50'}`}>
                                    {key}
                                  </code>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editingValue}
                                      onChange={(e) => setEditingValue(e.target.value)}
                                      className="flex-1 text-sm bg-slate-800 border border-amber-400 rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleSaveEdit()
                                        } else if (e.key === 'Escape') {
                                          handleCancelEdit()
                                        }
                                      }}
                                    />
                                  ) : (
                                    <span 
                                      className="text-sm text-slate-400 truncate cursor-pointer hover:text-slate-200 flex-1"
                                      onClick={() => !isProtected && handleStartEdit(key, value)}
                                      title={isProtected ? 'Переменная защищена от редактирования' : 'Нажмите для редактирования'}
                                    >
                                      {value}
                                    </span>
                                  )}
                                  {isProtected && !isEditing && (
                                    <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                                      Защищено
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                {isEditing ? (
                                  <>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleSaveEdit}
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      title="Сохранить изменения"
                                    >
                                      <Check size={14} />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleCancelEdit}
                                      className="text-slate-400 hover:text-slate-300 hover:bg-slate-700/30"
                                      title="Отменить редактирование"
                                    >
                                      <X size={14} />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleStartEdit(key, value)}
                                      className={`${isProtected ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-100 cursor-not-allowed opacity-50' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'}`}
                                      disabled={loading || isProtected}
                                      title={isProtected ? 'Переменная API_URL защищена от изменений участниками' : 'Редактировать переменную'}
                                    >
                                      <Edit2 size={14} />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveEnvVar(key)}
                                      className={`${isProtected ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-100 cursor-not-allowed opacity-50' : 'text-red-600 hover:text-red-700 hover:bg-red-50'}`}
                                      disabled={loading || isProtected}
                                      title={isProtected ? 'Переменная API_URL защищена от удаления участниками' : 'Удалить переменную'}
                                    >
                                      <X size={14} />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-slate-500 space-y-1">
                    <p>
                      Переменные будут доступны в K6 скриптах через <code>__ENV.VARIABLE_NAME</code>
                    </p>
                    <p>
                      • Нажмите на значение переменной для редактирования
                    </p>
                    <p>
                      • Используйте Enter для сохранения, Escape для отмены
                    </p>
                    {isParticipant && (
                      <p className="text-amber-600">
                        • Переменная API_URL защищена от изменений участниками
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Информация о времени выполнения */}
            <div className="bg-amber-500/10 border border-amber-400/30 p-4 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-400 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-white mb-1">Информация о выполнении</h4>
                  <ul className="text-sm text-slate-300 space-y-1">
                    <li>• Тест будет создан в статусе &quot;PENDING&quot; (ожидание)</li>
                    <li>• Запуск можно будет начать вручную из списка тестов</li>
                    <li>• Время создания будет зафиксировано автоматически</li>
                    <li>• Статус теста можно изменить в любое время</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Ошибки формы */}
            {errors.submit && (
              <div className="p-4 rounded-md border bg-red-500/20 text-red-300 border-red-500/30">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{errors.submit}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Действия */}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={loading || loadingScenarios || scenarios.length === 0}
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-medium flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
                Создание...
              </>
            ) : (
              <>
                <Save size={16} />
                Создать запуск
              </>
            )}
          </Button>
          <Button
            type="button"
            onClick={onCancel}
            variant="ghost"
            disabled={loading}
            className="text-slate-400 hover:text-white"
          >
            <X size={16} className="mr-2" />
            Отмена
          </Button>
        </div>
      </form>
    </div>
  )
}