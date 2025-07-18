import { createMockRequest, createMockUser, createMockParticipant, createMockTeam, createMockHackathon } from '../utils/test-helpers'
import { POST } from '@/app/api/teams/join-request/route'
import { DELETE } from '@/app/api/teams/join-request/[id]/withdraw/route'
import { auth } from '@/auth'
import { createJoinRequest, withdrawJoinRequest } from '@/lib/actions'

// Mock database
jest.mock('@/lib/db', () => ({
  db: {
    participant: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    team: {
      findUnique: jest.fn(),
    },
    hackathon: {
      findFirst: jest.fn(),
    },
    joinRequest: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

// Mock auth
jest.mock('@/auth')

// Mock actions
const mockCreateJoinRequest = jest.fn()
const mockWithdrawJoinRequest = jest.fn()

jest.mock('@/lib/actions', () => ({
  createJoinRequest: mockCreateJoinRequest,
  withdrawJoinRequest: mockWithdrawJoinRequest,
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    logApiCall: jest.fn(),
    logCreate: jest.fn(),
    logDelete: jest.fn(),
    logApiError: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
  LogAction: {
    CREATE: 'CREATE',
    DELETE: 'DELETE',
    READ: 'READ',
  },
}))

// Mock message service
jest.mock('@/lib/messages', () => ({
  messageService: {
    sendToTeam: jest.fn().mockResolvedValue([{ id: 'message-1' }]),
  },
}))

// Mock message templates
jest.mock('@/lib/message-templates', () => ({
  generateJoinRequestNotificationMessage: jest.fn().mockReturnValue({
    text: 'Test message',
  }),
}))

// Mock URL builder
jest.mock('@/lib/urls', () => ({
  urlBuilder: {
    space: {
      team: jest.fn().mockReturnValue('/space/teams'),
      participants: jest.fn().mockReturnValue('/space/participants'),
    },
  },
}))

// Mock cleanup
jest.mock('@/lib/team-join-cleanup', () => ({
  cleanupOldRequestsForParticipant: jest.fn().mockResolvedValue({ deleted: 0, found: 0 }),
}))

const { db } = require('@/lib/db')

describe('Team Join Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(auth as jest.Mock).mockResolvedValue({ user: { email: 'test@example.com' } })
  })

  describe('Create Join Request API', () => {
    it('should create join request successfully', async () => {
      const user = createMockUser()
      const participant = createMockParticipant({ teamId: null, isActive: true })
      const team = createMockTeam({ members: [createMockParticipant()], status: 'NEW' })
      const hackathon = createMockHackathon()

      db.participant.findFirst.mockResolvedValue(participant)
      db.team.findUnique.mockResolvedValue(team)
      db.hackathon.findFirst.mockResolvedValue(hackathon)
      db.joinRequest.findUnique.mockResolvedValue(null)
      db.joinRequest.create.mockResolvedValue({
        id: 'request-1',
        participantId: participant.id,
        teamId: team.id,
        hackathonId: hackathon.id,
        message: 'Test message',
        participant,
        team: { ...team, leader: createMockParticipant() },
      })

      const request = createMockRequest('http://localhost:3000/api/teams/join-request', {
        method: 'POST',
        body: { teamId: team.id, message: 'Test message' },
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(201)
      expect(result.id).toBe('request-1')
      expect(db.joinRequest.create).toHaveBeenCalledWith({
        data: {
          participantId: participant.id,
          teamId: team.id,
          hackathonId: hackathon.id,
          message: 'Test message',
        },
        include: {
          participant: true,
          team: {
            include: {
              leader: true,
            },
          },
        },
      })
    })

    it('should reject if participant not found', async () => {
      db.participant.findFirst.mockResolvedValue(null)

      const request = createMockRequest('http://localhost:3000/api/teams/join-request', {
        method: 'POST',
        body: { teamId: 'team-1', message: 'Test message' },
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBe('Participant not found')
    })

    it('should reject if participant account is inactive', async () => {
      const participant = createMockParticipant({ isActive: false })
      db.participant.findFirst.mockResolvedValue(participant)

      const request = createMockRequest('http://localhost:3000/api/teams/join-request', {
        method: 'POST',
        body: { teamId: 'team-1', message: 'Test message' },
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.error).toBe('Your account is inactive and cannot join teams')
    })

    it('should reject if participant already in team', async () => {
      const participant = createMockParticipant({ teamId: 'existing-team' })
      db.participant.findFirst.mockResolvedValue(participant)

      const request = createMockRequest('http://localhost:3000/api/teams/join-request', {
        method: 'POST',
        body: { teamId: 'team-1', message: 'Test message' },
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('You are already in a team')
    })

    it('should reject if team not found', async () => {
      const participant = createMockParticipant({ teamId: null })
      db.participant.findFirst.mockResolvedValue(participant)
      db.team.findUnique.mockResolvedValue(null)

      const request = createMockRequest('http://localhost:3000/api/teams/join-request', {
        method: 'POST',
        body: { teamId: 'team-1', message: 'Test message' },
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBe('Team not found')
    })

    it('should reject if team is full', async () => {
      const participant = createMockParticipant({ teamId: null })
      const team = createMockTeam({
        members: [
          createMockParticipant(),
          createMockParticipant(),
          createMockParticipant(),
          createMockParticipant(),
        ],
        status: 'NEW',
      })
      
      db.participant.findFirst.mockResolvedValue(participant)
      db.team.findUnique.mockResolvedValue(team)

      const request = createMockRequest('http://localhost:3000/api/teams/join-request', {
        method: 'POST',
        body: { teamId: team.id, message: 'Test message' },
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Team is full')
    })

    it('should reject if team not accepting members', async () => {
      const participant = createMockParticipant({ teamId: null })
      const team = createMockTeam({ members: [createMockParticipant()], status: 'FINISHED' })
      
      db.participant.findFirst.mockResolvedValue(participant)
      db.team.findUnique.mockResolvedValue(team)

      const request = createMockRequest('http://localhost:3000/api/teams/join-request', {
        method: 'POST',
        body: { teamId: team.id, message: 'Test message' },
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Team is not accepting new members')
    })

    it('should reject if existing request exists', async () => {
      const participant = createMockParticipant({ teamId: null })
      const team = createMockTeam({ members: [createMockParticipant()], status: 'NEW' })
      const hackathon = createMockHackathon()
      const existingRequest = {
        id: 'existing-request',
        participantId: participant.id,
        teamId: team.id,
        hackathonId: hackathon.id,
        status: 'PENDING',
      }
      
      db.participant.findFirst.mockResolvedValue(participant)
      db.team.findUnique.mockResolvedValue(team)
      db.hackathon.findFirst.mockResolvedValue(hackathon)
      db.joinRequest.findUnique.mockResolvedValue(existingRequest)

      const request = createMockRequest('http://localhost:3000/api/teams/join-request', {
        method: 'POST',
        body: { teamId: team.id, message: 'Test message' },
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('You already have a pending request for this team')
    })

    it('should handle unauthorized requests', async () => {
      ;(auth as jest.Mock).mockResolvedValue(null)

      const request = createMockRequest('http://localhost:3000/api/teams/join-request', {
        method: 'POST',
        body: { teamId: 'team-1', message: 'Test message' },
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(401)
      expect(result.error).toBe('Unauthorized')
    })
  })

  describe('Withdraw Join Request API', () => {
    it('should withdraw join request successfully', async () => {
      const participant = createMockParticipant()
      const team = createMockTeam()
      const joinRequest = {
        id: 'request-1',
        participantId: participant.id,
        teamId: team.id,
        status: 'PENDING',
        team: {
          id: team.id,
          name: team.name,
          nickname: team.nickname,
        },
      }

      db.participant.findFirst.mockResolvedValue(participant)
      db.joinRequest.findUnique.mockResolvedValue(joinRequest)
      db.joinRequest.delete.mockResolvedValue(joinRequest)

      const response = await DELETE(
        createMockRequest('http://localhost:3000/api/teams/join-request/request-1/withdraw', {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: 'request-1' }) }
      )

      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.message).toBe('Join request withdrawn successfully')
      expect(db.joinRequest.delete).toHaveBeenCalledWith({
        where: { id: 'request-1' },
      })
    })

    it('should reject if join request not found', async () => {
      const participant = createMockParticipant()
      
      db.participant.findFirst.mockResolvedValue(participant)
      db.joinRequest.findUnique.mockResolvedValue(null)

      const response = await DELETE(
        createMockRequest('http://localhost:3000/api/teams/join-request/request-1/withdraw', {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: 'request-1' }) }
      )

      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBe('Join request not found')
    })

    it('should reject if not request owner', async () => {
      const participant = createMockParticipant({ id: 'participant-1' })
      const joinRequest = {
        id: 'request-1',
        participantId: 'participant-2', // Different participant
        teamId: 'team-1',
        status: 'PENDING',
        team: { id: 'team-1', name: 'Team 1', nickname: 'team1' },
      }

      db.participant.findFirst.mockResolvedValue(participant)
      db.joinRequest.findUnique.mockResolvedValue(joinRequest)

      const response = await DELETE(
        createMockRequest('http://localhost:3000/api/teams/join-request/request-1/withdraw', {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: 'request-1' }) }
      )

      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.error).toBe('Unauthorized to withdraw this request')
    })

    it('should reject if request is not pending', async () => {
      const participant = createMockParticipant()
      const joinRequest = {
        id: 'request-1',
        participantId: participant.id,
        teamId: 'team-1',
        status: 'APPROVED', // Not pending
        team: { id: 'team-1', name: 'Team 1', nickname: 'team1' },
      }

      db.participant.findFirst.mockResolvedValue(participant)
      db.joinRequest.findUnique.mockResolvedValue(joinRequest)

      const response = await DELETE(
        createMockRequest('http://localhost:3000/api/teams/join-request/request-1/withdraw', {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: 'request-1' }) }
      )

      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Only pending requests can be withdrawn')
    })
  })

  describe('Create Join Request Action', () => {
    it('should create join request successfully', async () => {
      mockCreateJoinRequest.mockResolvedValue({ id: 'request-1' })

      const result = await mockCreateJoinRequest('participant-1', 'team-1', 'Test message')

      expect(mockCreateJoinRequest).toHaveBeenCalledWith('participant-1', 'team-1', 'Test message')
      expect(result.id).toBe('request-1')
    })

    it('should handle API errors', async () => {
      mockCreateJoinRequest.mockRejectedValue(new Error('Team is full'))

      await expect(mockCreateJoinRequest('participant-1', 'team-1', 'Test message')).rejects.toThrow('Team is full')
    })
  })

  describe('Withdraw Join Request Action', () => {
    it('should withdraw join request successfully', async () => {
      mockWithdrawJoinRequest.mockResolvedValue({ success: true })

      const result = await mockWithdrawJoinRequest('request-1')

      expect(mockWithdrawJoinRequest).toHaveBeenCalledWith('request-1')
      expect(result.success).toBe(true)
    })

    it('should handle API errors', async () => {
      mockWithdrawJoinRequest.mockRejectedValue(new Error('Request not found'))

      await expect(mockWithdrawJoinRequest('request-1')).rejects.toThrow('Request not found')
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing hackathon', async () => {
      const participant = createMockParticipant({ teamId: null })
      const team = createMockTeam({ members: [createMockParticipant()], status: 'NEW' })
      
      db.participant.findFirst.mockResolvedValue(participant)
      db.team.findUnique.mockResolvedValue(team)
      db.hackathon.findFirst.mockResolvedValue(null)

      const request = createMockRequest('http://localhost:3000/api/teams/join-request', {
        method: 'POST',
        body: { teamId: team.id, message: 'Test message' },
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('No active hackathon found')
    })

    it('should handle database errors gracefully', async () => {
      db.participant.findFirst.mockRejectedValue(new Error('Database connection failed'))

      const request = createMockRequest('http://localhost:3000/api/teams/join-request', {
        method: 'POST',
        body: { teamId: 'team-1', message: 'Test message' },
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Internal server error')
    })

    it('should handle validation errors', async () => {
      const request = createMockRequest('http://localhost:3000/api/teams/join-request', {
        method: 'POST',
        body: { teamId: '', message: 'Test message' }, // Empty team ID
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Invalid request data')
    })
  })
})