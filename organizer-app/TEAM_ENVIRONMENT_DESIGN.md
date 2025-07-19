# Team Environment Information System Design

## Overview

This document outlines the design for a comprehensive team environment information system that allows organizers to provide teams with essential development environment data (GitHub repos, IPs, cloud credentials, etc.) in a secure, organized manner.

## Requirements Analysis

### Functional Requirements
1. **Data Storage**: Store key-value environment metadata tied to teams
2. **Access Control**: Read-only access for team members, full CRUD for organizers
3. **UI Integration**: Sub-menu under "Tasks" in space mode sidebar
4. **API Access**: Service account API for external automation
5. **Journal Integration**: Automatic notifications when data is updated
6. **Team Membership**: Empty page with guidance for non-team members

### Non-Functional Requirements
- Secure handling of sensitive credentials
- Real-time updates through journal system
- Responsive UI design consistent with existing patterns
- Comprehensive API testing coverage

## Architecture Overview

### Database Schema Design

#### New Model: TeamEnvironmentData
```prisma
model TeamEnvironmentData {
  id          String    @id @default(cuid())
  teamId      String
  key         String    // e.g., "github_repo_url", "server_ip", "aws_access_key"
  value       String    // The actual value
  description String?   // Optional description for the key
  category    String?   // Optional grouping (e.g., "git", "infrastructure", "credentials")
  isSecure    Boolean   @default(false) // Mark sensitive data for display handling
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  createdBy   String?   // Participant ID who created this entry
  updatedBy   String?   // Participant ID who last updated this entry
  
  team        Team      @relation(fields: [teamId], references: [id], onDelete: Cascade)
  
  @@unique([teamId, key]) // Ensure unique keys per team
  @@map("team_environment_data")
}
```

#### Schema Migration
```prisma
// Add to Team model
model Team {
  // ... existing fields
  environmentData TeamEnvironmentData[]
}
```

#### New Journal Event Type
```prisma
enum JournalEventType {
  // ... existing types
  TEAM_ENVIRONMENT_UPDATED
}
```

### API Design

#### Core CRUD Endpoints

##### 1. Get Team Environment Data
```typescript
GET /api/teams/[teamId]/environment
Authorization: Team member or organizer
Response: {
  data: Array<{
    id: string
    key: string
    value: string // Masked if isSecure and not organizer
    description?: string
    category?: string
    isSecure: boolean
    createdAt: string
    updatedAt: string
  }>
  categories: string[] // Available categories for filtering
}
```

##### 2. Create Environment Data Entry
```typescript
POST /api/teams/[teamId]/environment
Authorization: Organizer only
Body: {
  key: string
  value: string
  description?: string
  category?: string
  isSecure?: boolean
}
Response: { id: string, ...environmentData }
```

##### 3. Update Environment Data Entry
```typescript
PUT /api/teams/[teamId]/environment/[entryId]
Authorization: Organizer only
Body: {
  key?: string
  value?: string
  description?: string
  category?: string
  isSecure?: boolean
}
Response: { ...updatedEnvironmentData }
```

##### 4. Delete Environment Data Entry
```typescript
DELETE /api/teams/[teamId]/environment/[entryId]
Authorization: Organizer only
Response: { message: "Entry deleted successfully" }
```

#### Service Account API

##### 5. Service Account Bulk Update
```typescript
PUT /api/service/teams/environment
Authorization: Service account API key
Body: {
  teamSlug: string // Team nickname
  updates: Array<{
    key: string
    value: string
    description?: string
    category?: string
    isSecure?: boolean
  }>
}
Response: {
  teamId: string
  updatedEntries: number
  createdEntries: number
  errors?: Array<{ key: string, error: string }>
}
```

##### 6. Service Account Single Update
```typescript
PUT /api/service/teams/[teamSlug]/environment/[key]
Authorization: Service account API key
Body: {
  value: string
  description?: string
  category?: string
  isSecure?: boolean
}
Response: { ...environmentData }
```

### Authentication & Authorization

#### Permission Matrix
| Role | Read Own Team | Read Other Teams | Create/Update/Delete |
|------|---------------|------------------|---------------------|
| Team Member | ✅ | ❌ | ❌ |
| Organizer | ✅ | ✅ | ✅ |
| Service Account | ❌ | ❌ | ✅ (via API key) |

#### Service Account Setup
```typescript
// New environment variable
SERVICE_ACCOUNT_API_KEY=your-secure-api-key-here

// Middleware for service account authentication
export function authenticateServiceAccount(request: NextRequest) {
  const apiKey = request.headers.get('X-API-Key')
  return apiKey === process.env.SERVICE_ACCOUNT_API_KEY
}
```

### UI Components Design

#### 1. Space Sidebar Integration
```typescript
// Update src/components/personal-cabinet-layout.tsx
const spaceNavigation = [
  // ... existing items
  {
    name: 'Задачи',
    href: '/space/tasks',
    icon: CheckSquare,
    subItems: [
      {
        name: 'Окружение',
        href: '/space/tasks/environment',
        icon: Settings,
        requiresTeam: true
      }
    ]
  }
]
```

#### 2. Environment Data Page
```typescript
// src/app/space/tasks/environment/page.tsx
export default async function EnvironmentPage() {
  // Check team membership
  // Fetch environment data
  // Render TeamEnvironmentView component
}
```

#### 3. Team Environment View Component
```typescript
// src/components/team-environment-view.tsx
interface TeamEnvironmentViewProps {
  teamId: string
  isOrganizer: boolean
  environmentData: TeamEnvironmentData[]
}

export function TeamEnvironmentView({
  teamId,
  isOrganizer,
  environmentData
}: TeamEnvironmentViewProps) {
  // Group data by category
  // Render categorized sections
  // Handle secure data masking
  // Show organizer controls if applicable
}
```

#### 4. Organizer Management Interface
```typescript
// src/components/admin/team-environment-management.tsx
export function TeamEnvironmentManagement({ teamId }: { teamId: string }) {
  // CRUD operations for environment data
  // Bulk import/export functionality
  // Category management
}
```

### Security Considerations

#### 1. Sensitive Data Handling
```typescript
// Mask sensitive values for non-organizers
function maskSensitiveValue(value: string, isSecure: boolean, isOrganizer: boolean): string {
  if (!isSecure || isOrganizer) return value
  if (value.length <= 8) return '***'
  return value.substring(0, 4) + '***' + value.substring(value.length - 4)
}
```

#### 2. Input Validation
```typescript
// Validation schemas using Zod
export const environmentDataSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  value: z.string().min(1).max(2000),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  isSecure: z.boolean().optional()
})
```

#### 3. Audit Logging
```typescript
// Enhanced logger calls for environment data changes
await logger.info(LogAction.CREATE, 'TeamEnvironment', 
  `Environment data created for team ${teamId}`, {
    metadata: { teamId, key, category, isSecure, createdBy }
  })
```

### Journal Integration

#### Environment Update Event
```typescript
// src/lib/journal.ts
export async function trackTeamEnvironmentUpdated(
  participantId: string, 
  teamId: string, 
  teamName: string, 
  changedKeys: string[]
) {
  await createJournalEntry({
    participantId,
    eventType: 'TEAM_ENVIRONMENT_UPDATED',
    title: 'Данные окружения обновлены',
    description: `Обновлены параметры окружения команды "${teamName}": ${changedKeys.join(', ')}`,
    entityId: teamId,
    entityType: 'team',
  })
}
```

#### Notification Strategy
```typescript
// Notify all team members when environment data changes
export async function notifyTeamEnvironmentUpdate(
  teamId: string, 
  changedKeys: string[]
) {
  const team = await db.team.findUnique({
    where: { id: teamId },
    include: { members: true, leader: true }
  })
  
  const allMembers = [...(team?.members || []), team?.leader].filter(Boolean)
  
  for (const member of allMembers) {
    await trackTeamEnvironmentUpdated(
      member.id, 
      teamId, 
      team?.name || '', 
      changedKeys
    )
  }
}
```

## Testing Strategy

### Unit Tests

#### 1. API Endpoint Tests
```typescript
// tests/api/teams/environment.test.ts
describe('Team Environment API', () => {
  describe('GET /api/teams/[teamId]/environment', () => {
    it('should return environment data for team members', async () => {
      // Setup: Create team, participant, environment data
      // Act: Make GET request
      // Assert: Returns correct data structure
    })

    it('should mask sensitive data for non-organizers', async () => {
      // Setup: Create secure environment data
      // Act: Request as team member
      // Assert: Sensitive values are masked
    })

    it('should return 403 for non-team members', async () => {
      // Setup: Create user not in team
      // Act: Make request
      // Assert: 403 status
    })
  })

  describe('POST /api/teams/[teamId]/environment', () => {
    it('should create environment data for organizers', async () => {
      // Setup: Organizer session
      // Act: Create environment data
      // Assert: Data created successfully
    })

    it('should reject duplicate keys', async () => {
      // Setup: Existing environment data
      // Act: Try to create duplicate key
      // Assert: Returns validation error
    })

    it('should return 403 for non-organizers', async () => {
      // Setup: Team member session
      // Act: Try to create data
      // Assert: 403 status
    })
  })

  describe('PUT /api/teams/[teamId]/environment/[entryId]', () => {
    it('should update environment data for organizers', async () => {
      // Setup: Existing environment data
      // Act: Update data
      // Assert: Data updated correctly
    })

    it('should create journal entries for team members', async () => {
      // Setup: Team with members
      // Act: Update environment data
      // Assert: Journal entries created for all members
    })
  })

  describe('DELETE /api/teams/[teamId]/environment/[entryId]', () => {
    it('should delete environment data for organizers', async () => {
      // Setup: Existing environment data
      // Act: Delete data
      // Assert: Data removed from database
    })
  })
})
```

#### 2. Service Account API Tests
```typescript
// tests/api/service/teams/environment.test.ts
describe('Service Account Environment API', () => {
  describe('PUT /api/service/teams/environment', () => {
    it('should bulk update environment data with valid API key', async () => {
      // Setup: Valid API key, team with slug
      // Act: Bulk update request
      // Assert: All updates applied correctly
    })

    it('should reject requests without API key', async () => {
      // Setup: Request without API key
      // Act: Make request
      // Assert: 401 status
    })

    it('should handle non-existent team gracefully', async () => {
      // Setup: Invalid team slug
      // Act: Make update request
      // Assert: Returns appropriate error
    })
  })

  describe('PUT /api/service/teams/[teamSlug]/environment/[key]', () => {
    it('should update single environment value', async () => {
      // Setup: Valid team slug and API key
      // Act: Update single key
      // Assert: Value updated, journal entry created
    })

    it('should create new key if not exists', async () => {
      // Setup: Team without specific key
      // Act: Set new key value
      // Assert: New entry created
    })
  })
})
```

#### 3. Database Integration Tests
```typescript
// tests/db/team-environment.test.ts
describe('TeamEnvironmentData Model', () => {
  it('should enforce unique key constraint per team', async () => {
    // Setup: Create environment data entry
    // Act: Try to create duplicate key for same team
    // Assert: Constraint violation thrown
  })

  it('should allow same key for different teams', async () => {
    // Setup: Two different teams
    // Act: Create same key for both teams
    // Assert: Both entries created successfully
  })

  it('should cascade delete when team is deleted', async () => {
    // Setup: Team with environment data
    // Act: Delete team
    // Assert: Environment data also deleted
  })
})
```

#### 4. UI Component Tests
```typescript
// tests/components/team-environment-view.test.ts
describe('TeamEnvironmentView Component', () => {
  it('should render environment data grouped by category', () => {
    // Setup: Mock environment data with categories
    // Act: Render component
    // Assert: Categories displayed correctly
  })

  it('should mask sensitive data for non-organizers', () => {
    // Setup: Sensitive environment data, non-organizer user
    // Act: Render component
    // Assert: Sensitive values are masked
  })

  it('should show edit controls for organizers', () => {
    // Setup: Organizer user
    // Act: Render component
    // Assert: Edit/delete buttons visible
  })

  it('should display empty state for teams without environment data', () => {
    // Setup: Empty environment data array
    // Act: Render component
    // Assert: Empty state message displayed
  })
})
```

#### 5. Journal Integration Tests
```typescript
// tests/journal/environment-events.test.ts
describe('Environment Journal Events', () => {
  it('should create journal entries for all team members on update', async () => {
    // Setup: Team with multiple members
    // Act: Update environment data
    // Assert: Journal entry created for each member
  })

  it('should include changed keys in journal description', async () => {
    // Setup: Team environment data
    // Act: Update multiple keys
    // Assert: Journal description lists all changed keys
  })

  it('should handle team members without errors', async () => {
    // Setup: Team with no members (edge case)
    // Act: Update environment data
    // Assert: No errors thrown, no journal entries created
  })
})
```

### Integration Tests

#### End-to-End Workflow Tests
```typescript
// tests/e2e/team-environment-workflow.test.ts
describe('Team Environment E2E Workflow', () => {
  it('should complete full CRUD workflow', async () => {
    // 1. Organizer creates environment data
    // 2. Team member views data (sensitive values masked)
    // 3. Organizer updates data
    // 4. Team members receive journal notifications
    // 5. Organizer deletes data
    // Assert: Each step completes successfully
  })

  it('should handle service account API workflow', async () => {
    // 1. Service account bulk updates environment data
    // 2. Team members receive journal notifications
    // 3. Team members view updated data
    // Assert: Data propagated correctly
  })
})
```

### Performance Tests

#### Load Testing
```typescript
// tests/performance/environment-api.test.ts
describe('Environment API Performance', () => {
  it('should handle 100 concurrent reads efficiently', async () => {
    // Setup: Large environment dataset
    // Act: 100 concurrent GET requests
    // Assert: Response time < 500ms, no errors
  })

  it('should handle bulk updates efficiently', async () => {
    // Setup: 1000 environment data entries
    // Act: Bulk update via service API
    // Assert: Complete within reasonable time
  })
})
```

## Implementation Timeline

### Phase 1: Database & Core API (Week 1)
- [ ] Database schema migration
- [ ] Core CRUD API endpoints
- [ ] Basic authentication & authorization
- [ ] Unit tests for API endpoints

### Phase 2: Service Account API (Week 1)
- [ ] Service account authentication middleware
- [ ] Bulk update API endpoints
- [ ] API key management
- [ ] Service account API tests

### Phase 3: UI Components (Week 2)
- [ ] Team environment view component
- [ ] Sidebar navigation integration
- [ ] Organizer management interface
- [ ] UI component tests

### Phase 4: Journal Integration (Week 2)
- [ ] Environment update journal events
- [ ] Team notification system
- [ ] Journal integration tests
- [ ] Performance optimization

### Phase 5: Security & Polish (Week 3)
- [ ] Security audit & sensitive data handling
- [ ] Input validation & sanitization
- [ ] Error handling & user feedback
- [ ] Documentation & deployment guide

## Migration Strategy

### Database Migration
```sql
-- Migration: Add team environment data table
CREATE TABLE team_environment_data (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_secure BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT,
  
  UNIQUE(team_id, key)
);

-- Add index for performance
CREATE INDEX idx_team_environment_data_team_id ON team_environment_data(team_id);
CREATE INDEX idx_team_environment_data_category ON team_environment_data(category);
```

### Data Migration
```typescript
// Migration script for existing teams
export async function migrateExistingTeams() {
  const teams = await db.team.findMany()
  
  for (const team of teams) {
    // Create default environment entries if needed
    await db.teamEnvironmentData.createMany({
      data: [
        {
          teamId: team.id,
          key: 'team_status',
          value: team.status,
          description: 'Current team status',
          category: 'meta'
        }
      ],
      skipDuplicates: true
    })
  }
}
```

## Monitoring & Observability

### Metrics to Track
- Environment data read/write operations
- Service account API usage
- Journal notification delivery rate
- UI component rendering performance
- Database query performance

### Logging Strategy
```typescript
// Enhanced logging for environment operations
await logger.info(LogAction.READ, 'TeamEnvironment', 
  `Environment data accessed for team ${teamId}`, {
    metadata: { 
      teamId, 
      userId, 
      isOrganizer, 
      dataKeys: environmentData.map(d => d.key),
      responseTime: Date.now() - startTime
    }
  })
```

## Enhanced Security Considerations

### Data Protection
- Encrypt sensitive environment values at rest
- Implement field-level access control
- Audit all environment data access
- Regular security reviews of stored credentials

### API Security
- Rate limiting on service account endpoints
- API key rotation strategy
- Input sanitization and validation
- CORS configuration for UI endpoints

### Access Control
- Team membership verification
- Organizer privilege escalation detection
- Service account permission scoping
- Regular access review process

## Future Enhancements

### Phase 2 Features
- Environment data templates for common setups
- Bulk import/export functionality
- Environment data versioning
- Integration with external secret management systems
- Real-time updates via WebSocket
- Environment data validation rules
- Team environment inheritance from hackathon defaults

This design provides a comprehensive foundation for the team environment information system while maintaining security, performance, and usability standards consistent with the existing application architecture.