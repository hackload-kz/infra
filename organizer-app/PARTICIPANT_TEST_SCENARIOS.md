# Participant Workflow Test Scenarios

This document outlines comprehensive test scenarios for the participant workflow, including edge cases, positive and negative flows, and unobvious scenarios.

## Table of Contents

1. [Authentication Workflow](#authentication-workflow)
2. [Participant Registration](#participant-registration)
3. [Profile Management](#profile-management)
4. [Public Profile Access](#public-profile-access)
5. [Internal Participant Data](#internal-participant-data)
6. [Edge Cases & Security](#edge-cases--security)

---

## Authentication Workflow

### Positive Scenarios

#### TC-AUTH-001: Google OAuth Authentication
**Scenario**: First-time user authenticates with Google
- **Preconditions**: User has valid Google account
- **Steps**:
  1. Navigate to `/login`
  2. Click "Sign in with Google"
  3. Complete Google OAuth flow
- **Expected Result**: 
  - User record created in database
  - Redirected to `/space/` 
  - Session established with role "participant"

#### TC-AUTH-002: GitHub OAuth Authentication
**Scenario**: First-time user authenticates with GitHub
- **Preconditions**: User has valid GitHub account
- **Steps**:
  1. Navigate to `/login`
  2. Click "Sign in with GitHub"
  3. Complete GitHub OAuth flow
- **Expected Result**: 
  - User record created in database
  - Redirected to `/space/`
  - Session established with role "participant"

#### TC-AUTH-003: Returning User Authentication
**Scenario**: User with existing account signs in again
- **Preconditions**: User already exists in database
- **Steps**:
  1. Navigate to `/login`
  2. Sign in with OAuth provider
- **Expected Result**: 
  - No duplicate user created
  - Existing user session established
  - Redirected to `/space/`

### Negative Scenarios

#### TC-AUTH-004: OAuth Provider Error
**Scenario**: OAuth provider returns error
- **Steps**:
  1. Navigate to `/login`
  2. Attempt OAuth sign-in
  3. OAuth provider returns error
- **Expected Result**: Authentication fails, user remains on login page

#### TC-AUTH-005: Database Connection Error During Auth
**Scenario**: Database unavailable during sign-in
- **Preconditions**: Database connection failure
- **Steps**: Attempt OAuth sign-in
- **Expected Result**: Authentication fails gracefully

### Edge Cases

#### TC-AUTH-006: Admin User Authentication
**Scenario**: User email is in ADMIN_USERS environment variable
- **Preconditions**: User email listed in `ADMIN_USERS`
- **Steps**: Complete OAuth flow
- **Expected Result**: 
  - User role set to "admin"
  - Access granted to `/dashboard` routes

#### TC-AUTH-007: Concurrent Sign-in Attempts
**Scenario**: Multiple sign-in attempts for same user
- **Steps**: Initiate multiple OAuth flows simultaneously
- **Expected Result**: Only one user record created, no duplicates

---

## Participant Registration

### Positive Scenarios

#### TC-REG-001: Basic Profile Creation (POST /api/participant/profile)
**Scenario**: New user creates participant profile
- **Preconditions**: 
  - User authenticated but no participant profile exists
  - Active hackathon available
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "city": "New York",
    "company": "TechCorp",
    "experienceLevel": "INTERMEDIATE"
  }
  ```
- **Expected Result**: 
  - HTTP 200
  - Participant record created
  - HackathonParticipation record created
  - Response includes participant data

#### TC-REG-002: Profile Creation with New Team
**Scenario**: User creates profile and new team simultaneously
- **Request Body**:
  ```json
  {
    "name": "Jane Smith",
    "email": "jane@example.com",
    "teamOption": "new",
    "newTeamName": "Team Alpha",
    "newTeamNickname": "alpha",
    "experienceLevel": "ADVANCED"
  }
  ```
- **Expected Result**:
  - Participant created
  - New team created with user as leader
  - Team.leaderId set to participant.id
  - Response includes team data with isLeader: true

#### TC-REG-003: Profile Creation with Existing Team
**Scenario**: User joins existing team during registration
- **Preconditions**: Team "beta" exists
- **Request Body**:
  ```json
  {
    "name": "Bob Wilson",
    "email": "bob@example.com",
    "teamOption": "existing",
    "selectedTeam": "{team-beta-id}",
    "experienceLevel": "BEGINNER"
  }
  ```
- **Expected Result**:
  - Participant created and assigned to existing team
  - No leadership role assigned

#### TC-REG-004: Profile with Social Links
**Scenario**: User provides social media profiles
- **Request Body**:
  ```json
  {
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "telegram": "@alice_dev",
    "githubUrl": "https://github.com/alice",
    "linkedinUrl": "https://linkedin.com/in/alice",
    "technologies": ["JavaScript", "Python", "React"],
    "cloudServices": ["AWS", "Docker"],
    "otherTechnologies": "Vue.js, Node.js"
  }
  ```
- **Expected Result**:
  - All social links and technologies stored
  - Arrays properly JSON.stringify'd

### Negative Scenarios

#### TC-REG-005: Missing Required Fields
**Scenario**: Registration without name or email
- **Request Body**:
  ```json
  {
    "city": "Boston"
  }
  ```
- **Expected Result**: HTTP 400, "Имя и email обязательны"

#### TC-REG-006: Duplicate Email Registration
**Scenario**: Email already registered by another participant
- **Preconditions**: Participant with email exists
- **Request Body**:
  ```json
  {
    "name": "John Duplicate",
    "email": "existing@example.com"
  }
  ```
- **Expected Result**: HTTP 400, "Участник с таким email уже зарегистрирован"

#### TC-REG-007: Profile Already Exists
**Scenario**: User already has participant profile
- **Preconditions**: Current user has existing participant record
- **Expected Result**: HTTP 400, "Профиль участника уже создан"

#### TC-REG-008: Team Nickname Conflict
**Scenario**: New team nickname already exists
- **Request Body**:
  ```json
  {
    "name": "User Name",
    "email": "user@example.com",
    "teamOption": "new",
    "newTeamName": "Duplicate Team",
    "newTeamNickname": "existing-nickname"
  }
  ```
- **Expected Result**: HTTP 400, "Команда с таким nickname уже существует"

#### TC-REG-009: Invalid Existing Team
**Scenario**: Selected team ID doesn't exist
- **Request Body**:
  ```json
  {
    "name": "User Name",
    "email": "user@example.com",
    "teamOption": "existing",
    "selectedTeam": "non-existent-id"
  }
  ```
- **Expected Result**: HTTP 400, "Выбранная команда не найдена"

#### TC-REG-010: No Active Hackathon
**Scenario**: Registration when no hackathon is active
- **Preconditions**: No hackathon with isActive: true
- **Expected Result**: HTTP 400, "No active hackathon found"

#### TC-REG-011: Unauthenticated Request
**Scenario**: Registration without authentication
- **Preconditions**: No valid session
- **Expected Result**: HTTP 401, "Не авторизован"

### Edge Cases

#### TC-REG-012: Transaction Failure During Team Creation
**Scenario**: Database error during team creation step
- **Setup**: Mock transaction failure after participant creation
- **Expected Result**: Entire transaction rolled back, no partial data

#### TC-REG-013: Large Technology Arrays
**Scenario**: User provides extensive technology lists
- **Request Body**: Arrays with 50+ technologies
- **Expected Result**: All data stored, proper JSON serialization

#### TC-REG-014: Special Characters in Team Name
**Scenario**: Team name with Unicode, emojis, special characters
- **Request Body**:
  ```json
  {
    "newTeamName": "Team 🚀 Alpha-β",
    "newTeamNickname": "team-alpha-beta"
  }
  ```
- **Expected Result**: Data stored correctly, no encoding issues

#### TC-REG-015: Concurrent Team Creation
**Scenario**: Multiple users try to create team with same nickname
- **Steps**: Simultaneous requests with identical nicknames
- **Expected Result**: Only one succeeds, others get constraint error

---

## Profile Management

### Positive Scenarios

#### TC-PROFILE-001: Update Existing Profile (PUT /api/participant/profile)
**Scenario**: User updates their existing profile
- **Preconditions**: User has existing participant profile
- **Request Body**:
  ```json
  {
    "name": "John Doe Updated",
    "city": "San Francisco",
    "company": "NewTech Inc",
    "experienceLevel": "ADVANCED",
    "technologies": ["JavaScript", "TypeScript", "React", "Node.js"]
  }
  ```
- **Expected Result**:
  - HTTP 200
  - Profile updated with new data
  - Response includes updated participant info

#### TC-PROFILE-002: First-Time Profile Creation via PUT
**Scenario**: Authenticated user without profile uses PUT endpoint
- **Preconditions**: 
  - User authenticated but no participant profile
  - Active hackathon exists
- **Request Body**:
  ```json
  {
    "name": "First Time User",
    "experienceLevel": "BEGINNER"
  }
  ```
- **Expected Result**:
  - HTTP 200
  - New participant profile created
  - HackathonParticipation record created
  - isNewParticipant: true in response

#### TC-PROFILE-003: Partial Profile Update
**Scenario**: User updates only specific fields
- **Request Body**:
  ```json
  {
    "name": "Same Name",
    "company": "Different Company"
  }
  ```
- **Expected Result**:
  - Only specified fields updated
  - Other fields remain unchanged
  - Null handling for optional fields

#### TC-PROFILE-004: Clear Optional Fields
**Scenario**: User removes optional information
- **Request Body**:
  ```json
  {
    "name": "User Name",
    "city": null,
    "company": "",
    "telegram": null
  }
  ```
- **Expected Result**: Optional fields set to null in database

### Negative Scenarios

#### TC-PROFILE-005: Update Without Name
**Scenario**: Profile update missing required name field
- **Request Body**:
  ```json
  {
    "city": "Boston",
    "company": "TechCorp"
  }
  ```
- **Expected Result**: HTTP 400, "Имя обязательно"

#### TC-PROFILE-006: Update Non-existent User
**Scenario**: Session user doesn't exist in database
- **Preconditions**: Session email not found in users table
- **Expected Result**: HTTP 404, "Пользователь не найден"

#### TC-PROFILE-007: Update During Hackathon Transition
**Scenario**: Profile update when no active hackathon (for new participants)
- **Preconditions**: 
  - User has no participant profile
  - No active hackathon
- **Expected Result**: HTTP 400, "No active hackathon found"

#### TC-PROFILE-008: Unauthenticated Update
**Scenario**: Profile update without authentication
- **Expected Result**: HTTP 401, "Не авторизован"

### Edge Cases

#### TC-PROFILE-009: Concurrent Profile Updates
**Scenario**: Multiple simultaneous updates to same profile
- **Steps**: Send multiple PUT requests simultaneously
- **Expected Result**: 
  - Last write wins
  - No data corruption
  - Proper timestamps

#### TC-PROFILE-010: Large Data Fields
**Scenario**: Profile with very large text fields
- **Request Body**: 
  - Company name with 1000+ characters
  - Technologies array with 100+ items
- **Expected Result**: Data stored or appropriate validation error

#### TC-PROFILE-011: Invalid JSON in Arrays
**Scenario**: Profile update with malformed array data
- **Setup**: Mock invalid JSON.stringify scenario
- **Expected Result**: Error handled gracefully

---

## Public Profile Access

### Positive Scenarios

#### TC-PUBLIC-001: View Public Participant Profile (GET /api/participants/{id})
**Scenario**: Admin views any participant profile
- **Preconditions**: 
  - Admin user authenticated
  - Participant exists
- **Expected Result**:
  - HTTP 200
  - Full participant data returned
  - Team information included if applicable

#### TC-PUBLIC-002: Participant List for Admin (GET /api/participants)
**Scenario**: Admin retrieves all participants for hackathon
- **Query Parameters**: `?hackathonId=hackathon-id`
- **Expected Result**:
  - HTTP 200
  - Array of participants for specified hackathon
  - Team associations included

#### TC-PUBLIC-003: Public Team Member Display
**Scenario**: View team members on public team page
- **Context**: Public-facing team profile page
- **Expected Result**: 
  - Participant names and basic info visible
  - Private info (email, phone) hidden from public

### Negative Scenarios

#### TC-PUBLIC-004: Non-Admin Access to Admin Endpoints
**Scenario**: Regular participant tries to access admin endpoints
- **Preconditions**: Non-admin user authenticated
- **Request**: GET /api/participants
- **Expected Result**: HTTP 403, "Access denied"

#### TC-PUBLIC-005: Unauthenticated Admin Endpoint Access
**Scenario**: Access admin endpoints without authentication
- **Request**: GET /api/participants
- **Expected Result**: HTTP 401, "Unauthorized"

#### TC-PUBLIC-006: Invalid Hackathon ID
**Scenario**: Request participants for non-existent hackathon
- **Request**: GET /api/participants?hackathonId=invalid-id
- **Expected Result**: HTTP 400, "Hackathon ID is required" or empty results

#### TC-PUBLIC-007: Missing Hackathon ID
**Scenario**: Admin request without required hackathon parameter
- **Request**: GET /api/participants
- **Expected Result**: HTTP 400, "Hackathon ID is required"

### Edge Cases

#### TC-PUBLIC-008: Participant with No Team
**Scenario**: View profile of participant not in any team
- **Expected Result**: Team information null/empty in response

#### TC-PUBLIC-009: Team Leader Profile
**Scenario**: View profile of participant who leads a team
- **Expected Result**: 
  - Team information included
  - Leadership status indicated

#### TC-PUBLIC-010: Deleted Team Reference
**Scenario**: Participant references deleted team
- **Setup**: Team deleted but participant.teamId still set
- **Expected Result**: Graceful handling, no cascade errors

---

## Internal Participant Data

### Positive Scenarios

#### TC-INTERNAL-001: Admin Participant Management (PUT /api/participants/{id})
**Scenario**: Admin updates any participant's profile
- **Preconditions**: Admin user authenticated
- **Request Body**:
  ```json
  {
    "name": "Admin Updated Name",
    "experienceLevel": "ADVANCED",
    "teamId": "new-team-id",
    "technologies": ["Updated", "Tech", "Stack"],
    "cloudServices": ["AWS", "Azure"]
  }
  ```
- **Expected Result**:
  - HTTP 200
  - Participant updated with new data
  - Team assignment changed if specified

#### TC-INTERNAL-002: Admin Team Assignment
**Scenario**: Admin assigns participant to different team
- **Request Body**:
  ```json
  {
    "name": "Participant Name",
    "teamId": "target-team-id"
  }
  ```
- **Expected Result**:
  - Participant moved to specified team
  - Previous team membership updated

#### TC-INTERNAL-003: Admin Remove Team Assignment
**Scenario**: Admin removes participant from team
- **Request Body**:
  ```json
  {
    "name": "Participant Name",
    "teamId": null
  }
  ```
- **Expected Result**: Participant.teamId set to null

### Negative Scenarios

#### TC-INTERNAL-004: Non-Admin Internal Access
**Scenario**: Regular user tries admin participant update
- **Preconditions**: Non-admin user authenticated
- **Request**: PUT /api/participants/{id}
- **Expected Result**: HTTP 401, "Unauthorized"

#### TC-INTERNAL-005: Update Non-existent Participant
**Scenario**: Admin tries to update non-existent participant
- **Request**: PUT /api/participants/invalid-id
- **Expected Result**: HTTP 404, "Participant not found"

#### TC-INTERNAL-006: Invalid Team Assignment
**Scenario**: Admin assigns participant to non-existent team
- **Request Body**:
  ```json
  {
    "name": "Participant Name",
    "teamId": "non-existent-team-id"
  }
  ```
- **Expected Result**: Database constraint error or validation error

### Edge Cases

#### TC-INTERNAL-007: Admin Self-Update
**Scenario**: Admin updates their own participant profile via admin endpoint
- **Expected Result**: Update succeeds, no permission issues

#### TC-INTERNAL-008: Bulk Team Assignment
**Scenario**: Admin rapidly updates multiple participants' teams
- **Steps**: Multiple concurrent requests
- **Expected Result**: All updates process correctly

#### TC-INTERNAL-009: Team Leader Reassignment
**Scenario**: Admin moves team leader to different team
- **Expected Result**: 
  - Leadership transfer or team dissolution
  - Proper cleanup of leadership relations

---

## Edge Cases & Security

### Security Scenarios

#### TC-SEC-001: SQL Injection in Profile Fields
**Scenario**: Malicious input in profile fields
- **Request Body**:
  ```json
  {
    "name": "'; DROP TABLE participants; --",
    "email": "test@example.com"
  }
  ```
- **Expected Result**: Input properly escaped, no SQL injection

#### TC-SEC-002: XSS in Profile Data
**Scenario**: Script injection in profile fields
- **Request Body**:
  ```json
  {
    "name": "<script>alert('xss')</script>",
    "company": "<img src=x onerror=alert('xss')>"
  }
  ```
- **Expected Result**: Data stored safely, scripts neutralized on display

#### TC-SEC-003: CSRF Token Validation
**Scenario**: Request without proper CSRF protection
- **Expected Result**: Request rejected or proper CSRF handling

#### TC-SEC-004: Rate Limiting
**Scenario**: Rapid repeated requests to profile endpoints
- **Steps**: Send 100+ requests in short timeframe
- **Expected Result**: Rate limiting applied, service remains stable

#### TC-SEC-005: Session Hijacking Attempt
**Scenario**: Invalid or expired session token
- **Expected Result**: Request rejected, user prompted to re-authenticate

### Data Integrity

#### TC-DATA-001: Concurrent Writes
**Scenario**: Multiple users updating same data simultaneously
- **Expected Result**: Proper locking, no data corruption

#### TC-DATA-002: Database Connection Loss
**Scenario**: Database becomes unavailable during request
- **Expected Result**: Graceful error handling, proper error messages

#### TC-DATA-003: Partial Transaction Failure
**Scenario**: Transaction fails after partial completion
- **Expected Result**: Full rollback, consistent state maintained

#### TC-DATA-004: Invalid Foreign Key References
**Scenario**: Reference to non-existent related records
- **Expected Result**: Constraint errors handled gracefully

### Performance

#### TC-PERF-001: Large Dataset Queries
**Scenario**: Participant list with 10,000+ participants
- **Expected Result**: 
  - Reasonable response time (< 5 seconds)
  - Proper pagination if needed

#### TC-PERF-002: Complex Profile Updates
**Scenario**: Profile with extensive JSON arrays and relationships
- **Expected Result**: Update completes within reasonable time

#### TC-PERF-003: Memory Usage
**Scenario**: Multiple large profile operations
- **Expected Result**: Memory usage remains stable, no leaks

---

## Test Data Requirements

### Sample Users
- `admin@hackload.kz` (Admin user)
- `participant1@test.com` (Regular participant)
- `participant2@test.com` (Team leader)
- `newuser@test.com` (No existing profile)

### Sample Teams
- Team Alpha (nickname: "alpha", has members)
- Team Beta (nickname: "beta", needs members)
- Team Gamma (nickname: "gamma", full team)

### Sample Hackathons
- Active: "HackLoad 2025" (isActive: true)
- Inactive: "Previous Hackathon" (isActive: false)

### Environment Variables Required for Testing
- `ADMIN_USERS=admin@hackload.kz,organizer@hackload.kz`
- `DATABASE_URL=postgresql://test:test@localhost:5432/test_db`
- `NEXTAUTH_SECRET=test-secret-key`
- `NEXTAUTH_URL=http://localhost:3000`

---

## Automation Notes

### API Testing Tools
- Jest + Supertest for endpoint testing
- Prisma test database for isolation
- Mock OAuth providers for authentication testing

### Test Database Setup
```sql
-- Reset test data before each test suite
TRUNCATE TABLE participants, teams, users, hackathons, hackathon_participations CASCADE;
-- Insert test fixtures
-- Run test scenarios
-- Cleanup
```

### Continuous Integration
- Run full test suite on every commit
- Include performance benchmarks
- Security scanning for injection vulnerabilities
- Database migration testing

This comprehensive test plan covers the entire participant workflow from authentication through profile management, ensuring robust testing of both happy paths and edge cases.