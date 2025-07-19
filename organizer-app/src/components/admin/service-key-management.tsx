'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Key, Plus, RefreshCw, Settings, Trash2, TrendingUp } from 'lucide-react'
import { ServiceKeyForm } from './service-key-form'
import { ServiceKeyUsage } from './service-key-usage'
import { ApiKeyDisplay } from './api-key-display'
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

interface ServiceKeyResponse {
  keys: ServiceKey[]
}

export function ServiceKeyManagement() {
  const [keys, setKeys] = useState<ServiceKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingKey, setEditingKey] = useState<ServiceKey | null>(null)
  const [showUsage, setShowUsage] = useState<string | null>(null)
  const [newApiKey, setNewApiKey] = useState<{ apiKey: string; keyPrefix: string } | null>(null)

  const fetchKeys = async () => {
    try {
      const response = await fetch('/api/dashboard/service-keys')
      if (response.ok) {
        const data: ServiceKeyResponse = await response.json()
        setKeys(data.keys)
      } else {
        toast.error('Не удалось загрузить API ключи')
      }
    } catch {
      toast.error('Ошибка при загрузке API ключей')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKeys()
  }, [])

  const handleCreateKey = () => {
    setEditingKey(null)
    setShowForm(true)
  }

  const handleEditKey = (key: ServiceKey) => {
    setEditingKey(key)
    setShowForm(true)
  }

  const handleDeleteKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Вы уверены, что хотите удалить API ключ "${keyName}"? Это действие нельзя отменить.`)) {
      return
    }

    try {
      const response = await fetch(`/api/dashboard/service-keys/${keyId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('API ключ успешно удален')
        fetchKeys()
      } else {
        toast.error('Не удалось удалить API ключ')
      }
    } catch {
      toast.error('Ошибка при удалении API ключа')
    }
  }

  const handleRegenerateKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Вы уверены, что хотите перегенерировать API ключ "${keyName}"? Старый ключ станет недействительным.`)) {
      return
    }

    try {
      const response = await fetch(`/api/dashboard/service-keys/${keyId}/regenerate`, {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setNewApiKey({
          apiKey: data.apiKey,
          keyPrefix: data.keyPrefix
        })
        toast.success('API ключ успешно перегенерирован')
        fetchKeys()
      } else {
        toast.error('Не удалось перегенерировать API ключ')
      }
    } catch {
      toast.error('Ошибка при перегенерации API ключа')
    }
  }

  const handleFormSuccess = (newKey?: { apiKey: string; keyPrefix: string }) => {
    setShowForm(false)
    setEditingKey(null)
    if (newKey) {
      setNewApiKey(newKey)
    }
    fetchKeys()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU')
  }

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* New API Key Display */}
      {newApiKey && (
        <ApiKeyDisplay 
          apiKey={newApiKey.apiKey}
          keyPrefix={newApiKey.keyPrefix}
          onClose={() => setNewApiKey(null)}
        />
      )}

      {/* Service Key Form */}
      {showForm && (
        <ServiceKeyForm
          key={editingKey?.id || 'new'}
          existingKey={editingKey}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false)
            setEditingKey(null)
          }}
        />
      )}

      {/* Usage Analytics */}
      {showUsage && (
        <ServiceKeyUsage
          keyId={showUsage}
          onClose={() => setShowUsage(null)}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">API Ключи</h2>
          <p className="text-sm text-gray-600">
            Управление ключами для автоматизации и интеграций
          </p>
        </div>
        <Button onClick={handleCreateKey} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Создать ключ
        </Button>
      </div>

      {/* Service Keys List */}
      <div className="grid gap-4">
        {keys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <Key className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Нет API ключей
              </h3>
              <p className="text-gray-600 mb-4">
                Создайте первый API ключ для автоматизации операций с данными окружения команд
              </p>
              <Button onClick={handleCreateKey}>
                Создать первый ключ
              </Button>
            </CardContent>
          </Card>
        ) : (
          keys.map((key) => (
            <Card key={key.id} className={isExpired(key.expiresAt) ? 'border-red-200 bg-red-50' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-gray-600" />
                    <div>
                      <CardTitle className="text-lg">{key.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {key.keyPrefix}...
                        </code>
                        <Badge variant={key.isActive ? 'default' : 'secondary'}>
                          {key.isActive ? 'Активен' : 'Неактивен'}
                        </Badge>
                        {isExpired(key.expiresAt) && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Истек
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowUsage(key.id)}
                      className="flex items-center gap-2"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Статистика
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditKey(key)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRegenerateKey(key.id, key.name)}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteKey(key.id, key.name)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-900">Права доступа</div>
                    <div className="text-gray-600">
                      {key.permissions.map(perm => (
                        <Badge key={perm} variant="outline" className="mr-1 mb-1">
                          {perm}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Последнее использование</div>
                    <div className="text-gray-600">
                      {key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Никогда'}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Истекает</div>
                    <div className="text-gray-600">
                      {key.expiresAt ? formatDate(key.expiresAt) : 'Никогда'}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Использований (30 дней)</div>
                    <div className="text-gray-600 font-medium">
                      {key.usageCount}
                    </div>
                  </div>
                </div>
                {key.description && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-sm text-gray-600">{key.description}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}