'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff, 
  Copy, 
  Save, 
  X,
  FileText, 
  Database, 
  Github, 
  Cloud, 
  Key,
  Settings,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDateShort } from '@/lib/date-utils'

interface TeamEnvironmentData {
  id: string
  key: string
  value: string
  description: string | null
  category: string | null
  isSecure: boolean
  isEditable: boolean
  createdAt: Date
  updatedAt: Date
}

interface Team {
  id: string
  name: string
  nickname: string
  environmentData: TeamEnvironmentData[]
}

interface DashboardEnvironmentViewProps {
  team: Team
}

interface EnvironmentFormData {
  key: string
  value: string
  description: string
  category: string
  isSecure: boolean
  isEditable: boolean
}

const predefinedCategories = [
  'git',
  'database', 
  'infrastructure',
  'cloud',
  'credentials',
  'security',
  'api',
  'общие'
]

const getCategoryIcon = (category?: string) => {
  switch (category?.toLowerCase()) {
    case 'git':
      return <Github className="w-4 h-4" />
    case 'database':
      return <Database className="w-4 h-4" />
    case 'infrastructure':
    case 'cloud':
      return <Cloud className="w-4 h-4" />
    case 'credentials':
    case 'security':
      return <Key className="w-4 h-4" />
    default:
      return <Settings className="w-4 h-4" />
  }
}

const getCategoryColor = (category?: string) => {
  switch (category?.toLowerCase()) {
    case 'git':
      return 'bg-orange-100 text-orange-800'
    case 'database':
      return 'bg-purple-100 text-purple-800'
    case 'infrastructure':
    case 'cloud':
      return 'bg-blue-100 text-blue-800'
    case 'credentials':
    case 'security':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function DashboardEnvironmentView({ team }: DashboardEnvironmentViewProps) {
  const [environmentData, setEnvironmentData] = useState<TeamEnvironmentData[]>(team.environmentData)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [visibleValues, setVisibleValues] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState<EnvironmentFormData>({
    key: '',
    value: '',
    description: '',
    category: '',
    isSecure: false,
    isEditable: true
  })

  const [editFormData, setEditFormData] = useState<EnvironmentFormData>({
    key: '',
    value: '',
    description: '',
    category: '',
    isSecure: false,
    isEditable: true
  })

  // Group data by category
  const groupedData = environmentData.reduce((acc, item) => {
    const category = item.category || 'Общие'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, TeamEnvironmentData[]>)

  const toggleValueVisibility = (entryId: string) => {
    const newVisible = new Set(visibleValues)
    if (newVisible.has(entryId)) {
      newVisible.delete(entryId)
    } else {
      newVisible.add(entryId)
    }
    setVisibleValues(newVisible)
  }

  const copyToClipboard = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`Значение "${key}" скопировано в буфер обмена`)
    } catch {
      toast.error('Не удалось скопировать значение')
    }
  }

  const maskValue = (value: string, isSecure: boolean, isVisible: boolean) => {
    if (!isSecure || isVisible) {
      return value
    }
    if (value.length <= 8) return '***'
    return value.substring(0, 4) + '***' + value.substring(value.length - 4)
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/teams/${team.id}/environment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create environment data')
      }

      const newEnvironmentData = await response.json()
      setEnvironmentData(prev => [...prev, newEnvironmentData])
      setFormData({
        key: '',
        value: '',
        description: '',
        category: '',
        isSecure: false,
        isEditable: true
      })
      setShowAddForm(false)
      toast.success('Данные окружения успешно добавлены')

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при добавлении данных')
    } finally {
      setLoading(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent, itemId: string) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/teams/${team.id}/environment/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update environment data')
      }

      const updatedEnvironmentData = await response.json()
      setEnvironmentData(prev => 
        prev.map(item => item.id === itemId ? updatedEnvironmentData : item)
      )
      setEditingItem(null)
      toast.success('Данные окружения успешно обновлены')

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при обновлении данных')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (itemId: string, key: string) => {
    if (!confirm(`Вы уверены, что хотите удалить &quot;${key}&quot;?`)) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/teams/${team.id}/environment/${itemId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete environment data')
      }

      setEnvironmentData(prev => prev.filter(item => item.id !== itemId))
      toast.success('Данные окружения успешно удалены')

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при удалении данных')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (item: TeamEnvironmentData) => {
    setEditFormData({
      key: item.key,
      value: item.value,
      description: item.description || '',
      category: item.category || '',
      isSecure: item.isSecure,
      isEditable: item.isEditable
    })
    setEditingItem(item.id)
  }

  return (
    <div className="space-y-6">
      {/* Add New Environment Data */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-gray-900">Данные окружения команды</CardTitle>
              <CardDescription className="text-gray-700">
                Всего параметров: {environmentData.length}
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить параметр
            </Button>
          </div>
        </CardHeader>
        
        {showAddForm && (
          <CardContent>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="key" className="text-gray-900 font-medium">Ключ *</Label>
                  <Input
                    id="key"
                    value={formData.key}
                    onChange={(e) => {
                      const value = e.target.value
                      // Allow only letters, numbers, underscores, and hyphens
                      const sanitized = value.replace(/[^a-zA-Z0-9_-]/g, '')
                      setFormData(prev => ({ ...prev, key: sanitized }))
                    }}
                    placeholder="например: database_url"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Только буквы, цифры, подчеркивания и дефисы
                  </p>
                </div>
                <div>
                  <Label htmlFor="category" className="text-gray-900 font-medium">Категория</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger className="text-gray-900">
                      <SelectValue placeholder="Выберите категорию" className="text-gray-900" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200">
                      {predefinedCategories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-gray-900 hover:bg-gray-100">{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="value" className="text-gray-900 font-medium">Значение *</Label>
                <Textarea
                  id="value"
                  value={formData.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="Введите значение"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description" className="text-gray-900 font-medium">Описание</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Опциональное описание"
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isSecure"
                    checked={formData.isSecure}
                    onChange={(e) => setFormData(prev => ({ ...prev, isSecure: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="isSecure" className="text-gray-900 font-medium">Конфиденциальные данные</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isEditable"
                    checked={formData.isEditable}
                    onChange={(e) => setFormData(prev => ({ ...prev, isEditable: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="isEditable" className="text-gray-900 font-medium">Может редактироваться лидером команды</Label>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Отмена
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Environment Data by Category */}
      {environmentData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Нет данных окружения
            </h3>
            <p className="text-gray-700 mb-4">
              Добавьте первый параметр окружения для команды &quot;{team.name}&quot;.
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить параметр
            </Button>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedData).map(([category, items]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                {getCategoryIcon(category)}
                {category}
              </CardTitle>
              <CardDescription className="text-gray-700">
                {items.length} {items.length === 1 ? 'параметр' : 'параметра'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-medium text-gray-900">Ключ</th>
                      <th className="text-left p-3 font-medium text-gray-900">Значение</th>
                      <th className="text-left p-3 font-medium text-gray-900">Описание</th>
                      <th className="text-left p-3 font-medium text-gray-900">Обновлено</th>
                      <th className="text-right p-3 font-medium text-gray-900">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const isVisible = visibleValues.has(item.id)
                      const displayValue = maskValue(item.value, item.isSecure, isVisible)
                      const isEditing = editingItem === item.id
                      
                      return (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          {isEditing ? (
                            <td colSpan={5} className="p-3">
                              <form onSubmit={(e) => handleEditSubmit(e, item.id)} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor={`edit-key-${item.id}`} className="text-gray-900 font-medium">Ключ *</Label>
                                    <Input
                                      id={`edit-key-${item.id}`}
                                      value={editFormData.key}
                                      onChange={(e) => {
                                        const value = e.target.value
                                        // Allow only letters, numbers, underscores, and hyphens
                                        const sanitized = value.replace(/[^a-zA-Z0-9_-]/g, '')
                                        setEditFormData(prev => ({ ...prev, key: sanitized }))
                                      }}
                                      required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                      Только буквы, цифры, подчеркивания и дефисы
                                    </p>
                                  </div>
                                  <div>
                                    <Label htmlFor={`edit-category-${item.id}`} className="text-gray-900 font-medium">Категория</Label>
                                    <Select value={editFormData.category} onValueChange={(value) => setEditFormData(prev => ({ ...prev, category: value }))}>
                                      <SelectTrigger className="text-gray-900">
                                        <SelectValue placeholder="Выберите категорию" className="text-gray-900" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-white border border-gray-200">
                                        {predefinedCategories.map((cat) => (
                                          <SelectItem key={cat} value={cat} className="text-gray-900 hover:bg-gray-100">{cat}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                
                                <div>
                                  <Label htmlFor={`edit-value-${item.id}`} className="text-gray-900 font-medium">Значение *</Label>
                                  <Textarea
                                    id={`edit-value-${item.id}`}
                                    value={editFormData.value}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, value: e.target.value }))}
                                    required
                                  />
                                </div>
                                
                                <div>
                                  <Label htmlFor={`edit-description-${item.id}`} className="text-gray-900 font-medium">Описание</Label>
                                  <Input
                                    id={`edit-description-${item.id}`}
                                    value={editFormData.description}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                                  />
                                </div>
                                
                                <div className="space-y-3">
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id={`edit-secure-${item.id}`}
                                      checked={editFormData.isSecure}
                                      onChange={(e) => setEditFormData(prev => ({ ...prev, isSecure: e.target.checked }))}
                                      className="rounded"
                                    />
                                    <Label htmlFor={`edit-secure-${item.id}`} className="text-gray-900 font-medium">Конфиденциальные данные</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id={`edit-editable-${item.id}`}
                                      checked={editFormData.isEditable}
                                      onChange={(e) => setEditFormData(prev => ({ ...prev, isEditable: e.target.checked }))}
                                      className="rounded"
                                    />
                                    <Label htmlFor={`edit-editable-${item.id}`} className="text-gray-900 font-medium">Может редактироваться лидером команды</Label>
                                  </div>
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button type="submit" size="sm" disabled={loading}>
                                    <Save className="w-4 h-4 mr-2" />
                                    Сохранить
                                  </Button>
                                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingItem(null)}>
                                    <X className="w-4 h-4 mr-2" />
                                    Отмена
                                  </Button>
                                </div>
                              </form>
                            </td>
                          ) : (
                            <>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">{item.key}</span>
                                  {item.category && (
                                    <Badge className={getCategoryColor(item.category)}>
                                      {item.category}
                                    </Badge>
                                  )}
                                  {item.isSecure && (
                                    <Badge variant="outline" className="text-amber-600 border-amber-200">
                                      <Key className="w-3 h-3 mr-1" />
                                      Secure
                                    </Badge>
                                  )}
                                  {!item.isEditable && (
                                    <Badge variant="outline" className="text-gray-600 border-gray-200">
                                      <Settings className="w-3 h-3 mr-1" />
                                      Read-only
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="bg-gray-50 rounded p-2 max-w-xs">
                                  <code className="text-sm break-all text-gray-900">{displayValue}</code>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="text-sm text-gray-700">{item.description || '-'}</span>
                              </td>
                              <td className="p-3">
                                <span className="text-xs text-gray-600">
                                  {formatDateShort(item.updatedAt)}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1 justify-end">
                                  {item.isSecure && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleValueVisibility(item.id)}
                                    >
                                      {isVisible ? (
                                        <EyeOff className="w-4 h-4" />
                                      ) : (
                                        <Eye className="w-4 h-4" />
                                      )}
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(item.value, item.key)}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEdit(item)}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(item.id, item.key)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Help Section */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Руководство по управлению данными окружения
          </CardTitle>
        </CardHeader>
        <CardContent className="text-gray-700">
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Используйте осмысленные имена ключей (например: database_url, api_key)</li>
            <li>Группируйте данные по категориям для удобства навигации</li>
            <li>Отмечайте конфиденциальные данные как &quot;Конфиденциальные&quot;</li>
            <li>Добавляйте описания для сложных параметров</li>
            <li>Команда автоматически получит уведомления об изменениях</li>
            <li>Все изменения логируются для аудита безопасности</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}