// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Learn more: https://jestjs.io/docs/configuration#setupfilesafterenv-array

// Import Jest DOM matchers for React Testing Library
require('@testing-library/jest-dom')

// Mock environment variables for testing
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only'
process.env.NEXTAUTH_URL = 'http://localhost:3000'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}))

// Mock NextAuth
jest.mock('next-auth', () => ({
  default: jest.fn(),
}))

// Mock the auth configuration
jest.mock('@/auth.config', () => ({
  default: {
    providers: [
      {
        id: 'google',
        name: 'Google',
        type: 'oauth',
      },
      {
        id: 'github',
        name: 'GitHub',
        type: 'oauth',
      },
    ],
  },
}))

// Mock the auth module
jest.mock('@/auth', () => ({
  auth: jest.fn().mockResolvedValue({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }),
  signIn: jest.fn(),
  signOut: jest.fn(),
  handlers: {
    GET: jest.fn(),
    POST: jest.fn(),
  },
}))

// Mock NextAuth providers - ES module style
jest.mock('next-auth/providers/google', () => {
  const mockProvider = jest.fn(() => ({
    id: 'google',
    name: 'Google',
    type: 'oauth',
    clientId: 'mock-google-client-id',
    clientSecret: 'mock-google-client-secret',
  }));
  
  return mockProvider;
});

jest.mock('next-auth/providers/github', () => {
  const mockProvider = jest.fn(() => ({
    id: 'github',
    name: 'GitHub',
    type: 'oauth',
    clientId: 'mock-github-client-id',
    clientSecret: 'mock-github-client-secret',
  }));
  
  return mockProvider;
});

// Note: Database mock removed to avoid conflicts with test-specific mocks
// Individual test files will mock @/lib/db as needed

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    logApiCall: jest.fn().mockResolvedValue(undefined),
    logApiSuccess: jest.fn().mockResolvedValue(undefined),
    logApiError: jest.fn().mockResolvedValue(undefined),
    logCreate: jest.fn().mockResolvedValue(undefined),
    logUpdate: jest.fn().mockResolvedValue(undefined),
    logDelete: jest.fn().mockResolvedValue(undefined),
    logRead: jest.fn().mockResolvedValue(undefined),
    logStatusChange: jest.fn().mockResolvedValue(undefined),
    info: jest.fn().mockResolvedValue(undefined),
    warn: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
  },
  LogAction: {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    READ: 'READ',
    DISABLE: 'DISABLE',
    ENABLE: 'ENABLE',
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
  },
  LogLevel: {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG',
  },
}))

// Mock hackathon module
jest.mock('@/lib/hackathon', () => ({
  getCurrentHackathon: jest.fn().mockResolvedValue({
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
  }),
  getHackathonBySlug: jest.fn().mockResolvedValue({
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
  }),
}))