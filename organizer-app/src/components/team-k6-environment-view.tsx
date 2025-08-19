'use client'

import { useState } from 'react'
import { 
  Settings, 
  Eye, 
  EyeOff, 
  Copy, 
  Key,
  Edit2,
  Save,
  X,
  Plus,
  Trash2,
  Users,
  Lock
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

interface Team {
  id: string
  name: string
  nickname: string
  k6EnvironmentVars: Record<string, string>
}

interface Participant {
  id: string
  name: string
  team?: Team | null
  ledTeam?: Team | null
}

interface TeamK6EnvironmentViewProps {
  participant: Participant
  isOrganizer: boolean
}

export function TeamK6EnvironmentView({ participant }: TeamK6EnvironmentViewProps) {
  const team = participant.team || participant.ledTeam
  const [visibleValues, setVisibleValues] = useState<Set<string>>(new Set())
  const [editingVars, setEditingVars] = useState<Record<string, string>>({})
  const [newVarKey, setNewVarKey] = useState('')
  const [newVarValue, setNewVarValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  if (!team) {
    return (
      <Card className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/30 p-8 text-center">
        <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Команда не найдена</h3>
        <p className="text-slate-400 mb-4">
          Для просмотра параметров команды необходимо состоять в команде.
        </p>
      </Card>
    )
  }

  const environmentVars = team.k6EnvironmentVars || {}
  const currentEditingVars = { ...environmentVars, ...editingVars }

  const toggleVisibility = (key: string) => {
    setVisibleValues(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Скопировано в буфер обмена')
  }

  const startEditing = (key: string, value: string) => {
    setEditingVars(prev => ({ ...prev, [key]: value }))
  }

  const cancelEditing = (key: string) => {
    setEditingVars(prev => {
      const newVars = { ...prev }
      delete newVars[key]
      return newVars
    })
  }

  const saveVariable = async (key: string) => {
    const newValue = editingVars[key]
    if (newValue === undefined) return

    setLoading(true)
    try {
      const response = await fetch('/api/space/teams/environment-variables', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          environmentVars: { [key]: newValue }
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка при сохранении')
      }

      toast.success('Переменная сохранена')
      setEditingVars(prev => {
        const newVars = { ...prev }
        delete newVars[key]
        return newVars
      })
      
      // Reload the page to get updated data
      window.location.reload()
    } catch (error) {
      console.error('Error saving variable:', error)
      toast.error(error instanceof Error ? error.message : 'Ошибка при сохранении')
    } finally {
      setLoading(false)
    }
  }

  const deleteVariable = async (key: string) => {
    if (key.toUpperCase() === 'API_URL') {
      toast.error('Переменную API_URL нельзя удалять')
      return
    }

    if (!confirm(`Удалить переменную "${key}"?`)) {
      return
    }

    setLoading(true)
    try {
      const newVars = { ...environmentVars }
      delete newVars[key]
      
      const response = await fetch('/api/space/teams/environment-variables', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          environmentVars: newVars
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка при удалении')
      }

      toast.success('Переменная удалена')
      window.location.reload()
    } catch (error) {
      console.error('Error deleting variable:', error)
      toast.error(error instanceof Error ? error.message : 'Ошибка при удалении')
    } finally {
      setLoading(false)
    }
  }

  const addNewVariable = async () => {
    if (!newVarKey.trim() || !newVarValue.trim()) {
      toast.error('Заполните название и значение переменной')
      return
    }

    if (newVarKey.toUpperCase() === 'API_URL') {
      toast.error('Переменную API_URL могут изменять только организаторы')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/space/teams/environment-variables', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          environmentVars: { [newVarKey]: newVarValue }
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка при добавлении')
      }

      toast.success('Переменная добавлена')
      setNewVarKey('')
      setNewVarValue('')
      setShowAddForm(false)
      window.location.reload()
    } catch (error) {
      console.error('Error adding variable:', error)
      toast.error(error instanceof Error ? error.message : 'Ошибка при добавлении')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-400/20 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Переменные окружения K6</h2>
            <p className="text-slate-400 text-sm">
              Настройки для нагрузочного тестирования команды {team.name}
            </p>
          </div>
        </div>
        
        <Button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={loading}
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить переменную
        </Button>
      </div>

      {/* Add New Variable Form */}
      {showAddForm && (
        <Card className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/30 p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Добавить новую переменную</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Название переменной
                </label>
                <Input
                  type="text"
                  value={newVarKey}
                  onChange={(e) => setNewVarKey(e.target.value)}
                  placeholder="VARIABLE_NAME"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Значение
                </label>
                <Input
                  type="text"
                  value={newVarValue}
                  onChange={(e) => setNewVarValue(e.target.value)}
                  placeholder="variable_value"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={addNewVariable}
                className="bg-green-600 hover:bg-green-700"
                disabled={loading}
              >
                <Save className="w-4 h-4 mr-2" />
                Сохранить
              </Button>
              <Button 
                onClick={() => {
                  setShowAddForm(false)
                  setNewVarKey('')
                  setNewVarValue('')
                }}
                variant="ghost"
                className="text-slate-300"
                disabled={loading}
              >
                <X className="w-4 h-4 mr-2" />
                Отменить
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Environment Variables */}
      <div className="space-y-4">
        {Object.keys(environmentVars).length === 0 ? (
          <Card className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/30 p-8 text-center">
            <Key className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Нет переменных окружения</h3>
            <p className="text-slate-400">
              Добавьте переменные окружения для настройки нагрузочного тестирования
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {Object.entries(currentEditingVars).map(([key, value]) => {
              const isVisible = visibleValues.has(key)
              const isEditing = editingVars.hasOwnProperty(key)
              const isProtected = key.toUpperCase() === 'API_URL'
              const displayValue = isVisible ? value : '•'.repeat(Math.min(value.length, 20))

              return (
                <Card key={key} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/30 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Key className="w-4 h-4 text-slate-400" />
                        <code className="text-sm font-mono text-blue-300">{key}</code>
                        {isProtected && (
                          <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                            <Lock className="w-3 h-3" />
                            <span>Защищено</span>
                          </span>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <Input
                          type="text"
                          value={editingVars[key]}
                          onChange={(e) => setEditingVars(prev => ({ ...prev, [key]: e.target.value }))}
                          className="bg-slate-700 border-slate-600 text-white font-mono text-sm"
                          disabled={loading}
                        />
                      ) : (
                        <code className="text-sm font-mono text-slate-300 bg-slate-700 px-3 py-2 rounded block">
                          {displayValue}
                        </code>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => saveVariable(key)}
                            className="bg-green-600 hover:bg-green-700"
                            disabled={loading}
                          >
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => cancelEditing(key)}
                            className="text-slate-300"
                            disabled={loading}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleVisibility(key)}
                            className="text-slate-300 hover:text-white"
                          >
                            {isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(value)}
                            className="text-slate-300 hover:text-white"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          
                          {!isProtected && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEditing(key, value)}
                                className="text-blue-300 hover:text-blue-200"
                                disabled={loading}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteVariable(key)}
                                className="text-red-300 hover:text-red-200"
                                disabled={loading}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Info */}
      <Card className="bg-blue-900/20 border-blue-500/30 p-4">
        <div className="flex items-start space-x-3">
          <Key className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-100">
            <p className="font-medium mb-1">Информация о переменных окружения:</p>
            <ul className="space-y-1 text-blue-200/80">
              <li>• Переменная API_URL защищена и может изменяться только организаторами</li>
              <li>• Переменные используются в K6 скриптах для нагрузочного тестирования</li>
              <li>• Значения переменных скрыты по умолчанию для безопасности</li>
              <li>• Изменения применяются к новым запускам тестов</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}