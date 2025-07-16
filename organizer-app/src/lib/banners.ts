import { BannerType, CustomBannerType } from '@prisma/client'
import { db } from '@/lib/db'

export interface Banner {
  type: BannerType
  title: string
  message: string
  actionText: string
  actionUrl: string
  variant: 'warning' | 'info' | 'error'
}

export interface CustomBanner {
  id: string
  title: string
  description: string
  type: CustomBannerType
  variant: 'warning' | 'info' | 'error'
  allowDismiss: boolean
  actionText?: string | null
  actionUrl?: string | null
}

export interface CalendarEventBanner {
  id: string
  title: string
  description: string
  eventDate: Date
  eventEndDate: Date | null
  eventType: 'INFO' | 'WARNING' | 'DEADLINE'
  variant: 'warning' | 'info' | 'error'
  allowDismiss: boolean
  actionText: string
  actionUrl: string
  team?: {
    id: string
    name: string
    nickname: string
  } | null
}

export interface ParticipantData {
  id: string
  telegram?: string | null
  githubUrl?: string | null
  team?: {
    id: string
    name: string
    level?: string | null
    members: { id: string }[]
  } | null
  ledTeam?: {
    id: string
    name: string
    level?: string | null
    members: { id: string }[]
  } | null
}

/**
 * Calculate which banners should be shown to a participant
 */
export function calculateBanners(participant: ParticipantData): Banner[] {
  const banners: Banner[] = []

  // Telegram Profile Banner
  if (!participant.telegram) {
    banners.push({
      type: BannerType.TELEGRAM_PROFILE,
      title: 'Заполните профиль Telegram',
      message: 'Укажите свой Telegram для связи с администраторами и участниками хакатона',
      actionText: 'Заполнить профиль',
      actionUrl: '/space/info/edit',
      variant: 'warning'
    })
  }

  // GitHub Profile Banner (mandatory)
  if (!participant.githubUrl) {
    banners.push({
      type: BannerType.GITHUB_PROFILE,
      title: 'Добавьте GitHub профиль',
      message: 'GitHub профиль обязателен для участия. Все решения команд должны храниться в GitHub',
      actionText: 'Добавить GitHub',
      actionUrl: '/space/info/edit',
      variant: 'error'
    })
  }

  // Find Team Banner
  if (!participant.team && !participant.ledTeam) {
    banners.push({
      type: BannerType.FIND_TEAM,
      title: 'Найдите команду',
      message: 'Только участники в составе команд допускаются к хакатону. Максимальный размер команды 4 человека, минимальный 3. Читайте FAQ для получения дополнительной информации.',
      actionText: 'Найти команду',
      actionUrl: '/space/teams',
      variant: 'info'
    })
  }

  // Team Needs Members Banner (for team leaders with < 3 members)
  if (participant.ledTeam && participant.ledTeam.members.length < 3) {
    banners.push({
      type: BannerType.TEAM_NEEDS_MEMBERS,
      title: 'Найдите участников для команды',
      message: 'Вашей команде нужно минимум 3 участника для участия в хакатоне. Читайте FAQ для получения дополнительной информации.',
      actionText: 'Найти участников',
      actionUrl: '/space/participants',
      variant: 'warning'
    })
  }

  // Set Team Level Banner (for team leaders without level set)
  if (participant.ledTeam && !participant.ledTeam.level) {
    banners.push({
      type: BannerType.SET_TEAM_LEVEL,
      title: 'Укажите уровень команды',
      message: 'Установите уровень сложности для вашей команды, чтобы получить доступ к соответствующим заданиям хакатона. Это важно для квалификации на участие.',
      actionText: 'Установить уровень',
      actionUrl: '/space/team',
      variant: 'info'
    })
  }

  return banners
}

/**
 * Get upcoming calendar events as banners
 */
export async function getUpcomingCalendarEvents(
  participantId: string,
  hackathonId: string,
  teamId?: string
): Promise<CalendarEventBanner[]> {
  const now = new Date()
  const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  
  // Get upcoming events for the next 24 hours
  const upcomingEvents = await db.calendarEvent.findMany({
    where: {
      hackathonId,
      isActive: true,
      eventDate: {
        gte: now,
        lte: next24Hours
      },
      OR: [
        { teamId: null }, // Global events
        ...(teamId ? [{ teamId }] : []) // Team-specific events if participant has a team
      ]
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          nickname: true
        }
      }
    },
    orderBy: {
      eventDate: 'asc'
    },
    take: 3 // Show only the next 3 events
  })

  // Get dismissed events
  const dismissedEvents = await db.calendarEventDismissal.findMany({
    where: {
      participantId,
      hackathonId,
      eventId: {
        in: upcomingEvents.map(e => e.id)
      }
    },
    select: {
      eventId: true
    }
  })

  const dismissedEventIds = new Set(dismissedEvents.map(d => d.eventId))

  // Filter out dismissed events and convert to banner format
  return upcomingEvents
    .filter(event => !dismissedEventIds.has(event.id))
    .map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      eventDate: event.eventDate,
      eventEndDate: event.eventEndDate,
      eventType: event.eventType,
      variant: event.eventType === 'DEADLINE' ? 'error' as const : 
               event.eventType === 'WARNING' ? 'warning' as const : 'info' as const,
      allowDismiss: true,
      actionText: 'Открыть календарь',
      actionUrl: '/space/calendar',
      team: event.team
    }))
}

/**
 * Get active custom banners for a participant (excluding dismissed ones)
 */
export async function getActiveCustomBanners(
  participantId: string,
  hackathonId: string
): Promise<CustomBanner[]> {
  const now = new Date()
  
  // Get all active custom banners for this hackathon
  const customBanners = await db.customBanner.findMany({
    where: {
      hackathonId,
      isActive: true,
      displayStart: { lte: now },
      displayEnd: { gte: now }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Get dismissed custom banners
  const dismissedCustomBanners = await db.customBannerDismissal.findMany({
    where: {
      participantId,
      hackathonId
    },
    select: {
      customBannerId: true
    }
  })

  const dismissedCustomIds = new Set(dismissedCustomBanners.map(b => b.customBannerId))
  
  // Filter out dismissed custom banners
  const activeCustomBanners = customBanners.filter(banner => 
    !dismissedCustomIds.has(banner.id)
  )

  return activeCustomBanners.map(banner => ({
    id: banner.id,
    title: banner.title,
    description: banner.description,
    type: banner.type,
    variant: banner.type === CustomBannerType.WARN ? 'warning' : 'info',
    allowDismiss: banner.allowDismiss,
    actionText: banner.actionText,
    actionUrl: banner.actionUrl
  }))
}

/**
 * Get active banners for a participant (excluding dismissed ones)
 */
export async function getActiveBanners(
  participantId: string, 
  hackathonId: string,
  participant: ParticipantData
): Promise<Banner[]> {
  // Get dismissed banners
  const dismissedBanners = await db.dismissedBanner.findMany({
    where: {
      participantId,
      hackathonId
    },
    select: {
      bannerType: true
    }
  })

  const dismissedTypes = new Set(dismissedBanners.map(b => b.bannerType))
  
  // Calculate all possible banners and filter out dismissed ones
  const allBanners = calculateBanners(participant)
  return allBanners.filter(banner => !dismissedTypes.has(banner.type))
}

/**
 * Dismiss a banner for a participant
 */
export async function dismissBanner(
  participantId: string,
  hackathonId: string,
  bannerType: BannerType
): Promise<void> {
  await db.dismissedBanner.upsert({
    where: {
      participantId_bannerType_hackathonId: {
        participantId,
        bannerType,
        hackathonId
      }
    },
    update: {
      dismissedAt: new Date()
    },
    create: {
      participantId,
      hackathonId,
      bannerType
    }
  })
}

/**
 * Dismiss a calendar event for a participant
 */
export async function dismissCalendarEvent(
  participantId: string,
  hackathonId: string,
  eventId: string
): Promise<void> {
  await db.calendarEventDismissal.upsert({
    where: {
      eventId_participantId_hackathonId: {
        eventId,
        participantId,
        hackathonId
      }
    },
    update: {
      dismissedAt: new Date()
    },
    create: {
      participantId,
      hackathonId,
      eventId
    }
  })
}