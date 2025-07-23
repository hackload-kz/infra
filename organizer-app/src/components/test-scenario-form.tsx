'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Save, X } from 'lucide-react'

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

interface TestScenarioFormProps {
  scenario?: TestScenario | null
  onSuccess: () => void
  onCancel: () => void
}

export default function TestScenarioForm({
  scenario,
  onSuccess,
  onCancel
}: TestScenarioFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    identifier: '',
    description: '',
    isActive: true
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (scenario) {
      setFormData({
        name: scenario.name || '',
        identifier: scenario.identifier || '',
        description: scenario.description || '',
        isActive: scenario.isActive
      })
    }
  }, [scenario])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Название обязательно'
    }

    if (!formData.identifier.trim()) {
      newErrors.identifier = 'Идентификатор обязателен'
    } else if (!/^[a-z0-9_-]+$/.test(formData.identifier)) {
      newErrors.identifier = 'Идентификатор может содержать только строчные буквы, цифры, дефисы и подчёркивания'
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

    try {
      const url = scenario 
        ? `/api/dashboard/test-scenarios/${scenario.id}`
        : '/api/dashboard/test-scenarios'
      
      const response = await fetch(url, {
        method: scenario ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onSuccess()
      } else {
        const error = await response.json()
        if (error.error === 'Сценарий с таким идентификатором уже существует') {
          setErrors({ identifier: error.error })
        } else {
          alert(`Ошибка: ${error.error}`)
        }
      }
    } catch (error) {
      console.error('Error saving scenario:', error)
      alert('Произошла ошибка при сохранении сценария')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const generateIdentifier = () => {
    const name = formData.name.trim()
    if (name) {
      const identifier = name
        .toLowerCase()
        .replace(/[^a-zа-я0-9\s-]/g, '')
        .replace(/[а-я]/g, (char) => {
          const map: Record<string, string> = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
            'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
            'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
            'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
            'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
          }
          return map[char] || char
        })
        .replace(/\s+/g, '_')
        .replace(/-+/g, '-')
        .replace(/_{2,}/g, '_')
        .replace(/^[_-]+|[_-]+$/g, '')
      
      handleInputChange('identifier', identifier)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onCancel} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white">
            {scenario ? 'Редактировать сценарий' : 'Создать сценарий'}
          </h1>
          <p className="text-slate-400 mt-1">
            {scenario ? 'Изменить параметры тестового сценария' : 'Добавить новый тестовый сценарий'}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/30 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">
                Название сценария *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Нагрузочное тестирование API"
                className={errors.name ? 'border-red-500' : ''}
              />
              <div className="flex justify-between">
                {errors.name && (
                  <p className="text-sm text-red-400">{errors.name}</p>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={generateIdentifier}
                  className="text-xs text-slate-400 hover:text-slate-300 ml-auto"
                >
                  Сгенерировать ID
                </Button>
              </div>
            </div>

            {/* Identifier Field */}
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-slate-300">
                Идентификатор *
              </Label>
              <Input
                id="identifier"
                value={formData.identifier}
                onChange={(e) => handleInputChange('identifier', e.target.value)}
                placeholder="load_test_api"
                className={`font-mono ${errors.identifier ? 'border-red-500' : ''}`}
              />
              {errors.identifier && (
                <p className="text-sm text-red-400">{errors.identifier}</p>
              )}
              <p className="text-xs text-slate-500">
                Только строчные буквы, цифры, дефисы и подчёркивания
              </p>
            </div>
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-slate-300">
              Описание
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Подробное описание сценария тестирования..."
              rows={4}
            />
          </div>

          {/* Active Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleInputChange('isActive', checked as boolean)}
            />
            <Label htmlFor="isActive" className="text-slate-300">
              Активный сценарий
            </Label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {scenario ? 'Сохранить изменения' : 'Создать сценарий'}
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Отмена
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}