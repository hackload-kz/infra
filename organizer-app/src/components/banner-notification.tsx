'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, AlertTriangle, Info, AlertCircle, ChevronDown, ChevronUp, Calendar, Clock, Users } from 'lucide-react'
import { Banner, CustomBanner, CalendarEventBanner } from '@/lib/banners'
import { dismissBannerAction, dismissCustomBannerAction } from '@/lib/actions'
import { markdownToHtml } from '@/lib/markdown'

interface BannerNotificationProps {
  banner: Banner
  participantId: string
  hackathonId: string
}

export function BannerNotification({ banner, participantId, hackathonId }: BannerNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isDismissing, setIsDismissing] = useState(false)

  const handleDismiss = async () => {
    setIsDismissing(true)
    try {
      await dismissBannerAction(participantId, hackathonId, banner.type)
      setIsVisible(false)
    } catch (error) {
      console.error('Failed to dismiss banner:', error)
      setIsDismissing(false)
    }
  }

  if (!isVisible) {
    return null
  }

  const getVariantStyles = () => {
    switch (banner.variant) {
      case 'error':
        return {
          container: 'bg-red-900/30 border-red-500/50 text-red-100',
          icon: 'text-red-400',
          button: 'bg-red-600 hover:bg-red-700 text-white',
          IconComponent: AlertCircle
        }
      case 'warning':
        return {
          container: 'bg-amber-900/30 border-amber-500/50 text-amber-100',
          icon: 'text-amber-400',
          button: 'bg-amber-600 hover:bg-amber-700 text-white',
          IconComponent: AlertTriangle
        }
      case 'info':
      default:
        return {
          container: 'bg-blue-900/30 border-blue-500/50 text-blue-100',
          icon: 'text-blue-400',
          button: 'bg-blue-600 hover:bg-blue-700 text-white',
          IconComponent: Info
        }
    }
  }

  const styles = getVariantStyles()
  const { IconComponent } = styles

  return (
    <div className={`relative rounded-lg border p-4 ${styles.container} mb-4`}>
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 ${styles.icon}`}>
          <IconComponent className="h-5 w-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold mb-1">{banner.title}</h3>
          <p className="text-sm opacity-90 mb-3">{banner.message}</p>
          
          <div className="flex items-center space-x-3">
            <Link
              href={banner.actionUrl}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${styles.button}`}
            >
              {banner.actionText}
            </Link>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          disabled={isDismissing}
          className="flex-shrink-0 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          aria-label="Закрыть уведомление"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

interface CalendarEventBannerProps {
  event: CalendarEventBanner
  participantId: string
  hackathonId: string
}

export function CalendarEventBannerComponent({ event, participantId, hackathonId }: CalendarEventBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isDismissing, setIsDismissing] = useState(false)

  const handleDismiss = async () => {
    setIsDismissing(true)
    try {
      // We'll need to create a new action for dismissing calendar events
      const response = await fetch(`/api/calendar/${event.id}/dismiss`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to dismiss event')
      }
      
      setIsVisible(false)
    } catch (error) {
      console.error('Failed to dismiss calendar event:', error)
      setIsDismissing(false)
    }
  }

  if (!isVisible) {
    return null
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatEndDate = (startDate: Date, endDate: Date) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    const isSameDay = start.toDateString() === end.toDateString()
    
    if (isSameDay) {
      return end.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else {
      return formatDate(end)
    }
  }

  const getVariantStyles = () => {
    switch (event.variant) {
      case 'error':
        return {
          container: 'bg-red-900/30 border-red-500/50 text-red-100',
          icon: 'text-red-400',
          button: 'bg-red-600 hover:bg-red-700 text-white',
          IconComponent: AlertCircle
        }
      case 'warning':
        return {
          container: 'bg-amber-900/30 border-amber-500/50 text-amber-100',
          icon: 'text-amber-400',
          button: 'bg-amber-600 hover:bg-amber-700 text-white',
          IconComponent: AlertTriangle
        }
      case 'info':
      default:
        return {
          container: 'bg-blue-900/30 border-blue-500/50 text-blue-100',
          icon: 'text-blue-400',
          button: 'bg-blue-600 hover:bg-blue-700 text-white',
          IconComponent: Info
        }
    }
  }

  const styles = getVariantStyles()
  const { IconComponent } = styles

  return (
    <div className={`relative rounded-lg border p-4 ${styles.container} mb-4`}>
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 ${styles.icon}`}>
          <IconComponent className="h-5 w-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold mb-1">{event.title}</h3>
          
          <div className="flex items-center space-x-4 text-sm opacity-90 mb-2">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(event.eventDate)}</span>
            </div>
            {event.eventEndDate && (
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>до {formatEndDate(event.eventDate, event.eventEndDate)}</span>
              </div>
            )}
            {event.team && (
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{event.team.name}</span>
              </div>
            )}
          </div>
          
          <div 
            className="text-sm opacity-90 mb-3"
            dangerouslySetInnerHTML={{ __html: event.description }}
          />
          
          <div className="flex items-center space-x-3">
            <Link
              href={event.actionUrl}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${styles.button}`}
            >
              {event.actionText}
            </Link>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          disabled={isDismissing}
          className="flex-shrink-0 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          aria-label="Закрыть уведомление"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

interface BannerListProps {
  banners: Banner[]
  participantId: string
  hackathonId: string
}

export function BannerList({ banners, participantId, hackathonId }: BannerListProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (banners.length === 0) {
    return null
  }

  const maxVisibleBanners = 2
  const visibleBanners = isExpanded ? banners : banners.slice(0, maxVisibleBanners)
  const hasMoreBanners = banners.length > maxVisibleBanners

  return (
    <div className="mb-8">
      <div className="space-y-4">
        {visibleBanners.map((banner, index) => (
          <BannerNotification
            key={`${banner.type}-${index}`}
            banner={banner}
            participantId={participantId}
            hackathonId={hackathonId}
          />
        ))}
        
        {hasMoreBanners && (
          <div className="text-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors border border-slate-600/30 hover:border-slate-500/50"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Скрыть дополнительные уведомления
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Показать ещё {banners.length - maxVisibleBanners} уведомлений
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface CustomBannerNotificationProps {
  banner: CustomBanner
  participantId: string
  hackathonId: string
}

export function CustomBannerNotification({ banner, participantId, hackathonId }: CustomBannerNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isDismissing, setIsDismissing] = useState(false)

  const handleDismiss = async () => {
    if (!banner.allowDismiss) return
    
    setIsDismissing(true)
    try {
      await dismissCustomBannerAction(participantId, hackathonId, banner.id)
      setIsVisible(false)
    } catch (error) {
      console.error('Failed to dismiss custom banner:', error)
      setIsDismissing(false)
    }
  }

  if (!isVisible) {
    return null
  }

  const getVariantStyles = () => {
    switch (banner.variant) {
      case 'warning':
        return {
          container: 'bg-amber-900/30 border-amber-500/50 text-amber-100',
          icon: 'text-amber-400',
          IconComponent: AlertTriangle
        }
      case 'info':
      default:
        return {
          container: 'bg-blue-900/30 border-blue-500/50 text-blue-100',
          icon: 'text-blue-400',
          IconComponent: Info
        }
    }
  }

  const styles = getVariantStyles()
  const { IconComponent } = styles

  return (
    <div className={`relative rounded-lg border p-4 ${styles.container} mb-4`}>
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 ${styles.icon}`}>
          <IconComponent className="h-5 w-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold mb-1">{banner.title}</h3>
          <div 
            className="text-sm opacity-90 mb-3"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(banner.description) }}
          />
          
          {banner.actionText && banner.actionUrl && (
            <div className="flex items-center space-x-3">
              <Link
                href={banner.actionUrl}
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  banner.variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {banner.actionText}
              </Link>
            </div>
          )}
        </div>

        {banner.allowDismiss && (
          <button
            onClick={handleDismiss}
            disabled={isDismissing}
            className="flex-shrink-0 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            aria-label="Закрыть уведомление"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}

interface CustomBannerListProps {
  banners: CustomBanner[]
  participantId: string
  hackathonId: string
}

export function CustomBannerList({ banners, participantId, hackathonId }: CustomBannerListProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (banners.length === 0) {
    return null
  }

  const maxVisibleBanners = 2
  const visibleBanners = isExpanded ? banners : banners.slice(0, maxVisibleBanners)
  const hasMoreBanners = banners.length > maxVisibleBanners

  return (
    <div className="mb-8">
      <div className="space-y-4">
        {visibleBanners.map((banner) => (
          <CustomBannerNotification
            key={banner.id}
            banner={banner}
            participantId={participantId}
            hackathonId={hackathonId}
          />
        ))}
        
        {hasMoreBanners && (
          <div className="text-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors border border-slate-600/30 hover:border-slate-500/50"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Скрыть дополнительные баннеры
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Показать ещё {banners.length - maxVisibleBanners} баннеров
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface CombinedBannerListProps {
  customBanners: CustomBanner[]
  systemBanners: Banner[]
  participantId: string
  hackathonId: string
}

export function CombinedBannerList({ customBanners, systemBanners, participantId, hackathonId }: CombinedBannerListProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const totalBanners = customBanners.length + systemBanners.length
  
  if (totalBanners === 0) {
    return null
  }

  const maxVisibleBanners = 2
  const hasMoreBanners = totalBanners > maxVisibleBanners

  // Combine all banners into a single array with type information
  const allBanners = [
    ...customBanners.map(banner => ({ type: 'custom' as const, data: banner })),
    ...systemBanners.map(banner => ({ type: 'system' as const, data: banner }))
  ]

  const visibleBanners = isExpanded ? allBanners : allBanners.slice(0, maxVisibleBanners)

  return (
    <div className="mb-8">
      <div className="space-y-4">
        {visibleBanners.map((banner, index) => (
          banner.type === 'custom' ? (
            <CustomBannerNotification
              key={`custom-${banner.data.id}`}
              banner={banner.data}
              participantId={participantId}
              hackathonId={hackathonId}
            />
          ) : (
            <BannerNotification
              key={`system-${banner.data.type}-${index}`}
              banner={banner.data}
              participantId={participantId}
              hackathonId={hackathonId}
            />
          )
        ))}
        
        {hasMoreBanners && (
          <div className="text-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors border border-slate-600/30 hover:border-slate-500/50"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Скрыть дополнительные уведомления
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Показать ещё {totalBanners - maxVisibleBanners} уведомлений
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}