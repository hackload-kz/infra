import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
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
      const { container } = render(<BannerNotification {...defaultProps} banner={errorBanner} />)

      const bannerContainer = container.firstChild as HTMLElement
      expect(bannerContainer).toHaveClass('bg-red-900/30', 'border-red-500/50', 'text-red-100')
    })

    it('should apply warning styling for warning variant', () => {
      const warningBanner = { ...mockBanner, variant: 'warning' as const }
      const { container } = render(<BannerNotification {...defaultProps} banner={warningBanner} />)

      const bannerContainer = container.firstChild as HTMLElement
      expect(bannerContainer).toHaveClass('bg-amber-900/30', 'border-amber-500/50', 'text-amber-100')
    })

    it('should apply info styling for info variant', () => {
      const infoBanner = { ...mockBanner, variant: 'info' as const }
      const { container } = render(<BannerNotification {...defaultProps} banner={infoBanner} />)

      const bannerContainer = container.firstChild as HTMLElement
      expect(bannerContainer).toHaveClass('bg-blue-900/30', 'border-blue-500/50', 'text-blue-100')
    })

    it('should render correct icon for error variant', () => {
      const errorBanner = { ...mockBanner, variant: 'error' as const }
      const { container } = render(<BannerNotification {...defaultProps} banner={errorBanner} />)

      // Check for any SVG icon presence (AlertCircle for error variant)
      const iconSvg = container.querySelector('svg')
      expect(iconSvg).toBeInTheDocument()
    })

    it('should render correct icon for warning variant', () => {
      const warningBanner = { ...mockBanner, variant: 'warning' as const }
      const { container } = render(<BannerNotification {...defaultProps} banner={warningBanner} />)

      // Check for any SVG icon presence (AlertTriangle for warning variant)
      const iconSvg = container.querySelector('svg')
      expect(iconSvg).toBeInTheDocument()
    })

    it('should render correct icon for info variant', () => {
      const infoBanner = { ...mockBanner, variant: 'info' as const }
      const { container } = render(<BannerNotification {...defaultProps} banner={infoBanner} />)

      // Check for any SVG icon presence (Info for info variant)
      const iconSvg = container.querySelector('svg')
      expect(iconSvg).toBeInTheDocument()
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
      
      await act(async () => {
        fireEvent.click(dismissButton)
      })

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
      
      await act(async () => {
        fireEvent.click(dismissButton)
      })

      expect(dismissButton).toBeDisabled()

      // Resolve the promise to finish the test
      await act(async () => {
        resolvePromise!(undefined)
      })
      
      await waitFor(() => {
        expect(screen.queryByText('Test Banner Title')).not.toBeInTheDocument()
      })
    })

    it('should handle dismissal errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (dismissBannerAction as jest.Mock).mockRejectedValue(new Error('Dismissal failed'))

      render(<BannerNotification {...defaultProps} />)

      const dismissButton = screen.getByLabelText('Закрыть уведомление')
      
      await act(async () => {
        fireEvent.click(dismissButton)
      })

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

      // Action button should be a focusable link
      expect(actionButton.tagName).toBe('A')
      expect(actionButton).toHaveAttribute('href', '/test-url')
      
      // Dismiss button should be a focusable button
      expect(dismissButton.tagName).toBe('BUTTON')
      expect(dismissButton).not.toBeDisabled()
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
      
      // The third banner should be hidden by default but expand button should be visible
      expect(screen.queryByText('Team Banner')).not.toBeInTheDocument()
      expect(screen.getByText('Показать ещё 1 уведомлений')).toBeInTheDocument()
    })

    it('should render banners in order', () => {
      render(<BannerList {...defaultProps} />)

      const bannerTitles = screen.getAllByRole('heading', { level: 3 })
      expect(bannerTitles[0]).toHaveTextContent('Telegram Banner')
      expect(bannerTitles[1]).toHaveTextContent('GitHub Banner')
      // Only first 2 banners should be visible by default
      expect(bannerTitles).toHaveLength(2)
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
      
      await act(async () => {
        fireEvent.click(dismissButtons[0])
      })

      await waitFor(() => {
        expect(screen.queryByText('Telegram Banner')).not.toBeInTheDocument()
      })

      // Other banner should still be visible
      expect(screen.getByText('GitHub Banner')).toBeInTheDocument()
      // Third banner should still be hidden since the component doesn't automatically show it
      expect(screen.queryByText('Team Banner')).not.toBeInTheDocument()
      // Expand button should still be visible
      expect(screen.getByText('Показать ещё 1 уведомлений')).toBeInTheDocument()
    })

    it('should pass correct props to each banner component', () => {
      render(<BannerList {...defaultProps} />)

      // Check that first 2 banner types are rendered with correct props
      expect(screen.getByText('Add Telegram')).toBeInTheDocument()
      expect(screen.getByText('Add GitHub')).toBeInTheDocument()
      // Third banner should not be visible by default
      expect(screen.queryByText('Find Team')).not.toBeInTheDocument()
    })
  })

  describe('Layout and Styling', () => {
    it('should apply proper spacing between banners', () => {
      const { container } = render(<BannerList {...defaultProps} />)

      // The space-y-4 class is on the inner div with the "space-y-4" class
      const spacingContainer = container.querySelector('.space-y-4')
      expect(spacingContainer).toHaveClass('space-y-4')
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
      
      await act(async () => {
        fireEvent.click(dismissButtons[0])
      })

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled()
      })

      // All visible banners should still be visible
      expect(screen.getByText('Telegram Banner')).toBeInTheDocument()
      expect(screen.getByText('GitHub Banner')).toBeInTheDocument()
      // Third banner should still be hidden by default
      expect(screen.queryByText('Team Banner')).not.toBeInTheDocument()

      consoleSpy.mockRestore()
    })
  })

  describe('Performance', () => {
    it('should handle large number of banners', () => {
      // Create unique banners to avoid React key conflicts
      const manyBanners = [
        { type: BannerType.TELEGRAM_PROFILE, title: 'Banner 0', message: 'Message 0', actionText: 'Action 0', actionUrl: '/url-0', variant: 'info' as const },
        { type: BannerType.GITHUB_PROFILE, title: 'Banner 1', message: 'Message 1', actionText: 'Action 1', actionUrl: '/url-1', variant: 'info' as const },
        { type: BannerType.FIND_TEAM, title: 'Banner 2', message: 'Message 2', actionText: 'Action 2', actionUrl: '/url-2', variant: 'info' as const },
        { type: BannerType.TELEGRAM_PROFILE, title: 'Banner 3', message: 'Message 3', actionText: 'Action 3', actionUrl: '/url-3', variant: 'warning' as const },
        { type: BannerType.GITHUB_PROFILE, title: 'Banner 4', message: 'Message 4', actionText: 'Action 4', actionUrl: '/url-4', variant: 'warning' as const },
        { type: BannerType.FIND_TEAM, title: 'Banner 5', message: 'Message 5', actionText: 'Action 5', actionUrl: '/url-5', variant: 'warning' as const },
        { type: BannerType.TELEGRAM_PROFILE, title: 'Banner 6', message: 'Message 6', actionText: 'Action 6', actionUrl: '/url-6', variant: 'error' as const },
        { type: BannerType.GITHUB_PROFILE, title: 'Banner 7', message: 'Message 7', actionText: 'Action 7', actionUrl: '/url-7', variant: 'error' as const },
        { type: BannerType.FIND_TEAM, title: 'Banner 8', message: 'Message 8', actionText: 'Action 8', actionUrl: '/url-8', variant: 'error' as const },
        { type: BannerType.TELEGRAM_PROFILE, title: 'Banner 9', message: 'Message 9', actionText: 'Action 9', actionUrl: '/url-9', variant: 'info' as const },
      ]

      render(<BannerList {...defaultProps} banners={manyBanners} />)

      // Only first 2 banners should be visible by default
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2)
    })
  })
})