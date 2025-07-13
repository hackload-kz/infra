'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  User, 
  MessageSquare, 
  Users, 
  UserPlus, 
  UserMinus, 
  CheckCircle, 
  XCircle,
  Settings,
  AlertCircle,
  Bell,
  BellOff,
  ArrowLeft,
  X,
  Home
} from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface JournalEntry {
  id: string
  eventType: string
  title: string
  description?: string
  entityId?: string
  entityType?: string
  isRead: boolean
  createdAt: string
}

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  PARTICIPANT_CREATED: User,
  PROFILE_UPDATED: Settings,
  MESSAGE_RECEIVED: MessageSquare,
  TEAM_CREATED: Users,
  TEAM_UPDATED: Settings,
  TEAM_DELETED: XCircle,
  JOIN_REQUEST_CREATED: UserPlus,
  JOIN_REQUEST_APPROVED: CheckCircle,
  JOIN_REQUEST_REJECTED: XCircle,
  JOINED_TEAM: UserPlus,
  LEFT_TEAM: UserMinus,
  INVITED_TO_TEAM: UserPlus,
  TEAM_STATUS_UPDATED: Settings,
  ADMIN_TEAM_EDIT: Settings,
  SYSTEM_EVENT: AlertCircle,
}

const EVENT_COLORS: Record<string, { bg: string; icon: string; badge: string }> = {
  PARTICIPANT_CREATED: { 
    bg: 'bg-slate-800/60 border-blue-500/30 hover:bg-slate-800/80', 
    icon: 'text-blue-400', 
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
  },
  PROFILE_UPDATED: { 
    bg: 'bg-slate-800/60 border-slate-500/30 hover:bg-slate-800/80', 
    icon: 'text-slate-400', 
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30' 
  },
  MESSAGE_RECEIVED: { 
    bg: 'bg-slate-800/60 border-purple-500/30 hover:bg-slate-800/80', 
    icon: 'text-purple-400', 
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' 
  },
  TEAM_CREATED: { 
    bg: 'bg-slate-800/60 border-green-500/30 hover:bg-slate-800/80', 
    icon: 'text-green-400', 
    badge: 'bg-green-500/20 text-green-300 border-green-500/30' 
  },
  TEAM_UPDATED: { 
    bg: 'bg-slate-800/60 border-amber-500/30 hover:bg-slate-800/80', 
    icon: 'text-amber-400', 
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
  },
  TEAM_DELETED: { 
    bg: 'bg-slate-800/60 border-red-500/30 hover:bg-slate-800/80', 
    icon: 'text-red-400', 
    badge: 'bg-red-500/20 text-red-300 border-red-500/30' 
  },
  JOIN_REQUEST_CREATED: { 
    bg: 'bg-slate-800/60 border-blue-500/30 hover:bg-slate-800/80', 
    icon: 'text-blue-400', 
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
  },
  JOIN_REQUEST_APPROVED: { 
    bg: 'bg-slate-800/60 border-green-500/30 hover:bg-slate-800/80', 
    icon: 'text-green-400', 
    badge: 'bg-green-500/20 text-green-300 border-green-500/30' 
  },
  JOIN_REQUEST_REJECTED: { 
    bg: 'bg-slate-800/60 border-red-500/30 hover:bg-slate-800/80', 
    icon: 'text-red-400', 
    badge: 'bg-red-500/20 text-red-300 border-red-500/30' 
  },
  JOINED_TEAM: { 
    bg: 'bg-slate-800/60 border-green-500/30 hover:bg-slate-800/80', 
    icon: 'text-green-400', 
    badge: 'bg-green-500/20 text-green-300 border-green-500/30' 
  },
  LEFT_TEAM: { 
    bg: 'bg-slate-800/60 border-orange-500/30 hover:bg-slate-800/80', 
    icon: 'text-orange-400', 
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30' 
  },
  INVITED_TO_TEAM: { 
    bg: 'bg-slate-800/60 border-cyan-500/30 hover:bg-slate-800/80', 
    icon: 'text-cyan-400', 
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' 
  },
  TEAM_STATUS_UPDATED: { 
    bg: 'bg-slate-800/60 border-indigo-500/30 hover:bg-slate-800/80', 
    icon: 'text-indigo-400', 
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' 
  },
  ADMIN_TEAM_EDIT: { 
    bg: 'bg-slate-800/60 border-violet-500/30 hover:bg-slate-800/80', 
    icon: 'text-violet-400', 
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30' 
  },
  SYSTEM_EVENT: { 
    bg: 'bg-slate-800/60 border-slate-500/30 hover:bg-slate-800/80', 
    icon: 'text-slate-400', 
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30' 
  },
}

export default function JournalPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    fetchEntries()
    markEntriesAsRead()
  }, [])

  // Add keyboard shortcut for closing the page
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        router.back()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [router])

  const fetchEntries = async (pageNum = 1) => {
    try {
      const response = await fetch(`/api/journal?page=${pageNum}&limit=20`)
      if (response.ok) {
        const data = await response.json()
        if (pageNum === 1) {
          setEntries(data.entries)
        } else {
          setEntries(prev => [...prev, ...data.entries])
        }
        setHasMore(data.entries.length === 20)
      }
    } catch (error) {
      console.error('Ошибка при загрузке записей журнала:', error)
    } finally {
      setLoading(false)
    }
  }

  const markEntriesAsRead = async () => {
    try {
      await fetch('/api/journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'mark_read' }),
      })
    } catch (error) {
      console.error('Ошибка при отметке записей как прочитанных:', error)
    }
  }

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchEntries(nextPage)
  }

  const getEntityLink = (entry: JournalEntry) => {
    if (!entry.entityId || !entry.entityType) return null

    switch (entry.entityType) {
      case 'team':
        return `/space/team`
      case 'message':
        return `/space/messages`
      case 'participant':
        return `/space/info`
      case 'join_request':
        return `/space/team`
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 py-8">
      <div className="container mx-auto px-4">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.back()}
              variant="outline"
              size="sm"
              className="bg-slate-800/50 border-slate-600/50 text-slate-200 hover:bg-slate-700/50 hover:text-white hover:border-slate-500/50 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
            <div className="h-6 w-px bg-slate-600/50"></div>
            <Link
              href="/"
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <Home className="h-4 w-4" />
              <span className="text-sm">Главная</span>
            </Link>
          </div>
          
          <Button
            onClick={() => router.push('/')}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200"
            title="Закрыть (Esc)"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Закрыть</span>
          </Button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-full">
              <Bell className="h-8 w-8 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">
              Журнал <span className="text-blue-400">активности</span>
            </h1>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-lg">
              Персональная лента событий и уведомлений
            </p>
            <p className="text-slate-500 text-sm hidden sm:block">
              Нажмите <kbd className="px-1.5 py-0.5 bg-slate-800/50 border border-slate-600/50 rounded text-xs">Esc</kbd> для закрытия
            </p>
          </div>
        </div>

        {entries.length === 0 ? (
          /* Empty State */
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg shadow-xl">
            <div className="flex flex-col items-center justify-center py-16 px-8">
              <div className="p-4 bg-slate-700/50 rounded-full mb-6">
                <BellOff className="h-12 w-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Пока нет активности
              </h3>
              <p className="text-slate-400 text-center max-w-md leading-relaxed">
                Здесь будут отображаться обновления о вашем участии в хакатоне, 
                действия с командами и полученные сообщения.
              </p>
            </div>
          </div>
        ) : (
          /* Journal Entries */
          <div className="space-y-4">
            {entries.map((entry) => {
              const IconComponent = EVENT_ICONS[entry.eventType] || AlertCircle
              const eventStyle = EVENT_COLORS[entry.eventType] || EVENT_COLORS.SYSTEM_EVENT
              const entityLink = getEntityLink(entry)

              return (
                <div 
                  key={entry.id} 
                  className={`
                    ${eventStyle.bg} 
                    backdrop-blur-sm border rounded-lg shadow-lg 
                    transition-all duration-200 
                    ${!entry.isRead ? 'ring-2 ring-blue-500/30 shadow-blue-500/10' : ''}
                  `}
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <div className="p-3 bg-slate-900/50 rounded-full border border-slate-600/50">
                          <IconComponent className={`h-6 w-6 ${eventStyle.icon}`} />
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-semibold text-white leading-tight">
                            {entry.title}
                          </h3>
                          <div className="flex items-center gap-3 ml-4">
                            {!entry.isRead && (
                              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap">
                                Новое
                              </span>
                            )}
                            <span className="text-sm text-slate-400 whitespace-nowrap">
                              {format(new Date(entry.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}
                            </span>
                          </div>
                        </div>
                        
                        {entry.description && (
                          <p className="text-slate-300 mb-4 leading-relaxed">
                            {entry.description}
                          </p>
                        )}
                        
                        {entityLink && (
                          <a
                            href={entityLink}
                            className="inline-flex items-center text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors group"
                          >
                            Подробнее 
                            <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* Load More Button */}
            {hasMore && (
              <div className="text-center pt-8">
                <Button 
                  onClick={loadMore} 
                  variant="outline"
                  className="bg-slate-800/50 border-slate-600/50 text-slate-200 hover:bg-slate-700/50 hover:text-white hover:border-slate-500/50 transition-all duration-200"
                >
                  Загрузить еще
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Footer Stats */}
        {entries.length > 0 && (
          <div className="mt-12 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Статистика активности</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-600/30 text-center">
                <div className="text-2xl font-bold text-blue-400 mb-1">{entries.length}</div>
                <div className="text-sm text-slate-400">Всего событий</div>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-600/30 text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">
                  {entries.filter(e => e.eventType.includes('TEAM')).length}
                </div>
                <div className="text-sm text-slate-400">Командные события</div>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-600/30 text-center">
                <div className="text-2xl font-bold text-amber-400 mb-1">
                  {entries.filter(e => !e.isRead).length}
                </div>
                <div className="text-sm text-slate-400">Непрочитанные</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}