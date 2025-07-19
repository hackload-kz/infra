'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { toast } from 'sonner'

interface ServiceKey {
  id: string
  name: string
  keyPrefix: string
  description?: string
  permissions: string[]
  isActive: boolean
  lastUsedAt?: string
  expiresAt?: string
  createdAt: string
  usageCount: number
}

interface ServiceKeyFormProps {
  existingKey?: ServiceKey | null
  onSuccess: (newKey?: { apiKey: string; keyPrefix: string }) => void
  onCancel: () => void
}

const AVAILABLE_PERMISSIONS = [
  { id: 'environment:write', label: 'Управление данными окружения', description: 'Создание, обновление и удаление переменных окружения команд' },
  { id: 'environment:read', label: 'Чтение данных окружения', description: 'Просмотр переменных окружения команд' },
  { id: '*', label: 'Полный доступ', description: 'Все доступные операции (используйте осторожно)' }
]

export function ServiceKeyForm({ existingKey, onSuccess, onCancel }: ServiceKeyFormProps) {
  const [formData, setFormData] = useState({
    name: existingKey?.name || '',
    description: existingKey?.description || '',
    permissions: existingKey?.permissions || ['environment:write'],
    expiresAt: existingKey?.expiresAt ? new Date(existingKey.expiresAt).toISOString().slice(0, 16) : '',
    isActive: existingKey?.isActive ?? true
  })
  const [loading, setLoading] = useState(false)

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        permissions: [...prev.permissions, permissionId]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => p !== permissionId)
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        permissions: formData.permissions,
        expiresAt: formData.expiresAt || undefined,
        ...(existingKey && { isActive: formData.isActive })
      }

      const url = existingKey 
        ? `/api/dashboard/service-keys/${existingKey.id}`
        : '/api/dashboard/service-keys'
      
      const method = existingKey ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(existingKey ? 'API ключ обновлен' : 'API ключ создан')
        
        // For new keys, pass the API key to show it
        if (!existingKey && data.apiKey) {
          onSuccess({ apiKey: data.apiKey, keyPrefix: data.keyPrefix })
        } else {
          onSuccess()
        }
      } else {
        const error = await response.json()
        toast.error(error.error || 'Ошибка при сохранении API ключа')
      }
    } catch {
      toast.error('Ошибка при сохранении API ключа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {existingKey ? 'Редактировать API ключ' : 'Создать новый API ключ'}
            </CardTitle>
            <CardDescription>
              {existingKey 
                ? 'Обновите настройки существующего API ключа'
                : 'Создайте новый API ключ для автоматизации операций'
              }
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-gray-900 font-medium">Название ключа</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Например: Автоматизация развертывания"
                required
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-gray-900 font-medium">Описание (опционально)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Для чего используется этот ключ..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="expiresAt" className="text-gray-900 font-medium">Дата истечения (опционально)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
              />
              <p className="text-xs text-gray-600 mt-1">
                Оставьте пустым для ключа без срока истечения
              </p>
            </div>
          </div>

          {/* Permissions */}
          <div>
            <Label className="text-gray-900 font-medium">Права доступа</Label>
            <div className="mt-2 space-y-3">
              {AVAILABLE_PERMISSIONS.map((permission) => (
                <div key={permission.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={permission.id}
                    checked={formData.permissions.includes(permission.id)}
                    onCheckedChange={(checked) => handlePermissionChange(permission.id, checked as boolean)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={permission.id} className="text-gray-900 font-medium">
                      {permission.label}
                    </Label>
                    <p className="text-xs text-gray-600">{permission.description}</p>
                  </div>
                </div>
              ))}
            </div>
            {formData.permissions.length === 0 && (
              <p className="text-xs text-red-600 mt-1">
                Выберите хотя бы одно право доступа
              </p>
            )}
          </div>

          {/* Active Status (only for editing) */}
          {existingKey && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked as boolean }))}
              />
              <Label htmlFor="isActive" className="text-gray-900 font-medium">Ключ активен</Label>
            </div>
          )}

          {/* Selected Permissions Preview */}
          {formData.permissions.length > 0 && (
            <div>
              <Label className="text-gray-900 font-medium">Выбранные права доступа:</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.permissions.map(permission => (
                  <Badge key={permission} variant="outline">
                    {AVAILABLE_PERMISSIONS.find(p => p.id === permission)?.label || permission}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={loading || formData.permissions.length === 0}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : null}
              {existingKey ? 'Обновить ключ' : 'Создать ключ'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}