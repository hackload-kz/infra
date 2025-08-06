'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Settings, 
  Trash2, 
  Edit,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'
import TestScenarioForm from '@/components/test-scenario-form'
import TestStepsManager from '@/components/test-steps-manager'

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
  steps?: TestScenarioStep[]
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

export default function TestScenariosClient() {
  const [scenarios, setScenarios] = useState<TestScenario[]>([])
  const [filteredScenarios, setFilteredScenarios] = useState<TestScenario[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingScenario, setEditingScenario] = useState<TestScenario | null>(null)
  const [selectedScenario, setSelectedScenario] = useState<TestScenario | null>(null)
  const [showStepsManager, setShowStepsManager] = useState(false)

  useEffect(() => {
    fetchScenarios()
  }, [])

  useEffect(() => {
    const filtered = scenarios.filter(scenario =>
      scenario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scenario.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (scenario.description && scenario.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredScenarios(filtered)
  }, [scenarios, searchTerm])

  const fetchScenarios = async () => {
    try {
      const response = await fetch('/api/dashboard/test-scenarios')
      if (response.ok) {
        const data = await response.json()
        setScenarios(data)
      }
    } catch (error) {
      console.error('Error fetching scenarios:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateScenario = () => {
    setEditingScenario(null)
    setShowForm(true)
  }

  const handleEditScenario = (scenario: TestScenario) => {
    setEditingScenario(scenario)
    setShowForm(true)
  }

  const handleDeleteScenario = async (scenario: TestScenario) => {
    if (!confirm(`Вы уверены, что хотите удалить сценарий "${scenario.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/dashboard/test-scenarios/${scenario.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchScenarios()
      } else {
        const error = await response.json()
        alert(`Ошибка: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting scenario:', error)
      alert('Произошла ошибка при удалении сценария')
    }
  }

  const handleManageSteps = (scenario: TestScenario) => {
    setSelectedScenario(scenario)
    setShowStepsManager(true)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingScenario(null)
    fetchScenarios()
  }

  const handleStepsManagerClose = () => {
    setShowStepsManager(false)
    setSelectedScenario(null)
    fetchScenarios()
  }

  const getStatusIcon = (scenario: TestScenario) => {
    if (!scenario.isActive) {
      return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
    if (scenario._count.steps === 0) {
      return <Clock className="h-4 w-4 text-yellow-600" />
    }
    return <CheckCircle className="h-4 w-4 text-green-600" />
  }

  const getStatusText = (scenario: TestScenario) => {
    if (!scenario.isActive) return 'Неактивен'
    if (scenario._count.steps === 0) return 'Нет шагов'
    return 'Готов'
  }

  if (showForm) {
    return (
      <TestScenarioForm
        scenario={editingScenario}
        onSuccess={handleFormSuccess}
        onCancel={() => setShowForm(false)}
      />
    )
  }

  if (showStepsManager && selectedScenario) {
    return (
      <TestStepsManager
        scenario={selectedScenario}
        onClose={handleStepsManagerClose}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Поиск сценариев..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white border-gray-300 text-gray-900 placeholder-gray-500"
          />
        </div>
        <Button onClick={handleCreateScenario}>
          <Plus className="h-4 w-4 mr-2" />
          Создать сценарий
        </Button>
      </div>

      {/* Scenarios Grid */}
      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-600">Загрузка сценариев...</div>
        </div>
      ) : filteredScenarios.length === 0 ? (
        <Card className="bg-white border-gray-300 shadow-sm p-8 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'Сценарии не найдены' : 'Нет сценариев'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm 
              ? 'Попробуйте изменить условия поиска'
              : 'Создайте первый тестовый сценарий для начала работы'
            }
          </p>
          {!searchTerm && (
            <Button onClick={handleCreateScenario}>
              <Plus className="h-4 w-4 mr-2" />
              Создать сценарий
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredScenarios.map((scenario) => (
            <Card key={scenario.id} className="bg-white border-gray-300 shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  {getStatusIcon(scenario)}
                  <span className={`text-xs px-2 py-1 rounded-full border ${
                    scenario.isActive 
                      ? scenario._count.steps > 0 
                        ? 'bg-green-100 text-green-800 border-green-300'
                        : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                      : 'bg-gray-100 text-gray-600 border-gray-300'
                  }`}>
                    {getStatusText(scenario)}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleManageSteps(scenario)}
                    className="h-8 w-8 p-0"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditScenario(scenario)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteScenario(scenario)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{scenario.name}</h3>
                  <p className="text-sm text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded mt-1">
                    {scenario.identifier}
                  </p>
                </div>

                {scenario.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {scenario.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{scenario._count.steps} шагов</span>
                  <span>
                    {new Date(scenario.updatedAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleManageSteps(scenario)}
                    className="flex-1"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Шаги ({scenario._count.steps})
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}