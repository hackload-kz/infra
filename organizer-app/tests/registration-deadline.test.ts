import { isRegistrationEnded, isRegistrationActive, getCurrentHackathon } from '@/lib/hackathon'
import { createTeam, createAndJoinTeam } from '@/lib/actions'
import { db } from '@/lib/db'
import { logger, LogAction } from '@/lib/logger'

// Mock external dependencies
jest.mock('@/lib/db', () => ({
  db: {
    hackathon: {
      findFirst: jest.fn(),
    },
    team: {
      create: jest.fn(),
    },
    participant: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
  LogAction: {
    CREATE: 'CREATE',
  },
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/hackathon', () => ({
  ...jest.requireActual('@/lib/hackathon'),
  getCurrentHackathon: jest.fn(),
}));

describe('Registration Deadline Functionality', () => {
  // Create hackathon with relative dates for easier testing
  const now = new Date()
  const mockHackathon = {
    id: 'hackathon-1',
    name: 'Test Hackathon',
    slug: 'test-hackathon',
    description: 'Test hackathon description',
    theme: 'Test theme',
    registrationStart: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    registrationEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    startDate: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000), // 35 days from now
    endDate: new Date(now.getTime() + 38 * 24 * 60 * 60 * 1000), // 38 days from now
    maxTeamSize: 4,
    minTeamSize: 1,
    allowTeamChanges: true,
    isActive: true,
    isPublic: true,
    logoUrl: null,
    bannerUrl: null,
    primaryColor: null,
    secondaryColor: null,
    createdAt: now,
    updatedAt: now,
  }

  const expiredHackathon = {
    ...mockHackathon,
    registrationEnd: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('isRegistrationEnded', () => {
    it('should return false when registration is still active', () => {
      const result = isRegistrationEnded(mockHackathon)
      expect(result).toBe(false)
    })

    it('should return true when registration has ended', () => {
      const result = isRegistrationEnded(expiredHackathon)
      expect(result).toBe(true)
    })
  })

  describe('isRegistrationActive', () => {
    it('should return true when registration is active', () => {
      const result = isRegistrationActive(mockHackathon)
      expect(result).toBe(true)
    })

    it('should return false after registration ends', () => {
      const result = isRegistrationActive(expiredHackathon)
      expect(result).toBe(false)
    })
  })

  describe('createTeam with registration deadline', () => {
    const formData = new FormData()
    formData.append('name', 'Test Team')
    formData.append('nickname', 'test-team')

    it('should create team when registration is active', async () => {
      (getCurrentHackathon as jest.Mock).mockResolvedValue(mockHackathon);
      (db.team.create as jest.Mock).mockResolvedValue({ 
        id: 'team-1', 
        name: 'Test Team', 
        nickname: 'test-team' 
      })

      await createTeam(formData)

      expect(db.team.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Team',
          nickname: 'test-team',
          hackathonId: 'hackathon-1',
        },
      })
    })

    it('should throw error when registration has ended', async () => {
      (getCurrentHackathon as jest.Mock).mockResolvedValue(expiredHackathon)

      await expect(createTeam(formData)).rejects.toThrow('Failed to create team')
      
      expect(db.team.create).not.toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalledWith(
        'CREATE',
        'Team',
        expect.stringContaining('Team registration has ended'),
        expect.any(Object)
      )
    })

    it('should handle missing hackathon gracefully', async () => {
      (getCurrentHackathon as jest.Mock).mockResolvedValue(null)

      await expect(createTeam(formData)).rejects.toThrow('Failed to create team')
      
      expect(db.team.create).not.toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalledWith(
        'CREATE',
        'Team',
        expect.stringContaining('No active hackathon found'),
        expect.any(Object)
      )
    })
  })

  describe('createAndJoinTeam with registration deadline', () => {
    const mockParticipant = {
      id: 'participant-1',
      name: 'Test User',
      email: 'test@example.com',
      team: null,
      ledTeam: null,
    }

    it('should create team when registration is active', async () => {
      (getCurrentHackathon as jest.Mock).mockResolvedValue(mockHackathon);
      (db.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          participant: {
            findUnique: jest.fn().mockResolvedValue(mockParticipant),
            update: jest.fn().mockResolvedValue({ ...mockParticipant, teamId: 'team-1' }),
          },
          team: {
            findUnique: jest.fn().mockResolvedValue(null), // nickname available
            create: jest.fn().mockResolvedValue({
              id: 'team-1',
              name: 'Test Team',
              nickname: 'test-team',
            }),
            update: jest.fn(),
          },
          hackathonParticipation: {
            upsert: jest.fn().mockResolvedValue({}),
          },
        }
        return await callback(mockTx)
      })

      await createAndJoinTeam(
        'participant-1',
        'Test Team',
        'test-team',
        'BEGINNER',
        null,
        ['JavaScript'],
        ['React'],
        'Test description'
      )

      expect(db.$transaction).toHaveBeenCalled()
    })

    it('should throw error when registration has ended', async () => {
      (getCurrentHackathon as jest.Mock).mockResolvedValue(expiredHackathon)

      await expect(createAndJoinTeam(
        'participant-1',
        'Test Team',
        'test-team'
      )).rejects.toThrow('Регистрация команд для этого хакатона завершена')
      
      expect(db.$transaction).not.toHaveBeenCalled()
    })

    it('should validate required parameters', async () => {
      await expect(createAndJoinTeam('', '', '')).rejects.toThrow(
        'Все поля обязательны для заполнения'
      )
      
      expect(getCurrentHackathon).not.toHaveBeenCalled()
    })

    it('should validate nickname format', async () => {
      await expect(createAndJoinTeam(
        'participant-1',
        'Test Team',
        'invalid nickname!' // Contains invalid characters
      )).rejects.toThrow(
        'Никнейм команды может содержать только буквы, цифры, дефисы и подчеркивания'
      )
      
      expect(getCurrentHackathon).not.toHaveBeenCalled()
    })
  })

  describe('Edge cases', () => {
    it('should handle hackathon with invalid dates gracefully', () => {
      const invalidHackathon = {
        ...mockHackathon,
        registrationEnd: 'invalid-date' as any,
      }

      // This should handle gracefully without throwing
      expect(() => isRegistrationEnded(invalidHackathon)).not.toThrow()
    })
  })
})