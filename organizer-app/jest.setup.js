// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Learn more: https://jestjs.io/docs/configuration#setupfilesafterenv-array

// Import Jest DOM matchers for React Testing Library
require('@testing-library/jest-dom')

// Configure React Testing Library with proper act support for React 19
// This tells React Testing Library to use the built-in act from React
global.IS_REACT_ACT_ENVIRONMENT = true

// Fix for React 19 + React Testing Library compatibility
// React 19 moved act from react-dom/test-utils to react, but RTL still expects it in the old location
try {
  const ReactDOMTestUtils = require('react-dom/test-utils')
  const React = require('react')
  
  // If ReactDOMTestUtils.act doesn't exist, create it
  if (!ReactDOMTestUtils.act) {
    // Try to use React's act first
    if (React.act) {
      ReactDOMTestUtils.act = React.act
    } else {
      // Fallback implementation
      ReactDOMTestUtils.act = function act(callback) {
        const result = callback()
        if (result && typeof result.then === 'function') {
          return result
        }
        return Promise.resolve(result)
      }
    }
  }
  
  // Also ensure React.act exists globally for testing-library
  if (!React.act) {
    React.act = ReactDOMTestUtils.act
  }
  
} catch (error) {
  console.warn('Failed to setup React.act compatibility:', error)
}

// Additional mock to ensure act is available everywhere
jest.mock('react-dom/test-utils', () => {
  const original = jest.requireActual('react-dom/test-utils')
  return {
    ...original,
    act: original.act || function act(callback) {
      const result = callback()
      if (result && typeof result.then === 'function') {
        return result
      }
      return Promise.resolve(result)
    }
  }
})

// Polyfill Web APIs for Node.js test environment
const { TextEncoder, TextDecoder } = require('util')

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Polyfill ReadableStream
global.ReadableStream = class ReadableStream {
  constructor(source) {
    this.source = source
  }
}

// Simple mock for Request and Response
global.Request = class Request {
  constructor(url, options = {}) {
    // Create a URL-like object that works with NextRequest
    Object.defineProperty(this, 'url', {
      value: url,
      writable: false,
      enumerable: true,
      configurable: false
    })
    this.method = options.method || 'GET'
    this.headers = new Map(Object.entries(options.headers || {}))
    this.body = options.body
  }
  
  async json() {
    return this.body ? JSON.parse(this.body) : null
  }
  
  async text() {
    return this.body || ''
  }
}

global.Response = class Response {
  constructor(body, options = {}) {
    this.body = body
    this.status = options.status || 200
    this.statusText = options.statusText || 'OK'
    this.headers = new Map(Object.entries(options.headers || {}))
  }
  
  async json() {
    return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
  }
  
  async text() {
    return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
  }
  
  static json(data, options = {}) {
    return new Response(data, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
  }
  
  static redirect(url, status = 302) {
    return new Response(null, {
      status,
      headers: {
        'Location': url.toString()
      }
    })
  }
}

// Mock Headers
global.Headers = class Headers extends Map {
  constructor(init) {
    super()
    if (init) {
      if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.set(key, value))
      } else if (typeof init === 'object') {
        Object.entries(init).forEach(([key, value]) => this.set(key, value))
      }
    }
  }
}

// Mock fetch for tests
global.fetch = jest.fn()

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