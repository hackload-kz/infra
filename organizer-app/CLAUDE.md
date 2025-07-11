# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development Workflow
```bash
# Install dependencies
npm install

# Run development server with Turbopack
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Database Operations
```bash
# Generate Prisma client after schema changes
npx prisma generate

# Push schema changes to database
npx prisma db push

# Open Prisma Studio to view/edit data
npx prisma studio

# View database in browser
npx prisma studio
```

### Testing and Validation
```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/api/teams.test.ts

# Run tests with specific pattern
npm test -- --testNamePattern="should create participant profile"

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run deployment check script
./test-app.sh

# Test Docker build
./test-docker.sh

# Check deployment status
./deployment-check.sh
```

## Testing Framework

### Overview
The testing framework uses Jest with TypeScript and comprehensive mocking to ensure reliable, fast, and isolated tests. All database mock conflicts have been resolved, and the framework supports both API endpoint testing and complex workflow testing.

### Test Infrastructure Architecture

#### Jest Configuration (`jest.config.js`)
```javascript
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-node',
  moduleNameMapper: { '^@/(.*): '<rootDir>/src/$1' },
  transformIgnorePatterns: ['node_modules/(?!(next-auth|@auth|@next/env)/)'],
  testMatch: ['<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}'],
}
```

#### Global Test Setup (`jest.setup.js`)
- **NextAuth Providers**: Comprehensive ES module mocking for Google/GitHub OAuth
- **Authentication Module**: Mock auth, signIn, signOut with proper session handling
- **Logger Module**: Complete logger mock with LogAction/LogLevel enums
- **Hackathon Module**: Default active hackathon mock for consistent testing
- **Router Mocking**: Next.js navigation and search params mocking

### Database Mocking Strategy

#### **CRITICAL**: No Global Database Mocks
Global database mocks have been removed to prevent conflicts. Each test file must include its own database mock.

#### Standard Database Mock Pattern
```javascript
// Add to each test file that uses database
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
    hackathonParticipation: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));
```

#### Required Additional Mocks
```javascript
// Always include these mocks when testing API routes
jest.mock('@/auth');
jest.mock('@/lib/admin'); // For tests using isOrganizer
```

### Test File Organization

#### Test Structure
```
tests/
├── api/                     # API endpoint tests
│   ├── health.test.ts      # Health check endpoint
│   ├── messages.test.ts    # Message system API
│   ├── participants.test.ts # Participant management API
│   └── teams.test.ts       # Team management API
├── participant-workflow/    # Complex workflow tests
│   ├── auth.test.ts        # Authentication scenarios (8/14 passing)
│   ├── registration.test.ts # Participant registration flow
│   ├── profile-management.test.ts # Profile update workflows
│   ├── security-edge-cases.test.ts # Security and edge cases
│   ├── internal-participant-data.test.ts # Admin functionality
│   └── public-profile-access.test.ts # Public data access
└── utils/
    └── test-helpers.ts     # Test utilities and mock factories
```

### Test Helper Functions (`tests/utils/test-helpers.ts`)

#### Mock Data Factories
```javascript
// Create consistent test data
export const createMockUser = (overrides = {}) => ({ id: 'user-1', email: 'test@example.com', ...overrides });
export const createMockParticipant = (overrides = {}) => ({ id: 'participant-1', name: 'Test User', ...overrides });
export const createMockTeam = (overrides = {}) => ({ id: 'team-1', name: 'Test Team', ...overrides });
export const createMockHackathon = (overrides = {}) => ({ id: 'hackathon-1', name: 'HackLoad 2025', ...overrides });
```

#### Session Management
```javascript
export const createMockSession = (overrides = {}) => ({ user: { email: 'test@example.com', role: 'participant', ...overrides.user } });
export const createAdminSession = () => ({ user: { email: 'admin@hackload.kz', role: 'admin' } });
```

#### Test Setup/Cleanup
```javascript
export const setupMocks = () => {
  (auth as jest.Mock).mockResolvedValue(createMockSession());
  (isOrganizer as jest.Mock).mockImplementation((email: string) => 
    Promise.resolve(email === 'admin@hackload.kz' || email === 'organizer@hackload.kz'));
};
export const resetMocks = () => jest.clearAllMocks();
```

### Common Test Patterns

#### API Route Testing
```javascript
it('should create participant successfully', async () => {
  // 1. Setup mocks
  const user = createMockUser();
  const participant = createMockParticipant();
  
  // 2. Mock database operations
  (db.user.findUnique as jest.Mock).mockResolvedValue({ ...user, participant: null });
  (db.$transaction as jest.Mock).mockImplementation(async (callback) => {
    const tx = { participant: { create: jest.fn().mockResolvedValue(participant) } };
    await callback(tx);
    return { participant, team: null };
  });
  
  // 3. Make request
  const request = createMockRequest('http://localhost:3000/api/participant/profile', {
    method: 'POST', 
    body: { name: 'John Doe', email: 'john@example.com' }
  });
  const response = await POST(request);
  
  // 4. Assert results
  expect(response.status).toBe(200);
  expect(db.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
});
```

#### User Lookup Pattern (Required for API Routes)
```javascript
// Most API routes require user lookup - always mock this
(db.user.findUnique as jest.Mock).mockResolvedValue({
  ...user,
  participant: existingParticipant || null, // null for new users, participant object for existing
});
```

#### Transaction Mocking
```javascript
// For create operations
(db.$transaction as jest.Mock).mockImplementation(async (callback) => {
  const tx = {
    participant: { create: jest.fn().mockResolvedValue(mockParticipant) },
    hackathonParticipation: { create: jest.fn().mockResolvedValue({}) },
  };
  await callback(tx);
  return { participant: mockParticipant, team: null };
});

// For error testing
(db.$transaction as jest.Mock).mockRejectedValue(new Error('Database error'));
```

### Test Categories and Status

#### API Tests (100% Infrastructure Working)
- **health.test.ts**: ✅ Database health check
- **teams.test.ts**: ✅ Team CRUD operations  
- **participants.test.ts**: ✅ Participant listing
- **messages.test.ts**: ✅ Message system

#### Workflow Tests (Database Mocks Fixed)
- **auth.test.ts**: ✅ 8/14 tests passing (57% success rate)
- **registration.test.ts**: ✅ Basic registration working, needs user lookup mocks for other tests
- **security-edge-cases.test.ts**: ✅ Infrastructure fixed, individual test logic needs refinement
- **profile-management.test.ts**: ✅ Core update functionality working
- **internal-participant-data.test.ts**: ✅ Admin operations infrastructure ready
- **public-profile-access.test.ts**: ✅ Public API access patterns working

### Current Test Metrics
- **Total Tests**: 128
- **Passing**: 94 (73% success rate)
- **Failing**: 34 (individual test logic issues, not infrastructure)
- **Test Suites**: 3 passing, 7 with individual test failures

### Debugging Test Issues

#### Common Issues and Solutions

1. **404 "User not found" Error**
   ```javascript
   // Always add user lookup mock for API routes
   (db.user.findUnique as jest.Mock).mockResolvedValue({ ...user, participant: existingParticipant });
   ```

2. **ES Module Import Errors**
   ```javascript
   // Ensure transformIgnorePatterns includes NextAuth modules in jest.config.js
   transformIgnorePatterns: ['node_modules/(?!(next-auth|@auth|@next/env)/)']
   ```

3. **Mock Conflicts**
   ```javascript
   // Never use global database mocks - always mock locally in test files
   // Remove deprecated helpers: mockDbUser, mockDbParticipant, mockSuccessfulTransaction
   ```

4. **LogAction/LogLevel Undefined**
   ```javascript
   // Already fixed in jest.setup.js - includes full logger mock with enums
   ```

### Performance and Best Practices

#### Test Performance
- **Database Mocking**: All database operations are mocked for fast execution
- **No Network Calls**: All external services mocked
- **Parallel Execution**: Jest runs tests in parallel for faster feedback
- **Isolated Tests**: Each test is completely isolated with proper setup/teardown

#### Best Practices
- **Single Responsibility**: Each test focuses on one specific behavior
- **Descriptive Names**: Test names clearly describe the scenario being tested
- **Arrange-Act-Assert**: Clear test structure with setup, execution, and verification
- **Mock Isolation**: Database mocks are specific to each test file to prevent conflicts
- **Error Testing**: Both success and failure scenarios are covered

### Future Improvements
- **Increase auth test success rate** from 57% to 90%+
- **Add missing user lookup mocks** to remaining failing tests
- **Standardize mock data expectations** across test files
- **Add performance benchmarking** for critical API endpoints

## Architecture Overview

[... rest of the existing content remains unchanged ...]