'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  ArrowLeft, 
  Save, 
  X, 
  Code, 
  Globe, 
  Copy,
  Check
} from 'lucide-react'

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

interface TestStepFormProps {
  scenario: TestScenario
  step?: TestScenarioStep | null
  onSuccess: () => void
  onCancel: () => void
}

export default function TestStepForm({
  scenario,
  step,
  onSuccess,
  onCancel
}: TestStepFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    stepType: 'http_request' as 'k6_script' | 'http_request',
    stepOrder: 1,
    isActive: true,
    config: {
      curl: '',
      script: '',
      parallelism: 1
    }
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (step) {
      setFormData({
        name: step.name || '',
        description: step.description || '',
        stepType: step.stepType || 'http_request',
        stepOrder: step.stepOrder || 1,
        isActive: step.isActive,
        config: {
          curl: (step.config?.curl as string) || '',
          script: (step.config?.script as string) || '',
          parallelism: (step.config?.parallelism as number) || 1
        }
      })
    }
  }, [step])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Название шага обязательно'
    }

    if (formData.stepType === 'http_request' && !formData.config.curl.trim()) {
      newErrors.curl = 'Curl команда обязательна для HTTP запроса'
    }

    if (formData.stepType === 'k6_script' && !formData.config.script.trim()) {
      newErrors.script = 'K6 скрипт обязателен'
    }

    if (formData.stepOrder < 1) {
      newErrors.stepOrder = 'Порядок должен быть положительным числом'
    }

    if (formData.config.parallelism < 1 || formData.config.parallelism > 10) {
      newErrors.parallelism = 'Параллелизм должен быть от 1 до 10'
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
      const config = formData.stepType === 'http_request' 
        ? { curl: formData.config.curl, parallelism: formData.config.parallelism }
        : { script: formData.config.script, parallelism: formData.config.parallelism }

      const url = step 
        ? `/api/dashboard/test-scenarios/${scenario.id}/steps/${step.id}`
        : `/api/dashboard/test-scenarios/${scenario.id}/steps`
      
      const response = await fetch(url, {
        method: step ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          stepType: formData.stepType,
          stepOrder: step ? undefined : formData.stepOrder, // Don't change order when editing
          config,
          isActive: formData.isActive
        })
      })

      if (response.ok) {
        onSuccess()
      } else {
        const error = await response.json()
        if (error.error === 'Шаг с таким порядком уже существует') {
          setErrors({ stepOrder: error.error })
        } else {
          alert(`Ошибка: ${error.error}`)
        }
      }
    } catch (error) {
      console.error('Error saving step:', error)
      alert('Произошла ошибка при сохранении шага')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean | number) => {
    if (field.startsWith('config.')) {
      const configField = field.split('.')[1]
      setFormData(prev => ({
        ...prev,
        config: { ...prev.config, [configField]: value }
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const copyExample = (example: string) => {
    navigator.clipboard.writeText(example)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const curlExample = `curl -X GET \\
  'https://api.example.com/users' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -H 'Content-Type: application/json'`

  const k6Example = `import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '60s', target: 10 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  let response = http.get('https://api.example.com/users');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onCancel} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white">
            {step ? 'Редактировать шаг' : 'Создать шаг'}
          </h1>
          <p className="text-slate-500 mt-1">
            {scenario.name} • {step ? `Шаг ${step.stepOrder}` : 'Новый шаг'}
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
                Название шага *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Проверка API пользователей"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Step Order Field */}
            {!step && (
              <div className="space-y-2">
                <Label htmlFor="stepOrder" className="text-slate-300">
                  Порядок выполнения *
                </Label>
                <Input
                  id="stepOrder"
                  type="number"
                  min="1"
                  value={formData.stepOrder}
                  onChange={(e) => handleInputChange('stepOrder', parseInt(e.target.value) || 1)}
                  className={errors.stepOrder ? 'border-red-500' : ''}
                />
                {errors.stepOrder && (
                  <p className="text-sm text-red-400">{errors.stepOrder}</p>
                )}
              </div>
            )}
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
              placeholder="Подробное описание шага..."
              rows={3}
            />
          </div>

          {/* Step Type Selection */}
          <div className="space-y-4">
            <Label className="text-slate-300">Тип шага *</Label>
            <div className="grid gap-4 md:grid-cols-2">
              <Card 
                className={`p-4 cursor-pointer transition-colors ${
                  formData.stepType === 'http_request' 
                    ? 'bg-slate-700/50 border-slate-600' 
                    : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-700/30'
                }`}
                onClick={() => handleInputChange('stepType', 'http_request')}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded ${
                    formData.stepType === 'http_request' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-slate-600/50 text-slate-400'
                  }`}>
                    <Globe className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">HTTP Запрос</h3>
                    <p className="text-sm text-slate-400">Выполнить curl команду</p>
                  </div>
                </div>
              </Card>

              <Card 
                className={`p-4 cursor-pointer transition-colors ${
                  formData.stepType === 'k6_script' 
                    ? 'bg-slate-700/50 border-slate-600' 
                    : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-700/30'
                }`}
                onClick={() => handleInputChange('stepType', 'k6_script')}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded ${
                    formData.stepType === 'k6_script' 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : 'bg-slate-600/50 text-slate-400'
                  }`}>
                    <Code className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">K6 Скрипт</h3>
                    <p className="text-sm text-slate-400">Выполнить K6 тест</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Parallelism Configuration */}
          <div className="space-y-2">
            <Label htmlFor="parallelism" className="text-slate-300">
              Параллелизм *
            </Label>
            <Input
              id="parallelism"
              type="number"
              min="1"
              max="10"
              value={formData.config.parallelism}
              onChange={(e) => handleInputChange('config.parallelism', parseInt(e.target.value) || 1)}
              className={errors.parallelism ? 'border-red-500' : ''}
            />
            {errors.parallelism && (
              <p className="text-sm text-red-400">{errors.parallelism}</p>
            )}
            <p className="text-xs text-slate-500">
              Количество параллельных K6 контейнеров для выполнения теста (1-10)
            </p>
          </div>

          {/* Configuration Fields */}
          {formData.stepType === 'http_request' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="curl" className="text-slate-300">
                  Curl команда *
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => copyExample(curlExample)}
                  className="text-xs"
                >
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  Пример
                </Button>
              </div>
              <Textarea
                id="curl"
                value={formData.config.curl}
                onChange={(e) => handleInputChange('config.curl', e.target.value)}
                placeholder="curl -X GET 'https://api.example.com/users' -H 'Authorization: Bearer TOKEN'"
                className={`font-mono text-sm ${errors.curl ? 'border-red-500' : ''}`}
                rows={6}
              />
              {errors.curl && (
                <p className="text-sm text-red-400">{errors.curl}</p>
              )}
              <p className="text-xs text-slate-500">
                Введите полную curl команду с заголовками и параметрами
              </p>
            </div>
          )}

          {formData.stepType === 'k6_script' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="script" className="text-slate-300">
                  K6 Скрипт *
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => copyExample(k6Example)}
                  className="text-xs"
                >
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  Пример
                </Button>
              </div>
              <Textarea
                id="script"
                value={formData.config.script}
                onChange={(e) => handleInputChange('config.script', e.target.value)}
                placeholder="import http from 'k6/http'..."
                className={`font-mono text-sm ${errors.script ? 'border-red-500' : ''}`}
                rows={12}
              />
              {errors.script && (
                <p className="text-sm text-red-400">{errors.script}</p>
              )}
              <p className="text-xs text-slate-500">
                Введите JavaScript код для K6 нагрузочного тестирования
              </p>
            </div>
          )}

          {/* Active Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleInputChange('isActive', checked as boolean)}
            />
            <Label htmlFor="isActive" className="text-slate-300">
              Активный шаг
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
                  {step ? 'Сохранить изменения' : 'Создать шаг'}
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