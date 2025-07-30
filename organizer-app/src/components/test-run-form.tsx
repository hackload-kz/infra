'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  ArrowLeft, 
  Save, 
  X, 
  Play,
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

interface TestRunFormProps {
  teamId: string
  onSuccess: (testRun: any) => void
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
          className="text-slate-300 hover:text-white"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Новый запуск теста</h1>
          <p className="mt-2 text-slate-500">
            Создание нового запуска нагрузочного тестирования
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/30 p-6">
          <h2 className="text-lg font-medium text-white mb-4">
            Параметры теста
          </h2>

          <div className="space-y-4">
            {/* Выбор сценария */}
            <div>
              <Label htmlFor="scenario" className="text-slate-300">
                Сценарий тестирования *
              </Label>
              {loadingScenarios ? (
                <div className="mt-1 p-3 bg-slate-700/50 border border-slate-600 rounded-md text-slate-400">
                  Загрузка сценариев...
                </div>
              ) : scenarios.length === 0 ? (
                <div className="mt-1 p-3 bg-slate-700/50 border border-slate-600 rounded-md text-slate-400">
                  Нет доступных сценариев. Создайте сценарий в разделе "Сценарии тестирования".
                </div>
              ) : (
                <select
                  id="scenario"
                  value={selectedScenario}
                  onChange={(e) => setSelectedScenario(e.target.value)}
                  className="mt-1 block w-full bg-slate-700/50 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
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
              <div className="bg-slate-700/30 p-4 rounded-md">
                <h3 className="text-sm font-medium text-white mb-2">Детали сценария</h3>
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
              </div>
            )}

            {/* Комментарий */}
            <div>
              <Label htmlFor="comment" className="text-slate-300">
                Комментарий
              </Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Описание цели теста, ожидаемых результатов или особых условий..."
                className="mt-1 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:ring-amber-400 focus:border-transparent resize-none"
                rows={3}
                disabled={loading}
              />
              <p className="mt-1 text-sm text-slate-400">
                Необязательное поле для дополнительной информации о запуске
              </p>
            </div>

            {/* Информация о времени выполнения */}
            <div className="bg-amber-900/20 border border-amber-500/30 p-4 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-400 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-amber-100 mb-1">Информация о выполнении</h4>
                  <ul className="text-sm text-amber-200/80 space-y-1">
                    <li>• Тест будет создан в статусе "PENDING" (ожидание)</li>
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
        </Card>

        {/* Действия */}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={loading || loadingScenarios || scenarios.length === 0}
            className="bg-amber-400 hover:bg-amber-500 text-black font-medium flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
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
            className="text-slate-300 hover:text-white"
          >
            <X size={16} className="mr-2" />
            Отмена
          </Button>
        </div>
      </form>
    </div>
  )
}