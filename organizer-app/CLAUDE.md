# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint checks

### Database Commands
- `npx prisma generate` - Generate Prisma client after schema changes
- `npx prisma db push` - Push schema changes to database
- `npx prisma studio` - Open database viewer in browser
- `npx prisma migrate dev` - Create and apply new migration

### Testing Commands
- `./test-app.sh` - Run application tests
- `./test-docker.sh` - Test Docker containerization

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes with server actions
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with OAuth (Google, GitHub)
- **UI Components**: Radix UI primitives with custom styling
- **Deployment**: Docker with multi-stage builds

### Key Architecture Patterns

#### Authentication & Authorization
- OAuth-only authentication (no passwords stored)
- Role-based access control: `admin` (organizers) vs `participant`
- Admin users defined via `ADMIN_USERS` environment variable
- Middleware handles route protection at `/dashboard`, `/profile`, `/admin`

#### Database Design
- **Users**: OAuth user records
- **Participants**: Extended user profiles with hackathon-specific data
- **Teams**: Hackathon teams with leaders and members
- Relations: User → Participant → Team (with leader/member roles)

#### Server Actions Pattern
- Database operations in `src/lib/actions.ts` using server actions
- Form submissions handled via server actions with revalidation
- CRUD operations for teams with soft delete capability

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (auth, teams, participants)
│   ├── dashboard/         # Admin dashboard (team management)
│   ├── profile/           # User profile management
│   └── login/             # Authentication pages
├── components/            # React components
│   ├── ui/               # Reusable UI components (button, input)
│   └── [feature].tsx     # Feature-specific components
├── lib/                  # Utilities and configuration
│   ├── db.ts             # Prisma client setup
│   ├── actions.ts        # Server actions
│   ├── admin.ts          # Admin role utilities
│   └── utils.ts          # General utilities
├── auth.ts               # NextAuth configuration
├── auth.config.ts        # Auth provider setup
└── middleware.ts         # Route protection middleware
```

## Environment Setup

### Required Environment Variables
```env
DATABASE_URL="postgresql://user:password@localhost:5432/hackload_organizer"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
ADMIN_USERS="admin@example.com,organizer@example.com"
```

### Database Setup
1. Create PostgreSQL database
2. Run `npx prisma db push` to apply schema
3. Run `npx prisma generate` to generate client

## Development Workflow

### Working with Database
- Always run `npx prisma generate` after schema changes
- Use `npx prisma studio` to inspect data during development
- Database queries are logged in development (see `src/lib/db.ts`)

### Authentication Testing
- Use email addresses listed in `ADMIN_USERS` for admin access
- OAuth providers require proper callback URLs in development
- Admin users access `/dashboard`, regular users access `/profile`

### UI Development
- Uses Tailwind CSS with custom component system
- Dark sidebar theme with high contrast text
- Form validation with React Hook Form and Zod
- Components follow shadcn/ui patterns

## Application Features

### Team Management (Admin Only)
- Create, read, update, delete teams
- URL-friendly team nicknames
- Team leader and member relationships
- Soft delete with cascading updates

### Participant Profiles
- OAuth-based user registration
- Extended profile with experience levels
- Technology and cloud service preferences
- Team membership tracking

### Security Considerations
- No password storage (OAuth only)
- Role-based route protection
- Admin user verification via environment variables
- Proper session management with NextAuth.js