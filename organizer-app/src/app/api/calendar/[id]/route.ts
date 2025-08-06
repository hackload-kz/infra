import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { markdownToHtmlServer } from '@/lib/markdown-server'
import { isOrganizer } from '@/lib/admin'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await logger.logApiCall('GET', `/api/calendar/${id}`, session.user.email)

    const event = await db.calendarEvent.findUnique({
      where: { id },
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
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const eventWithDismissal = {
      ...event,
      isDismissed: event.dismissals.length > 0
    }

    await logger.logApiSuccess('GET', `/api/calendar/${id}`, session.user.email, id)
    return NextResponse.json(eventWithDismissal)
  } catch (error) {
    const errorSession = await auth()
    const { id } = await params
    await logger.logApiError('GET', `/api/calendar/${id}`, error instanceof Error ? error : new Error('Unknown error'), errorSession?.user?.email || undefined)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await isOrganizer(session.user.email)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { 
      title, 
      description, 
      eventDate, 
      eventEndDate, 
      link, 
      eventType, 
      teamId,
      isActive 
    } = body

    await logger.logApiCall('PUT', `/api/calendar/${id}`, session.user.email)

    const existingEvent = await db.calendarEvent.findUnique({
      where: { id }
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Convert markdown to HTML if description is provided
    const htmlDescription = description ? markdownToHtmlServer(description) : existingEvent.description

    const event = await db.calendarEvent.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description: htmlDescription }),
        ...(eventDate && { eventDate: new Date(eventDate) }),
        ...(eventEndDate !== undefined && { eventEndDate: eventEndDate ? new Date(eventEndDate) : null }),
        ...(link !== undefined && { link }),
        ...(eventType && { eventType }),
        ...(teamId !== undefined && { teamId: teamId || null }),
        ...(isActive !== undefined && { isActive })
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

    await logger.logUpdate('CalendarEvent', id, session.user.email, 
      `Calendar event updated: ${event.title}${event.teamId ? ` for team ${event.teamId}` : ' (global)'}`
    )

    await logger.logApiSuccess('PUT', `/api/calendar/${id}`, session.user.email, id)
    return NextResponse.json(event)
  } catch (error) {
    const errorSession = await auth()
    const { id } = await params
    await logger.logApiError('PUT', `/api/calendar/${id}`, error instanceof Error ? error : new Error('Unknown error'), errorSession?.user?.email || undefined)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await isOrganizer(session.user.email)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    await logger.logApiCall('DELETE', `/api/calendar/${id}`, session.user.email)

    const existingEvent = await db.calendarEvent.findUnique({
      where: { id }
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    await db.calendarEvent.delete({
      where: { id }
    })

    await logger.logDelete('CalendarEvent', id, session.user.email, 
      `Calendar event deleted: ${existingEvent.title}`
    )

    await logger.logApiSuccess('DELETE', `/api/calendar/${id}`, session.user.email, id)
    return NextResponse.json({ message: 'Event deleted successfully' })
  } catch (error) {
    const errorSession = await auth()
    const { id } = await params
    await logger.logApiError('DELETE', `/api/calendar/${id}`, error instanceof Error ? error : new Error('Unknown error'), errorSession?.user?.email || undefined)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}