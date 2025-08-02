import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { isOrganizer } from '@/lib/admin';

// Note: Database mocks are handled in individual test files to avoid conflicts

// Mock session types
export interface MockSession {
  user: {
    email: string;
    name?: string;
    role?: string;
  };
}

export interface MockUser {
  id: string;
  email: string;
  participant?: MockParticipant | null;
}

export interface MockParticipant {
  id: string;
  name: string;
  email: string;
  city?: string | null;
  company?: string | null;
  telegram?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  experienceLevel?: string | null;
  technologies?: string | null;
  cloudServices?: string | null;
  cloudProviders?: string | null;
  otherTechnologies?: string | null;
  otherCloudServices?: string | null;
  otherCloudProviders?: string | null;
  isActive?: boolean;
  programmingLanguages?: string[] | null;
  databases?: string[] | null;
  description?: string | null;
  hackathonParticipations?: Array<{
    hackathon: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
  userId: string;
  teamId?: string | null;
  ledTeamId?: string | null;
  team?: MockTeam | null;
  ledTeam?: MockTeam | null;
}

export interface MockTeam {
  id: string;
  name: string;
  nickname: string;
  comment?: string | null;
  status: string;
  level?: string | null;
  hackathonId: string;
  leaderId?: string | null;
  members?: MockParticipant[];
}

export interface MockHackathon {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  theme?: string | null;
  startDate: Date;
  endDate: Date;
  registrationStart: Date;
  registrationEnd: Date;
  maxTeamSize: number;
  minTeamSize: number;
  allowTeamChanges: boolean;
  isActive: boolean;
  isPublic: boolean;
}

// Test data fixtures
export const createMockHackathon = (overrides: Partial<MockHackathon> = {}): MockHackathon => ({
  id: 'hackathon-1',
  name: 'HackLoad 2025',
  slug: 'hackload-2025',
  description: 'Test hackathon',
  theme: 'Building a ticket selling system',
  startDate: new Date('2025-01-15'),
  endDate: new Date('2025-01-17'),
  registrationStart: new Date('2025-01-01'),
  registrationEnd: new Date('2025-01-14'),
  maxTeamSize: 4,
  minTeamSize: 1,
  allowTeamChanges: true,
  isActive: true,
  isPublic: true,
  ...overrides,
});

export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  id: 'user-1',
  email: 'test@example.com',
  participant: null,
  ...overrides,
});

export const createMockParticipant = (overrides: Partial<MockParticipant> = {}): MockParticipant => ({
  id: 'participant-1',
  name: 'Test User',
  email: 'test@example.com',
  city: 'Test City',
  company: 'Test Company',
  experienceLevel: 'INTERMEDIATE',
  userId: 'user-1',
  teamId: null,
  ledTeamId: null,
  telegram: null,
  githubUrl: null,
  linkedinUrl: null,
  technologies: null,
  cloudServices: null,
  cloudProviders: null,
  hackathonParticipations: [{
    hackathon: {
      id: 'hackathon-1',
      name: 'Test Hackathon',
      slug: 'test-hackathon'
    }
  }],
  otherTechnologies: null,
  otherCloudServices: null,
  otherCloudProviders: null,
  isActive: true,
  programmingLanguages: null,
  databases: null,
  description: null,
  team: null,
  ledTeam: null,
  ...overrides,
});

export const createMockTeam = (overrides: Partial<MockTeam> = {}): MockTeam => ({
  id: 'team-1',
  name: 'Test Team',
  nickname: 'test-team',
  comment: 'Test team description',
  status: 'NEW',
  level: 'BEGINNER',
  hackathonId: 'hackathon-1',
  leaderId: null,
  members: [],
  ...overrides,
});

export const createMockSession = (overrides: Partial<MockSession> = {}): MockSession => ({
  user: {
    email: 'test@example.com',
    name: 'Test User',
    role: 'participant',
    ...overrides.user,
  },
});

export const createAdminSession = (): MockSession => ({
  user: {
    email: 'admin@hackload.kz',
    name: 'Admin User',
    role: 'admin',
  },
});

// Mock request helpers
export const createMockRequest = (
  url: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
): NextRequest => {
  const { method = 'GET', body, headers = {} } = options;

  const requestInit: any = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    requestInit.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  return new NextRequest(url, requestInit);
};

// Database mocks are now handled directly through Jest mocks in the module mock above

// Setup and teardown helpers
export const setupMocks = () => {
  // Mock auth
  (auth as jest.Mock).mockResolvedValue(createMockSession());

  // Mock isOrganizer
  (isOrganizer as jest.Mock).mockImplementation((email: string) => {
    return Promise.resolve(email === 'admin@hackload.kz' || email === 'organizer@hackload.kz');
  });

  // Database mocks should be set up in individual test files
};

export const resetMocks = () => {
  jest.clearAllMocks();
};

// Common test scenarios
export const setupActiveHackathon = () => {
  const hackathon = createMockHackathon();

  // Mock getCurrentHackathon
  const getCurrentHackathon = jest.fn().mockResolvedValue(hackathon);
  jest.doMock('@/lib/hackathon', () => ({
    getCurrentHackathon,
  }));

  return hackathon;
};

export const setupExistingUser = (withParticipant = false) => {
  const user = createMockUser();
  if (withParticipant) {
    user.participant = createMockParticipant({ userId: user.id });
  }
  return user;
};

export const setupExistingTeam = (nickname = 'existing-team') => {
  const team = createMockTeam({ nickname });
  return team;
};

// Assertion helpers
export const expectSuccessResponse = (response: Response, expectedStatus = 200) => {
  expect(response.status).toBe(expectedStatus);
};

export const expectErrorResponse = (response: Response, expectedStatus: number, expectedMessage?: string) => {
  expect(response.status).toBe(expectedStatus);
  if (expectedMessage) {
    return response.json().then(data => {
      expect(data.error).toBe(expectedMessage);
    });
  }
};

// Transaction mock helpers - DEPRECATED
// Use direct db.$transaction mocking in individual tests instead
// Example: (db.$transaction as jest.Mock).mockImplementation((callback) => callback(mockTx));

// Security test helpers
export const createMaliciousRequest = (payload: any) => {
  return createMockRequest('http://localhost:3000/api/participant/profile', {
    method: 'POST',
    body: payload,
  });
};

// Performance test helpers
export const createLargeDataRequest = () => {
  const largeTechnologies = Array.from({ length: 100 }, (_, i) => `Technology${i}`);
  const largeCloudServices = Array.from({ length: 50 }, (_, i) => `CloudService${i}`);

  return {
    name: 'Test User',
    email: 'test@example.com',
    company: 'x'.repeat(1000), // 1000 character company name
    technologies: largeTechnologies,
    cloudServices: largeCloudServices,
    otherTechnologies: 'x'.repeat(2000), // 2000 character text
  };
};

// Concurrent request helper
export const createConcurrentRequests = (count: number, requestFactory: () => Promise<Response>) => {
  return Promise.all(Array.from({ length: count }, () => requestFactory()));
};
