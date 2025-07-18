import { getTeamJoinError, getJoinBlockReason, JoinErrorCode, teamJoinErrors } from '@/lib/team-join-errors'
import { createMockParticipant, createMockTeam, createMockHackathon } from '../utils/test-helpers'

describe('Team Join Error Handling', () => {
  describe('getTeamJoinError', () => {
    it('should map common error messages to specific error codes', () => {
      const testCases = [
        { message: 'Participant not found', expectedCode: JoinErrorCode.PARTICIPANT_NOT_FOUND },
        { message: 'Участник не найден', expectedCode: JoinErrorCode.PARTICIPANT_NOT_FOUND },
        { message: 'Your account is inactive', expectedCode: JoinErrorCode.ACCOUNT_INACTIVE },
        { message: 'You are already in a team', expectedCode: JoinErrorCode.ALREADY_IN_TEAM },
        { message: 'Team not found', expectedCode: JoinErrorCode.TEAM_NOT_FOUND },
        { message: 'Team is full', expectedCode: JoinErrorCode.TEAM_FULL },
        { message: 'Team is not accepting new members', expectedCode: JoinErrorCode.TEAM_NOT_ACCEPTING },
        { message: 'You already have a pending request', expectedCode: JoinErrorCode.EXISTING_REQUEST },
        { message: 'No active hackathon found', expectedCode: JoinErrorCode.NO_ACTIVE_HACKATHON },
        { message: 'Unauthorized', expectedCode: JoinErrorCode.UNAUTHORIZED },
        { message: 'Invalid request data', expectedCode: JoinErrorCode.VALIDATION_ERROR },
        { message: 'Some unknown error', expectedCode: JoinErrorCode.UNKNOWN_ERROR },
      ]

      testCases.forEach(({ message, expectedCode }) => {
        const error = getTeamJoinError(message)
        expect(error.code).toBe(expectedCode)
        expect(error.message).toBeTruthy()
        expect(error.description).toBeTruthy()
      })
    })

    it('should return proper error structure', () => {
      const error = getTeamJoinError('Team is full')
      
      expect(error).toHaveProperty('code')
      expect(error).toHaveProperty('message')
      expect(error).toHaveProperty('description')
      expect(error).toHaveProperty('suggestion')
      expect(error).toHaveProperty('severity')
      expect(['error', 'warning', 'info']).toContain(error.severity)
    })
  })

  describe('getJoinBlockReason', () => {
    it('should return null when participant can join', () => {
      const participant = createMockParticipant({ teamId: null, isActive: true })
      const team = createMockTeam({ members: [createMockParticipant()], status: 'NEW' })
      const hackathon = createMockHackathon()

      const reason = getJoinBlockReason(participant, team, hackathon)
      expect(reason).toBeNull()
    })

    it('should detect participant not found', () => {
      const reason = getJoinBlockReason(null, createMockTeam(), createMockHackathon())
      expect(reason?.code).toBe(JoinErrorCode.PARTICIPANT_NOT_FOUND)
    })

    it('should detect inactive account', () => {
      const participant = createMockParticipant({ isActive: false })
      const reason = getJoinBlockReason(participant, createMockTeam(), createMockHackathon())
      expect(reason?.code).toBe(JoinErrorCode.ACCOUNT_INACTIVE)
    })

    it('should detect already in team', () => {
      const participant = createMockParticipant({ teamId: 'existing-team' })
      const reason = getJoinBlockReason(participant, createMockTeam(), createMockHackathon())
      expect(reason?.code).toBe(JoinErrorCode.ALREADY_IN_TEAM)
    })

    it('should detect team not found', () => {
      const participant = createMockParticipant({ teamId: null })
      const reason = getJoinBlockReason(participant, null, createMockHackathon())
      expect(reason?.code).toBe(JoinErrorCode.TEAM_NOT_FOUND)
    })

    it('should detect team full', () => {
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
      const reason = getJoinBlockReason(participant, team, createMockHackathon())
      expect(reason?.code).toBe(JoinErrorCode.TEAM_FULL)
    })

    it('should detect team not accepting members', () => {
      const participant = createMockParticipant({ teamId: null })
      const team = createMockTeam({ members: [createMockParticipant()], status: 'FINISHED' })
      const reason = getJoinBlockReason(participant, team, createMockHackathon())
      expect(reason?.code).toBe(JoinErrorCode.TEAM_NOT_ACCEPTING)
    })

    it('should detect existing request', () => {
      const participant = createMockParticipant({ teamId: null })
      const team = createMockTeam({ members: [createMockParticipant()], status: 'NEW' })
      const hackathon = createMockHackathon()
      const existingRequest = { id: 'request-1', status: 'PENDING' }

      const reason = getJoinBlockReason(participant, team, hackathon, existingRequest)
      expect(reason?.code).toBe(JoinErrorCode.EXISTING_REQUEST)
    })

    it('should detect no active hackathon', () => {
      const participant = createMockParticipant({ teamId: null })
      const team = createMockTeam({ members: [createMockParticipant()], status: 'NEW' })
      const reason = getJoinBlockReason(participant, team, null)
      expect(reason?.code).toBe(JoinErrorCode.NO_ACTIVE_HACKATHON)
    })

    it('should detect wrong hackathon', () => {
      const participant = createMockParticipant({ teamId: null })
      const team = createMockTeam({
        members: [createMockParticipant()],
        status: 'NEW',
        hackathonId: 'hackathon-1',
      })
      const hackathon = createMockHackathon({ id: 'hackathon-2' })

      const reason = getJoinBlockReason(participant, team, hackathon)
      expect(reason?.code).toBe(JoinErrorCode.WRONG_HACKATHON)
    })

    it('should check conditions in correct priority order', () => {
      // Multiple issues - should return the first one encountered
      const participant = createMockParticipant({ teamId: null, isActive: false })
      const team = createMockTeam({
        members: [
          createMockParticipant(),
          createMockParticipant(),
          createMockParticipant(),
          createMockParticipant(),
        ],
        status: 'FINISHED',
      })
      const hackathon = createMockHackathon()

      const reason = getJoinBlockReason(participant, team, hackathon)
      // Should return inactive account first (checked before team issues)
      expect(reason?.code).toBe(JoinErrorCode.ACCOUNT_INACTIVE)
    })
  })

  describe('Error Definitions', () => {
    it('should have all error codes defined', () => {
      Object.values(JoinErrorCode).forEach(code => {
        expect(teamJoinErrors).toHaveProperty(code)
        const error = teamJoinErrors[code as JoinErrorCode]
        expect(error.code).toBe(code)
        expect(error.message).toBeTruthy()
        expect(error.description).toBeTruthy()
        expect(['error', 'warning', 'info']).toContain(error.severity)
      })
    })

    it('should have appropriate severity levels', () => {
      expect(teamJoinErrors[JoinErrorCode.PARTICIPANT_NOT_FOUND].severity).toBe('error')
      expect(teamJoinErrors[JoinErrorCode.ACCOUNT_INACTIVE].severity).toBe('error')
      expect(teamJoinErrors[JoinErrorCode.ALREADY_IN_TEAM].severity).toBe('warning')
      expect(teamJoinErrors[JoinErrorCode.TEAM_FULL].severity).toBe('warning')
      expect(teamJoinErrors[JoinErrorCode.TEAM_NOT_ACCEPTING].severity).toBe('warning')
      expect(teamJoinErrors[JoinErrorCode.EXISTING_REQUEST].severity).toBe('info')
      expect(teamJoinErrors[JoinErrorCode.UNAUTHORIZED].severity).toBe('error')
    })

    it('should have helpful suggestions', () => {
      expect(teamJoinErrors[JoinErrorCode.PARTICIPANT_NOT_FOUND].suggestion).toContain('профиль участника')
      expect(teamJoinErrors[JoinErrorCode.ACCOUNT_INACTIVE].suggestion).toContain('администратору')
      expect(teamJoinErrors[JoinErrorCode.ALREADY_IN_TEAM].suggestion).toContain('Покиньте')
      expect(teamJoinErrors[JoinErrorCode.TEAM_FULL].suggestion).toContain('другую команду')
      expect(teamJoinErrors[JoinErrorCode.TEAM_NOT_ACCEPTING].suggestion).toContain('статусом')
      expect(teamJoinErrors[JoinErrorCode.EXISTING_REQUEST].suggestion).toContain('отмените')
    })
  })

  describe('Error Message Localization', () => {
    it('should support both English and Russian error messages', () => {
      const englishError = getTeamJoinError('Team not found')
      const russianError = getTeamJoinError('Команда не найдена')

      expect(englishError.code).toBe(JoinErrorCode.TEAM_NOT_FOUND)
      expect(russianError.code).toBe(JoinErrorCode.TEAM_NOT_FOUND)
      expect(englishError.message).toBe(russianError.message)
    })

    it('should handle partial message matches', () => {
      const error = getTeamJoinError('Error: Team is full (capacity exceeded)')
      expect(error.code).toBe(JoinErrorCode.TEAM_FULL)
    })

    it('should fallback to unknown error for unrecognized messages', () => {
      const error = getTeamJoinError('This is a completely unknown error message')
      expect(error.code).toBe(JoinErrorCode.UNKNOWN_ERROR)
    })
  })

  describe('Real-world Scenarios', () => {
    it('should handle complex team eligibility check', () => {
      const scenarios = [
        {
          name: 'Perfect conditions for joining',
          participant: createMockParticipant({ teamId: null, isActive: true }),
          team: createMockTeam({ members: [createMockParticipant()], status: 'NEW' }),
          hackathon: createMockHackathon(),
          existingRequest: null,
          expectedError: null,
        },
        {
          name: 'Team at capacity',
          participant: createMockParticipant({ teamId: null, isActive: true }),
          team: createMockTeam({
            members: [
              createMockParticipant(),
              createMockParticipant(),
              createMockParticipant(),
              createMockParticipant(),
            ],
            status: 'NEW',
          }),
          hackathon: createMockHackathon(),
          existingRequest: null,
          expectedError: JoinErrorCode.TEAM_FULL,
        },
        {
          name: 'Team not accepting new members',
          participant: createMockParticipant({ teamId: null, isActive: true }),
          team: createMockTeam({ members: [createMockParticipant()], status: 'FINISHED' }),
          hackathon: createMockHackathon(),
          existingRequest: null,
          expectedError: JoinErrorCode.TEAM_NOT_ACCEPTING,
        },
        {
          name: 'Participant already has pending request',
          participant: createMockParticipant({ teamId: null, isActive: true }),
          team: createMockTeam({ members: [createMockParticipant()], status: 'NEW' }),
          hackathon: createMockHackathon(),
          existingRequest: { id: 'request-1', status: 'PENDING' },
          expectedError: JoinErrorCode.EXISTING_REQUEST,
        },
      ]

      scenarios.forEach(({ name, participant, team, hackathon, existingRequest, expectedError }) => {
        const reason = getJoinBlockReason(participant, team, hackathon, existingRequest)
        if (expectedError) {
          expect(reason?.code).toBe(expectedError)
        } else {
          expect(reason).toBeNull()
        }
      })
    })

    it('should provide actionable error messages', () => {
      const error = getTeamJoinError('Team is full')
      expect(error.message).toBe('Команда переполнена')
      expect(error.description).toContain('максимальное количество участников')
      expect(error.suggestion).toContain('другую команду')
      expect(error.severity).toBe('warning')
    })
  })
})