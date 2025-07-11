import { GET as participantsListGET } from '@/app/api/participants/route';
import { auth } from '@/auth';
import { isOrganizer } from '@/lib/admin';
import { db } from '@/lib/db';
import {
  setupMocks,
  resetMocks,
  createMockRequest,
  createMockSession,
  createAdminSession,
  createMockUser,
  createMockParticipant,
  createMockTeam,
} from '../utils/test-helpers';

// Mock dependencies
jest.mock('@/auth');
jest.mock('@/lib/admin');
jest.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    participant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    team: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    hackathon: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('Public Profile Access', () => {
  beforeEach(() => {
    setupMocks();
  });

  afterEach(() => {
    resetMocks();
  });

  describe('Positive Scenarios', () => {
    // TC-PUBLIC-002: Participant List for Admin
    describe('TC-PUBLIC-002: Participant List for Admin', () => {
      it('should return all participants for admin users', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const mockParticipants = [
          createMockParticipant({
            id: 'participant-1',
            name: 'John Doe',
            email: 'john@example.com',
            city: 'New York',
            company: 'TechCorp',
            experienceLevel: 'INTERMEDIATE',
            team: createMockTeam({ name: 'Team Alpha' }),
          }),
          createMockParticipant({
            id: 'participant-2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            city: 'San Francisco',
            company: 'StartupInc',
            experienceLevel: 'ADVANCED',
            team: null,
          }),
        ];

        (db.participant.findMany as jest.Mock).mockResolvedValue(mockParticipants);

        const request = createMockRequest(
          'http://localhost:3000/api/participants?hackathonId=hackathon-1'
        );

        const response = await participantsListGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.participants).toHaveLength(2);
        expect(data.participants[0].name).toBe('John Doe');
        expect(data.participants[0].team).toBeDefined();
        expect(data.participants[1].team).toBeNull();

        expect(db.participant.findMany).toHaveBeenCalledWith({
          where: {
            hackathonParticipations: {
              some: {
                hackathonId: 'hackathon-1',
              },
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
            city: true,
            company: true,
            experienceLevel: true,
            teamId: true,
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            name: 'asc',
          },
        });
      });

      it('should filter participants by hackathon ID', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const hackathon1Participants = [
          createMockParticipant({ name: 'Participant 1' }),
        ];

        (db.participant.findMany as jest.Mock).mockResolvedValue(hackathon1Participants);

        const request = createMockRequest(
          'http://localhost:3000/api/participants?hackathonId=hackathon-1'
        );

        const response = await participantsListGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.participants).toHaveLength(1);
        expect(db.participant.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              hackathonParticipations: {
                some: {
                  hackathonId: 'hackathon-1',
                },
              },
            },
          })
        );
      });

      it('should return participants sorted by name', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const sortedParticipants = [
          createMockParticipant({ name: 'Alice' }),
          createMockParticipant({ name: 'Bob' }),
          createMockParticipant({ name: 'Charlie' }),
        ];

        (db.participant.findMany as jest.Mock).mockResolvedValue(sortedParticipants);

        const request = createMockRequest(
          'http://localhost:3000/api/participants?hackathonId=hackathon-1'
        );

        const response = await participantsListGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.participants[0].name).toBe('Alice');
        expect(data.participants[1].name).toBe('Bob');
        expect(data.participants[2].name).toBe('Charlie');

        expect(db.participant.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: {
              name: 'asc',
            },
          })
        );
      });
    });
  });

  describe('Negative Scenarios', () => {
    // TC-PUBLIC-004: Non-Admin Access to Admin Endpoints
    describe('TC-PUBLIC-004: Non-Admin Access to Admin Endpoints', () => {
      it('should return 403 for non-admin users', async () => {
        (auth as jest.Mock).mockResolvedValue(createMockSession());
        (isOrganizer as jest.Mock).mockResolvedValue(false);

        const request = createMockRequest(
          'http://localhost:3000/api/participants?hackathonId=hackathon-1'
        );

        const response = await participantsListGET(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Access denied');
        expect(db.participant.findMany).not.toHaveBeenCalled();
      });

      it('should check organizer status correctly', async () => {
        const participantSession = createMockSession({
          user: { email: 'participant@test.com', role: 'participant' },
        });

        (auth as jest.Mock).mockResolvedValue(participantSession);
        (isOrganizer as jest.Mock).mockResolvedValue(false);

        const request = createMockRequest(
          'http://localhost:3000/api/participants?hackathonId=hackathon-1'
        );

        const response = await participantsListGET(request);

        expect(response.status).toBe(403);
        expect(isOrganizer).toHaveBeenCalledWith('participant@test.com');
      });
    });

    // TC-PUBLIC-005: Unauthenticated Admin Endpoint Access
    describe('TC-PUBLIC-005: Unauthenticated Admin Endpoint Access', () => {
      it('should return 401 for unauthenticated requests', async () => {
        (auth as jest.Mock).mockResolvedValue(null);

        const request = createMockRequest(
          'http://localhost:3000/api/participants?hackathonId=hackathon-1'
        );

        const response = await participantsListGET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
        expect(db.participant.findMany).not.toHaveBeenCalled();
      });

      it('should return 401 when session has no email', async () => {
        (auth as jest.Mock).mockResolvedValue({
          user: { name: 'User' }, // No email
        });

        const request = createMockRequest(
          'http://localhost:3000/api/participants?hackathonId=hackathon-1'
        );

        const response = await participantsListGET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });
    });

    // TC-PUBLIC-006: Invalid Hackathon ID
    describe('TC-PUBLIC-006: Invalid Hackathon ID', () => {
      it('should return empty results for non-existent hackathon', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        (db.participant.findMany as jest.Mock).mockResolvedValue([]);

        const request = createMockRequest(
          'http://localhost:3000/api/participants?hackathonId=invalid-id'
        );

        const response = await participantsListGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.participants).toHaveLength(0);
        expect(db.participant.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              hackathonParticipations: {
                some: {
                  hackathonId: 'invalid-id',
                },
              },
            },
          })
        );
      });
    });

    // TC-PUBLIC-007: Missing Hackathon ID
    describe('TC-PUBLIC-007: Missing Hackathon ID', () => {
      it('should return 400 when hackathonId parameter is missing', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const request = createMockRequest(
          'http://localhost:3000/api/participants'
        );

        const response = await participantsListGET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Hackathon ID is required');
        expect(db.participant.findMany).not.toHaveBeenCalled();
      });

      it('should return 400 when hackathonId is empty string', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const request = createMockRequest(
          'http://localhost:3000/api/participants?hackathonId='
        );

        const response = await participantsListGET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Hackathon ID is required');
      });
    });
  });

  describe('Edge Cases', () => {
    // TC-PUBLIC-008: Participant with No Team
    describe('TC-PUBLIC-008: Participant with No Team', () => {
      it('should return null team information for teamless participants', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const teamlessParticipant = createMockParticipant({
          teamId: null,
          team: null,
        });

        (db.participant.findMany as jest.Mock).mockResolvedValue([teamlessParticipant]);

        const request = createMockRequest(
          'http://localhost:3000/api/participants?hackathonId=hackathon-1'
        );

        const response = await participantsListGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.participants[0].team).toBeNull();
        expect(data.participants[0].teamId).toBeNull();
      });
    });

    // TC-PUBLIC-009: Team Leader Profile
    describe('TC-PUBLIC-009: Team Leader Profile', () => {
      it('should include team information for team leaders', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const team = createMockTeam({
          id: 'team-1',
          name: 'Leadership Team',
          leaderId: 'participant-1',
        });

        const teamLeader = createMockParticipant({
          id: 'participant-1',
          name: 'Team Leader',
          teamId: team.id,
          ledTeamId: team.id,
          team: team,
        });

        (db.participant.findMany as jest.Mock).mockResolvedValue([teamLeader]);

        const request = createMockRequest(
          'http://localhost:3000/api/participants?hackathonId=hackathon-1'
        );

        const response = await participantsListGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.participants[0].team).toBeDefined();
        expect(data.participants[0].team.id).toBe('team-1');
        expect(data.participants[0].team.name).toBe('Leadership Team');
      });
    });

    // TC-PUBLIC-010: Deleted Team Reference
    describe('TC-PUBLIC-010: Deleted Team Reference', () => {
      it('should handle participants with invalid team references', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const participantWithDeletedTeam = createMockParticipant({
          teamId: 'deleted-team-id',
          team: null, // Team was deleted but teamId still set
        });

        (db.participant.findMany as jest.Mock).mockResolvedValue([participantWithDeletedTeam]);

        const request = createMockRequest(
          'http://localhost:3000/api/participants?hackathonId=hackathon-1'
        );

        const response = await participantsListGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.participants[0].teamId).toBe('deleted-team-id');
        expect(data.participants[0].team).toBeNull();
      });
    });

    // Database Error Handling
    describe('Database Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        (db.participant.findMany as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

        const request = createMockRequest(
          'http://localhost:3000/api/participants?hackathonId=hackathon-1'
        );

        const response = await participantsListGET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');
      });
    });

    // Large Dataset Handling
    describe('Large Dataset Handling', () => {
      it('should handle large numbers of participants', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const largeParticipantList = Array.from({ length: 1000 }, (_, i) =>
          createMockParticipant({
            id: `participant-${i}`,
            name: `Participant ${i}`,
            email: `participant${i}@test.com`,
          })
        );

        (db.participant.findMany as jest.Mock).mockResolvedValue(largeParticipantList);

        const request = createMockRequest(
          'http://localhost:3000/api/participants?hackathonId=hackathon-1'
        );

        const startTime = Date.now();
        const response = await participantsListGET(request);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.participants).toHaveLength(1000);
        // Response should complete within reasonable time (5 seconds)
        expect(responseTime).toBeLessThan(5000);
      });
    });

    // Participant Privacy Filtering
    describe('Participant Privacy Filtering', () => {
      it('should return only selected fields for privacy', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const participant = createMockParticipant({
          name: 'Public User',
          email: 'public@test.com',
          // Sensitive fields that should be filtered
          telegram: '@secret_handle',
          githubUrl: 'https://github.com/secret',
        });

        (db.participant.findMany as jest.Mock).mockResolvedValue([participant]);

        const request = createMockRequest(
          'http://localhost:3000/api/participants?hackathonId=hackathon-1'
        );

        const response = await participantsListGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.participants[0]).toHaveProperty('name');
        expect(data.participants[0]).toHaveProperty('email');
        expect(data.participants[0]).toHaveProperty('city');
        expect(data.participants[0]).toHaveProperty('company');
        expect(data.participants[0]).toHaveProperty('experienceLevel');

        // Verify only selected fields are included as per API specification
        expect(db.participant.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            select: {
              id: true,
              name: true,
              email: true,
              city: true,
              company: true,
              experienceLevel: true,
              teamId: true,
              team: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          })
        );
      });
    });

    // Multiple Hackathon Participation
    describe('Multiple Hackathon Participation', () => {
      it('should filter participants correctly for specific hackathon', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const participantsForHackathon1 = [
          createMockParticipant({ name: 'Hackathon 1 Participant' }),
        ];

        (db.participant.findMany as jest.Mock).mockResolvedValue(participantsForHackathon1);

        const request = createMockRequest(
          'http://localhost:3000/api/participants?hackathonId=specific-hackathon'
        );

        const response = await participantsListGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.participants).toHaveLength(1);

        // Verify the correct filtering logic is applied
        expect(db.participant.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              hackathonParticipations: {
                some: {
                  hackathonId: 'specific-hackathon',
                },
              },
            },
          })
        );
      });
    });

    // Team Status and Information
    describe('Team Status and Information', () => {
      it('should include complete team information when available', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const team = createMockTeam({
          id: 'team-full-info',
          name: 'Complete Team Info',
        });

        const participant = createMockParticipant({
          name: 'Team Member',
          team: team,
          teamId: team.id,
        });

        (db.participant.findMany as jest.Mock).mockResolvedValue([participant]);

        const request = createMockRequest(
          'http://localhost:3000/api/participants?hackathonId=hackathon-1'
        );

        const response = await participantsListGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.participants[0].team).toMatchObject({
          id: 'team-full-info',
          name: 'Complete Team Info',
        });
      });
    });
  });
});