'use client'

import { useState, useEffect } from 'react'
import { Bell, BellRing } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function JournalNotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUnreadCount()
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/journal/unread-count')
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.count)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Button variant="ghost" size="sm" className="relative" disabled>
        <Bell className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <Link href="/journal">
      <Button variant="ghost" size="sm" className="relative">
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5 text-blue-600" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        
        <span className="sr-only">
          {unreadCount > 0 ? `${unreadCount} unread notifications` : 'No unread notifications'}
        </span>
      </Button>
    </Link>
  )
}