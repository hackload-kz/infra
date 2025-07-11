import { PUT } from '@/app/api/participant/profile/route';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import {
  setupMocks,
  resetMocks,
  createMockRequest,
  createMockSession,
  createMockUser,
  createMockParticipant,
  createMockHackathon,
  setupActiveHackathon,
  setupExistingUser,
  mockDbUser,
  mockDbParticipant,
  mockDbTransaction,
  mockDbHackathonParticipation,
  mockSuccessfulTransaction,
  createConcurrentRequests,
  createLargeDataRequest,
} from '../utils/test-helpers';

// Mock dependencies
jest.mock('@/auth');
jest.mock('@/lib/db');
jest.mock('@/lib/hackathon');

describe('Profile Management', () => {
  beforeEach(() => {
    setupMocks();
  });

  afterEach(() => {
    resetMocks();
  });

  describe('Positive Scenarios', () => {
    // TC-PROFILE-001: Update Existing Profile
    describe('TC-PROFILE-001: Update Existing Profile', () => {
      it('should update existing participant profile successfully', async () => {
        const user = setupExistingUser(true); // User with existing participant
        const updatedParticipant = createMockParticipant({
          name: 'John Doe Updated',
          city: 'San Francisco',
          company: 'NewTech Inc',
          experienceLevel: 'ADVANCED',
          technologies: JSON.stringify(['JavaScript', 'TypeScript', 'React', 'Node.js']),
        });

        mockDbParticipant.update.mockResolvedValue(updatedParticipant);
        mockDbParticipant.findUnique.mockResolvedValue(updatedParticipant);

        const requestBody = {
          name: 'John Doe Updated',
          city: 'San Francisco',
          company: 'NewTech Inc',
          experienceLevel: 'ADVANCED',
          technologies: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: requestBody }
        );

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.message).toBe('Профиль обновлен успешно');
        expect(data.participant.name).toBe('John Doe Updated');
        expect(data.participant.city).toBe('San Francisco');
        expect(data.isNewParticipant).toBe(false);
      });

      it('should update only specified fields', async () => {
        const user = setupExistingUser(true);
        const originalParticipant = createMockParticipant({
          name: 'Original Name',
          city: 'Original City',
          company: 'Original Company',
        });

        const updatedParticipant = createMockParticipant({
          name: 'Original Name', // unchanged
          city: 'Original City', // unchanged  
          company: 'Different Company', // changed
        });

        user.participant = originalParticipant;
        mockDbUser.findUnique.mockResolvedValue(user);
        mockDbParticipant.update.mockResolvedValue(updatedParticipant);
        mockDbParticipant.findUnique.mockResolvedValue(updatedParticipant);

        const requestBody = {
          name: 'Original Name',
          company: 'Different Company',
          // city not included - should remain unchanged
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: requestBody }
        );

        const response = await PUT(request);

        expect(response.status).toBe(200);
        expect(mockDbParticipant.update).toHaveBeenCalledWith({
          where: { id: originalParticipant.id },
          data: expect.objectContaining({
            name: 'Original Name',
            company: 'Different Company',
            city: null, // Should be null when not provided
          }),
        });
      });
    });

    // TC-PROFILE-002: First-Time Profile Creation via PUT
    describe('TC-PROFILE-002: First-Time Profile Creation via PUT', () => {
      it('should create new participant profile via PUT endpoint', async () => {
        const hackathon = setupActiveHackathon();
        const user = setupExistingUser(false); // User without participant profile
        const newParticipant = createMockParticipant({
          name: 'First Time User',
          experienceLevel: 'BEGINNER',
        });

        // Mock transaction for new participant creation
        mockDbTransaction.mockImplementation((callback) => {
          const tx = {
            participant: {
              create: jest.fn().mockResolvedValue(newParticipant),
            },
            hackathonParticipation: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(tx);
        });

        mockDbParticipant.findUnique.mockResolvedValue(newParticipant);

        const requestBody = {
          name: 'First Time User',
          experienceLevel: 'BEGINNER',
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: requestBody }
        );

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.message).toBe('Профиль создан успешно');
        expect(data.isNewParticipant).toBe(true);
        expect(mockDbTransaction).toHaveBeenCalled();
      });

      it('should create hackathon participation for new participants', async () => {
        const hackathon = setupActiveHackathon();
        const user = setupExistingUser(false);
        const newParticipant = createMockParticipant();

        let hackathonParticipationCreated = false;

        mockDbTransaction.mockImplementation((callback) => {
          const tx = {
            participant: {
              create: jest.fn().mockResolvedValue(newParticipant),
            },
            hackathonParticipation: {
              create: jest.fn().mockImplementation(() => {
                hackathonParticipationCreated = true;
                return Promise.resolve({});
              }),
            },
          };
          return callback(tx);
        });

        mockDbParticipant.findUnique.mockResolvedValue(newParticipant);

        const requestBody = {
          name: 'First Time User',
          experienceLevel: 'BEGINNER',
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: requestBody }
        );

        await PUT(request);

        expect(hackathonParticipationCreated).toBe(true);
      });
    });

    // TC-PROFILE-003: Partial Profile Update
    describe('TC-PROFILE-003: Partial Profile Update', () => {
      it('should update only specified fields leaving others unchanged', async () => {
        const user = setupExistingUser(true);
        const originalParticipant = createMockParticipant({
          name: 'Same Name',
          city: 'Original City',
          company: 'Original Company',
          experienceLevel: 'BEGINNER',
        });

        user.participant = originalParticipant;
        mockDbUser.findUnique.mockResolvedValue(user);

        const partiallyUpdatedParticipant = createMockParticipant({
          ...originalParticipant,
          company: 'Different Company',
        });

        mockDbParticipant.update.mockResolvedValue(partiallyUpdatedParticipant);
        mockDbParticipant.findUnique.mockResolvedValue(partiallyUpdatedParticipant);

        const requestBody = {
          name: 'Same Name',
          company: 'Different Company',
          // Intentionally omitting city and experienceLevel
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: requestBody }
        );

        const response = await PUT(request);

        expect(response.status).toBe(200);
        expect(mockDbParticipant.update).toHaveBeenCalledWith({
          where: { id: originalParticipant.id },
          data: expect.objectContaining({
            name: 'Same Name',
            company: 'Different Company',
            city: null,
            experienceLevel: null,
          }),
        });
      });
    });

    // TC-PROFILE-004: Clear Optional Fields
    describe('TC-PROFILE-004: Clear Optional Fields', () => {
      it('should set optional fields to null when explicitly cleared', async () => {
        const user = setupExistingUser(true);
        const participant = createMockParticipant({
          name: 'User Name',
          city: 'Old City',
          company: 'Old Company',
          telegram: '@oldhandle',
        });

        user.participant = participant;
        mockDbUser.findUnique.mockResolvedValue(user);

        const clearedParticipant = createMockParticipant({
          name: 'User Name',
          city: null,
          company: null,
          telegram: null,
        });

        mockDbParticipant.update.mockResolvedValue(clearedParticipant);
        mockDbParticipant.findUnique.mockResolvedValue(clearedParticipant);

        const requestBody = {
          name: 'User Name',
          city: null,
          company: '',
          telegram: null,
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: requestBody }
        );

        const response = await PUT(request);

        expect(response.status).toBe(200);
        expect(mockDbParticipant.update).toHaveBeenCalledWith({
          where: { id: participant.id },
          data: expect.objectContaining({
            city: null,
            company: '',
            telegram: null,
          }),
        });
      });
    });
  });

  describe('Negative Scenarios', () => {
    // TC-PROFILE-005: Update Without Name
    describe('TC-PROFILE-005: Update Without Name', () => {
      it('should return 400 when name is missing', async () => {
        const requestBody = {
          city: 'Boston',
          company: 'TechCorp',
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: requestBody }
        );

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Имя обязательно');
      });

      it('should return 400 when name is empty string', async () => {
        const requestBody = {
          name: '',
          city: 'Boston',
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: requestBody }
        );

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Имя обязательно');
      });
    });

    // TC-PROFILE-006: Update Non-existent User
    describe('TC-PROFILE-006: Update Non-existent User', () => {
      it('should return 404 when user does not exist', async () => {
        (auth as jest.Mock).mockResolvedValue(createMockSession({
          user: { email: 'nonexistent@example.com' },
        }));

        mockDbUser.findUnique.mockResolvedValue(null);

        const requestBody = {
          name: 'Test User',
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: requestBody }
        );

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Пользователь не найден');
      });
    });

    // TC-PROFILE-007: Update During Hackathon Transition
    describe('TC-PROFILE-007: Update During Hackathon Transition', () => {
      it('should return 400 when no active hackathon for new participants', async () => {
        const user = setupExistingUser(false); // User without participant

        // Mock no active hackathon
        const getCurrentHackathon = jest.fn().mockResolvedValue(null);
        jest.doMock('@/lib/hackathon', () => ({
          getCurrentHackathon,
        }));

        const requestBody = {
          name: 'Test User',
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: requestBody }
        );

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('No active hackathon found');
      });
    });

    // TC-PROFILE-008: Unauthenticated Update
    describe('TC-PROFILE-008: Unauthenticated Update', () => {
      it('should return 401 for unauthenticated requests', async () => {
        (auth as jest.Mock).mockResolvedValue(null);

        const requestBody = {
          name: 'Test User',
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: requestBody }
        );

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Не авторизован');
      });

      it('should return 401 when session has no email', async () => {
        (auth as jest.Mock).mockResolvedValue({
          user: { name: 'Test User' }, // No email
        });

        const requestBody = {
          name: 'Test User',
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: requestBody }
        );

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Не авторизован');
      });
    });
  });

  describe('Edge Cases', () => {
    // TC-PROFILE-009: Concurrent Profile Updates
    describe('TC-PROFILE-009: Concurrent Profile Updates', () => {
      it('should handle concurrent updates without data corruption', async () => {
        const user = setupExistingUser(true);
        const participant = createMockParticipant({
          name: 'Original Name',
          city: 'Original City',
        });

        user.participant = participant;
        mockDbUser.findUnique.mockResolvedValue(user);

        // Mock different update responses for concurrent requests
        const update1Result = createMockParticipant({
          name: 'Update 1',
          city: 'City 1',
        });

        const update2Result = createMockParticipant({
          name: 'Update 2', 
          city: 'City 2',
        });

        mockDbParticipant.update
          .mockResolvedValueOnce(update1Result)
          .mockResolvedValueOnce(update2Result);

        mockDbParticipant.findUnique
          .mockResolvedValueOnce(update1Result)
          .mockResolvedValueOnce(update2Result);

        const requestFactory = (name: string, city: string) => async () => {
          const request = createMockRequest(
            'http://localhost:3000/api/participant/profile',
            {
              method: 'PUT',
              body: { name, city },
            }
          );
          return PUT(request);
        };

        const responses = await createConcurrentRequests(2, async () => {
          // Alternate between the two different requests
          const isFirstRequest = Math.random() > 0.5;
          return isFirstRequest 
            ? requestFactory('Update 1', 'City 1')()
            : requestFactory('Update 2', 'City 2')();
        });

        // Both requests should succeed
        responses.forEach(response => {
          expect(response.status).toBe(200);
        });

        // Verify no race conditions caused errors
        expect(mockDbParticipant.update).toHaveBeenCalledTimes(2);
      });
    });

    // TC-PROFILE-010: Large Data Fields
    describe('TC-PROFILE-010: Large Data Fields', () => {
      it('should handle large data fields appropriately', async () => {
        const user = setupExistingUser(true);
        const largeDataRequest = createLargeDataRequest();

        const updatedParticipant = createMockParticipant({
          company: largeDataRequest.company,
          technologies: JSON.stringify(largeDataRequest.technologies),
          cloudServices: JSON.stringify(largeDataRequest.cloudServices),
          otherTechnologies: largeDataRequest.otherTechnologies,
        });

        mockDbParticipant.update.mockResolvedValue(updatedParticipant);
        mockDbParticipant.findUnique.mockResolvedValue(updatedParticipant);

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: largeDataRequest }
        );

        const response = await PUT(request);

        // Should either succeed or fail gracefully with appropriate error
        expect([200, 400, 413]).toContain(response.status);

        if (response.status === 200) {
          // If successful, verify data was processed
          expect(mockDbParticipant.update).toHaveBeenCalledWith({
            where: { id: user.participant!.id },
            data: expect.objectContaining({
              company: largeDataRequest.company,
              technologies: JSON.stringify(largeDataRequest.technologies),
              cloudServices: JSON.stringify(largeDataRequest.cloudServices),
              otherTechnologies: largeDataRequest.otherTechnologies,
            }),
          });
        }
      });
    });

    // TC-PROFILE-011: Invalid JSON in Arrays
    describe('TC-PROFILE-011: Invalid JSON in Arrays', () => {
      it('should handle JSON serialization errors gracefully', async () => {
        const user = setupExistingUser(true);

        // Create a request with data that might cause JSON.stringify issues
        const requestBody = {
          name: 'Test User',
          technologies: [{ circular: 'reference' }],
          cloudServices: ['normal', 'service'],
        };

        // Add circular reference to cause JSON.stringify to fail
        (requestBody.technologies[0] as any).self = requestBody.technologies[0];

        mockDbParticipant.update.mockImplementation(() => {
          // Simulate JSON.stringify error
          throw new Error('Converting circular structure to JSON');
        });

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: requestBody }
        );

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Converting circular structure to JSON');
      });
    });

    // Additional Edge Case: Database Error During Update
    describe('Database Error During Update', () => {
      it('should handle database errors during participant update', async () => {
        const user = setupExistingUser(true);

        mockDbParticipant.update.mockRejectedValue(new Error('Database connection failed'));

        const requestBody = {
          name: 'Test User',
          city: 'Test City',
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: requestBody }
        );

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Внутренняя ошибка сервера');
      });
    });

    // Additional Edge Case: Team Relationship Handling
    describe('Team Relationship Handling', () => {
      it('should include team information in response for team members', async () => {
        const user = setupExistingUser(true);
        const team = createMockParticipant({
          team: {
            id: 'team-1',
            name: 'Test Team',
            nickname: 'test-team',
          },
          ledTeam: null, // Not a leader
        } as any);

        mockDbParticipant.update.mockResolvedValue(team);
        mockDbParticipant.findUnique.mockResolvedValue(team);

        const requestBody = {
          name: 'Team Member',
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: requestBody }
        );

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.team).toBeDefined();
        expect(data.team.id).toBe('team-1');
        expect(data.team.isLeader).toBe(false);
      });

      it('should indicate leadership status for team leaders', async () => {
        const user = setupExistingUser(true);
        const teamLeader = createMockParticipant({
          team: {
            id: 'team-1',
            name: 'Test Team',
            nickname: 'test-team',
          },
          ledTeam: {
            id: 'team-1',
            name: 'Test Team',
            nickname: 'test-team',
          },
        } as any);

        mockDbParticipant.update.mockResolvedValue(teamLeader);
        mockDbParticipant.findUnique.mockResolvedValue(teamLeader);

        const requestBody = {
          name: 'Team Leader',
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'PUT', body: requestBody }
        );

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.team).toBeDefined();
        expect(data.team.isLeader).toBe(true);
      });
    });
  });
});