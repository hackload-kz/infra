'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
  BellOff
} from 'lucide-react'
import { format } from 'date-fns'

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

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    fetchEntries()
    markEntriesAsRead()
  }, [])

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
        return `/teams/${entry.entityId}`
      case 'message':
        return `/messages`
      case 'participant':
        return `/profile`
      case 'join_request':
        return `/teams`
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Bell className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">Activity Journal</h1>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BellOff className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
            <p className="text-gray-500 text-center">
              Your activity journal will show updates about your participation, teams, and messages.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => {
            const IconComponent = EVENT_ICONS[entry.eventType] || AlertCircle
            const colorClasses = EVENT_COLORS[entry.eventType] || 'bg-gray-100 text-gray-800'
            const entityLink = getEntityLink(entry)

            return (
              <Card key={entry.id} className={`transition-all hover:shadow-md ${!entry.isRead ? 'border-blue-200 bg-blue-50/30' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full ${colorClasses}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {entry.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          {!entry.isRead && (
                            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                              New
                            </span>
                          )}
                          <span className="text-sm text-gray-500">
                            {format(new Date(entry.createdAt), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                      </div>
                      
                      {entry.description && (
                        <p className="text-gray-600 mb-3">
                          {entry.description}
                        </p>
                      )}
                      
                      {entityLink && (
                        <a
                          href={entityLink}
                          className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View details →
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          
          {hasMore && (
            <div className="text-center pt-6">
              <Button onClick={loadMore} variant="outline">
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}