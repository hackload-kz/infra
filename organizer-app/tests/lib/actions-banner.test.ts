import { dismissBannerAction } from '@/lib/actions'
import { dismissBanner } from '@/lib/banners'
import { revalidatePath } from 'next/cache'
import { BannerType } from '@prisma/client'

// Mock the markdown library that causes ES module issues
jest.mock('marked', () => {
  const mockMarked = jest.fn().mockReturnValue('<p>mocked html</p>') as jest.MockedFunction<any> & {
    setOptions: jest.MockedFunction<any>
    parse: jest.MockedFunction<any>
  }
  mockMarked.setOptions = jest.fn()
  mockMarked.parse = jest.fn().mockReturnValue('<p>mocked html</p>')
  return {
    marked: mockMarked,
    parse: jest.fn().mockReturnValue('<p>mocked html</p>'),
  }
})

// Mock dependencies
jest.mock('@/lib/banners', () => ({
  dismissBanner: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

describe('Banner Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset revalidatePath to not throw by default
    ;(revalidatePath as jest.Mock).mockImplementation(() => undefined)
  })

  describe('dismissBannerAction', () => {
    it('should successfully dismiss a banner', async () => {
      (dismissBanner as jest.Mock).mockResolvedValue(undefined)

      await dismissBannerAction('participant-1', 'hackathon-1', BannerType.TELEGRAM_PROFILE)

      expect(dismissBanner).toHaveBeenCalledWith('participant-1', 'hackathon-1', BannerType.TELEGRAM_PROFILE)
      expect(revalidatePath).toHaveBeenCalledWith('/space')
    })

    it('should throw error for missing participantId', async () => {
      await expect(
        dismissBannerAction('', 'hackathon-1', BannerType.TELEGRAM_PROFILE)
      ).rejects.toThrow('All parameters are required')

      expect(dismissBanner).not.toHaveBeenCalled()
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('should throw error for missing hackathonId', async () => {
      await expect(
        dismissBannerAction('participant-1', '', BannerType.TELEGRAM_PROFILE)
      ).rejects.toThrow('All parameters are required')

      expect(dismissBanner).not.toHaveBeenCalled()
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('should throw error for missing bannerType', async () => {
      await expect(
        dismissBannerAction('participant-1', 'hackathon-1', '' as any)
      ).rejects.toThrow('All parameters are required')

      expect(dismissBanner).not.toHaveBeenCalled()
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('should handle null parameters', async () => {
      await expect(
        dismissBannerAction(null as any, 'hackathon-1', BannerType.TELEGRAM_PROFILE)
      ).rejects.toThrow('All parameters are required')

      await expect(
        dismissBannerAction('participant-1', null as any, BannerType.TELEGRAM_PROFILE)
      ).rejects.toThrow('All parameters are required')

      await expect(
        dismissBannerAction('participant-1', 'hackathon-1', null as any)
      ).rejects.toThrow('All parameters are required')

      expect(dismissBanner).not.toHaveBeenCalled()
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('should handle undefined parameters', async () => {
      await expect(
        dismissBannerAction(undefined as any, 'hackathon-1', BannerType.TELEGRAM_PROFILE)
      ).rejects.toThrow('All parameters are required')

      await expect(
        dismissBannerAction('participant-1', undefined as any, BannerType.TELEGRAM_PROFILE)
      ).rejects.toThrow('All parameters are required')

      await expect(
        dismissBannerAction('participant-1', 'hackathon-1', undefined as any)
      ).rejects.toThrow('All parameters are required')

      expect(dismissBanner).not.toHaveBeenCalled()
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('should handle dismissBanner function errors', async () => {
      const error = new Error('Database connection failed')
      ;(dismissBanner as jest.Mock).mockRejectedValue(error)

      await expect(
        dismissBannerAction('participant-1', 'hackathon-1', BannerType.TELEGRAM_PROFILE)
      ).rejects.toThrow('Database connection failed')

      expect(dismissBanner).toHaveBeenCalledWith('participant-1', 'hackathon-1', BannerType.TELEGRAM_PROFILE)
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('should handle revalidatePath errors', async () => {
      (dismissBanner as jest.Mock).mockResolvedValue(undefined)
      ;(revalidatePath as jest.Mock).mockImplementation(() => {
        throw new Error('Revalidation failed')
      })

      await expect(
        dismissBannerAction('participant-1', 'hackathon-1', BannerType.TELEGRAM_PROFILE)
      ).rejects.toThrow('Revalidation failed')

      expect(dismissBanner).toHaveBeenCalledWith('participant-1', 'hackathon-1', BannerType.TELEGRAM_PROFILE)
      expect(revalidatePath).toHaveBeenCalledWith('/space')
    })

    it('should work with all banner types', async () => {
      (dismissBanner as jest.Mock).mockResolvedValue(undefined)

      // Test all banner types
      const bannerTypes = [
        BannerType.TELEGRAM_PROFILE,
        BannerType.GITHUB_PROFILE,
        BannerType.FIND_TEAM,
        BannerType.TEAM_NEEDS_MEMBERS
      ]

      for (const bannerType of bannerTypes) {
        await dismissBannerAction('participant-1', 'hackathon-1', bannerType)
        expect(dismissBanner).toHaveBeenCalledWith('participant-1', 'hackathon-1', bannerType)
      }

      expect(dismissBanner).toHaveBeenCalledTimes(4)
      expect(revalidatePath).toHaveBeenCalledTimes(4)
    })

    it('should handle concurrent dismissal requests', async () => {
      (dismissBanner as jest.Mock).mockResolvedValue(undefined)

      const promises = [
        dismissBannerAction('participant-1', 'hackathon-1', BannerType.TELEGRAM_PROFILE),
        dismissBannerAction('participant-1', 'hackathon-1', BannerType.GITHUB_PROFILE),
        dismissBannerAction('participant-1', 'hackathon-1', BannerType.FIND_TEAM)
      ]

      await Promise.all(promises)

      expect(dismissBanner).toHaveBeenCalledTimes(3)
      expect(revalidatePath).toHaveBeenCalledTimes(3)
    })

    it('should handle long participant and hackathon IDs', async () => {
      (dismissBanner as jest.Mock).mockResolvedValue(undefined)

      const longId = 'a'.repeat(100)
      
      await dismissBannerAction(longId, longId, BannerType.TELEGRAM_PROFILE)

      expect(dismissBanner).toHaveBeenCalledWith(longId, longId, BannerType.TELEGRAM_PROFILE)
      expect(revalidatePath).toHaveBeenCalledWith('/space')
    })

    it('should handle special characters in IDs', async () => {
      (dismissBanner as jest.Mock).mockResolvedValue(undefined)

      const specialId = 'participant-123_test@domain.com'
      
      await dismissBannerAction(specialId, 'hackathon-2024', BannerType.TELEGRAM_PROFILE)

      expect(dismissBanner).toHaveBeenCalledWith(specialId, 'hackathon-2024', BannerType.TELEGRAM_PROFILE)
      expect(revalidatePath).toHaveBeenCalledWith('/space')
    })
  })
})