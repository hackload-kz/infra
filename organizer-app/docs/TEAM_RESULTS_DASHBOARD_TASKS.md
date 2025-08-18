# Team Results Dashboard Implementation Tasks

## Overview
Implementation of a comprehensive team results dashboard that displays performance criteria for all approved teams in the hackathon.

## Task Breakdown

### Task 1: Database Schema for Team Criteria Tracking
**Required Data to Start:**
- Current Prisma schema (`organizer-app/prisma/schema.prisma`)
- Understanding of existing Team model structure
- Database migration workflow

**Implementation Details:**
- Create `TeamCriteria` model with fields:
  - `id` (String, @id @default(cuid()))
  - `teamId` (String, relation to Team)
  - `hackathonId` (String, relation to Hackathon)
  - `criteriaType` (Enum: CODE_REPO, DEPLOYED_SOLUTION, EVENT_SEARCH, ARCHIVE_SEARCH, AUTH_PERFORMANCE, TICKET_BOOKING, TICKET_CANCELLATION, BUDGET_TRACKING)
  - `status` (Enum: PASSED, FAILED, NO_DATA)
  - `score` (Int, nullable)
  - `metrics` (Json, nullable - for storing performance data)
  - `lastUpdated` (DateTime)
  - `updatedBy` (String - service identifier)

**Questions for Clarification:**
1. Should we store historical data for each criteria update or just the latest?
2. What's the unique identifier format for teams mentioned in the requirements?

### Task 2: API Endpoints for Updating Criteria Data
**Required Data to Start:**
- Service token authentication mechanism
- API route structure in the app
- Understanding of existing authentication middleware

**Implementation Details:**
- Create `POST /api/team-criteria/update` endpoint
- Implement service token validation middleware
- Create endpoint for bulk updates: `POST /api/team-criteria/bulk-update`
- Add input validation using Zod schemas
- Implement rate limiting for external services

**Questions for Clarification:**
1. What should be the format and length of the Service-Token?
2. Should we implement webhook endpoints or just HTTP POST endpoints?
3. Do we need audit logging for criteria updates?

### Task 3: Results Dashboard Page with Navigation
**Required Data to Start:**
- Existing navigation structure (`organizer-app/src/components/navigation/`)
- Current page routing system
- Admin permission system

**Implementation Details:**
- Create `/results` page under app router
- Add "Результаты" menu item under "Tasks" in navigation
- Implement admin-only access control
- Set up basic page layout with Tailwind CSS

**Questions for Clarification:**
1. Should this page be accessible to all authenticated users or only admins?
2. Should we add any filters (by hackathon, team status, etc.)?

### Task 4: Team Table with Basic Structure
**Required Data to Start:**
- Existing table components or design system
- Team data structure and approved teams query
- Link routing to team pages

**Implementation Details:**
- Create responsive table component with team names as links
- Implement server-side data fetching for approved teams
- Add sorting capabilities by:
  - Team name (alphabetical)
  - Latest data update (most recent first)
  - Total score/number of passed criteria (highest first)
  - Default sort: Latest data update, then by total score
- Include loading states and error handling
- Add sort direction indicators (up/down arrows)

**Questions for Clarification:**
1. Should the table be paginated if there are many teams?
2. Do we need real-time updates or is periodic refresh sufficient?
3. Should we show the total score prominently in a dedicated column?

### Task 5: Code Repository Criteria (1 балл)
**Required Data to Start:**
- Team repository information storage
- Git API integration or webhook setup
- Understanding of "last 24 hours" calculation

**Implementation Details:**
- Check for commits in the last 24 hours
- Display "Да/Нет" status with green/red indicators
- Show last commit timestamp
- Handle cases where repository is not accessible

**Questions for Clarification:**
1. How do teams provide their repository information?
2. Should we integrate with GitHub/GitLab APIs or expect external updates?

### Task 6: Deployed Solution Criteria (1 балл)
**Required Data to Start:**
- Team deployment URL storage
- HTTP client for endpoint checking
- Error handling for various HTTP responses

**Implementation Details:**
- Test HTTP 200 response from team's endpoint
- Display "Да/Нет" status with indicators
- Show last check timestamp and response time
- Handle timeouts and network errors gracefully

**Questions for Clarification:**
1. What timeout should we use for endpoint checks?
2. Should we check multiple endpoints or just one per team?

### Task 7: Event Search Performance Criteria (3 балла)
**Required Data to Start:**
- Performance metrics data structure
- Understanding of P95 calculation
- Load testing result format

**Implementation Details:**
- Display metrics for 5K, 25K, 50K user loads
- Show P95 response time and success rate
- Color-code based on criteria (P95 < 2s, 95% success)
- Display test duration (10 minutes)

**Questions for Clarification:**
1. Who will conduct the load testing and provide the data?
2. Should we display detailed breakdown by user load level?

### Task 8: Archive Search Performance Criteria (1 балл)
**Required Data to Start:**
- Similar performance metrics structure as Task 7
- 5K user load testing results

**Implementation Details:**
- Display P95 < 1s and 99% success rate criteria
- Show last test results and timestamp
- Implement status indicators (red/green/grey)

**Questions for Clarification:**
1. Is this the same endpoint as event search or different?

### Task 9: Authentication Performance Criteria (1 балл)
**Required Data to Start:**
- Authentication endpoint performance data
- 50K user load testing results

**Implementation Details:**
- Display authentication performance metrics
- Show P95 < 1s and 99% success rate
- Include test duration display

### Task 10: Ticket Booking Performance Criteria (3 балла)
**Required Data to Start:**
- Booking system performance metrics
- Multi-level load testing data (25K, 50K, 100K users)

**Implementation Details:**
- Display metrics for each user load level
- Show P95 < 3s, 99% success rate
- Display booked tickets count (target: 100,000)
- Show test duration metric

**Questions for Clarification:**
1. How do we verify the 100,000 booked tickets requirement?

### Task 11: Ticket Cancellation Criteria (1 балл)
**Required Data to Start:**
- Cancellation flow performance data
- Sequential booking and cancellation metrics

**Implementation Details:**
- Display booking/cancellation flow metrics
- Show P95 < 3s and 99% success rate
- Count booked tickets during the test
- 10-minute test duration display

### Task 12: Budget Tracking Criteria (8 балл)
**Required Data to Start:**
- Team expense tracking system
- Cumulative spending calculation method
- Hackathon start date reference

**Implementation Details:**
- Display cumulative spending since hackathon start
- Show spending trends or charts
- Update in real-time or near real-time

**Questions for Clarification:**
1. What constitutes "spent funds" - cloud costs, services, etc.?
2. How will teams report their expenses?

### Task 13: Status Indicators and Update Timestamps
**Required Data to Start:**
- Design system for status indicators
- Timestamp formatting preferences

**Implementation Details:**
- Implement red (failed), green (passed), grey (no data) dots
- Display last update timestamp for each criteria
- Add tooltips with detailed information
- Ensure accessibility compliance

### Task 14: Testing and Finalization
**Required Data to Start:**
- Complete implementation of all previous tasks
- Test data for all criteria types

**Implementation Details:**
- Run linting: `npm run lint`
- Run type checking: `npx tsc --noEmit`
- Test API endpoints with mock data
- Verify responsive design
- Test admin access controls
- Performance testing of dashboard load times

**Questions for Clarification:**
1. Should we create seed data for development/testing?
2. Do we need automated tests for the criteria calculations?

## Implementation Order
Tasks should be implemented in sequential order, with each task's completion verified through:
1. Successful linting (`npm run lint`)
2. Type checking without errors
3. Successful compilation and dev server start
4. Manual testing of implemented features

## Technical Considerations
- All database changes require Prisma migrations
- API endpoints must be secured with service token authentication
- Dashboard must be responsive and accessible
- Real-time or periodic updates need to be considered for performance
- Error handling and graceful degradation for external service failures