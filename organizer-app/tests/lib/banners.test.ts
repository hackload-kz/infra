import { calculateBanners, getActiveBanners, dismissBanner } from '@/lib/banners'
import { BannerType } from '@prisma/client'
import { db } from '@/lib/db'
import {
  createMockParticipantForBanner,
  createMockTeam,
  expectBannerType,
  expectBannerNotPresent,
} from '../utils/banner-test-helpers'

// Mock the database following CLAUDE.md standard pattern
jest.mock('@/lib/db', () => ({
  db: {
    dismissedBanner: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}))

// Get typed mock instance  
const mockDbDismissedBanner = {
  findMany: db.dismissedBanner.findMany as jest.MockedFunction<typeof db.dismissedBanner.findMany>,
  upsert: db.dismissedBanner.upsert as jest.MockedFunction<typeof db.dismissedBanner.upsert>,
}


describe('Banner Calculation Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('calculateBanners', () => {
    describe('Telegram Profile Banner', () => {
      it('should show telegram banner for empty profile', () => {
        const participant = createMockParticipantForBanner({
          telegram: null,
          githubUrl: 'https://github.com/user',
          team: createMockTeam(3),
          ledTeam: null,
        })

        const banners = calculateBanners(participant)
        const telegramBanner = expectBannerType(banners, BannerType.TELEGRAM_PROFILE)

        expect(telegramBanner).toBeDefined()
        expect(telegramBanner?.title).toBe('Заполните профиль Telegram')
        expect(telegramBanner?.message).toBe('Укажите свой Telegram для связи с администраторами и участниками хакатона')
        expect(telegramBanner?.variant).toBe('warning')
        expect(telegramBanner?.actionUrl).toBe('/space/info/edit')
      })

      it('should hide telegram banner for filled profile', () => {
        const participant = createMockParticipantForBanner({
          telegram: '@username',
          githubUrl: null,
          team: null,
          ledTeam: null,
        })

        const banners = calculateBanners(participant)
        
        expect(expectBannerNotPresent(banners, BannerType.TELEGRAM_PROFILE)).toBe(true)
      })

      it('should show telegram banner for empty string', () => {
        const participant = createMockParticipantForBanner({
          telegram: '',
          githubUrl: 'https://github.com/user',
          team: null,
          ledTeam: null,
        })

        const banners = calculateBanners(participant)
        
        expect(expectBannerType(banners, BannerType.TELEGRAM_PROFILE)).toBeDefined()
      })
    })

    describe('GitHub Profile Banner', () => {
      it('should show github banner for empty profile', () => {
        const participant = createMockParticipantForBanner({
          telegram: '@username',
          githubUrl: null,
          team: createMockTeam(3),
          ledTeam: null,
        })

        const banners = calculateBanners(participant)
        const githubBanner = expectBannerType(banners, BannerType.GITHUB_PROFILE)

        expect(githubBanner).toBeDefined()
        expect(githubBanner?.title).toBe('Добавьте GitHub профиль')
        expect(githubBanner?.message).toBe('GitHub профиль обязателен для участия. Все решения команд должны храниться в GitHub')
        expect(githubBanner?.variant).toBe('error')
        expect(githubBanner?.actionUrl).toBe('/space/info/edit')
      })

      it('should hide github banner for filled profile', () => {
        const participant = createMockParticipantForBanner({
          telegram: null,
          githubUrl: 'https://github.com/username',
          team: null,
          ledTeam: null,
        })

        const banners = calculateBanners(participant)
        
        expect(expectBannerNotPresent(banners, BannerType.GITHUB_PROFILE)).toBe(true)
      })

      it('should show github banner for empty string', () => {
        const participant = createMockParticipantForBanner({
          telegram: '@username',
          githubUrl: '',
          team: null,
          ledTeam: null,
        })

        const banners = calculateBanners(participant)
        
        expect(expectBannerType(banners, BannerType.GITHUB_PROFILE)).toBeDefined()
      })
    })

    describe('Find Team Banner', () => {
      it('should show find team banner for teamless participant', () => {
        const participant = createMockParticipantForBanner({
          telegram: '@username',
          githubUrl: 'https://github.com/user',
          team: null,
          ledTeam: null,
        })

        const banners = calculateBanners(participant)
        const findTeamBanner = expectBannerType(banners, BannerType.FIND_TEAM)

        expect(findTeamBanner).toBeDefined()
        expect(findTeamBanner?.title).toBe('Найдите команду')
        expect(findTeamBanner?.message).toBe('Только участники в составе команд допускаются к хакатону. Максимальный размер команды 4 человека, минимальный 3. Читайте FAQ для получения дополнительной информации.')
        expect(findTeamBanner?.variant).toBe('info')
        expect(findTeamBanner?.actionUrl).toBe('/space/teams')
      })

      it('should hide find team banner for team member', () => {
        const participant = createMockParticipantForBanner({
          telegram: null,
          githubUrl: null,
          team: createMockTeam(3),
          ledTeam: null,
        })

        const banners = calculateBanners(participant)
        
        expect(expectBannerNotPresent(banners, BannerType.FIND_TEAM)).toBe(true)
      })

      it('should hide find team banner for team leader', () => {
        const participant = createMockParticipantForBanner({
          telegram: null,
          githubUrl: null,
          team: null,
          ledTeam: createMockTeam(3),
        })

        const banners = calculateBanners(participant)
        
        expect(expectBannerNotPresent(banners, BannerType.FIND_TEAM)).toBe(true)
      })
    })

    describe('Team Needs Members Banner', () => {
      it('should show team needs members banner for understaffed team', () => {
        const participant = createMockParticipantForBanner({
          telegram: '@username',
          githubUrl: 'https://github.com/user',
          team: null,
          ledTeam: createMockTeam(2),
        })

        const banners = calculateBanners(participant)
        const teamBanner = expectBannerType(banners, BannerType.TEAM_NEEDS_MEMBERS)

        expect(teamBanner).toBeDefined()
        expect(teamBanner?.title).toBe('Найдите участников для команды')
        expect(teamBanner?.message).toBe('Вашей команде нужно минимум 3 участника для участия в хакатоне. Читайте FAQ для получения дополнительной информации.')
        expect(teamBanner?.variant).toBe('warning')
        expect(teamBanner?.actionUrl).toBe('/space/participants')
      })

      it('should hide team needs members banner for adequate team', () => {
        const participant = createMockParticipantForBanner({
          telegram: null,
          githubUrl: null,
          team: null,
          ledTeam: createMockTeam(3),
        })

        const banners = calculateBanners(participant)
        
        expect(expectBannerNotPresent(banners, BannerType.TEAM_NEEDS_MEMBERS)).toBe(true)
      })

      it('should hide team needs members banner for non-leader', () => {
        const participant = createMockParticipantForBanner({
          telegram: null,
          githubUrl: null,
          team: createMockTeam(2),
          ledTeam: null,
        })

        const banners = calculateBanners(participant)
        
        expect(expectBannerNotPresent(banners, BannerType.TEAM_NEEDS_MEMBERS)).toBe(true)
      })

      it('should handle team with 4 members (max team size)', () => {
        const participant = createMockParticipantForBanner({
          telegram: '@username',
          githubUrl: 'https://github.com/user',
          team: null,
          ledTeam: createMockTeam(4),
        })

        const banners = calculateBanners(participant)
        
        expect(expectBannerNotPresent(banners, BannerType.TEAM_NEEDS_MEMBERS)).toBe(true)
      })
    })

    describe('Multiple Banner Scenarios', () => {
      it('should show all banners for new participant', () => {
        const participant = createMockParticipantForBanner({
          telegram: null,
          githubUrl: null,
          team: null,
          ledTeam: null,
        })

        const banners = calculateBanners(participant)

        expect(banners).toHaveLength(3)
        expect(expectBannerType(banners, BannerType.TELEGRAM_PROFILE)).toBeDefined()
        expect(expectBannerType(banners, BannerType.GITHUB_PROFILE)).toBeDefined()
        expect(expectBannerType(banners, BannerType.FIND_TEAM)).toBeDefined()
      })

      it('should show profile and team banners for team leader with incomplete profile', () => {
        const participant = createMockParticipantForBanner({
          telegram: null,
          githubUrl: null,
          team: null,
          ledTeam: createMockTeam(2),
        })

        const banners = calculateBanners(participant)

        expect(banners).toHaveLength(3)
        expect(expectBannerType(banners, BannerType.TELEGRAM_PROFILE)).toBeDefined()
        expect(expectBannerType(banners, BannerType.GITHUB_PROFILE)).toBeDefined()
        expect(expectBannerType(banners, BannerType.TEAM_NEEDS_MEMBERS)).toBeDefined()
      })

      it('should show no banners for complete profile team member', () => {
        const participant = createMockParticipantForBanner({
          telegram: '@username',
          githubUrl: 'https://github.com/user',
          team: createMockTeam(3),
          ledTeam: null,
        })

        const banners = calculateBanners(participant)

        expect(banners).toHaveLength(0)
      })
    })

    describe('Edge Cases', () => {
      it('should handle null team data gracefully', () => {
        const participant = createMockParticipantForBanner({
          telegram: '@username',
          githubUrl: 'https://github.com/user',
          team: null,
          ledTeam: null,
        })

        expect(() => calculateBanners(participant)).not.toThrow()
        const banners = calculateBanners(participant)
        expect(Array.isArray(banners)).toBe(true)
      })

      it('should handle empty members array', () => {
        const participant = createMockParticipantForBanner({
          telegram: '@username',
          githubUrl: 'https://github.com/user',
          team: null,
          ledTeam: createMockTeam(0),
        })

        const banners = calculateBanners(participant)
        const teamBanner = expectBannerType(banners, BannerType.TEAM_NEEDS_MEMBERS)

        expect(teamBanner).toBeDefined()
      })

      it('should handle team with single member', () => {
        const participant = createMockParticipantForBanner({
          telegram: '@username',
          githubUrl: 'https://github.com/user',
          team: null,
          ledTeam: createMockTeam(1),
        })

        const banners = calculateBanners(participant)
        const teamBanner = expectBannerType(banners, BannerType.TEAM_NEEDS_MEMBERS)

        expect(teamBanner).toBeDefined()
      })
    })
  })

  describe('getActiveBanners', () => {
    beforeEach(() => {
      mockDbDismissedBanner.findMany.mockClear()
    })

    it('should return all banners when none are dismissed', async () => {
      mockDbDismissedBanner.findMany.mockResolvedValue([])

      const participant = createMockParticipantForBanner({
        telegram: null,
        githubUrl: null,
        team: null,
        ledTeam: null,
      })

      const banners = await getActiveBanners('participant-1', 'hackathon-1', participant)

      expect(banners).toHaveLength(3)
      expect(mockDbDismissedBanner.findMany).toHaveBeenCalledWith({
        where: {
          participantId: 'participant-1',
          hackathonId: 'hackathon-1'
        },
        select: {
          bannerType: true
        }
      })
    })

    it('should filter out dismissed banners', async () => {
      mockDbDismissedBanner.findMany.mockResolvedValue([
        { 
          id: 'dismissed-1',
          bannerType: BannerType.TELEGRAM_PROFILE,
          participantId: 'participant-1',
          hackathonId: 'hackathon-1',
          dismissedAt: new Date()
        }
      ])

      const participant = createMockParticipantForBanner({
        telegram: null,
        githubUrl: null,
        team: null,
        ledTeam: null,
      })

      const banners = await getActiveBanners('participant-1', 'hackathon-1', participant)

      expect(banners).toHaveLength(2)
      expect(expectBannerNotPresent(banners, BannerType.TELEGRAM_PROFILE)).toBe(true)
      expect(expectBannerType(banners, BannerType.GITHUB_PROFILE)).toBeDefined()
      expect(expectBannerType(banners, BannerType.FIND_TEAM)).toBeDefined()
    })

    it('should return empty array when all banners are dismissed', async () => {
      mockDbDismissedBanner.findMany.mockResolvedValue([
        { 
          id: 'dismissed-1',
          bannerType: BannerType.TELEGRAM_PROFILE,
          participantId: 'participant-1',
          hackathonId: 'hackathon-1',
          dismissedAt: new Date()
        },
        { 
          id: 'dismissed-2',
          bannerType: BannerType.GITHUB_PROFILE,
          participantId: 'participant-1',
          hackathonId: 'hackathon-1',
          dismissedAt: new Date()
        },
        { 
          id: 'dismissed-3',
          bannerType: BannerType.FIND_TEAM,
          participantId: 'participant-1',
          hackathonId: 'hackathon-1',
          dismissedAt: new Date()
        }
      ])

      const participant = createMockParticipantForBanner({
        telegram: null,
        githubUrl: null,
        team: null,
        ledTeam: null,
      })

      const banners = await getActiveBanners('participant-1', 'hackathon-1', participant)

      expect(banners).toHaveLength(0)
    })

    it('should handle database errors gracefully', async () => {
      mockDbDismissedBanner.findMany.mockRejectedValue(new Error('Database error'))

      const participant = createMockParticipantForBanner({
        telegram: null,
        githubUrl: null,
        team: null,
        ledTeam: null,
      })

      await expect(getActiveBanners('participant-1', 'hackathon-1', participant)).rejects.toThrow('Database error')
    })
  })

  describe('dismissBanner', () => {
    beforeEach(() => {
      mockDbDismissedBanner.upsert.mockClear()
    })

    it('should successfully dismiss a banner', async () => {
      mockDbDismissedBanner.upsert.mockResolvedValue({
        id: 'dismissed-1',
        participantId: 'participant-1',
        hackathonId: 'hackathon-1',
        bannerType: BannerType.TELEGRAM_PROFILE,
        dismissedAt: new Date()
      })

      await dismissBanner('participant-1', 'hackathon-1', BannerType.TELEGRAM_PROFILE)

      expect(mockDbDismissedBanner.upsert).toHaveBeenCalledWith({
        where: {
          participantId_bannerType_hackathonId: {
            participantId: 'participant-1',
            bannerType: BannerType.TELEGRAM_PROFILE,
            hackathonId: 'hackathon-1'
          }
        },
        update: {
          dismissedAt: expect.any(Date)
        },
        create: {
          participantId: 'participant-1',
          hackathonId: 'hackathon-1',
          bannerType: BannerType.TELEGRAM_PROFILE
        }
      })
    })

    it('should handle already dismissed banner (idempotent)', async () => {
      mockDbDismissedBanner.upsert.mockResolvedValue({
        id: 'dismissed-1',
        participantId: 'participant-1',
        hackathonId: 'hackathon-1',
        bannerType: BannerType.TELEGRAM_PROFILE,
        dismissedAt: new Date()
      })

      // Should not throw error when banner is already dismissed
      await expect(dismissBanner('participant-1', 'hackathon-1', BannerType.TELEGRAM_PROFILE)).resolves.not.toThrow()
    })

    it('should handle database errors', async () => {
      mockDbDismissedBanner.upsert.mockRejectedValue(new Error('Database error'))

      await expect(dismissBanner('participant-1', 'hackathon-1', BannerType.TELEGRAM_PROFILE)).rejects.toThrow('Database error')
    })
  })
})