'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Copy, Eye, EyeOff, X } from 'lucide-react'
import { toast } from 'sonner'

interface ApiKeyDisplayProps {
  apiKey: string
  keyPrefix: string
  onClose: () => void
}

export function ApiKeyDisplay({ apiKey, keyPrefix, onClose }: ApiKeyDisplayProps) {
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey)
      setCopied(true)
      toast.success('API ключ скопирован в буфер обмена')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Не удалось скопировать ключ')
    }
  }

  const maskedKey = showKey ? apiKey : keyPrefix + '•'.repeat(apiKey.length - keyPrefix.length)

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Copy className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-gray-900">API ключ создан успешно!</CardTitle>
              <CardDescription className="text-gray-700">
                Сохраните этот ключ в безопасном месте. Он больше не будет показан.
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Security Warning */}
        <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium text-yellow-800">Важные замечания по безопасности:</div>
            <ul className="mt-1 text-yellow-700 list-disc list-inside space-y-1">
              <li>Этот ключ предоставляет доступ к API системы</li>
              <li>Сохраните его в безопасном месте (например, в менеджере паролей)</li>
              <li>Никогда не размещайте ключ в публичных репозиториях</li>
              <li>При компрометации немедленно удалите или перегенерируйте ключ</li>
            </ul>
          </div>
        </div>

        {/* API Key Display */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-900">API Ключ:</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 p-3 bg-gray-100 border rounded-md font-mono text-sm break-all text-gray-900">
              {maskedKey}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKey(!showKey)}
              className="flex items-center gap-2"
            >
              {showKey ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Скрыть
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Показать
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className={`flex items-center gap-2 ${copied ? 'bg-green-50 border-green-200' : ''}`}
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Скопировано!' : 'Копировать'}
            </Button>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Как использовать:</h4>
          <div className="space-y-3">
            <div>
              <div className="text-xs font-medium text-gray-900 mb-1">1. Массовое обновление данных окружения:</div>
              <div className="p-2 bg-gray-100 rounded text-xs font-mono text-gray-900">
                curl -X PUT https://your-domain.com/api/service/teams/environment \<br />
                &nbsp;&nbsp;-H &quot;X-API-Key: {maskedKey}&quot; \<br />
                &nbsp;&nbsp;-H &quot;Content-Type: application/json&quot; \<br />
                &nbsp;&nbsp;-d &apos;{`{
                  "teamSlug": "team-nickname",
                  "updates": [
                    {
                      "key": "GITHUB_REPO_URL",
                      "value": "https://github.com/user/repo",
                      "category": "git"
                    }
                  ]
                }`}&apos;
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-900 mb-1">2. Обновление одного параметра:</div>
              <div className="p-2 bg-gray-100 rounded text-xs font-mono text-gray-900">
                curl -X PUT https://your-domain.com/api/service/teams/TEAM_SLUG/environment/KEY_NAME \<br />
                &nbsp;&nbsp;-H &quot;X-API-Key: {maskedKey}&quot; \<br />
                &nbsp;&nbsp;-H &quot;Content-Type: application/json&quot; \<br />
                &nbsp;&nbsp;-d &apos;{`{
                  "value": "new-value",
                  "description": "Updated via API"
                }`}&apos;
              </div>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Я сохранил ключ безопасно
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}