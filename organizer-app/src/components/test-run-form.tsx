'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  ArrowLeft, 
  Save, 
  X, 
  AlertCircle
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
  teamId: string
  onSuccess: (testRun: TestRun) => void
  onCancel: () => void
}

export default function TestRunForm({ teamId, onSuccess, onCancel }: TestRunFormProps) {
  const [scenarios, setScenarios] = useState<TestScenario[]>([])
  const [selectedScenario, setSelectedScenario] = useState('')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingScenarios, setLoadingScenarios] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchScenarios()
  }, [])

  const fetchScenarios = async () => {
    try {
      setLoadingScenarios(true)
      const response = await fetch('/api/dashboard/test-scenarios')
      if (response.ok) {
        const data = await response.json()
        setScenarios(data.filter((scenario: TestScenario) => scenario.isActive))
      }
    } catch (error) {
      console.error('Error fetching scenarios:', error)
    } finally {
      setLoadingScenarios(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    setErrors({})

    try {
      const response = await fetch(`/api/dashboard/load-testing/teams/${teamId}/test-runs`, {
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
      {/* Заголовок */}
      <div className="flex items-center gap-4">
        <Button
          onClick={onCancel}
          variant="ghost"
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Новый запуск теста</h1>
          <p className="mt-2 text-gray-600">
            Создание нового запуска нагрузочного тестирования
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-white border-gray-300 shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Параметры теста
          </h2>

          <div className="space-y-4">
            {/* Выбор сценария */}
            <div>
              <Label htmlFor="scenario" className="text-gray-700 font-medium">
                Сценарий тестирования *
              </Label>
              {loadingScenarios ? (
                <div className="mt-1 p-3 bg-gray-50 border border-gray-300 rounded-md text-gray-600">
                  Загрузка сценариев...
                </div>
              ) : scenarios.length === 0 ? (
                <div className="mt-1 p-3 bg-gray-50 border border-gray-300 rounded-md text-gray-600">
                  Нет доступных сценариев. Создайте сценарий в разделе &quot;Сценарии тестирования&quot;.
                </div>
              ) : (
                <select
                  id="scenario"
                  value={selectedScenario}
                  onChange={(e) => setSelectedScenario(e.target.value)}
                  className="mt-1 block w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.scenario}
                </p>
              )}
            </div>

            {/* Детали выбранного сценария */}
            {selectedScenario && (
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Детали сценария</h3>
                {(() => {
                  const scenario = getSelectedScenarioDetails()
                  return scenario ? (
                    <div className="space-y-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium text-gray-900">Название:</span> {scenario.name}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Идентификатор:</span> {scenario.identifier}
                      </div>
                      {scenario.description && (
                        <div>
                          <span className="font-medium text-gray-900">Описание:</span> {scenario.description}
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-gray-900">Количество шагов:</span> {scenario._count.steps}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Создан:</span> {new Date(scenario.createdAt).toLocaleString('ru-RU')}
                      </div>
                    </div>
                  ) : null
                })()}
              </div>
            )}

            {/* Комментарий */}
            <div>
              <Label htmlFor="comment" className="text-gray-700 font-medium">
                Комментарий
              </Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Описание цели теста, ожидаемых результатов или особых условий..."
                className="mt-1 bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                disabled={loading}
              />
              <p className="mt-1 text-sm text-gray-600">
                Необязательное поле для дополнительной информации о запуске
              </p>
            </div>

            {/* Информация о времени выполнения */}
            <div className="bg-blue-50 border border-blue-300 p-4 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Информация о выполнении</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
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
              <div className="p-4 rounded-md border bg-red-100 text-red-800 border-red-300">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{errors.submit}</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Действия */}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={loading || loadingScenarios || scenarios.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
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
            className="text-gray-600 hover:text-gray-900"
          >
            <X size={16} className="mr-2" />
            Отмена
          </Button>
        </div>
      </form>
    </div>
  )
}