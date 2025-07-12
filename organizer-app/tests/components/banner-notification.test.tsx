import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BannerNotification, BannerList } from '@/components/banner-notification'
import { Banner } from '@/lib/banners'
import { BannerType } from '@prisma/client'
import { dismissBannerAction } from '@/lib/actions'

// Mock the server action
jest.mock('@/lib/actions', () => ({
  dismissBannerAction: jest.fn(),
}))

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return <a href={href} {...props}>{children}</a>
  }
})

describe('BannerNotification Component', () => {
  const mockBanner: Banner = {
    type: BannerType.TELEGRAM_PROFILE,
    title: 'Test Banner Title',
    message: 'Test banner message',
    actionText: 'Test Action',
    actionUrl: '/test-url',
    variant: 'warning'
  }

  const defaultProps = {
    banner: mockBanner,
    participantId: 'participant-1',
    hackathonId: 'hackathon-1'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render banner with correct content', () => {
      render(<BannerNotification {...defaultProps} />)

      expect(screen.getByText('Test Banner Title')).toBeInTheDocument()
      expect(screen.getByText('Test banner message')).toBeInTheDocument()
      expect(screen.getByText('Test Action')).toBeInTheDocument()
    })

    it('should render action button with correct link', () => {
      render(<BannerNotification {...defaultProps} />)

      const actionButton = screen.getByText('Test Action')
      expect(actionButton.closest('a')).toHaveAttribute('href', '/test-url')
    })

    it('should render dismiss button', () => {
      render(<BannerNotification {...defaultProps} />)

      const dismissButton = screen.getByLabelText('Закрыть уведомление')
      expect(dismissButton).toBeInTheDocument()
    })
  })

  describe('Styling Variants', () => {
    it('should apply error styling for error variant', () => {
      const errorBanner = { ...mockBanner, variant: 'error' as const }
      render(<BannerNotification {...defaultProps} banner={errorBanner} />)

      const container = screen.getByText('Test Banner Title').closest('div')
      expect(container).toHaveClass('bg-red-900/30', 'border-red-500/50', 'text-red-100')
    })

    it('should apply warning styling for warning variant', () => {
      const warningBanner = { ...mockBanner, variant: 'warning' as const }
      render(<BannerNotification {...defaultProps} banner={warningBanner} />)

      const container = screen.getByText('Test Banner Title').closest('div')
      expect(container).toHaveClass('bg-amber-900/30', 'border-amber-500/50', 'text-amber-100')
    })

    it('should apply info styling for info variant', () => {
      const infoBanner = { ...mockBanner, variant: 'info' as const }
      render(<BannerNotification {...defaultProps} banner={infoBanner} />)

      const container = screen.getByText('Test Banner Title').closest('div')
      expect(container).toHaveClass('bg-blue-900/30', 'border-blue-500/50', 'text-blue-100')
    })

    it('should render correct icon for error variant', () => {
      const errorBanner = { ...mockBanner, variant: 'error' as const }
      render(<BannerNotification {...defaultProps} banner={errorBanner} />)

      // Check for AlertCircle icon presence (it should be in the DOM)
      const iconContainer = screen.getByText('Test Banner Title').parentElement?.querySelector('svg')
      expect(iconContainer).toBeInTheDocument()
    })

    it('should render correct icon for warning variant', () => {
      const warningBanner = { ...mockBanner, variant: 'warning' as const }
      render(<BannerNotification {...defaultProps} banner={warningBanner} />)

      // Check for AlertTriangle icon presence
      const iconContainer = screen.getByText('Test Banner Title').parentElement?.querySelector('svg')
      expect(iconContainer).toBeInTheDocument()
    })

    it('should render correct icon for info variant', () => {
      const infoBanner = { ...mockBanner, variant: 'info' as const }
      render(<BannerNotification {...defaultProps} banner={infoBanner} />)

      // Check for Info icon presence
      const iconContainer = screen.getByText('Test Banner Title').parentElement?.querySelector('svg')
      expect(iconContainer).toBeInTheDocument()
    })
  })

  describe('Dismiss Functionality', () => {
    it('should call dismissBannerAction when dismiss button is clicked', async () => {
      (dismissBannerAction as jest.Mock).mockResolvedValue(undefined)

      render(<BannerNotification {...defaultProps} />)

      const dismissButton = screen.getByLabelText('Закрыть уведомление')
      fireEvent.click(dismissButton)

      expect(dismissBannerAction).toHaveBeenCalledWith(
        'participant-1',
        'hackathon-1',
        BannerType.TELEGRAM_PROFILE
      )
    })

    it('should hide banner after successful dismissal', async () => {
      (dismissBannerAction as jest.Mock).mockResolvedValue(undefined)

      render(<BannerNotification {...defaultProps} />)

      const dismissButton = screen.getByLabelText('Закрыть уведомление')
      fireEvent.click(dismissButton)

      await waitFor(() => {
        expect(screen.queryByText('Test Banner Title')).not.toBeInTheDocument()
      })
    })

    it('should disable dismiss button during dismissal', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      });

      (dismissBannerAction as jest.Mock).mockReturnValue(promise)

      render(<BannerNotification {...defaultProps} />)

      const dismissButton = screen.getByLabelText('Закрыть уведомление')
      fireEvent.click(dismissButton)

      expect(dismissButton).toBeDisabled()

      // Resolve the promise to finish the test
      resolvePromise!(undefined)
      await waitFor(() => {
        expect(screen.queryByText('Test Banner Title')).not.toBeInTheDocument()
      })
    })

    it('should handle dismissal errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (dismissBannerAction as jest.Mock).mockRejectedValue(new Error('Dismissal failed'))

      render(<BannerNotification {...defaultProps} />)

      const dismissButton = screen.getByLabelText('Закрыть уведомление')
      fireEvent.click(dismissButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to dismiss banner:', expect.any(Error))
      })

      // Banner should still be visible after error
      expect(screen.getByText('Test Banner Title')).toBeInTheDocument()
      expect(dismissButton).not.toBeDisabled()

      consoleSpy.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria-label for dismiss button', () => {
      render(<BannerNotification {...defaultProps} />)

      const dismissButton = screen.getByLabelText('Закрыть уведомление')
      expect(dismissButton).toHaveAttribute('aria-label', 'Закрыть уведомление')
    })

    it('should be keyboard accessible', () => {
      render(<BannerNotification {...defaultProps} />)

      const actionButton = screen.getByText('Test Action')
      const dismissButton = screen.getByLabelText('Закрыть уведомление')

      expect(actionButton).toHaveAttribute('tabIndex', '0')
      expect(dismissButton).not.toHaveAttribute('tabIndex', '-1')
    })
  })
})

describe('BannerList Component', () => {
  const mockBanners: Banner[] = [
    {
      type: BannerType.TELEGRAM_PROFILE,
      title: 'Telegram Banner',
      message: 'Telegram message',
      actionText: 'Add Telegram',
      actionUrl: '/telegram',
      variant: 'warning'
    },
    {
      type: BannerType.GITHUB_PROFILE,
      title: 'GitHub Banner',
      message: 'GitHub message',
      actionText: 'Add GitHub',
      actionUrl: '/github',
      variant: 'error'
    },
    {
      type: BannerType.FIND_TEAM,
      title: 'Team Banner',
      message: 'Team message',
      actionText: 'Find Team',
      actionUrl: '/teams',
      variant: 'info'
    }
  ]

  const defaultProps = {
    banners: mockBanners,
    participantId: 'participant-1',
    hackathonId: 'hackathon-1'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render multiple banners', () => {
      render(<BannerList {...defaultProps} />)

      expect(screen.getByText('Telegram Banner')).toBeInTheDocument()
      expect(screen.getByText('GitHub Banner')).toBeInTheDocument()
      expect(screen.getByText('Team Banner')).toBeInTheDocument()
    })

    it('should render banners in order', () => {
      render(<BannerList {...defaultProps} />)

      const bannerTitles = screen.getAllByRole('heading', { level: 3 })
      expect(bannerTitles[0]).toHaveTextContent('Telegram Banner')
      expect(bannerTitles[1]).toHaveTextContent('GitHub Banner')
      expect(bannerTitles[2]).toHaveTextContent('Team Banner')
    })

    it('should render nothing for empty banner list', () => {
      const { container } = render(<BannerList {...defaultProps} banners={[]} />)

      expect(container.firstChild).toBeNull()
    })

    it('should render single banner correctly', () => {
      const singleBanner = [mockBanners[0]]
      render(<BannerList {...defaultProps} banners={singleBanner} />)

      expect(screen.getByText('Telegram Banner')).toBeInTheDocument()
      expect(screen.queryByText('GitHub Banner')).not.toBeInTheDocument()
    })
  })

  describe('Banner Interactions', () => {
    it('should handle banner dismissal', async () => {
      (dismissBannerAction as jest.Mock).mockResolvedValue(undefined)

      render(<BannerList {...defaultProps} />)

      const dismissButtons = screen.getAllByLabelText('Закрыть уведомление')
      fireEvent.click(dismissButtons[0])

      await waitFor(() => {
        expect(screen.queryByText('Telegram Banner')).not.toBeInTheDocument()
      })

      // Other banners should still be visible
      expect(screen.getByText('GitHub Banner')).toBeInTheDocument()
      expect(screen.getByText('Team Banner')).toBeInTheDocument()
    })

    it('should pass correct props to each banner component', () => {
      render(<BannerList {...defaultProps} />)

      // Check that each banner type is rendered with correct props
      expect(screen.getByText('Add Telegram')).toBeInTheDocument()
      expect(screen.getByText('Add GitHub')).toBeInTheDocument()
      expect(screen.getByText('Find Team')).toBeInTheDocument()
    })
  })

  describe('Layout and Styling', () => {
    it('should apply proper spacing between banners', () => {
      const { container } = render(<BannerList {...defaultProps} />)

      const bannerContainer = container.querySelector('div')
      expect(bannerContainer).toHaveClass('space-y-4')
    })

    it('should have proper margin bottom', () => {
      const { container } = render(<BannerList {...defaultProps} />)

      const outerContainer = container.firstChild
      expect(outerContainer).toHaveClass('mb-8')
    })
  })

  describe('Error Handling', () => {
    it('should handle banner dismissal errors without affecting other banners', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (dismissBannerAction as jest.Mock).mockRejectedValue(new Error('Dismissal failed'))

      render(<BannerList {...defaultProps} />)

      const dismissButtons = screen.getAllByLabelText('Закрыть уведомление')
      fireEvent.click(dismissButtons[0])

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled()
      })

      // All banners should still be visible
      expect(screen.getByText('Telegram Banner')).toBeInTheDocument()
      expect(screen.getByText('GitHub Banner')).toBeInTheDocument()
      expect(screen.getByText('Team Banner')).toBeInTheDocument()

      consoleSpy.mockRestore()
    })
  })

  describe('Performance', () => {
    it('should handle large number of banners', () => {
      const manyBanners = Array.from({ length: 10 }, (_, i) => ({
        type: BannerType.TELEGRAM_PROFILE,
        title: `Banner ${i}`,
        message: `Message ${i}`,
        actionText: `Action ${i}`,
        actionUrl: `/url-${i}`,
        variant: 'info' as const
      }))

      render(<BannerList {...defaultProps} banners={manyBanners} />)

      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(10)
    })
  })
})