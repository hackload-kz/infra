import { BannerType } from '@prisma/client'
import { Banner, ParticipantData } from '@/lib/banners'

// Mock Data Factories for Banner Testing

export const createMockParticipantForBanner = (overrides: Partial<ParticipantData> = {}): ParticipantData => ({
  id: 'participant-1',
  telegram: null,
  githubUrl: null,
  team: null,
  ledTeam: null,
  ...overrides,
})

export const createMockTeam = (memberCount: number = 3, overrides = {}) => ({
  id: 'team-1',
  name: 'Test Team',
  level: null,
  members: Array.from({ length: memberCount }, (_, i) => ({ id: `member-${i + 1}` })),
  ...overrides,
})

export const createMockBanner = (type: BannerType, overrides: Partial<Banner> = {}): Banner => {
  const bannerDefaults: Record<BannerType, Banner> = {
    [BannerType.TELEGRAM_PROFILE]: {
      type: BannerType.TELEGRAM_PROFILE,
      title: 'Заполните профиль Telegram',
      message: 'Укажите свой Telegram для связи с администраторами и участниками хакатона',
      actionText: 'Заполнить профиль',
      actionUrl: '/space/info/edit',
      variant: 'warning'
    },
    [BannerType.GITHUB_PROFILE]: {
      type: BannerType.GITHUB_PROFILE,
      title: 'Добавьте GitHub профиль',
      message: 'GitHub профиль обязателен для участия. Все решения команд должны храниться в GitHub',
      actionText: 'Добавить GitHub',
      actionUrl: '/space/info/edit',
      variant: 'error'
    },
    [BannerType.FIND_TEAM]: {
      type: BannerType.FIND_TEAM,
      title: 'Найдите команду',
      message: 'Только участники в составе команд допускаются к хакатону. Максимальный размер команды 4 человека, минимальный 3. Читайте FAQ для получения дополнительной информации.',
      actionText: 'Найти команду',
      actionUrl: '/space/teams',
      variant: 'info'
    },
    [BannerType.TEAM_NEEDS_MEMBERS]: {
      type: BannerType.TEAM_NEEDS_MEMBERS,
      title: 'Найдите участников для команды',
      message: 'Вашей команде нужно минимум 3 участника для участия в хакатоне. Читайте FAQ для получения дополнительной информации.',
      actionText: 'Найти участников',
      actionUrl: '/space/participants',
      variant: 'warning'
    },
    [BannerType.SET_TEAM_LEVEL]: {
      type: BannerType.SET_TEAM_LEVEL,
      title: 'Укажите уровень команды',
      message: 'Установите уровень сложности для вашей команды, чтобы получить доступ к соответствующим заданиям хакатона. Это важно для квалификации на участие.',
      actionText: 'Установить уровень',
      actionUrl: '/space/team',
      variant: 'info'
    }
  }

  return {
    ...bannerDefaults[type],
    ...overrides,
  }
}

export const createMockDismissedBanner = (participantId: string, hackathonId: string, bannerType: BannerType, overrides = {}) => ({
  id: `dismissed-${bannerType}-${participantId}`,
  participantId,
  hackathonId,
  bannerType,
  dismissedAt: new Date('2024-01-01T10:00:00Z'),
  ...overrides,
})

// Test Scenario Builders

export const createNewParticipantScenario = (): ParticipantData => 
  createMockParticipantForBanner({
    telegram: null,
    githubUrl: null,
    team: null,
    ledTeam: null,
  })

export const createCompleteParticipantScenario = (): ParticipantData => 
  createMockParticipantForBanner({
    telegram: '@username',
    githubUrl: 'https://github.com/username',
    team: createMockTeam(3),
    ledTeam: null,
  })

export const createTeamLeaderWithSmallTeamScenario = (): ParticipantData => 
  createMockParticipantForBanner({
    telegram: '@leader',
    githubUrl: 'https://github.com/leader',
    team: null,
    ledTeam: createMockTeam(2),
  })

export const createTeamLeaderWithAdequateTeamScenario = (): ParticipantData => 
  createMockParticipantForBanner({
    telegram: '@leader',
    githubUrl: 'https://github.com/leader',
    team: null,
    ledTeam: createMockTeam(4),
  })

export const createIncompleteProfileTeamLeaderScenario = (): ParticipantData => 
  createMockParticipantForBanner({
    telegram: null,
    githubUrl: null,
    team: null,
    ledTeam: createMockTeam(2),
  })

export const createTeamLeaderWithoutLevelScenario = (): ParticipantData => 
  createMockParticipantForBanner({
    telegram: '@leader',
    githubUrl: 'https://github.com/leader',
    team: null,
    ledTeam: createMockTeam(3, { level: null }),
  })

export const createTeamLeaderWithLevelScenario = (): ParticipantData => 
  createMockParticipantForBanner({
    telegram: '@leader',
    githubUrl: 'https://github.com/leader',
    team: null,
    ledTeam: createMockTeam(3, { level: 'BEGINNER' }),
  })

// Database Mock Helpers

export const mockDismissedBannersQuery = (dismissedTypes: BannerType[] = []) => {
  return dismissedTypes.map(type => ({ bannerType: type }))
}

export const mockEmptyDismissedBanners = () => []

export const mockAllBannersDismissed = () => [
  { bannerType: BannerType.TELEGRAM_PROFILE },
  { bannerType: BannerType.GITHUB_PROFILE },
  { bannerType: BannerType.FIND_TEAM },
  { bannerType: BannerType.TEAM_NEEDS_MEMBERS },
  { bannerType: BannerType.SET_TEAM_LEVEL },
]

// Test Assertion Helpers

export const expectBannerType = (banners: Banner[], type: BannerType) => {
  return banners.find(b => b.type === type)
}

export const expectBannerNotPresent = (banners: Banner[], type: BannerType) => {
  return !banners.find(b => b.type === type)
}

export const expectBannerCount = (banners: Banner[], expectedCount: number) => {
  return banners.length === expectedCount
}

// Mock Reset Helper

export const resetBannerMocks = () => {
  jest.clearAllMocks()
}