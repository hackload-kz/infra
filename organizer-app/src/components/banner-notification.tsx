'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, AlertTriangle, Info, AlertCircle } from 'lucide-react'
import { Banner } from '@/lib/banners'
import { dismissBannerAction } from '@/lib/actions'

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

interface BannerListProps {
  banners: Banner[]
  participantId: string
  hackathonId: string
}

export function BannerList({ banners, participantId, hackathonId }: BannerListProps) {
  if (banners.length === 0) {
    return null
  }

  return (
    <div className="mb-8">
      <div className="space-y-4">
        {banners.map((banner, index) => (
          <BannerNotification
            key={`${banner.type}-${index}`}
            banner={banner}
            participantId={participantId}
            hackathonId={hackathonId}
          />
        ))}
      </div>
    </div>
  )
}