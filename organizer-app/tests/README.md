# Participant Workflow Test Suite

This directory contains comprehensive automated tests for the participant workflow, implementing all test scenarios from `PARTICIPANT_TEST_SCENARIOS.md`.

## 📁 Directory Structure

```
tests/
├── README.md                           # This file
├── run-participant-tests.js            # Test runner script
├── utils/
│   └── test-helpers.ts                 # Test utilities and mocks
└── participant-workflow/
    ├── auth.test.ts                    # Authentication workflow tests
    ├── registration.test.ts            # Participant registration tests
    ├── profile-management.test.ts      # Profile management tests
    ├── public-profile-access.test.ts   # Public profile access tests
    ├── internal-participant-data.test.ts # Internal participant data tests
    └── security-edge-cases.test.ts     # Security and edge case tests
```

## 🧪 Test Coverage

### Test Statistics
- **Total Test Scenarios**: 67+
- **Test Files**: 6
- **Test Categories**: 6
- **Security Tests**: 15+
- **Edge Cases**: 20+

### Test Categories

#### 1. Authentication Workflow (7 scenarios)
- `tests/participant-workflow/auth.test.ts`
- Google/GitHub OAuth authentication
- Role assignment (admin vs participant)
- Session management and middleware
- Concurrent authentication attempts

#### 2. Participant Registration (15 scenarios)
- `tests/participant-workflow/registration.test.ts`
- Basic profile creation via POST
- Team creation and joining workflows
- Data validation and error handling
- Transaction integrity testing

#### 3. Profile Management (11 scenarios)
- `tests/participant-workflow/profile-management.test.ts`
- Profile updates via PUT endpoint
- Partial updates and field clearing
- First-time profile creation
- Concurrent update handling

#### 4. Public Profile Access (10 scenarios)
- `tests/participant-workflow/public-profile-access.test.ts`
- Admin access to participant data
- Authorization and permission testing
- Data filtering and privacy
- Large dataset handling

#### 5. Internal Participant Data (9 scenarios)
- `tests/participant-workflow/internal-participant-data.test.ts`
- Admin-only participant management
- Team assignment and removal
- Bulk operations and leadership transitions

#### 6. Security & Edge Cases (15+ scenarios)
- `tests/participant-workflow/security-edge-cases.test.ts`
- SQL injection prevention
- XSS payload handling
- Rate limiting and CSRF protection
- Data integrity and performance testing

## 🚀 Running Tests

### Quick Start

```bash
# Run all participant workflow tests
npm test

# Run specific test suite
npx jest tests/participant-workflow/auth.test.ts

# Run with coverage
npm run test:coverage

# Run comprehensive test suite with custom runner
node tests/run-participant-tests.js
```

### Individual Test Suites

```bash
# Authentication tests
npx jest tests/participant-workflow/auth.test.ts --verbose

# Registration tests
npx jest tests/participant-workflow/registration.test.ts --verbose

# Profile management tests
npx jest tests/participant-workflow/profile-management.test.ts --verbose

# Public access tests
npx jest tests/participant-workflow/public-profile-access.test.ts --verbose

# Internal data tests
npx jest tests/participant-workflow/internal-participant-data.test.ts --verbose

# Security tests
npx jest tests/participant-workflow/security-edge-cases.test.ts --verbose
```

### Watch Mode

```bash
# Watch all participant tests
npx jest tests/participant-workflow/ --watch

# Watch specific test file
npx jest tests/participant-workflow/auth.test.ts --watch
```

## 🔧 Test Infrastructure

### Test Helpers (`tests/utils/test-helpers.ts`)

The test helper utilities provide:

- **Mock Factories**: Create test data objects
- **Request Helpers**: Generate mock HTTP requests
- **Database Mocks**: Mock Prisma database operations
- **Session Mocks**: Mock authentication sessions
- **Security Helpers**: Create malicious payloads for security testing
- **Performance Helpers**: Generate large datasets and concurrent requests

### Key Helper Functions

```typescript
// Mock data creation
createMockUser(overrides?)
createMockParticipant(overrides?)
createMockTeam(overrides?)
createMockSession(overrides?)
createAdminSession()

// Request helpers
createMockRequest(url, options)
createMaliciousRequest(payload)
createLargeDataRequest()

// Test setup
setupMocks()
resetMocks()
setupActiveHackathon()
setupExistingUser(withParticipant?)

// Assertions
expectSuccessResponse(response, status?)
expectErrorResponse(response, status, message?)
```

## 📋 Test Scenarios Mapping

This test suite implements all scenarios from `PARTICIPANT_TEST_SCENARIOS.md`:

| Test ID | Scenario | Test File | Status |
|---------|----------|-----------|--------|
| TC-AUTH-001 | Google OAuth Authentication | auth.test.ts | ✅ |
| TC-AUTH-002 | GitHub OAuth Authentication | auth.test.ts | ✅ |
| TC-AUTH-003 | Returning User Authentication | auth.test.ts | ✅ |
| TC-REG-001 | Basic Profile Creation | registration.test.ts | ✅ |
| TC-REG-002 | Profile with New Team | registration.test.ts | ✅ |
| TC-REG-003 | Profile with Existing Team | registration.test.ts | ✅ |
| TC-PROFILE-001 | Update Existing Profile | profile-management.test.ts | ✅ |
| TC-PUBLIC-001 | View Public Profile | public-profile-access.test.ts | ✅ |
| TC-INTERNAL-001 | Admin Participant Management | internal-participant-data.test.ts | ✅ |
| TC-SEC-001 | SQL Injection Prevention | security-edge-cases.test.ts | ✅ |
| ... | (67+ total scenarios) | ... | ✅ |

## 🛡️ Security Testing

### SQL Injection Tests
- Malicious SQL in name, email, and text fields
- Parameterized query validation
- Database constraint protection

### XSS Prevention Tests
- Script injection in profile fields
- Complex XSS payloads
- Output sanitization validation

### Authorization Tests
- Role-based access control
- Session validation
- Privilege escalation prevention

### Rate Limiting Tests
- Rapid request simulation
- Concurrent operation handling
- Service stability under load

## 🎯 Performance Testing

### Load Tests
- Large dataset handling (1000+ participants)
- Complex JSON serialization
- Memory usage monitoring

### Concurrency Tests
- Simultaneous profile updates
- Race condition prevention
- Data integrity under concurrent access

### Response Time Tests
- API response time validation
- Database operation efficiency
- Large payload processing

## 🔍 Edge Case Coverage

### Data Validation
- Unicode character handling
- Large text fields
- Invalid JSON payloads
- Circular reference prevention

### Network Conditions
- Database connection failures
- Timeout scenarios
- Partial transaction failures

### Business Logic
- Team leadership transitions
- Hackathon participation logic
- Constraint violation handling

## 📊 Coverage Reports

### Generating Coverage Reports

```bash
# Generate HTML coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

### Coverage Targets

- **Statement Coverage**: >95%
- **Branch Coverage**: >90%
- **Function Coverage**: >95%
- **Line Coverage**: >95%

## 🔧 Configuration

### Jest Configuration (`jest.config.js`)

The test suite uses a custom Jest configuration optimized for Next.js and TypeScript:

- TypeScript compilation with ts-jest
- Module path mapping for `@/` imports
- Mock setup for Next.js components
- Coverage collection from source files

### Environment Variables

Required for testing:

```bash
DATABASE_URL=postgresql://test:test@localhost:5432/test_db
NEXTAUTH_SECRET=test-secret-key-for-testing-only
NEXTAUTH_URL=http://localhost:3000
ADMIN_USERS=admin@hackload.kz,organizer@hackload.kz
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Module Resolution Errors
```bash
# Clear Jest cache
npx jest --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### 2. TypeScript Compilation Errors
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Verify path mappings in jest.config.js
```

#### 3. Mock Setup Issues
```bash
# Reset all mocks between tests
# (handled automatically by resetMocks())

# Check mock implementations in test-helpers.ts
```

#### 4. Database Mock Issues
```bash
# Verify Prisma client mocks
# Check transaction mock implementations
# Ensure proper mock cleanup
```

### Debug Mode

```bash
# Run tests with debug output
DEBUG=* npx jest tests/participant-workflow/

# Run single test with verbose output
npx jest tests/participant-workflow/auth.test.ts --verbose --no-cache
```

## 📈 Continuous Integration

### GitHub Actions Integration

Add to `.github/workflows/test.yml`:

```yaml
name: Participant Workflow Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - run: node tests/run-participant-tests.js
```

### Pre-commit Hooks

Add to `package.json`:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test && npm run lint"
    }
  }
}
```

## 📚 Documentation

### Related Documents

- `PARTICIPANT_TEST_SCENARIOS.md` - Detailed test scenario specifications
- `CLAUDE.md` - Project development guidelines
- `jest.config.js` - Jest configuration
- `jest.setup.js` - Test environment setup

### API Documentation

The tests validate the following API endpoints:

- `POST /api/participant/profile` - Participant registration
- `PUT /api/participant/profile` - Profile updates
- `GET /api/participants` - Admin participant list
- `PUT /api/participants/[id]` - Admin participant management

## 🤝 Contributing

### Adding New Tests

1. Add test scenarios to `PARTICIPANT_TEST_SCENARIOS.md`
2. Implement tests in appropriate test file
3. Update test helpers if needed
4. Run full test suite to ensure compatibility
5. Update this README with new test counts

### Test Writing Guidelines

- Use descriptive test names matching scenario IDs
- Include positive, negative, and edge case tests
- Mock external dependencies appropriately
- Verify both success and error responses
- Test data validation thoroughly
- Include performance and security tests

### Code Review Checklist

- [ ] All test scenarios implemented
- [ ] Mocks properly configured
- [ ] Error cases covered
- [ ] Performance tests included
- [ ] Security tests updated
- [ ] Documentation updated

## 📞 Support

For issues with the test suite:

1. Check this README for troubleshooting
2. Review test output and error messages
3. Verify environment setup and dependencies
4. Check mock configurations
5. Review related documentation

The test suite is designed to be comprehensive, reliable, and maintainable, providing confidence in the participant workflow implementation.