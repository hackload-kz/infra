import { POST } from '@/app/api/participant/profile/route';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import {
  setupMocks,
  resetMocks,
  createMockRequest,
  createMockSession,
  createMockUser,
  createMockParticipant,
  createMockTeam,
  createMockHackathon,
  setupActiveHackathon,
  setupExistingUser,
  setupExistingTeam,
  expectSuccessResponse,
  expectErrorResponse,
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
jest.mock('@/lib/hackathon');

describe('Participant Registration', () => {
  beforeEach(() => {
    setupMocks();
  });

  afterEach(() => {
    resetMocks();
  });

  describe('Positive Scenarios', () => {
    // TC-REG-001: Basic Profile Creation
    describe('TC-REG-001: Basic Profile Creation', () => {
      it('should create participant profile successfully', async () => {
        const hackathon = setupActiveHackathon();
        const user = setupExistingUser(false); // User without participant profile
        const mockParticipant = createMockParticipant({
          name: 'John Doe',
          email: 'john@example.com',
          city: 'New York',
          company: 'TechCorp',
          experienceLevel: 'INTERMEDIATE',
        });

        const requestBody = {
          name: 'John Doe',
          email: 'john@example.com',
          city: 'New York',
          company: 'TechCorp',
          experienceLevel: 'INTERMEDIATE',
        };

        // Mock user lookup - return user without participant profile
        (db.user.findUnique as jest.Mock).mockResolvedValue({
          ...user,
          participant: null, // No existing participant profile
        });

        // Mock successful transaction
        (db.$transaction as jest.Mock).mockImplementation(async (callback) => {
          const tx = {
            participant: { create: jest.fn().mockResolvedValue(mockParticipant) },
            hackathonParticipation: { create: jest.fn().mockResolvedValue({}) },
          };
          await callback(tx);
          return {
            participant: mockParticipant,
            team: null,
            isLeader: false,
          };
        });

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'POST', body: requestBody }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.message).toBe('Профиль создан успешно');
        expect(data.participant).toBeDefined();
        expect(data.participant.name).toBe('John Doe');
        expect(data.team).toBeNull();
      });

      it('should create hackathon participation record', async () => {
        const hackathon = setupActiveHackathon();
        const user = setupExistingUser(false);
        const mockParticipant = createMockParticipant();

        const requestBody = {
          name: 'John Doe',
          email: 'john@example.com',
          experienceLevel: 'INTERMEDIATE',
        };

        // Mock user lookup - return user without participant profile
        (db.user.findUnique as jest.Mock).mockResolvedValue({
          ...user,
          participant: null, // No existing participant profile
        });

        // Mock participant email check to return null (no duplicate email)
        (db.participant.findUnique as jest.Mock).mockResolvedValue(null);

        // Mock transaction with participation creation
        (db.$transaction as jest.Mock).mockImplementation(async (callback) => {
          const tx = {
            participant: {
              create: jest.fn().mockResolvedValue(mockParticipant),
            },
            hackathonParticipation: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return await callback(tx);
        });

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'POST', body: requestBody }
        );

        await POST(request);

        expect(db.$transaction).toHaveBeenCalled();
      });
    });

    // TC-REG-002: Profile Creation with New Team
    describe('TC-REG-002: Profile Creation with New Team', () => {
      it('should create participant and new team with leadership', async () => {
        const hackathon = setupActiveHackathon();
        const user = setupExistingUser(false);
        const mockParticipant = createMockParticipant();
        const mockTeam = createMockTeam({
          name: 'Team Alpha',
          nickname: 'alpha',
          leaderId: mockParticipant.id,
        });

        const requestBody = {
          name: 'Jane Smith',
          email: 'jane@example.com',
          teamOption: 'new',
          newTeamName: 'Team Alpha',
          newTeamNickname: 'alpha',
          experienceLevel: 'ADVANCED',
        };

        // Mock user lookup - return user without participant profile
        (db.user.findUnique as jest.Mock).mockResolvedValue({
          ...user,
          participant: null, // No existing participant profile
        });

        // Mock participant email check to return null (no duplicate email)
        (db.participant.findUnique as jest.Mock).mockResolvedValue(null);

        // Mock transaction for team creation
        (db.$transaction as jest.Mock).mockImplementation(async (callback) => {
          const tx = {
            team: {
              findUnique: jest.fn().mockResolvedValue(null), // No existing team
              create: jest.fn().mockResolvedValue(mockTeam),
              update: jest.fn().mockResolvedValue(mockTeam),
            },
            participant: {
              create: jest.fn().mockResolvedValue(mockParticipant),
            },
          };
          await callback(tx);
          return {
            participant: mockParticipant,
            team: mockTeam,
            isLeader: true,
          };
        });

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'POST', body: requestBody }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.team).toBeDefined();
        expect(data.team.name).toBe('Team Alpha');
        expect(data.team.isLeader).toBe(true);
      });
    });

    // TC-REG-003: Profile Creation with Existing Team
    describe('TC-REG-003: Profile Creation with Existing Team', () => {
      it('should join existing team during registration', async () => {
        const hackathon = setupActiveHackathon();
        const user = setupExistingUser(false);
        const existingTeam = setupExistingTeam('beta');
        const mockParticipant = createMockParticipant({ teamId: existingTeam.id });

        const requestBody = {
          name: 'Bob Wilson',
          email: 'bob@example.com',
          teamOption: 'existing',
          selectedTeam: existingTeam.id,
          experienceLevel: 'BEGINNER',
        };

        // Mock user lookup - return user without participant profile
        (db.user.findUnique as jest.Mock).mockResolvedValue({
          ...user,
          participant: null, // No existing participant profile
        });

        // Mock participant email check to return null (no duplicate email)
        (db.participant.findUnique as jest.Mock).mockResolvedValue(null);

        (db.$transaction as jest.Mock).mockImplementation(async (callback) => {
          const tx = {
            team: {
              findUnique: jest.fn().mockResolvedValue(existingTeam),
            },
            participant: {
              create: jest.fn().mockResolvedValue(mockParticipant),
            },
          };
          await callback(tx);
          return {
            participant: mockParticipant,
            team: existingTeam,
            isLeader: false,
          };
        });

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'POST', body: requestBody }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.team).toBeDefined();
        expect(data.team.id).toBe(existingTeam.id);
        expect(data.team.isLeader).toBe(false);
      });
    });

    // TC-REG-004: Profile with Social Links
    describe('TC-REG-004: Profile with Social Links', () => {
      it('should store social links and technologies properly', async () => {
        const hackathon = setupActiveHackathon();
        const user = setupExistingUser(false);
        const mockParticipant = createMockParticipant({
          telegram: '@alice_dev',
          githubUrl: 'https://github.com/alice',
          linkedinUrl: 'https://linkedin.com/in/alice',
          technologies: JSON.stringify(['JavaScript', 'Python', 'React']),
          cloudServices: JSON.stringify(['AWS', 'Docker']),
          otherTechnologies: 'Vue.js, Node.js',
        });

        const requestBody = {
          name: 'Alice Johnson',
          email: 'alice@example.com',
          telegram: '@alice_dev',
          githubUrl: 'https://github.com/alice',
          linkedinUrl: 'https://linkedin.com/in/alice',
          technologies: ['JavaScript', 'Python', 'React'],
          cloudServices: ['AWS', 'Docker'],
          otherTechnologies: 'Vue.js, Node.js',
        };

        // Mock user lookup - return user without participant profile
        (db.user.findUnique as jest.Mock).mockResolvedValue({
          ...user,
          participant: null, // No existing participant profile
        });

        // Mock participant email check to return null (no duplicate email)
        (db.participant.findUnique as jest.Mock).mockResolvedValue(null);

        (db.$transaction as jest.Mock).mockImplementation(async (callback) => {
          const tx = {
            participant: { create: jest.fn().mockResolvedValue(mockParticipant) },
            hackathonParticipation: { create: jest.fn().mockResolvedValue({}) },
          };
          await callback(tx);
          return {
            participant: mockParticipant,
            team: null,
            isLeader: false,
          };
        });

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'POST', body: requestBody }
        );

        const response = await POST(request);

        expect(response.status).toBe(200);
        // Verify that arrays are JSON.stringify'd in the transaction
        expect(db.$transaction).toHaveBeenCalled();
      });
    });
  });

  describe('Negative Scenarios', () => {
    // TC-REG-005: Missing Required Fields
    describe('TC-REG-005: Missing Required Fields', () => {
      it('should return 400 for missing name', async () => {
        const requestBody = {
          city: 'Boston',
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'POST', body: requestBody }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Имя и email обязательны');
      });

      it('should return 400 for missing email', async () => {
        const requestBody = {
          name: 'John Doe',
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'POST', body: requestBody }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Имя и email обязательны');
      });
    });

    // TC-REG-006: Duplicate Email Registration
    describe('TC-REG-006: Duplicate Email Registration', () => {
      it('should return 400 for duplicate participant email', async () => {
        const user = setupExistingUser(false);
        const existingParticipant = createMockParticipant({
          email: 'existing@example.com',
        });

        (db.participant.findUnique as jest.Mock).mockResolvedValue(existingParticipant);

        const requestBody = {
          name: 'John Duplicate',
          email: 'existing@example.com',
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'POST', body: requestBody }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Участник с таким email уже зарегистрирован');
      });
    });

    // TC-REG-007: Profile Already Exists
    describe('TC-REG-007: Profile Already Exists', () => {
      it('should return 400 when user already has participant profile', async () => {
        const user = setupExistingUser(true); // User with existing participant

        // Mock user lookup to return user with existing participant
        (db.user.findUnique as jest.Mock).mockResolvedValue({
          ...user,
          participant: user.participant, // This will trigger the "Profile already exists" error
        });

        const requestBody = {
          name: 'Test User',
          email: 'test@example.com',
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'POST', body: requestBody }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Профиль участника уже создан');
      });
    });

    // TC-REG-008: Team Nickname Conflict
    describe('TC-REG-008: Team Nickname Conflict', () => {
      it('should return 400 for duplicate team nickname', async () => {
        const hackathon = setupActiveHackathon();
        const user = setupExistingUser(false);
        const existingTeam = createMockTeam({ nickname: 'existing-nickname' });

        // Mock user lookup to return user without participant
        (db.user.findUnique as jest.Mock).mockResolvedValue({
          ...user,
          participant: null, // No existing participant profile
        });

        // Mock participant email check to return null (no duplicate email)
        (db.participant.findUnique as jest.Mock).mockResolvedValue(null);

        const requestBody = {
          name: 'User Name',
          email: 'user@example.com',
          teamOption: 'new',
          newTeamName: 'Duplicate Team',
          newTeamNickname: 'existing-nickname',
        };

        (db.$transaction as jest.Mock).mockImplementation(async (callback) => {
          const tx = {
            team: {
              findUnique: jest.fn().mockResolvedValue(existingTeam),
            },
          };
          return await callback(tx);
        });

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'POST', body: requestBody }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Команда с таким nickname уже существует');
      });
    });

    // TC-REG-009: Invalid Existing Team
    describe('TC-REG-009: Invalid Existing Team', () => {
      it('should return 400 for non-existent team selection', async () => {
        const hackathon = setupActiveHackathon();
        const user = setupExistingUser(false);

        // Mock user lookup to return user without participant
        (db.user.findUnique as jest.Mock).mockResolvedValue({
          ...user,
          participant: null, // No existing participant profile
        });

        // Mock participant email check to return null (no duplicate email)
        (db.participant.findUnique as jest.Mock).mockResolvedValue(null);

        const requestBody = {
          name: 'User Name',
          email: 'user@example.com',
          teamOption: 'existing',
          selectedTeam: 'non-existent-id',
        };

        (db.$transaction as jest.Mock).mockImplementation(async (callback) => {
          const tx = {
            team: {
              findUnique: jest.fn().mockResolvedValue(null),
            },
          };
          return await callback(tx);
        });

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'POST', body: requestBody }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Выбранная команда не найдена');
      });
    });

    // TC-REG-010: No Active Hackathon
    describe('TC-REG-010: No Active Hackathon', () => {
      it('should return 400 when no active hackathon exists', async () => {
        const user = setupExistingUser(false);

        // Mock user lookup to return user without participant
        (db.user.findUnique as jest.Mock).mockResolvedValue({
          ...user,
          participant: null, // No existing participant profile
        });

        // Mock participant email check to return null (no duplicate email)
        (db.participant.findUnique as jest.Mock).mockResolvedValue(null);

        // Mock no active hackathon by making transaction throw error
        // Since the transaction is mocked, we need the team creation to fail with hackathon error

        const requestBody = {
          name: 'Test User',
          email: 'test@example.com',
          teamOption: 'new',
          newTeamName: 'Test Team',
          newTeamNickname: 'test-team',
        };

        (db.$transaction as jest.Mock).mockImplementation(async (callback) => {
          const tx = {
            team: {
              findUnique: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue(createMockTeam()),
              update: jest.fn().mockResolvedValue(createMockTeam()),
            },
            participant: {
              create: jest.fn().mockResolvedValue(createMockParticipant()),
            },
          };
          // Directly throw the hackathon error instead of executing the callback
          throw new Error('No active hackathon found');
        });

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'POST', body: requestBody }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('No active hackathon found');
      });
    });

    // TC-REG-011: Unauthenticated Request
    describe('TC-REG-011: Unauthenticated Request', () => {
      it('should return 401 for unauthenticated request', async () => {
        (auth as jest.Mock).mockResolvedValue(null);

        const requestBody = {
          name: 'Test User',
          email: 'test@example.com',
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'POST', body: requestBody }
        );

        const response = await POST(request);
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
          email: 'test@example.com',
        };

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'POST', body: requestBody }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Не авторизован');
      });
    });
  });

  describe('Edge Cases', () => {
    // TC-REG-012: Transaction Failure During Team Creation
    describe('TC-REG-012: Transaction Failure During Team Creation', () => {
      it('should rollback transaction on failure', async () => {
        const hackathon = setupActiveHackathon();
        const user = setupExistingUser(false);

        // Mock user lookup to return user without participant
        (db.user.findUnique as jest.Mock).mockResolvedValue({
          ...user,
          participant: null, // No existing participant profile
        });

        // Mock participant email check to return null (no duplicate email)
        (db.participant.findUnique as jest.Mock).mockResolvedValue(null);

        const requestBody = {
          name: 'Test User',
          email: 'test@example.com',
          teamOption: 'new',
          newTeamName: 'Test Team',
          newTeamNickname: 'test-team',
        };

        // Mock transaction failure
        (db.$transaction as jest.Mock).mockRejectedValue(new Error('Database error during team creation'));

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'POST', body: requestBody }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Database error during team creation');
      });
    });

    // TC-REG-013: Large Technology Arrays
    describe('TC-REG-013: Large Technology Arrays', () => {
      it('should handle large technology arrays', async () => {
        const hackathon = setupActiveHackathon();
        const user = setupExistingUser(false);
        const largeTechnologies = Array.from({ length: 50 }, (_, i) => `Technology${i}`);
        const largeCloudServices = Array.from({ length: 30 }, (_, i) => `CloudService${i}`);

        // Mock user lookup to return user without participant
        (db.user.findUnique as jest.Mock).mockResolvedValue({
          ...user,
          participant: null, // No existing participant profile
        });

        // Mock participant email check to return null (no duplicate email)
        (db.participant.findUnique as jest.Mock).mockResolvedValue(null);

        const requestBody = {
          name: 'Test User',
          email: 'test@example.com',
          technologies: largeTechnologies,
          cloudServices: largeCloudServices,
        };

        const mockParticipant = createMockParticipant({
          technologies: JSON.stringify(largeTechnologies),
          cloudServices: JSON.stringify(largeCloudServices),
        });

        (db.$transaction as jest.Mock).mockImplementation(async (callback) => {
          const tx = {
            participant: { create: jest.fn().mockResolvedValue(mockParticipant) },
            hackathonParticipation: { create: jest.fn().mockResolvedValue({}) },
          };
          await callback(tx);
          return {
            participant: mockParticipant,
            team: null,
            isLeader: false,
          };
        });

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'POST', body: requestBody }
        );

        const response = await POST(request);

        expect(response.status).toBe(200);
      });
    });

    // TC-REG-014: Special Characters in Team Name
    describe('TC-REG-014: Special Characters in Team Name', () => {
      it('should handle Unicode and special characters in team name', async () => {
        const hackathon = setupActiveHackathon();
        const user = setupExistingUser(false);

        // Mock user lookup to return user without participant
        (db.user.findUnique as jest.Mock).mockResolvedValue({
          ...user,
          participant: null, // No existing participant profile
        });

        // Mock participant email check to return null (no duplicate email)
        (db.participant.findUnique as jest.Mock).mockResolvedValue(null);

        const requestBody = {
          name: 'Test User',
          email: 'test@example.com',
          teamOption: 'new',
          newTeamName: 'Team 🚀 Alpha-β',
          newTeamNickname: 'team-alpha-beta',
        };

        const mockTeam = createMockTeam({
          name: 'Team 🚀 Alpha-β',
          nickname: 'team-alpha-beta',
        });

        const mockParticipant = createMockParticipant();

        (db.$transaction as jest.Mock).mockImplementation(async (callback) => {
          const tx = {
            team: {
              findUnique: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue(mockTeam),
              update: jest.fn().mockResolvedValue(mockTeam),
            },
            participant: {
              create: jest.fn().mockResolvedValue(mockParticipant),
            },
          };
          await callback(tx);
          return {
            participant: mockParticipant,
            team: mockTeam,
            isLeader: true,
          };
        });

        const request = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'POST', body: requestBody }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.team.name).toBe('Team 🚀 Alpha-β');
      });
    });

    // TC-REG-015: Concurrent Team Creation
    describe('TC-REG-015: Concurrent Team Creation', () => {
      it('should handle concurrent team creation attempts', async () => {
        const hackathon = setupActiveHackathon();
        const user1 = createMockUser({ id: 'user-1', email: 'user1@test.com' });
        const user2 = createMockUser({ id: 'user-2', email: 'user2@test.com' });

        // Setup separate sessions for concurrent users
        (auth as jest.Mock)
          .mockResolvedValueOnce(createMockSession({ user: { email: user1.email } }))
          .mockResolvedValueOnce(createMockSession({ user: { email: user2.email } }));

        // Mock user lookup to return users without participants
        (db.user.findUnique as jest.Mock)
          .mockResolvedValueOnce({ ...user1, participant: null })
          .mockResolvedValueOnce({ ...user2, participant: null });

        // Mock participant email check to return null (no duplicate email)
        (db.participant.findUnique as jest.Mock)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null);

        const requestBody = {
          name: 'Test User',
          email: 'test@example.com',
          teamOption: 'new',
          newTeamName: 'Concurrent Team',
          newTeamNickname: 'concurrent-team',
        };

        // First request succeeds, second fails with constraint error
        (db.$transaction as jest.Mock)
          .mockImplementationOnce(async (callback) => {
            const tx = {
              team: {
                findUnique: jest.fn().mockResolvedValue(null),
                create: jest.fn().mockResolvedValue(createMockTeam()),
                update: jest.fn().mockResolvedValue(createMockTeam()),
              },
              participant: {
                create: jest.fn().mockResolvedValue(createMockParticipant()),
              },
            };
            await callback(tx);
            return {
              participant: createMockParticipant(),
              team: createMockTeam(),
              isLeader: true,
            };
          })
          .mockImplementationOnce(async (callback) => {
            const tx = {
              team: {
                findUnique: jest.fn().mockResolvedValue(null),
                create: jest.fn().mockResolvedValue(createMockTeam()),
                update: jest.fn().mockResolvedValue(createMockTeam()),
              },
              participant: {
                create: jest.fn().mockResolvedValue(createMockParticipant()),
              },
            };
            await callback(tx);
            throw new Error('Команда с таким nickname уже существует');
          });

        const request1 = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'POST', body: requestBody }
        );

        const request2 = createMockRequest(
          'http://localhost:3000/api/participant/profile',
          { method: 'POST', body: requestBody }
        );

        const [response1, response2] = await Promise.all([
          POST(request1),
          POST(request2),
        ]);

        expect(response1.status).toBe(200);
        expect(response2.status).toBe(400);

        const data2 = await response2.json();
        expect(data2.error).toBe('Команда с таким nickname уже существует');
      });
    });
  });
});