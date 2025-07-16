'use client'

import { useState } from 'react'
import { Calendar, Clock, Users, ExternalLink, X, ChevronDown, ChevronUp } from 'lucide-react'
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

interface CalendarEventItemProps {
  event: CalendarEvent & {
    team?: {
      id: string
      name: string
      nickname: string
    } | null
    isDismissed?: boolean
  }
  isUpcoming: boolean
  canDismiss?: boolean
  onDismiss?: (eventId: string) => void
  isPast?: boolean
  isCollapsed?: boolean
}

export function CalendarEventItem({ 
  event, 
  isUpcoming, 
  canDismiss = true,
  onDismiss,
  isPast = false,
  isCollapsed = false 
}: CalendarEventItemProps) {
  const [isDismissing, setIsDismissing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(!isCollapsed)

  const handleDismiss = async () => {
    if (!onDismiss) return
    setIsDismissing(true)
    try {
      await onDismiss(event.id)
    } finally {
      setIsDismissing(false)
    }
  }

  const getEventTypeColor = () => {
    switch (event.eventType) {
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
    switch (event.eventType) {
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isPast && isCollapsed && !isExpanded) {
    return (
      <div className="border-l-4 border-gray-300 bg-gray-50 p-4 rounded-lg opacity-70">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {formatDate(event.eventDate)}
            </span>
            <span className="text-sm font-medium text-gray-700">{event.title}</span>
            {event.team && (
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                {event.team.name}
              </span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className={`border-l-4 ${getEventTypeColor()} p-4 rounded-lg relative ${isPast ? 'opacity-70' : ''}`}>
      {canDismiss && !event.isDismissed && isUpcoming && (
        <button
          onClick={handleDismiss}
          disabled={isDismissing}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      
      {isPast && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      )}

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">{getEventTypeIcon()}</span>
            <h3 className="font-semibold text-gray-900">{event.title}</h3>
            {event.team && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center">
                <Users className="h-3 w-3 mr-1" />
                {event.team.name}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(event.eventDate)}</span>
            </div>
            {event.eventEndDate && (
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>до {formatTime(event.eventEndDate)}</span>
              </div>
            )}
          </div>

          <div 
            className="prose prose-sm max-w-none text-gray-700 mb-3"
            dangerouslySetInnerHTML={{ __html: event.description }}
          />

          {event.link && (
            <div className="flex items-center space-x-2">
              <ExternalLink className="h-4 w-4 text-blue-600" />
              <a 
                href={event.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Перейти по ссылке
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}