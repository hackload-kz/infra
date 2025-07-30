'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ArrowUp, 
  ArrowDown,
  Code,
  Globe,
  AlertCircle
} from 'lucide-react'
import TestStepForm from '@/components/test-step-form'

interface TestScenario {
  id: string
  name: string
  identifier: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: {
    steps: number
  }
}

interface TestScenarioStep {
  id: string
  scenarioId: string
  name: string
  description?: string
  stepType: 'k6_script' | 'http_request'
  stepOrder: number
  config: Record<string, unknown>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface TestStepsManagerProps {
  scenario: TestScenario
  onClose: () => void
}

export default function TestStepsManager({ scenario, onClose }: TestStepsManagerProps) {
  const [steps, setSteps] = useState<TestScenarioStep[]>([])
  const [filteredSteps, setFilteredSteps] = useState<TestScenarioStep[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingStep, setEditingStep] = useState<TestScenarioStep | null>(null)

  const fetchSteps = useCallback(async () => {
    try {
      const response = await fetch(`/api/dashboard/test-scenarios/${scenario.id}/steps`)
      if (response.ok) {
        const data = await response.json()
        setSteps(data)
      }
    } catch (error) {
      console.error('Error fetching steps:', error)
    } finally {
      setLoading(false)
    }
  }, [scenario.id])

  useEffect(() => {
    fetchSteps()
  }, [fetchSteps])

  useEffect(() => {
    const filtered = steps.filter(step =>
      step.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (step.description && step.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredSteps(filtered)
  }, [steps, searchTerm])

  const handleCreateStep = () => {
    setEditingStep(null)
    setShowForm(true)
  }

  const handleEditStep = (step: TestScenarioStep) => {
    setEditingStep(step)
    setShowForm(true)
  }

  const handleDeleteStep = async (step: TestScenarioStep) => {
    if (!confirm(`Вы уверены, что хотите удалить шаг "${step.name}"?`)) {
      return
    }

    try {
      const response = await fetch(
        `/api/dashboard/test-scenarios/${scenario.id}/steps/${step.id}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        fetchSteps()
      } else {
        const error = await response.json()
        alert(`Ошибка: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting step:', error)
      alert('Произошла ошибка при удалении шага')
    }
  }

  const handleMoveStep = async (step: TestScenarioStep, direction: 'up' | 'down') => {
    // const currentIndex = steps.findIndex(s => s.id === step.id)
    const newOrder = direction === 'up' ? step.stepOrder - 1 : step.stepOrder + 1
    
    if (newOrder < 1 || newOrder > steps.length) {
      return
    }

    try {
      const response = await fetch(
        `/api/dashboard/test-scenarios/${scenario.id}/steps/${step.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newOrder })
        }
      )

      if (response.ok) {
        const reorderedSteps = await response.json()
        setSteps(reorderedSteps)
      } else {
        const error = await response.json()
        alert(`Ошибка: ${error.error}`)
      }
    } catch (error) {
      console.error('Error moving step:', error)
      alert('Произошла ошибка при перемещении шага')
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingStep(null)
    fetchSteps()
  }

  const getStepTypeIcon = (stepType: string) => {
    switch (stepType) {
      case 'k6_script':
        return <Code className="h-4 w-4 text-blue-400" />
      case 'http_request':
        return <Globe className="h-4 w-4 text-green-400" />
      default:
        return <AlertCircle className="h-4 w-4 text-slate-400" />
    }
  }

  const getStepTypeLabel = (stepType: string) => {
    switch (stepType) {
      case 'k6_script':
        return 'K6 Скрипт'
      case 'http_request':
        return 'HTTP Запрос'
      default:
        return 'Неизвестно'
    }
  }

  const formatConfig = (config: Record<string, unknown>, stepType: string) => {
    if (stepType === 'http_request' && config.curl && typeof config.curl === 'string') {
      return config.curl.length > 50 ? config.curl.substring(0, 50) + '...' : config.curl
    }
    if (stepType === 'k6_script' && config.script && typeof config.script === 'string') {
      const lines = config.script.split('\n').length
      return `${lines} строк кода`
    }
    return 'Конфигурация настроена'
  }

  if (showForm) {
    return (
      <TestStepForm
        scenario={scenario}
        step={editingStep}
        onSuccess={handleFormSuccess}
        onCancel={() => setShowForm(false)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onClose} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white">Шаги сценария</h1>
          <p className="text-slate-500 mt-1">
            {scenario.name} • {scenario.identifier}
          </p>
        </div>
        <Button onClick={handleCreateStep}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить шаг
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Поиск шагов..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Steps List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="text-slate-400">Загрузка шагов...</div>
        </div>
      ) : filteredSteps.length === 0 ? (
        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/30 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            {searchTerm ? 'Шаги не найдены' : 'Нет шагов'}
          </h3>
          <p className="text-slate-400 mb-4">
            {searchTerm 
              ? 'Попробуйте изменить условия поиска'
              : 'Добавьте первый шаг для начала работы с сценарием'
            }
          </p>
          {!searchTerm && (
            <Button onClick={handleCreateStep}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить шаг
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSteps.map((step) => (
            <Card key={step.id} className="bg-slate-800/50 backdrop-blur-sm border-slate-700/30 p-4">
              <div className="flex items-start gap-4">
                {/* Order Controls */}
                <div className="flex flex-col gap-1 mt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMoveStep(step, 'up')}
                    disabled={step.stepOrder === 1}
                    className="h-6 w-6 p-0"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <div className="text-xs text-slate-400 text-center font-mono w-6">
                    {step.stepOrder}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMoveStep(step, 'down')}
                    disabled={step.stepOrder === steps.length}
                    className="h-6 w-6 p-0"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>

                {/* Step Content */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getStepTypeIcon(step.stepType)}
                      <h3 className="font-semibold text-white">{step.name}</h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-700/50 text-slate-300">
                        {getStepTypeLabel(step.stepType)}
                      </span>
                      {!step.isActive && (
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-500/20 text-slate-400">
                          Неактивен
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditStep(step)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteStep(step)}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {step.description && (
                    <p className="text-sm text-slate-300">{step.description}</p>
                  )}

                  <p className="text-xs text-slate-400 font-mono bg-slate-900/50 px-2 py-1 rounded">
                    {formatConfig(step.config, step.stepType)}
                  </p>

                  <div className="text-xs text-slate-500">
                    Обновлен {new Date(step.updatedAt).toLocaleString('ru-RU')}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}