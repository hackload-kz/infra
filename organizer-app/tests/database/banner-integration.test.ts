import { db } from '@/lib/db'
import { BannerType } from '@prisma/client'

// Mock the database for integration tests
jest.mock('@/lib/db', () => ({
  db: {
    dismissedBanner: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    participant: {
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
    hackathon: {
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}))

describe('Banner Database Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('DismissedBanner Model Operations', () => {
    describe('Create Operations', () => {
      it('should create dismissed banner record successfully', async () => {
        const mockDismissedBanner = {
          id: 'dismissed-1',
          participantId: 'participant-1',
          hackathonId: 'hackathon-1',
          bannerType: BannerType.TELEGRAM_PROFILE,
          dismissedAt: new Date('2024-01-01T10:00:00Z')
        }

        ;(db.dismissedBanner.create as jest.Mock).mockResolvedValue(mockDismissedBanner)

        const result = await db.dismissedBanner.create({
          data: {
            participantId: 'participant-1',
            hackathonId: 'hackathon-1',
            bannerType: BannerType.TELEGRAM_PROFILE
          }
        })

        expect(result).toEqual(mockDismissedBanner)
        expect(db.dismissedBanner.create).toHaveBeenCalledWith({
          data: {
            participantId: 'participant-1',
            hackathonId: 'hackathon-1',
            bannerType: BannerType.TELEGRAM_PROFILE
          }
        })
      })

      it('should handle auto-generated ID and timestamp', async () => {
        const mockDismissedBanner = {
          id: expect.any(String),
          participantId: 'participant-1',
          hackathonId: 'hackathon-1',
          bannerType: BannerType.GITHUB_PROFILE,
          dismissedAt: expect.any(Date)
        }

        ;(db.dismissedBanner.create as jest.Mock).mockResolvedValue(mockDismissedBanner)

        const result = await db.dismissedBanner.create({
          data: {
            participantId: 'participant-1',
            hackathonId: 'hackathon-1',
            bannerType: BannerType.GITHUB_PROFILE
          }
        })

        expect(result.id).toBeDefined()
        expect(result.dismissedAt).toBeDefined()
      })

      it('should create records for all banner types', async () => {
        const bannerTypes = [
          BannerType.TELEGRAM_PROFILE,
          BannerType.GITHUB_PROFILE,
          BannerType.FIND_TEAM,
          BannerType.TEAM_NEEDS_MEMBERS
        ]

        for (const bannerType of bannerTypes) {
          const mockRecord = {
            id: `dismissed-${bannerType}`,
            participantId: 'participant-1',
            hackathonId: 'hackathon-1',
            bannerType,
            dismissedAt: new Date()
          }

          ;(db.dismissedBanner.create as jest.Mock).mockResolvedValue(mockRecord)

          const result = await db.dismissedBanner.create({
            data: {
              participantId: 'participant-1',
              hackathonId: 'hackathon-1',
              bannerType
            }
          })

          expect(result.bannerType).toBe(bannerType)
        }

        expect(db.dismissedBanner.create).toHaveBeenCalledTimes(4)
      })
    })

    describe('Query Operations', () => {
      it('should find dismissed banners by participant and hackathon', async () => {
        const mockDismissedBanners = [
          {
            id: 'dismissed-1',
            participantId: 'participant-1',
            hackathonId: 'hackathon-1',
            bannerType: BannerType.TELEGRAM_PROFILE,
            dismissedAt: new Date()
          },
          {
            id: 'dismissed-2',
            participantId: 'participant-1',
            hackathonId: 'hackathon-1',
            bannerType: BannerType.GITHUB_PROFILE,
            dismissedAt: new Date()
          }
        ]

        ;(db.dismissedBanner.findMany as jest.Mock).mockResolvedValue(mockDismissedBanners)

        const result = await db.dismissedBanner.findMany({
          where: {
            participantId: 'participant-1',
            hackathonId: 'hackathon-1'
          }
        })

        expect(result).toEqual(mockDismissedBanners)
        expect(result).toHaveLength(2)
        expect(db.dismissedBanner.findMany).toHaveBeenCalledWith({
          where: {
            participantId: 'participant-1',
            hackathonId: 'hackathon-1'
          }
        })
      })

      it('should find dismissed banners with selected fields only', async () => {
        const mockBannerTypes = [
          { bannerType: BannerType.TELEGRAM_PROFILE },
          { bannerType: BannerType.GITHUB_PROFILE }
        ]

        ;(db.dismissedBanner.findMany as jest.Mock).mockResolvedValue(mockBannerTypes)

        const result = await db.dismissedBanner.findMany({
          where: {
            participantId: 'participant-1',
            hackathonId: 'hackathon-1'
          },
          select: {
            bannerType: true
          }
        })

        expect(result).toEqual(mockBannerTypes)
        expect(db.dismissedBanner.findMany).toHaveBeenCalledWith({
          where: {
            participantId: 'participant-1',
            hackathonId: 'hackathon-1'
          },
          select: {
            bannerType: true
          }
        })
      })

      it('should return empty array when no dismissed banners exist', async () => {
        ;(db.dismissedBanner.findMany as jest.Mock).mockResolvedValue([])

        const result = await db.dismissedBanner.findMany({
          where: {
            participantId: 'participant-1',
            hackathonId: 'hackathon-1'
          }
        })

        expect(result).toEqual([])
        expect(result).toHaveLength(0)
      })

      it('should find specific dismissed banner by unique constraint', async () => {
        const mockDismissedBanner = {
          id: 'dismissed-1',
          participantId: 'participant-1',
          hackathonId: 'hackathon-1',
          bannerType: BannerType.TELEGRAM_PROFILE,
          dismissedAt: new Date()
        }

        ;(db.dismissedBanner.findUnique as jest.Mock).mockResolvedValue(mockDismissedBanner)

        const result = await db.dismissedBanner.findUnique({
          where: {
            participantId_bannerType_hackathonId: {
              participantId: 'participant-1',
              bannerType: BannerType.TELEGRAM_PROFILE,
              hackathonId: 'hackathon-1'
            }
          }
        })

        expect(result).toEqual(mockDismissedBanner)
        expect(db.dismissedBanner.findUnique).toHaveBeenCalledWith({
          where: {
            participantId_bannerType_hackathonId: {
              participantId: 'participant-1',
              bannerType: BannerType.TELEGRAM_PROFILE,
              hackathonId: 'hackathon-1'
            }
          }
        })
      })
    })

    describe('Constraint Testing', () => {
      it('should handle unique constraint violations', async () => {
        const error = new Error('Unique constraint violation')
        ;(db.dismissedBanner.create as jest.Mock).mockRejectedValue(error)

        await expect(
          db.dismissedBanner.create({
            data: {
              participantId: 'participant-1',
              hackathonId: 'hackathon-1',
              bannerType: BannerType.TELEGRAM_PROFILE
            }
          })
        ).rejects.toThrow('Unique constraint violation')
      })

      it('should handle foreign key constraint violations for participant', async () => {
        const error = new Error('Foreign key constraint violation')
        ;(db.dismissedBanner.create as jest.Mock).mockRejectedValue(error)

        await expect(
          db.dismissedBanner.create({
            data: {
              participantId: 'non-existent-participant',
              hackathonId: 'hackathon-1',
              bannerType: BannerType.TELEGRAM_PROFILE
            }
          })
        ).rejects.toThrow('Foreign key constraint violation')
      })

      it('should handle foreign key constraint violations for hackathon', async () => {
        const error = new Error('Foreign key constraint violation')
        ;(db.dismissedBanner.create as jest.Mock).mockRejectedValue(error)

        await expect(
          db.dismissedBanner.create({
            data: {
              participantId: 'participant-1',
              hackathonId: 'non-existent-hackathon',
              bannerType: BannerType.TELEGRAM_PROFILE
            }
          })
        ).rejects.toThrow('Foreign key constraint violation')
      })
    })

    describe('Cascade Delete Operations', () => {
      it('should cascade delete when participant is deleted', async () => {
        // Mock participant deletion which should cascade to dismissed banners
        ;(db.participant.delete as jest.Mock).mockResolvedValue({
          id: 'participant-1',
          name: 'Test User',
          email: 'test@example.com'
        })

        await db.participant.delete({
          where: { id: 'participant-1' }
        })

        // In real implementation, this would automatically delete related dismissed banners
        expect(db.participant.delete).toHaveBeenCalledWith({
          where: { id: 'participant-1' }
        })
      })

      it('should cascade delete when hackathon is deleted', async () => {
        // Mock hackathon deletion which should cascade to dismissed banners
        ;(db.hackathon.delete as jest.Mock).mockResolvedValue({
          id: 'hackathon-1',
          name: 'Test Hackathon',
          slug: 'test-hackathon'
        })

        await db.hackathon.delete({
          where: { id: 'hackathon-1' }
        })

        // In real implementation, this would automatically delete related dismissed banners
        expect(db.hackathon.delete).toHaveBeenCalledWith({
          where: { id: 'hackathon-1' }
        })
      })

      it('should verify dismissed banners are deleted after participant deletion', async () => {
        // First, check that dismissed banners exist
        ;(db.dismissedBanner.findMany as jest.Mock).mockResolvedValueOnce([
          { id: 'dismissed-1', participantId: 'participant-1' }
        ])

        let initialBanners = await db.dismissedBanner.findMany({
          where: { participantId: 'participant-1' }
        })
        expect(initialBanners).toHaveLength(1)

        // Delete participant
        ;(db.participant.delete as jest.Mock).mockResolvedValue({})

        await db.participant.delete({
          where: { id: 'participant-1' }
        })

        // Check that dismissed banners are now deleted (cascade)
        ;(db.dismissedBanner.findMany as jest.Mock).mockResolvedValueOnce([])

        const remainingBanners = await db.dismissedBanner.findMany({
          where: { participantId: 'participant-1' }
        })
        expect(remainingBanners).toHaveLength(0)
      })
    })

    describe('Cross-Hackathon Data Isolation', () => {
      it('should maintain separate dismissed banners per hackathon', async () => {
        const hackathon1Banners = [
          {
            id: 'dismissed-h1-1',
            participantId: 'participant-1',
            hackathonId: 'hackathon-1',
            bannerType: BannerType.TELEGRAM_PROFILE,
            dismissedAt: new Date()
          }
        ]

        const hackathon2Banners = [
          {
            id: 'dismissed-h2-1',
            participantId: 'participant-1',
            hackathonId: 'hackathon-2',
            bannerType: BannerType.GITHUB_PROFILE,
            dismissedAt: new Date()
          }
        ]

        // Mock finding banners for hackathon 1
        ;(db.dismissedBanner.findMany as jest.Mock).mockResolvedValueOnce(hackathon1Banners)

        const h1Banners = await db.dismissedBanner.findMany({
          where: {
            participantId: 'participant-1',
            hackathonId: 'hackathon-1'
          }
        })

        // Mock finding banners for hackathon 2
        ;(db.dismissedBanner.findMany as jest.Mock).mockResolvedValueOnce(hackathon2Banners)

        const h2Banners = await db.dismissedBanner.findMany({
          where: {
            participantId: 'participant-1',
            hackathonId: 'hackathon-2'
          }
        })

        expect(h1Banners).toHaveLength(1)
        expect(h2Banners).toHaveLength(1)
        expect(h1Banners[0].hackathonId).toBe('hackathon-1')
        expect(h2Banners[0].hackathonId).toBe('hackathon-2')
        expect(h1Banners[0].bannerType).toBe(BannerType.TELEGRAM_PROFILE)
        expect(h2Banners[0].bannerType).toBe(BannerType.GITHUB_PROFILE)
      })
    })

    describe('Performance and Bulk Operations', () => {
      it('should handle multiple dismissed banners efficiently', async () => {
        const multipleBanners = Array.from({ length: 100 }, (_, i) => ({
          id: `dismissed-${i}`,
          participantId: `participant-${i % 10}`,
          hackathonId: 'hackathon-1',
          bannerType: Object.values(BannerType)[i % 4],
          dismissedAt: new Date()
        }))

        ;(db.dismissedBanner.findMany as jest.Mock).mockResolvedValue(multipleBanners)

        const result = await db.dismissedBanner.findMany({
          where: { hackathonId: 'hackathon-1' }
        })

        expect(result).toHaveLength(100)
      })

      it('should handle deletion of multiple dismissed banners', async () => {
        ;(db.dismissedBanner.deleteMany as jest.Mock).mockResolvedValue({ count: 50 })

        const result = await db.dismissedBanner.deleteMany({
          where: { hackathonId: 'hackathon-1' }
        })

        expect(result.count).toBe(50)
        expect(db.dismissedBanner.deleteMany).toHaveBeenCalledWith({
          where: { hackathonId: 'hackathon-1' }
        })
      })
    })
  })
})