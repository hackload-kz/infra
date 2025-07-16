import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getCurrentHackathon } from '@/lib/hackathon'
import { markdownToHtmlServer } from '@/lib/markdown-server'
import { isOrganizer } from '@/lib/admin'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const includeInactive = searchParams.get('includeInactive') === 'true'
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hackathon = await getCurrentHackathon()
    if (!hackathon) {
      return NextResponse.json({ error: 'No active hackathon found' }, { status: 404 })
    }

    await logger.logApiCall('GET', '/api/calendar', session.user.email)

    // Build query conditions
    const whereConditions: Record<string, unknown> = {
      hackathonId: hackathon.id,
      ...(includeInactive ? {} : { isActive: true })
    }

    // If teamId is provided, get events for that team or global events
    if (teamId) {
      whereConditions.OR = [
        { teamId: teamId },
        { teamId: null } // Global events
      ]
    } else {
      // For space/calendar, get global events and user's team events
      const user = await db.user.findUnique({
        where: { email: session.user.email },
        include: {
          participant: {
            include: {
              team: true
            }
          }
        }
      })

      if (user?.participant?.team) {
        whereConditions.OR = [
          { teamId: user.participant.team.id },
          { teamId: null } // Global events
        ]
      } else {
        whereConditions.teamId = null // Only global events
      }
    }

    const events = await db.calendarEvent.findMany({
      where: whereConditions,
      include: {
        team: {
          select: {
            id: true,
            name: true,
            nickname: true
          }
        },
        dismissals: {
          where: {
            participant: {
              user: {
                email: session.user.email
              }
            }
          }
        }
      },
      orderBy: {
        eventDate: 'asc'
      }
    })

    const eventsWithDismissal = events.map(event => ({
      ...event,
      isDismissed: event.dismissals.length > 0
    }))

    await logger.logApiSuccess('GET', '/api/calendar', session.user.email)
    return NextResponse.json(eventsWithDismissal)
  } catch (error) {
    const errorSession = await auth()
    await logger.logApiError('GET', '/api/calendar', error instanceof Error ? error : new Error('Unknown error'), errorSession?.user?.email || undefined)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await isOrganizer(session.user.email)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const hackathon = await getCurrentHackathon()
    if (!hackathon) {
      return NextResponse.json({ error: 'No active hackathon found' }, { status: 404 })
    }

    const body = await request.json()
    const { 
      title, 
      description, 
      eventDate, 
      eventEndDate, 
      link, 
      eventType, 
      teamId,
      isActive = true 
    } = body

    if (!title || !description || !eventDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await logger.logApiCall('POST', '/api/calendar', session.user.email)

    // Convert markdown to HTML
    const htmlDescription = markdownToHtmlServer(description)

    const event = await db.calendarEvent.create({
      data: {
        title,
        description: htmlDescription,
        eventDate: new Date(eventDate),
        eventEndDate: eventEndDate ? new Date(eventEndDate) : null,
        link,
        eventType: eventType || 'INFO',
        teamId: teamId || null,
        isActive,
        hackathonId: hackathon.id
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            nickname: true
          }
        }
      }
    })

    await logger.logCreate('CalendarEvent', event.id, session.user.email, 
      `Calendar event created: ${title}${teamId ? ` for team ${teamId}` : ' (global)'}`
    )

    await logger.logApiSuccess('POST', '/api/calendar', session.user.email, event.id)
    return NextResponse.json(event)
  } catch (error) {
    const errorSession = await auth()
    await logger.logApiError('POST', '/api/calendar', error instanceof Error ? error : new Error('Unknown error'), errorSession?.user?.email || undefined)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}