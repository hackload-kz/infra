'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Clock, ExternalLink, Users } from 'lucide-react'

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
  isDismissed?: boolean
}

interface CalendarBannerProps {
  participantId: string
  hackathonId: string
  className?: string
}

export function CalendarBanner({ participantId, hackathonId, className = "" }: CalendarBannerProps) {
  const [nextEvent, setNextEvent] = useState<CalendarEventWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDismissing, setIsDismissing] = useState(false)

  useEffect(() => {
    fetchNextEvent()
  }, [participantId, hackathonId])

  const fetchNextEvent = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/calendar')
      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }
      
      const events = await response.json()
      const now = new Date()
      
      // Find the next upcoming event that's not dismissed
      const upcomingEvents = events.filter((event: CalendarEventWithRelations) => 
        new Date(event.eventDate) >= now && 
        event.isActive && 
        !event.isDismissed
      )
      
      if (upcomingEvents.length > 0) {
        setNextEvent(upcomingEvents[0])
      } else {
        setNextEvent(null)
      }
    } catch (err) {
      console.error('Error fetching next event:', err)
      setNextEvent(null)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = async () => {
    if (!nextEvent) return
    
    setIsDismissing(true)
    try {
      const response = await fetch(`/api/calendar/${nextEvent.id}/dismiss`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to dismiss event')
      }
      
      setNextEvent(null)
    } catch (err) {
      console.error('Error dismissing event:', err)
    } finally {
      setIsDismissing(false)
    }
  }

  const getEventTypeColor = () => {
    if (!nextEvent) return 'border-blue-500 bg-blue-50'
    
    switch (nextEvent.eventType) {
      case 'DEADLINE':
        return 'border-red-500 bg-red-50'
      case 'WARNING':
        return 'border-yellow-500 bg-yellow-50'
      case 'INFO':
      default:
        return 'border-blue-500 bg-blue-50'
    }
  }

  const getEventTypeIcon = () => {
    if (!nextEvent) return 'ℹ️'
    
    switch (nextEvent.eventType) {
      case 'DEADLINE':
        return '🚨'
      case 'WARNING':
        return '⚠️'
      case 'INFO':
      default:
        return 'ℹ️'
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-20 bg-gray-100 rounded-lg"></div>
      </div>
    )
  }

  if (!nextEvent) {
    return null
  }

  return (
    <div className={`border-l-4 ${getEventTypeColor()} p-4 rounded-lg relative ${className}`}>
      <button
        onClick={handleDismiss}
        disabled={isDismissing}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 disabled:opacity-50"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <span className="text-2xl">{getEventTypeIcon()}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-900">Ближайшее событие</span>
            {nextEvent.team && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center">
                <Users className="h-3 w-3 mr-1" />
                {nextEvent.team.name}
              </span>
            )}
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {nextEvent.title}
          </h3>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{formatDate(nextEvent.eventDate)}</span>
            </div>
            {nextEvent.eventEndDate && (
              <span className="text-gray-500">
                до {new Date(nextEvent.eventEndDate).toLocaleTimeString('ru-RU', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            )}
          </div>
          
          <div 
            className="text-sm text-gray-700 mb-2 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: nextEvent.description }}
          />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {nextEvent.link && (
                <a 
                  href={nextEvent.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm underline flex items-center space-x-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Перейти</span>
                </a>
              )}
            </div>
            
            <a
              href="/space/calendar"
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Все события →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}