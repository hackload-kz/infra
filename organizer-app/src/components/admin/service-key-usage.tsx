'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, TrendingUp, Calendar, CheckCircle, XCircle, Globe, User } from 'lucide-react'
import { toast } from 'sonner'

interface UsageLog {
  id: string
  endpoint: string
  method: string
  teamId?: string
  success: boolean
  createdAt: string
  userAgent?: string
  ipAddress?: string
}

interface UsageSummary {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  teamsAffected: number
  successRate: number
  endpointStats: Record<string, { total: number; successful: number; failed: number }>
}

interface UsageData {
  keyId: string
  keyName: string
  keyPrefix: string
  usage: UsageLog[]
  summary: UsageSummary
  periodDays: number
}

interface ServiceKeyUsageProps {
  keyId: string
  onClose: () => void
}

export function ServiceKeyUsage({ keyId, onClose }: ServiceKeyUsageProps) {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodDays, setPeriodDays] = useState('30')

  const fetchUsage = useCallback(async (days: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/dashboard/service-keys/${keyId}/usage?days=${days}`)
      if (response.ok) {
        const usageData: UsageData = await response.json()
        setData(usageData)
      } else {
        toast.error('Не удалось загрузить статистику использования')
      }
    } catch {
      toast.error('Ошибка при загрузке статистики')
    } finally {
      setLoading(false)
    }
  }, [keyId])

  useEffect(() => {
    fetchUsage(periodDays)
  }, [fetchUsage, periodDays])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU')
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-100 text-blue-800'
      case 'POST': return 'bg-green-100 text-green-800'
      case 'PUT': return 'bg-yellow-100 text-yellow-800'
      case 'DELETE': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8">
          <XCircle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-gray-600">Не удалось загрузить данные</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Статистика использования
            </CardTitle>
            <CardDescription>
              Ключ: <code className="bg-gray-100 px-2 py-1 rounded">{data.keyPrefix}...</code> ({data.keyName})
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={periodDays} onValueChange={setPeriodDays}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 дней</SelectItem>
                <SelectItem value="30">30 дней</SelectItem>
                <SelectItem value="90">90 дней</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-900">{data.summary.totalRequests}</div>
            <div className="text-sm text-blue-600">Всего запросов</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-900">{data.summary.successfulRequests}</div>
            <div className="text-sm text-green-600">Успешных</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-900">{data.summary.failedRequests}</div>
            <div className="text-sm text-red-600">Ошибок</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-900">{data.summary.teamsAffected}</div>
            <div className="text-sm text-purple-600">Команд затронуто</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{data.summary.successRate}%</div>
            <div className="text-sm text-gray-600">Успешность</div>
          </div>
        </div>

        {/* Endpoint Statistics */}
        {Object.keys(data.summary.endpointStats).length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Статистика по эндпоинтам</h3>
            <div className="space-y-2">
              {Object.entries(data.summary.endpointStats).map(([endpoint, stats]) => (
                <div key={endpoint} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <code className="text-sm font-mono">{endpoint}</code>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">Всего: {stats.total}</span>
                    <span className="text-green-600">✓ {stats.successful}</span>
                    <span className="text-red-600">✗ {stats.failed}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Usage Logs */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Последние запросы ({data.usage.length > 50 ? 'показано 50 из ' + data.usage.length : data.usage.length})
          </h3>
          {data.usage.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Нет данных об использовании за выбранный период
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.usage.slice(0, 50).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {log.success ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <Badge className={getMethodColor(log.method)}>
                      {log.method}
                    </Badge>
                    <code className="text-sm">{log.endpoint}</code>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {log.teamId && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Team
                      </span>
                    )}
                    {log.ipAddress && (
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {log.ipAddress}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}