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

## UI Color Schema Reference

### Overview
The HackLoad organizer application uses a comprehensive dark theme color schema built on Tailwind CSS. This reference provides standardized color usage patterns for consistency across the dashboard and space interfaces.

### Primary Color Palette

#### **Amber (Primary/Accent Color)**
- **Primary Brand**: `text-amber-400`, `bg-amber-400`
- **Accent Elements**: Page titles, active states, highlights
- **Gradients**: `from-amber-400 to-amber-500`
- **Interactive**: `bg-amber-400/20` (20% opacity for backgrounds)
- **Hover States**: `hover:bg-amber-500`, `hover:text-amber-300`

#### **Slate (Main UI Framework)**
- **Dark Backgrounds**: 
  - `bg-slate-900` - Main app background
  - `bg-slate-800` - Secondary panels/cards
  - `bg-slate-800/50` - Semi-transparent overlays with backdrop blur
  - `bg-slate-700` - Interactive elements background
  - `bg-slate-700/30` - Subtle card sections
- **Text Colors**:
  - `text-white` - Primary headings and important text
  - `text-slate-300` - Secondary text and navigation
  - `text-slate-400` - Muted text, descriptions, placeholders
  - `text-slate-500` - Very subtle text, timestamps
- **Borders**: 
  - `border-slate-700/30` - Standard borders with opacity
  - `border-slate-800/50` - Subtle dividers

### State-Specific Colors

#### **Success States (Green)**
- **Success Actions**: `text-green-400`, `bg-green-400`
- **Team Status**: `bg-green-500/20 text-green-300 border-green-500/30`
- **Completed Tasks**: `text-green-400`
- **Success Messages**: `bg-green-100 text-green-800` (light theme contexts)
- **Interactive**: `bg-green-500 hover:bg-green-600` (buttons)

#### **Error/Danger States (Red)**
- **High Priority**: `text-red-400`
- **Destructive Actions**: `bg-red-600 hover:bg-red-700`
- **Error Messages**: `bg-red-100 text-red-800` (light theme contexts)
- **Borders**: `border-red-300 text-red-600 hover:bg-red-50`

#### **Warning States (Yellow/Amber)**
- **Medium Priority**: `text-yellow-400`
- **Warning Messages**: `bg-yellow-100 text-yellow-800` (light theme contexts)
- **Alert Icons**: `text-amber-500`
- **Warning Banners**: `bg-amber-900/30 border-amber-500/50 text-amber-100`

#### **Info States (Blue)**
- **Info Messages**: `text-blue-400`, `bg-blue-500/20 text-blue-300`
- **Default Buttons**: `bg-blue-600 hover:bg-blue-700`
- **In Progress Status**: `text-blue-400`
- **Focus Rings**: `focus:ring-blue-500`

#### **Neutral States (Purple/Gray)**
- **Admin Actions**: `bg-purple-100 text-purple-800`
- **Review Status**: `bg-purple-500/20 text-purple-300`
- **Disabled/Inactive**: `text-slate-500`, `opacity-50`

### Interactive Element Colors

#### **Navigation (PersonalCabinetLayout)**
- **Active Page**: `bg-amber-400/20 text-amber-400 border border-amber-400/30`
- **Inactive Links**: `text-slate-300 hover:bg-slate-800/50 hover:text-white`
- **Disabled Items**: `text-slate-500` with `opacity-50`
- **Icons**: `text-slate-400 group-hover:text-white`

#### **Buttons (UI Components)**
- **Primary**: `bg-blue-600 text-white hover:bg-blue-700`
- **Destructive**: `bg-red-600 text-white hover:bg-red-700`
- **Outline**: `border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`
- **Secondary**: `bg-gray-100 text-gray-900 hover:bg-gray-200`
- **Ghost**: `text-gray-700 hover:bg-gray-100`
- **Success**: `bg-green-500 hover:bg-green-600 text-white`

#### **Form Elements**
- **Input Fields**: `border-gray-300 focus:ring-blue-500 text-gray-900`
- **Checkboxes**: `text-blue-600 focus:ring-blue-500`
- **Focus States**: `focus:ring-2 focus:ring-offset-2`

#### **Cards and Containers**
- **Main Cards**: `bg-slate-800/50 backdrop-blur-sm border border-slate-700/30`
- **Hover States**: `hover:bg-slate-800/70`
- **Special Highlights**: `border-amber-400/30 bg-amber-400/5` (unread items)

### Team Status Colors

#### **Team Workflow States**
- **NEW**: `bg-blue-500/20 text-blue-300 border-blue-500/30`
- **INCOMPLETED**: `bg-yellow-500/20 text-yellow-300 border-yellow-500/30`
- **FINISHED**: `bg-green-500/20 text-green-300 border-green-500/30`
- **IN_REVIEW**: `bg-purple-500/20 text-purple-300 border-purple-500/30`
- **APPROVED**: `bg-green-500/20 text-green-300 border-green-500/30`
- **CANCELED**: `bg-gray-500/20 text-gray-300 border-gray-500/30`

### Priority Colors

#### **Task Priority System**
- **High Priority**: `text-red-400`
- **Medium Priority**: `text-yellow-400`
- **Low Priority**: `text-green-400`

### Gradient Patterns

#### **Brand Gradients**
- **Primary**: `bg-gradient-to-r from-amber-400 to-amber-500`
- **User Avatar**: `bg-gradient-to-r from-amber-400 to-amber-500`
- **CTA Sections**: `from-amber-400/20 to-amber-500/20 border-amber-400/30`

### Accessibility Considerations

#### **Contrast Ratios**
- **High Contrast**: White text on dark backgrounds for readability
- **Interactive Elements**: Clear visual feedback with hover states
- **Focus Indicators**: Prominent focus rings for keyboard navigation
- **Color + Text**: Status information uses both color and text labels

#### **Dark Theme Optimization**
- **Backdrop Blur**: `backdrop-blur-sm` used with semi-transparent backgrounds
- **Opacity Layers**: Strategic use of opacity (`/50`, `/30`, `/20`) for depth
- **Border Contrast**: Subtle borders with opacity for visual separation

### Usage Guidelines

#### **Do's**
- Use amber for primary brand elements and active states
- Maintain slate as the foundation color system
- Apply consistent opacity patterns for layering
- Use semantic colors (green=success, red=error, etc.)

#### **Don'ts**
- Mix different opacity levels of the same color randomly
- Use pure black backgrounds (prefer slate-900)
- Override focus ring colors without accessibility testing
- Use color alone to convey important information

#### **Special Cases**
- **Admin Interface**: Uses light theme colors (`gray-100`, `gray-900`) in some components
- **Message System**: Has dedicated read/unread color states
- **Loading States**: Uses amber spinner with `border-amber-400`

This color schema ensures visual consistency, accessibility compliance, and maintainability across the entire HackLoad organizer application.

## Architecture Overview

### K6 Load Testing Configuration

#### Resource Management
K6 TestRuns can be configured with resource requests and limits through environment variables:

- **`K6_RESOURCE_CPU`**: CPU resource limit (default: `500m`)
  - Sets both requests and limits to the same value
  - Example values: `500m`, `1000m`, `2`
  
- **`K6_RESOURCE_MEMORY`**: Memory resource limit (default: `512Mi`)
  - Sets both requests and limits to the same value
  - Example values: `512Mi`, `1Gi`, `2Gi`

#### Usage Examples
```bash
# Default resources (500m CPU, 512Mi memory)
# No environment variables needed

# Custom resources for higher loads
export K6_RESOURCE_CPU="1000m"
export K6_RESOURCE_MEMORY="1Gi"

# For development/testing with lower resources
export K6_RESOURCE_CPU="250m" 
export K6_RESOURCE_MEMORY="256Mi"
```

#### Implementation Notes
- Resources are applied to all K6 TestRun pods
- Requests and limits are always equal (guaranteed QoS)
- Changes take effect on new test runs
- Each test scenario step can have different parallelism levels but uses the same resource allocation per container

[... rest of the existing content remains unchanged ...]