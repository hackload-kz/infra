import { PUT } from '@/app/api/participants/[id]/route';
import { auth } from '@/auth';
import { isOrganizer } from '@/lib/admin';
import { db } from '@/lib/db';
import {
  setupMocks,
  resetMocks,
  createMockRequest,
  createMockSession,
  createAdminSession,
  createMockParticipant,
  createMockTeam,
  createConcurrentRequests,
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

describe('Internal Participant Data', () => {
  beforeEach(() => {
    setupMocks();
  });

  afterEach(() => {
    resetMocks();
  });

  describe('Positive Scenarios', () => {
    // TC-INTERNAL-001: Admin Participant Management
    describe('TC-INTERNAL-001: Admin Participant Management', () => {
      it('should allow admin to update any participant profile', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const originalParticipant = createMockParticipant({
          id: 'participant-1',
          name: 'Original Name',
          experienceLevel: 'BEGINNER',
          teamId: 'old-team-id',
        });

        const updatedParticipant = createMockParticipant({
          id: 'participant-1',
          name: 'Admin Updated Name',
          experienceLevel: 'ADVANCED',
          teamId: 'new-team-id',
          technologies: JSON.stringify(['Updated', 'Tech', 'Stack']),
          cloudServices: JSON.stringify(['AWS', 'Azure']),
        });

        (db.participant.findUnique as jest.Mock).mockResolvedValue(originalParticipant);
        (db.participant.update as jest.Mock).mockResolvedValue(updatedParticipant);

        const requestBody = {
          name: 'Admin Updated Name',
          city: 'Test City',
          company: 'Test Company',
          githubUrl: 'https://github.com/test',
          linkedinUrl: 'https://linkedin.com/in/test',
          experienceLevel: 'ADVANCED',
          technologies: ['Updated', 'Tech', 'Stack'],
          cloudServices: ['AWS', 'Azure'],
          cloudProviders: ['AWS', 'GCP'],
          otherTechnologies: 'Other tech',
          otherCloudServices: 'Other services',
          otherCloudProviders: 'Other providers',
          programmingLanguages: ['JavaScript', 'Python'],
          databases: ['PostgreSQL', 'MongoDB'],
          description: 'Test description',
          teamId: 'new-team-id',
          isActive: true,
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participants/participant-1',
          { method: 'PUT', body: requestBody }
        );

        // Mock params resolution
        const mockParams = Promise.resolve({ id: 'participant-1' });

        const response = await PUT(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.name).toBe('Admin Updated Name');
        expect(data.experienceLevel).toBe('ADVANCED');
        expect(data.teamId).toBe('new-team-id');

        expect(db.participant.update).toHaveBeenCalledWith({
          where: { id: 'participant-1' },
          data: expect.objectContaining({
            name: 'Admin Updated Name',
            experienceLevel: 'ADVANCED',
            technologies: JSON.stringify(['Updated', 'Tech', 'Stack']),
            cloudServices: JSON.stringify(['AWS', 'Azure']),
            teamId: 'new-team-id',
            programmingLanguages: ['JavaScript', 'Python'],
            databases: ['PostgreSQL', 'MongoDB'],
            description: 'Test description',
            isActive: true,
          }),
        });
      });

      it('should handle all participant fields for admin updates', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const participant = createMockParticipant({ id: 'participant-1' });
        (db.participant.findUnique as jest.Mock).mockResolvedValue(participant);

        const updatedParticipant = createMockParticipant({
          id: 'participant-1',
          name: 'Complete Update',
          city: 'New City',
          company: 'New Company',
          githubUrl: 'https://github.com/newuser',
          linkedinUrl: 'https://linkedin.com/in/newuser',
          experienceLevel: 'EXPERT',
          technologies: JSON.stringify(['React', 'Vue', 'Angular']),
          cloudServices: JSON.stringify(['AWS', 'GCP', 'Azure']),
          cloudProviders: JSON.stringify(['Amazon', 'Google', 'Microsoft']),
          otherTechnologies: 'Django, Flask',
          otherCloudServices: 'Kubernetes, Docker',
          otherCloudProviders: 'DigitalOcean, Linode',
          teamId: 'target-team',
        });

        (db.participant.update as jest.Mock).mockResolvedValue(updatedParticipant);

        const requestBody = {
          name: 'Complete Update',
          city: 'New City',
          company: 'New Company',
          githubUrl: 'https://github.com/newuser',
          linkedinUrl: 'https://linkedin.com/in/newuser',
          experienceLevel: 'EXPERT',
          technologies: ['React', 'Vue', 'Angular'],
          cloudServices: ['AWS', 'GCP', 'Azure'],
          cloudProviders: ['Amazon', 'Google', 'Microsoft'],
          otherTechnologies: 'Django, Flask',
          otherCloudServices: 'Kubernetes, Docker',
          otherCloudProviders: 'DigitalOcean, Linode',
          programmingLanguages: ['JavaScript', 'Python', 'TypeScript'],
          databases: ['PostgreSQL', 'MongoDB', 'Redis'],
          description: 'Complete test description',
          teamId: 'target-team',
          isActive: true,
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participants/participant-1',
          { method: 'PUT', body: requestBody }
        );

        const mockParams = Promise.resolve({ id: 'participant-1' });
        const response = await PUT(request, { params: mockParams });

        expect(response.status).toBe(200);
        expect(db.participant.update).toHaveBeenCalledWith({
          where: { id: 'participant-1' },
          data: expect.objectContaining({
            name: 'Complete Update',
            city: 'New City',
            company: 'New Company',
            githubUrl: 'https://github.com/newuser',
            linkedinUrl: 'https://linkedin.com/in/newuser',
            experienceLevel: 'EXPERT',
            teamId: 'target-team',
          }),
        });
      });
    });

    // TC-INTERNAL-002: Admin Team Assignment
    describe('TC-INTERNAL-002: Admin Team Assignment', () => {
      it('should allow admin to assign participant to different team', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const participant = createMockParticipant({
          id: 'participant-1',
          teamId: 'old-team-id',
        });

        const updatedParticipant = createMockParticipant({
          id: 'participant-1',
          teamId: 'target-team-id',
        });

        (db.participant.findUnique as jest.Mock).mockResolvedValue(participant);
        (db.participant.update as jest.Mock).mockResolvedValue(updatedParticipant);

        const requestBody = {
          name: 'Participant Name',
          city: 'Test City',
          company: 'Test Company',
          githubUrl: 'https://github.com/test',
          linkedinUrl: 'https://linkedin.com/in/test',
          experienceLevel: 'BEGINNER',
          technologies: ['JavaScript'],
          cloudServices: ['AWS'],
          cloudProviders: ['Amazon'],
          otherTechnologies: '',
          otherCloudServices: '',
          otherCloudProviders: '',
          programmingLanguages: ['JavaScript'],
          databases: ['PostgreSQL'],
          description: 'Test description',
          teamId: 'target-team-id',
          isActive: true,
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participants/participant-1',
          { method: 'PUT', body: requestBody }
        );

        const mockParams = Promise.resolve({ id: 'participant-1' });
        const response = await PUT(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.teamId).toBe('target-team-id');

        expect(db.participant.update).toHaveBeenCalledWith({
          where: { id: 'participant-1' },
          data: expect.objectContaining({
            teamId: 'target-team-id',
          }),
        });
      });

      it('should handle team assignment with validation', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const participant = createMockParticipant({ id: 'participant-1' });
        const targetTeam = createMockTeam({ id: 'valid-team-id' });

        (db.participant.findUnique as jest.Mock).mockResolvedValue(participant);
        (db.team.findUnique as jest.Mock).mockResolvedValue(targetTeam);

        const updatedParticipant = createMockParticipant({
          id: 'participant-1',
          teamId: 'valid-team-id',
        });
        (db.participant.update as jest.Mock).mockResolvedValue(updatedParticipant);

        const requestBody = {
          name: 'Participant Name',
          city: 'Test City',
          company: 'Test Company',
          githubUrl: 'https://github.com/test',
          linkedinUrl: 'https://linkedin.com/in/test',
          experienceLevel: 'BEGINNER',
          technologies: ['JavaScript'],
          cloudServices: ['AWS'],
          cloudProviders: ['Amazon'],
          otherTechnologies: '',
          otherCloudServices: '',
          otherCloudProviders: '',
          programmingLanguages: ['JavaScript'],
          databases: ['PostgreSQL'],
          description: 'Test description',
          teamId: 'valid-team-id',
          isActive: true,
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participants/participant-1',
          { method: 'PUT', body: requestBody }
        );

        const mockParams = Promise.resolve({ id: 'participant-1' });
        const response = await PUT(request, { params: mockParams });

        expect(response.status).toBe(200);
        expect(db.participant.update).toHaveBeenCalledWith({
          where: { id: 'participant-1' },
          data: expect.objectContaining({
            teamId: 'valid-team-id',
          }),
        });
      });
    });

    // TC-INTERNAL-003: Admin Remove Team Assignment
    describe('TC-INTERNAL-003: Admin Remove Team Assignment', () => {
      it('should allow admin to remove participant from team', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const participant = createMockParticipant({
          id: 'participant-1',
          teamId: 'current-team-id',
        });

        const updatedParticipant = createMockParticipant({
          id: 'participant-1',
          teamId: null,
        });

        (db.participant.findUnique as jest.Mock).mockResolvedValue(participant);
        (db.participant.update as jest.Mock).mockResolvedValue(updatedParticipant);

        const requestBody = {
          name: 'Participant Name',
          city: 'Test City',
          company: 'Test Company',
          githubUrl: 'https://github.com/test',
          linkedinUrl: 'https://linkedin.com/in/test',
          experienceLevel: 'BEGINNER',
          technologies: ['JavaScript'],
          cloudServices: ['AWS'],
          cloudProviders: ['Amazon'],
          otherTechnologies: '',
          otherCloudServices: '',
          otherCloudProviders: '',
          programmingLanguages: ['JavaScript'],
          databases: ['PostgreSQL'],
          description: 'Test description',
          teamId: null,
          isActive: true,
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participants/participant-1',
          { method: 'PUT', body: requestBody }
        );

        const mockParams = Promise.resolve({ id: 'participant-1' });
        const response = await PUT(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.teamId).toBeNull();

        expect(db.participant.update).toHaveBeenCalledWith({
          where: { id: 'participant-1' },
          data: expect.objectContaining({
            teamId: null,
          }),
        });
      });
    });
  });

  describe('Negative Scenarios', () => {
    // TC-INTERNAL-004: Non-Admin Internal Access
    describe('TC-INTERNAL-004: Non-Admin Internal Access', () => {
      it('should return 401 for non-admin users', async () => {
        (auth as jest.Mock).mockResolvedValue(createMockSession());
        (isOrganizer as jest.Mock).mockResolvedValue(false);

        const requestBody = {
          name: 'Unauthorized Update',
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participants/participant-1',
          { method: 'PUT', body: requestBody }
        );

        const mockParams = Promise.resolve({ id: 'participant-1' });
        const response = await PUT(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
        expect(db.participant.update).not.toHaveBeenCalled();
      });

      it('should verify admin status correctly', async () => {
        const regularUserSession = createMockSession({
          user: { email: 'user@test.com', role: 'participant' },
        });

        (auth as jest.Mock).mockResolvedValue(regularUserSession);
        (isOrganizer as jest.Mock).mockResolvedValue(false);

        const request = createMockRequest(
          'http://localhost:3000/api/participants/participant-1',
          { method: 'PUT', body: { name: 'Test' } }
        );

        const mockParams = Promise.resolve({ id: 'participant-1' });
        const response = await PUT(request, { params: mockParams });

        expect(response.status).toBe(401);
        expect(isOrganizer).toHaveBeenCalledWith('user@test.com');
      });
    });

    // TC-INTERNAL-005: Update Non-existent Participant
    describe('TC-INTERNAL-005: Update Non-existent Participant', () => {
      it('should return 404 for non-existent participant', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        (db.participant.findUnique as jest.Mock).mockResolvedValue(null);

        const requestBody = {
          name: 'Non-existent Update',
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participants/invalid-id',
          { method: 'PUT', body: requestBody }
        );

        const mockParams = Promise.resolve({ id: 'invalid-id' });
        const response = await PUT(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Participant not found');
        expect(db.participant.update).not.toHaveBeenCalled();
      });
    });

    // TC-INTERNAL-006: Invalid Team Assignment
    describe('TC-INTERNAL-006: Invalid Team Assignment', () => {
      it('should handle assignment to non-existent team', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const participant = createMockParticipant({ id: 'participant-1' });
        (db.participant.findUnique as jest.Mock).mockResolvedValue(participant);

        // Mock database constraint error for invalid team reference
        (db.participant.update as jest.Mock).mockRejectedValue(
          new Error('Foreign key constraint failed on the field: `teamId`')
        );

        const requestBody = {
          name: 'Participant Name',
          teamId: 'non-existent-team-id',
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participants/participant-1',
          { method: 'PUT', body: requestBody }
        );

        const mockParams = Promise.resolve({ id: 'participant-1' });
        const response = await PUT(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');
      });
    });

    // Unauthenticated Access
    describe('Unauthenticated Access', () => {
      it('should return 401 for unauthenticated requests', async () => {
        (auth as jest.Mock).mockResolvedValue(null);

        const request = createMockRequest(
          'http://localhost:3000/api/participants/participant-1',
          { method: 'PUT', body: { name: 'Test' } }
        );

        const mockParams = Promise.resolve({ id: 'participant-1' });
        const response = await PUT(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });

      it('should return 401 when session has no email', async () => {
        (auth as jest.Mock).mockResolvedValue({
          user: { name: 'User' }, // No email
        });

        const request = createMockRequest(
          'http://localhost:3000/api/participants/participant-1',
          { method: 'PUT', body: { name: 'Test' } }
        );

        const mockParams = Promise.resolve({ id: 'participant-1' });
        const response = await PUT(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });
    });
  });

  describe('Edge Cases', () => {
    // TC-INTERNAL-007: Admin Self-Update
    describe('TC-INTERNAL-007: Admin Self-Update', () => {
      it('should allow admin to update their own participant profile', async () => {
        const adminSession = createAdminSession();
        (auth as jest.Mock).mockResolvedValue(adminSession);
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const adminParticipant = createMockParticipant({
          id: 'admin-participant-1',
          email: 'admin@hackload.kz',
          name: 'Admin User',
        });

        const updatedAdminParticipant = createMockParticipant({
          id: 'admin-participant-1',
          email: 'admin@hackload.kz',
          name: 'Updated Admin User',
          experienceLevel: 'EXPERT',
        });

        (db.participant.findUnique as jest.Mock).mockResolvedValue(adminParticipant);
        (db.participant.update as jest.Mock).mockResolvedValue(updatedAdminParticipant);

        const requestBody = {
          name: 'Updated Admin User',
          city: 'Admin City',
          company: 'Admin Company',
          githubUrl: 'https://github.com/admin',
          linkedinUrl: 'https://linkedin.com/in/admin',
          experienceLevel: 'EXPERT',
          technologies: ['JavaScript', 'React'],
          cloudServices: ['AWS', 'Azure'],
          cloudProviders: ['Amazon', 'Microsoft'],
          otherTechnologies: '',
          otherCloudServices: '',
          otherCloudProviders: '',
          programmingLanguages: ['JavaScript', 'TypeScript'],
          databases: ['PostgreSQL', 'MongoDB'],
          description: 'Admin description',
          teamId: null,
          isActive: true,
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participants/admin-participant-1',
          { method: 'PUT', body: requestBody }
        );

        const mockParams = Promise.resolve({ id: 'admin-participant-1' });
        const response = await PUT(request, { params: mockParams });

        expect(response.status).toBe(200);
        expect(db.participant.update).toHaveBeenCalledWith({
          where: { id: 'admin-participant-1' },
          data: expect.objectContaining({
            name: 'Updated Admin User',
            experienceLevel: 'EXPERT',
          }),
        });
      });
    });

    // TC-INTERNAL-008: Bulk Team Assignment
    describe('TC-INTERNAL-008: Bulk Team Assignment', () => {
      it('should handle multiple concurrent participant updates', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const participants = [
          createMockParticipant({ id: 'participant-1', teamId: null }),
          createMockParticipant({ id: 'participant-2', teamId: null }),
          createMockParticipant({ id: 'participant-3', teamId: null }),
        ];

        const updatedParticipants = participants.map(p => ({
          ...p,
          teamId: 'new-team-id',
        }));

        (db.participant.findUnique as jest.Mock)
          .mockResolvedValueOnce(participants[0])
          .mockResolvedValueOnce(participants[1])
          .mockResolvedValueOnce(participants[2]);

        (db.participant.update as jest.Mock)
          .mockResolvedValueOnce(updatedParticipants[0])
          .mockResolvedValueOnce(updatedParticipants[1])
          .mockResolvedValueOnce(updatedParticipants[2]);

        const updateFactory = (participantId: string) => async () => {
          const request = createMockRequest(
            `http://localhost:3000/api/participants/${participantId}`,
            {
              method: 'PUT',
              body: { 
                name: 'Updated Participant', 
                city: 'Test City',
                company: 'Test Company',
                githubUrl: 'https://github.com/test',
                linkedinUrl: 'https://linkedin.com/in/test',
                experienceLevel: 'BEGINNER',
                technologies: ['JavaScript'],
                cloudServices: ['AWS'],
                cloudProviders: ['Amazon'],
                otherTechnologies: '',
                otherCloudServices: '',
                otherCloudProviders: '',
                programmingLanguages: ['JavaScript'],
                databases: ['PostgreSQL'],
                description: 'Test description',
                teamId: 'new-team-id',
                isActive: true,
              },
            }
          );

          const mockParams = Promise.resolve({ id: participantId });
          return PUT(request, { params: mockParams });
        };

        const responses = await Promise.all([
          updateFactory('participant-1')(),
          updateFactory('participant-2')(),
          updateFactory('participant-3')(),
        ]);

        responses.forEach(response => {
          expect(response.status).toBe(200);
        });

        expect(db.participant.update).toHaveBeenCalledTimes(3);
      });
    });

    // TC-INTERNAL-009: Team Leader Reassignment
    describe('TC-INTERNAL-009: Team Leader Reassignment', () => {
      it('should handle moving team leader to different team', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const currentTeam = createMockTeam({
          id: 'current-team',
          leaderId: 'participant-1',
        });

        const teamLeader = createMockParticipant({
          id: 'participant-1',
          teamId: 'current-team',
          ledTeamId: 'current-team',
        });

        const updatedLeader = createMockParticipant({
          id: 'participant-1',
          teamId: 'new-team',
          ledTeamId: null, // No longer leading old team
        });

        (db.participant.findUnique as jest.Mock).mockResolvedValue(teamLeader);
        (db.participant.update as jest.Mock).mockResolvedValue(updatedLeader);

        const requestBody = {
          name: 'Former Team Leader',
          city: 'Test City',
          company: 'Test Company',
          githubUrl: 'https://github.com/test',
          linkedinUrl: 'https://linkedin.com/in/test',
          experienceLevel: 'BEGINNER',
          technologies: ['JavaScript'],
          cloudServices: ['AWS'],
          cloudProviders: ['Amazon'],
          otherTechnologies: '',
          otherCloudServices: '',
          otherCloudProviders: '',
          programmingLanguages: ['JavaScript'],
          databases: ['PostgreSQL'],
          description: 'Test description',
          teamId: 'new-team',
          isActive: true,
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participants/participant-1',
          { method: 'PUT', body: requestBody }
        );

        const mockParams = Promise.resolve({ id: 'participant-1' });
        const response = await PUT(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.teamId).toBe('new-team');

        expect(db.participant.update).toHaveBeenCalledWith({
          where: { id: 'participant-1' },
          data: expect.objectContaining({
            teamId: 'new-team',
          }),
        });
      });
    });

    // Database Transaction Handling
    describe('Database Transaction Handling', () => {
      it('should handle database errors during update', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const participant = createMockParticipant({ id: 'participant-1' });
        (db.participant.findUnique as jest.Mock).mockResolvedValue(participant);
        (db.participant.update as jest.Mock).mockRejectedValue(new Error('Database transaction failed'));

        const requestBody = {
          name: 'Failed Update',
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participants/participant-1',
          { method: 'PUT', body: requestBody }
        );

        const mockParams = Promise.resolve({ id: 'participant-1' });
        const response = await PUT(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');
      });
    });

    // Parameter Handling
    describe('Parameter Handling', () => {
      it('should handle invalid participant ID format', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        (db.participant.findUnique as jest.Mock).mockResolvedValue(null);

        const request = createMockRequest(
          'http://localhost:3000/api/participants/invalid-uuid-format',
          { method: 'PUT', body: { name: 'Test' } }
        );

        const mockParams = Promise.resolve({ id: 'invalid-uuid-format' });
        const response = await PUT(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Participant not found');
      });
    });

    // Data Validation
    describe('Data Validation', () => {
      it('should handle malformed JSON in arrays gracefully', async () => {
        (auth as jest.Mock).mockResolvedValue(createAdminSession());
        (isOrganizer as jest.Mock).mockResolvedValue(true);

        const participant = createMockParticipant({ id: 'participant-1' });
        (db.participant.findUnique as jest.Mock).mockResolvedValue(participant);

        // Simulate JSON.stringify error
        // Mock database update to throw JSON serialization error
        (db.participant.update as jest.Mock).mockImplementation(() => {
          throw new Error('Converting circular structure to JSON');
        });

        const requestBody = {
          name: 'Test User',
          technologies: ['normal', 'tech'],
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participants/participant-1',
          { method: 'PUT', body: requestBody }
        );

        const mockParams = Promise.resolve({ id: 'participant-1' });
        const response = await PUT(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');
      });
    });
  });
});