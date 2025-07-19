'use client'

import { useState, useEffect } from 'react'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
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
  BellOff
} from 'lucide-react'
import { format } from 'date-fns'
import { useSession } from 'next-auth/react'

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

const EVENT_COLORS: Record<string, string> = {
  PARTICIPANT_CREATED: 'bg-blue-100 text-blue-800',
  PROFILE_UPDATED: 'bg-gray-100 text-gray-800',
  MESSAGE_RECEIVED: 'bg-purple-100 text-purple-800',
  TEAM_CREATED: 'bg-green-100 text-green-800',
  TEAM_UPDATED: 'bg-yellow-100 text-yellow-800',
  TEAM_DELETED: 'bg-red-100 text-red-800',
  JOIN_REQUEST_CREATED: 'bg-blue-100 text-blue-800',
  JOIN_REQUEST_APPROVED: 'bg-green-100 text-green-800',
  JOIN_REQUEST_REJECTED: 'bg-red-100 text-red-800',
  JOINED_TEAM: 'bg-green-100 text-green-800',
  LEFT_TEAM: 'bg-orange-100 text-orange-800',
  INVITED_TO_TEAM: 'bg-blue-100 text-blue-800',
  TEAM_STATUS_UPDATED: 'bg-yellow-100 text-yellow-800',
  ADMIN_TEAM_EDIT: 'bg-purple-100 text-purple-800',
  SYSTEM_EVENT: 'bg-gray-100 text-gray-800',
}

export default function SpaceJournalPage() {
  const { data: session } = useSession()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [hasTeam, setHasTeam] = useState(false)

  useEffect(() => {
    if (session?.user?.email) {
      fetchEntries()
      markEntriesAsRead()
      fetchParticipantData()
    }
  }, [session])

  const fetchParticipantData = async () => {
    try {
      const response = await fetch('/api/participant/profile')
      if (response.ok) {
        const data = await response.json()
        setHasTeam(!!(data.participant?.team || data.participant?.ledTeam))
      }
    } catch (error) {
      console.error('Error fetching participant data:', error)
    }
  }

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
      console.error('Error fetching journal entries:', error)
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
      console.error('Error marking entries as read:', error)
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

  // Create user object for layout
  const user = {
    name: session?.user?.name || 'User',
    email: session?.user?.email || '',
    image: session?.user?.image || undefined
  }

  if (loading) {
    return (
      <PersonalCabinetLayout user={user} hasTeam={hasTeam}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
        </div>
      </PersonalCabinetLayout>
    )
  }

  return (
    <PersonalCabinetLayout user={user} hasTeam={hasTeam}>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="h-8 w-8 text-amber-400" />
          <h1 className="text-3xl font-bold text-white">
            Журнал <span className="text-amber-400">активности</span>
          </h1>
        </div>
        <div className="w-24 h-1 bg-amber-400 rounded-full"></div>
      </div>

      {entries.length === 0 ? (
        <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-lg border border-slate-700/30">
          <div className="text-center">
            <BellOff className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Пока нет активности</h3>
            <p className="text-slate-400">
              Здесь будет отображаться ваша активность в хакатоне: участие в командах, сообщения и обновления.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => {
            const IconComponent = EVENT_ICONS[entry.eventType] || AlertCircle
            const colorClasses = EVENT_COLORS[entry.eventType] || 'bg-slate-100 text-slate-800'
            const entityLink = getEntityLink(entry)

            return (
              <div key={entry.id} className={`bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30 transition-all hover:bg-slate-800/70 ${!entry.isRead ? 'border-amber-400/30 bg-amber-400/5' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${colorClasses.includes('bg-') ? 'bg-amber-400/20' : 'bg-amber-400/20'}`}>
                    <IconComponent className="h-6 w-6 text-amber-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-medium text-white">
                        {entry.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        {!entry.isRead && (
                          <span className="bg-amber-400 text-slate-900 text-xs px-2 py-1 rounded font-medium">
                            Новое
                          </span>
                        )}
                        <span className="text-sm text-slate-400">
                          {format(new Date(entry.createdAt), 'dd MMM yyyy, HH:mm')}
                        </span>
                      </div>
                    </div>
                    
                    {entry.description && (
                      <p className="text-slate-300 mb-3">
                        {entry.description}
                      </p>
                    )}
                    
                    {entityLink && (
                      <a
                        href={entityLink}
                        className="inline-flex items-center text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors"
                      >
                        Подробнее →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          
          {hasMore && (
            <div className="text-center pt-6">
              <button 
                onClick={loadMore}
                className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Загрузить еще
              </button>
            </div>
          )}
        </div>
      )}

      {/* Activity Summary */}
      {entries.length > 0 && (
        <div className="mt-12 bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
          <h3 className="text-xl font-semibold text-white mb-6">Сводка активности</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-700/30 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-amber-400 mb-1">{entries.length}</div>
              <div className="text-sm text-slate-400">Всего событий</div>
            </div>
            <div className="bg-slate-700/30 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">
                {entries.filter(e => e.eventType.includes('TEAM')).length}
              </div>
              <div className="text-sm text-slate-400">Командные события</div>
            </div>
            <div className="bg-slate-700/30 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {entries.filter(e => !e.isRead).length}
              </div>
              <div className="text-sm text-slate-400">Непрочитанные</div>
            </div>
          </div>
        </div>
      )}
    </PersonalCabinetLayout>
  )
}