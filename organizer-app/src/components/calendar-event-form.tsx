'use client'

import { useState } from 'react'
import { Calendar, Clock, Link as LinkIcon, Users, Save, X } from 'lucide-react'
// Define the CalendarEvent type locally since it's not available in the client
type CalendarEvent = {
  id: string
  title: string
  description: string
  eventDate: Date
  eventEndDate: Date | null
  link: string | null
  eventType: 'INFO' | 'WARNING' | 'DEADLINE'
  isActive: boolean
  hackathonId: string
  teamId: string | null
  createdAt: Date
  updatedAt: Date
}

interface CalendarEventFormProps {
  event?: CalendarEvent & {
    team?: {
      id: string
      name: string
      nickname: string
    } | null
  }
  teams?: Array<{
    id: string
    name: string
    nickname: string
  }>
  onSave: (eventData: Record<string, unknown>) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  teamId?: string // Pre-selected team ID
}

export function CalendarEventForm({ 
  event, 
  teams = [], 
  onSave, 
  onCancel, 
  isSubmitting = false,
  teamId 
}: CalendarEventFormProps) {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    eventDate: event?.eventDate 
      ? new Date(event.eventDate).toISOString().slice(0, 16)
      : '',
    eventEndDate: event?.eventEndDate 
      ? new Date(event.eventEndDate).toISOString().slice(0, 16)
      : '',
    link: event?.link || '',
    eventType: event?.eventType || 'INFO',
    teamId: teamId || event?.teamId || '',
    isActive: event?.isActive !== undefined ? event.isActive : true
  })

  // const [showMarkdownPreview, setShowMarkdownPreview] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.description.trim() || !formData.eventDate) {
      return
    }

    const eventData = {
      ...formData,
      eventDate: new Date(formData.eventDate).toISOString(),
      eventEndDate: formData.eventEndDate ? new Date(formData.eventEndDate).toISOString() : null,
      teamId: formData.teamId || null
    }

    await onSave(eventData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const getEventTypeColor = () => {
    switch (formData.eventType) {
      case 'DEADLINE': return 'border-red-500 bg-red-50'
      case 'WARNING': return 'border-yellow-500 bg-yellow-50'
      case 'INFO': default: return 'border-blue-500 bg-blue-50'
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Заголовок события *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Введите заголовок события"
            />
          </div>

          <div>
            <label htmlFor="eventType" className="block text-sm font-medium text-gray-700 mb-2">
              Тип события
            </label>
            <select
              id="eventType"
              name="eventType"
              value={formData.eventType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="INFO">Информация</option>
              <option value="WARNING">Предупреждение</option>
              <option value="DEADLINE">Дедлайн</option>
            </select>
          </div>

          <div>
            <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 mb-2">
              Дата и время события *
            </label>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <input
                type="datetime-local"
                id="eventDate"
                name="eventDate"
                value={formData.eventDate}
                onChange={handleChange}
                required
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="eventEndDate" className="block text-sm font-medium text-gray-700 mb-2">
              Дата и время окончания (опционально)
            </label>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <input
                type="datetime-local"
                id="eventEndDate"
                name="eventEndDate"
                value={formData.eventEndDate}
                onChange={handleChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="link" className="block text-sm font-medium text-gray-700 mb-2">
              Ссылка (опционально)
            </label>
            <div className="flex items-center space-x-2">
              <LinkIcon className="h-4 w-4 text-gray-400" />
              <input
                type="url"
                id="link"
                name="link"
                value={formData.link}
                onChange={handleChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com"
              />
            </div>
          </div>

          {teams.length > 0 && (
            <div>
              <label htmlFor="teamId" className="block text-sm font-medium text-gray-700 mb-2">
                Команда (опционально)
              </label>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-400" />
                <select
                  id="teamId"
                  name="teamId"
                  value={formData.teamId}
                  onChange={handleChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Глобальное событие</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name} (@{team.nickname})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Активное событие
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Описание события (Markdown) *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="Введите описание события в формате Markdown..."
            />
            <p className="mt-1 text-xs text-gray-500">
              Поддерживается Markdown форматирование: **жирный**, *курсив*, `код`, [ссылки](url)
            </p>
          </div>

          <div className={`p-4 rounded-lg border-l-4 ${getEventTypeColor()}`}>
            <h4 className="font-medium text-gray-900 mb-2">Предварительный просмотр</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-lg">
                  {formData.eventType === 'DEADLINE' ? '🚨' : 
                   formData.eventType === 'WARNING' ? '⚠️' : 'ℹ️'}
                </span>
                <span className="font-semibold">{formData.title || 'Заголовок события'}</span>
              </div>
              <p className="text-sm text-gray-600">
                {formData.eventDate ? new Date(formData.eventDate).toLocaleString('ru-RU') : 'Дата не указана'}
              </p>
              <div className="text-sm text-gray-700">
                {formData.description ? (
                  <div className="prose prose-sm max-w-none">
                    {formData.description.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                ) : (
                  'Описание события...'
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="h-4 w-4 mr-2 inline" />
          Отменить
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !formData.title.trim() || !formData.description.trim() || !formData.eventDate}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4 mr-2 inline" />
          {isSubmitting ? 'Сохранение...' : (event ? 'Обновить' : 'Создать')} событие
        </button>
      </div>
    </form>
  )
}