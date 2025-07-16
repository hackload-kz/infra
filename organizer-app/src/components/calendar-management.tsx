'use client'

import { useState, useEffect } from 'react'
import { Plus, Calendar, Search, Edit, Trash2 } from 'lucide-react'
import { CalendarEventForm } from './calendar-event-form'
import { CalendarEventItem } from './calendar-event-item'

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

type CalendarEventWithRelations = CalendarEvent & {
  team?: {
    id: string
    name: string
    nickname: string
  } | null
}

type Team = {
  id: string
  name: string
  nickname: string
}

export function CalendarManagement() {
  const [events, setEvents] = useState<CalendarEventWithRelations[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEventWithRelations | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTeam, setFilterTeam] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [showInactive, setShowInactive] = useState(false)
  const [preSelectedTeam, setPreSelectedTeam] = useState<string | null>(null)

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/calendar?includeInactive=true')
      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }
      const data = await response.json()
      setEvents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events')
    } finally {
      setLoading(false)
    }
  }

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams')
      if (!response.ok) {
        throw new Error('Failed to fetch teams')
      }
      const data = await response.json()
      setTeams(data.teams || [])
    } catch (err) {
      console.error('Failed to fetch teams:', err)
      setTeams([])
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchEvents()
    fetchTeams()
    
    // Check for team parameter in URL
    const urlParams = new URLSearchParams(window.location.search)
    const teamParam = urlParams.get('team')
    if (teamParam) {
      setPreSelectedTeam(teamParam)
      setShowCreateForm(true)
    }
  }, [])

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-40 bg-gray-200 rounded"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    )
  }

  const handleCreateEvent = async (eventData: Record<string, unknown>) => {
    try {
      setIsSubmitting(true)
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      })

      if (!response.ok) {
        throw new Error('Failed to create event')
      }

      await fetchEvents()
      setShowCreateForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateEvent = async (eventData: Record<string, unknown>) => {
    if (!editingEvent) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/calendar/${editingEvent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      })

      if (!response.ok) {
        throw new Error('Failed to update event')
      }

      await fetchEvents()
      setEditingEvent(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Вы уверены, что хотите удалить это событие?')) {
      return
    }

    try {
      const response = await fetch(`/api/calendar/${eventId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete event')
      }

      await fetchEvents()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event')
    }
  }

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTeam = !filterTeam || (filterTeam === 'global' ? !event.teamId : event.teamId === filterTeam)
    const matchesType = !filterType || event.eventType === filterType
    const matchesActive = showInactive || event.isActive

    return matchesSearch && matchesTeam && matchesType && matchesActive
  })

  const upcomingEvents = filteredEvents.filter(event => new Date(event.eventDate) >= new Date())
  const pastEvents = filteredEvents.filter(event => new Date(event.eventDate) < new Date())

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-40 bg-gray-200 rounded"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (showCreateForm || editingEvent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingEvent ? 'Редактировать событие' : 'Создать новое событие'}
          </h2>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <CalendarEventForm
            event={editingEvent || undefined}
            teams={teams}
            onSave={editingEvent ? handleUpdateEvent : handleCreateEvent}
            onCancel={() => {
              setShowCreateForm(false)
              setEditingEvent(null)
              setPreSelectedTeam(null)
            }}
            isSubmitting={isSubmitting}
            teamId={preSelectedTeam || undefined}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 hover:text-red-800"
          >
            Скрыть
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold text-gray-900">События календаря</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Создать событие
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск событий..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Все команды</option>
            <option value="global">Глобальные события</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Все типы</option>
            <option value="INFO">Информация</option>
            <option value="WARNING">Предупреждение</option>
            <option value="DEADLINE">Дедлайн</option>
          </select>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showInactive"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="showInactive" className="text-sm text-gray-700">
              Показать неактивные
            </label>
          </div>
        </div>

        <div className="space-y-6">
          {upcomingEvents.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                Предстоящие события ({upcomingEvents.length})
              </h3>
              <div className="space-y-3">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="relative">
                    <CalendarEventItem
                      event={event}
                      isUpcoming={true}
                      canDismiss={false}
                    />
                    <div className="absolute top-2 right-2 flex items-center space-x-2">
                      <button
                        onClick={() => setEditingEvent(event)}
                        className="p-1 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-1 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pastEvents.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                Прошедшие события ({pastEvents.length})
              </h3>
              <div className="space-y-3">
                {pastEvents.map(event => (
                  <div key={event.id} className="relative">
                    <CalendarEventItem
                      event={event}
                      isUpcoming={false}
                      canDismiss={false}
                      isPast={true}
                    />
                    <div className="absolute top-2 right-2 flex items-center space-x-2">
                      <button
                        onClick={() => setEditingEvent(event)}
                        className="p-1 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-1 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredEvents.length === 0 && (
            <div className="text-center py-12 text-gray-700">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>События не найдены</p>
              <p className="text-sm mt-2 text-gray-600">Попробуйте изменить фильтры или создать новое событие</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}