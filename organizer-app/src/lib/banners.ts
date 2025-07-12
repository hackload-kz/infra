import { BannerType } from '@prisma/client'
import { db } from '@/lib/db'

export interface Banner {
  type: BannerType
  title: string
  message: string
  actionText: string
  actionUrl: string
  variant: 'warning' | 'info' | 'error'
}

export interface ParticipantData {
  id: string
  telegram?: string | null
  githubUrl?: string | null
  team?: {
    id: string
    name: string
    members: { id: string }[]
  } | null
  ledTeam?: {
    id: string
    name: string
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

  return banners
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