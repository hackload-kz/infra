'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react'
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
          <Calendar className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">Календарь событий</h2>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-slate-700/30 rounded-lg"></div>
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

  // const getNextEvent = () => {
  //   const upcoming = upcomingEvents.filter(event => event.isActive)
  //   return upcoming.length > 0 ? upcoming[0] : null
  // }

  // const nextEvent = getNextEvent()

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">Календарь событий</h2>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-slate-700/30 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">Календарь событий</h2>
        </div>
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-300">Ошибка загрузки событий: {error}</p>
        </div>
      </div>
    )
  }

  // Sort events: upcoming first (chronological), then past events (reverse chronological)
  const sortedUpcomingEvents = upcomingEvents.sort((a, b) => 
    new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  )
  const sortedPastEvents = pastEvents.sort((a, b) => 
    new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  )

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center space-x-2">
        <Calendar className="h-5 w-5 text-amber-400" />
        <h2 className="text-lg font-semibold text-white">Календарь событий</h2>
      </div>

      {(sortedUpcomingEvents.length === 0 && sortedPastEvents.length === 0) && (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-400" />
          <p className="text-slate-300">События будут опубликованы позже</p>
        </div>
      )}

      {(sortedUpcomingEvents.length > 0 || sortedPastEvents.length > 0) && (
        <div className="relative">
          {/* Past Events Toggle Button at Top */}
          {sortedPastEvents.length > 0 && (
            <div className="mb-6 text-center">
              <button
                onClick={() => setShowPastEvents(!showPastEvents)}
                className="inline-flex items-center space-x-2 px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg transition-colors"
              >
                <span>{showPastEvents ? 'Скрыть прошедшие' : 'Показать прошедшие'} ({sortedPastEvents.length})</span>
                {showPastEvents ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          )}

          {/* Vertical Timeline Line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-400/50 via-slate-600/50 to-slate-700/30"></div>
          
          <div className="space-y-6">
            {/* Past Events Section - Collapsed by Default */}
            {showPastEvents && sortedPastEvents.map((event) => {
              const eventDate = new Date(event.eventDate)
              
              return (
                <div key={event.id} className="relative flex items-start space-x-4">
                  {/* Timeline Node */}
                  <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 bg-slate-700 border-slate-600">
                    <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                  </div>
                  
                  {/* Event Content */}
                  <div className="flex-1 min-w-0">
                    {/* Date Header */}
                    <div className="mb-2">
                      <div className="text-sm font-medium text-slate-400">
                        {eventDate.toLocaleDateString('ru-RU', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-xs text-slate-500">
                        {eventDate.toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    
                    {/* Event Item */}
                    <div className="opacity-60">
                      <CalendarEventItem
                        event={event}
                        isUpcoming={false}
                        canDismiss={false}
                        onDismiss={handleDismiss}
                        isPast={true}
                        isCollapsed={false}
                      />
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Upcoming Events Section */}
            {sortedUpcomingEvents.map((event) => {
              const eventDate = new Date(event.eventDate)
              const isToday = eventDate.toDateString() === now.toDateString()
              
              return (
                <div key={event.id} className="relative flex items-start space-x-4">
                  {/* Timeline Node */}
                  <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                    isToday 
                      ? 'bg-amber-400 border-amber-300 animate-pulse' 
                      : 'bg-slate-800 border-amber-400/50'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      isToday 
                        ? 'bg-slate-800' 
                        : 'bg-amber-400'
                    }`}></div>
                  </div>
                  
                  {/* Event Content */}
                  <div className="flex-1 min-w-0">
                    {/* Date Header */}
                    <div className="mb-2">
                      <div className={`text-sm font-medium ${
                        isToday 
                          ? 'text-amber-300' 
                          : 'text-slate-200'
                      }`}>
                        {eventDate.toLocaleDateString('ru-RU', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div className={`text-xs ${
                        isToday 
                          ? 'text-amber-400' 
                          : 'text-slate-400'
                      }`}>
                        {eventDate.toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    
                    {/* Event Item */}
                    <CalendarEventItem
                      event={event}
                      isUpcoming={true}
                      canDismiss={canDismiss}
                      onDismiss={handleDismiss}
                      isPast={false}
                      isCollapsed={false}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}