'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, ChevronDown, ChevronUp, Clock } from 'lucide-react'
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
import { CalendarEventItem } from './calendar-event-item'

interface CalendarViewProps {
  teamId?: string
  showTeamFilter?: boolean
  canDismiss?: boolean
  className?: string
}

type CalendarEventWithRelations = CalendarEvent & {
  team?: {
    id: string
    name: string
    nickname: string
  } | null
  isDismissed?: boolean
}

export function CalendarView({ 
  teamId, 
  // showTeamFilter = false, 
  canDismiss = true,
  className = ""
}: CalendarViewProps) {
  const [events, setEvents] = useState<CalendarEventWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPastEvents, setShowPastEvents] = useState(false)
  const [mounted, setMounted] = useState(false)

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams()
      if (teamId) queryParams.append('teamId', teamId)
      queryParams.append('includeInactive', 'false')
      
      const response = await fetch(`/api/calendar?${queryParams}`)
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
  }, [teamId])

  useEffect(() => {
    setMounted(true)
    fetchEvents()
  }, [fetchEvents])

  if (!mounted) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold">Календарь событий</h2>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  const handleDismiss = async (eventId: string) => {
    try {
      const response = await fetch(`/api/calendar/${eventId}/dismiss`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to dismiss event')
      }
      
      // Update local state
      setEvents(events.map(event => 
        event.id === eventId 
          ? { ...event, isDismissed: true }
          : event
      ))
    } catch (err) {
      console.error('Error dismissing event:', err)
    }
  }

  const now = new Date()
  const upcomingEvents = events.filter(event => 
    new Date(event.eventDate) >= now && !event.isDismissed
  )
  const pastEvents = events.filter(event => 
    new Date(event.eventDate) < now
  )

  const getNextEvent = () => {
    const upcoming = upcomingEvents.filter(event => event.isActive)
    return upcoming.length > 0 ? upcoming[0] : null
  }

  const nextEvent = getNextEvent()

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold">Календарь событий</h2>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold">Календарь событий</h2>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Ошибка загрузки событий: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center space-x-2">
        <Calendar className="h-5 w-5 text-gray-600" />
        <h2 className="text-lg font-semibold">Календарь событий</h2>
      </div>

      {nextEvent && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Ближайшее событие</span>
          </div>
          <CalendarEventItem
            event={nextEvent}
            isUpcoming={true}
            canDismiss={canDismiss}
            onDismiss={handleDismiss}
          />
        </div>
      )}

      {upcomingEvents.length === 0 && pastEvents.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>События будут опубликованы позже</p>
        </div>
      )}

      {upcomingEvents.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">Предстоящие события</h3>
          {upcomingEvents.map(event => (
            <CalendarEventItem
              key={event.id}
              event={event}
              isUpcoming={true}
              canDismiss={canDismiss}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}

      {pastEvents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Прошедшие события</h3>
            <button
              onClick={() => setShowPastEvents(!showPastEvents)}
              className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
            >
              <span>{showPastEvents ? 'Скрыть' : 'Показать'} ({pastEvents.length})</span>
              {showPastEvents ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
          
          {showPastEvents && (
            <div className="space-y-2">
              {pastEvents.map(event => (
                <CalendarEventItem
                  key={event.id}
                  event={event}
                  isUpcoming={false}
                  canDismiss={false}
                  isPast={true}
                  isCollapsed={true}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}