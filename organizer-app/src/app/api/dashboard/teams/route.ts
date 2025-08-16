import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { logger, LogAction } from '@/lib/logger'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is organizer
    const isOrganizerUser = isOrganizer(session.user.email)
    if (!isOrganizerUser) {
      return NextResponse.json({ error: 'Organizer access required' }, { status: 403 })
    }

    await logger.logApiCall('GET', '/api/dashboard/teams', session.user.email)

    // Fetch teams with basic environment data for export page
    const teams = await db.team.findMany({
      include: {
        environmentData: {
          select: {
            category: true
          }
        },
        leader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        hackathon: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    await logger.info(LogAction.READ, 'DashboardTeams', 
      `Dashboard teams data fetched`, {
        metadata: { 
          teamsCount: teams.length,
          userEmail: session.user.email
        }
      })

    await logger.logApiSuccess('GET', '/api/dashboard/teams', session.user.email)

    return NextResponse.json(teams)

  } catch (error) {
    const errorSession = await auth()
    await logger.logApiError('GET', '/api/dashboard/teams', 
      error instanceof Error ? error : new Error('Unknown error'), 
      errorSession?.user?.email || undefined)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}