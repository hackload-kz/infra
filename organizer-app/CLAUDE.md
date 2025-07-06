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
# Run deployment check script
./test-app.sh

# Test Docker build
./test-docker.sh

# Check deployment status
./deployment-check.sh
```

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes with server actions
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with Google/GitHub OAuth
- **Deployment**: Docker with standalone output

### Key Architectural Patterns

#### Authentication & Authorization
- OAuth-only authentication (Google + GitHub)
- Role-based access control via `ADMIN_USERS` environment variable
- Admin users access `/dashboard` routes, regular users access `/space`
- Middleware handles route protection and redirects

#### Database Design - Universal Hackathon System
- **Core Models**: `User`, `Participant`, `Team`, `Hackathon`
- **Relationship Models**: `HackathonParticipation`, `JoinRequest`
- **Enums**: `TeamStatus`, `TeamLevel`, `JoinRequestStatus`
- Teams belong to specific hackathons (`hackathonId` required)
- Participants can participate in multiple hackathons
- Join requests are hackathon-specific
- Unique constraints on team nicknames for URL-friendly routing
- Cascade deletion from User to Participant

#### Component Architecture
- Server components by default with client components marked with 'use client'
- Shared UI components in `src/components/ui/`
- Form handling with React Hook Form + Zod validation
- Tailwind CSS for styling with custom design system

### Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth configuration
│   │   ├── participant/   # Participant profile endpoints
│   │   ├── participants/  # Participant management endpoints
│   │   └── teams/         # Team management endpoints
│   ├── dashboard/         # Admin dashboard (organizer-only)
│   │   ├── hackathons/    # Hackathon management
│   │   ├── participants/  # Participant administration
│   │   └── teams/         # Team administration
│   ├── space/             # Participant cabinet
│   │   ├── calendar/      # Event calendar
│   │   ├── faq/          # FAQ section
│   │   ├── info/         # Hackathon information
│   │   ├── journal/      # Participant journal
│   │   ├── messages/     # Messages and notifications
│   │   ├── tasks/        # Task management
│   │   ├── team/         # Team management
│   │   └── teams/        # Team browsing and joining
│   ├── profile/           # User profile management
│   ├── teams/             # Public team pages
│   └── login/             # OAuth login page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── header.tsx        # App header
│   ├── sidebar.tsx       # Dashboard navigation
│   └── *.tsx             # Feature-specific components
├── lib/                  # Utility functions
│   ├── db.ts             # Prisma client singleton
│   ├── admin.ts          # Role checking utilities
│   ├── actions.ts        # Server actions
│   └── utils.ts          # General utilities
├── types/                # TypeScript definitions
└── auth.ts               # NextAuth configuration
```

## Development Guidelines

### Database Changes
- Always run `npx prisma generate` after modifying `schema.prisma`
- Use `npx prisma db push` for development schema changes
- Database migrations are in `prisma/migrations/`
- **Migration Strategy**: Use gradual migrations for data-preserving schema changes

### Authentication Flow
- Users authenticate via OAuth (Google/GitHub)
- Admin status determined by email in `ADMIN_USERS` env var
- Use `isOrganizer()` function to check admin privileges
- Session role is set in JWT callback in `auth.config.ts`

### API Endpoints
#### Team Management
- `GET/POST /api/teams` - List/create teams
- `GET/PUT/DELETE /api/teams/[id]` - Team operations
- `PUT /api/teams/[id]/edit` - Admin team editing
- `POST/DELETE /api/teams/[id]/members/[participantId]` - Member management
- `POST /api/teams/join-request` - Create join request
- `GET/PUT /api/teams/join-request/[id]` - Handle join requests
- `GET /api/teams/my-join-requests` - User's join requests

#### Participant Management
- `GET/PUT /api/participant/profile` - User profile operations
- `GET /api/participants/[id]` - Get participant details

#### Cabinet URLs (Future Implementation)
- **Admin Cabinet**: `/[hackathon-slug]/dashboard` (e.g., `/hackload-2025/dashboard`)
- **Participant Cabinet**: `/[hackathon-slug]/space` (e.g., `/hackload-2025/space`)
- **Current**: `/dashboard` (admin), `/space` (participant)

### Hackathon & Team Management
- **Hackathons**: Each hackathon has unique slug for URL routing (`/hackload-2025`)
- **Teams**: Belong to specific hackathons, have unique nicknames within hackathon
- **Team Status**: NEW, INCOMPLETED, FINISHED, IN_REVIEW, APPROVED, CANCELED, REJECTED
- **Team Level**: BEGINNER, ADVANCED (optional)
- **Join Requests**: Hackathon-specific team join requests with status tracking
- Team leaders are linked via `leaderId` field
- Team members are linked via `teamId` field in Participant model
- Participants can join multiple hackathons via `HackathonParticipation`

### UI Components
- Follow existing Tailwind CSS patterns
- Use shadcn/ui component structure in `components/ui/`
- Maintain high contrast design (dark sidebar, clear borders)
- Forms use React Hook Form with Zod validation

### Environment Variables Required
```
DATABASE_URL=postgresql://...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
ADMIN_USERS=admin1@example.com,admin2@example.com
```

## Docker & Deployment

### Docker Configuration
- Uses Next.js standalone output for optimized builds
- Multi-stage build with distroless base image
- Supports both AMD64 and ARM64 architectures
- Prisma client included in output tracing

### CI/CD Pipeline
- GitHub Actions builds and publishes Docker images
- Images tagged with both `latest` and commit SHA
- Published to GitHub Container Registry (ghcr.io)
- Uses self-hosted runners with `[self-hosted, orgs]` labels

## Database Schema

### Core Entities

#### Hackathon
```typescript
model Hackathon {
  id          String @id @default(cuid())
  name        String
  slug        String @unique // URL-friendly identifier
  description String?
  theme       String? // e.g., "Building a ticket selling system"
  
  // Timing
  startDate         DateTime
  endDate           DateTime
  registrationStart DateTime
  registrationEnd   DateTime
  
  // Settings
  maxTeamSize       Int @default(4)
  minTeamSize       Int @default(1)
  allowTeamChanges  Boolean @default(true)
  isActive          Boolean @default(true)
  isPublic          Boolean @default(true)
  
  // Branding
  logoUrl          String?
  bannerUrl        String?
  primaryColor     String?
  secondaryColor   String?
  
  // Relations
  teams            Team[]
  participations   HackathonParticipation[]
  joinRequests     JoinRequest[]
}
```

#### Team (Enhanced)
```typescript
model Team {
  id        String        @id @default(cuid())
  name      String
  nickname  String        @unique
  comment   String?
  status    TeamStatus    @default(NEW)
  level     TeamLevel?
  
  // Hackathon relation
  hackathon   Hackathon @relation(fields: [hackathonId], references: [id])
  hackathonId String
  
  // Relations
  leader    Participant?  @relation("TeamLeader")
  members   Participant[] @relation("TeamMembers")
  joinRequests JoinRequest[]
}
```

#### New Entities

**HackathonParticipation**: Links participants to hackathons
**JoinRequest**: Manages team join requests within hackathons
**Enums**: TeamStatus, TeamLevel, JoinRequestStatus

### Default Data
- **Default Hackathon**: "HackLoad 2025" (slug: `hackload-2025`)
- **Theme**: "Building a ticket selling system"
- **Dates**: January 15-17, 2025
- **Registration**: Until January 14, 2025