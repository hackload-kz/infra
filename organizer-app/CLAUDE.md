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
- Admin users access `/dashboard` routes, regular users access `/profile`
- Middleware handles route protection and redirects

#### Database Design
- Three main models: `User`, `Participant`, `Team`
- Soft deletion for teams (`isDeleted` field)
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
│   │   └── teams/         # Team management endpoints
│   ├── dashboard/         # Admin dashboard (organizer-only)
│   ├── profile/           # User profile management
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

### Authentication Flow
- Users authenticate via OAuth (Google/GitHub)
- Admin status determined by email in `ADMIN_USERS` env var
- Use `isOrganizer()` function to check admin privileges
- Session role is set in JWT callback in `auth.config.ts`

### Team Management
- Teams have unique nicknames for URL routing
- Use soft deletion (set `isDeleted: true`)
- Team leaders are linked via `leaderId` field
- Team members are linked via `teamId` field in Participant model

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