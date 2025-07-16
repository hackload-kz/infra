import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { logger, LogAction } from '@/lib/logger'
import { getCurrentHackathon } from '@/lib/hackathon'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    await logger.logApiCall('POST', `/api/calendar/${id}/dismiss`, session.user.email)

    const hackathon = await getCurrentHackathon()
    if (!hackathon) {
      return NextResponse.json({ error: 'No active hackathon found' }, { status: 404 })
    }

    // Get user's participant record
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        participant: true
      }
    })

    if (!user?.participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    // Check if event exists
    const event = await db.calendarEvent.findUnique({
      where: { id }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Create or update dismissal
    const dismissal = await db.calendarEventDismissal.upsert({
      where: {
        eventId_participantId_hackathonId: {
          eventId: id,
          participantId: user.participant.id,
          hackathonId: hackathon.id
        }
      },
      update: {
        dismissedAt: new Date()
      },
      create: {
        eventId: id,
        participantId: user.participant.id,
        hackathonId: hackathon.id
      }
    })

    await logger.info(LogAction.UPDATE, 'CalendarEventDismissal', 
      `Calendar event dismissed: ${event.title}`, 
      { 
        userEmail: session.user.email, 
        entityId: id, 
        metadata: { participantId: user.participant.id } 
      }
    )

    await logger.logApiSuccess('POST', `/api/calendar/${id}/dismiss`, session.user.email, id)
    return NextResponse.json(dismissal)
  } catch (error) {
    await logger.logApiError('POST', `/api/calendar/${id}/dismiss`, error instanceof Error ? error : new Error('Unknown error'), session?.user?.email || undefined)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    await logger.logApiCall('DELETE', `/api/calendar/${id}/dismiss`, session.user.email)

    const hackathon = await getCurrentHackathon()
    if (!hackathon) {
      return NextResponse.json({ error: 'No active hackathon found' }, { status: 404 })
    }

    // Get user's participant record
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        participant: true
      }
    })

    if (!user?.participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    // Remove dismissal
    await db.calendarEventDismissal.deleteMany({
      where: {
        eventId: id,
        participantId: user.participant.id,
        hackathonId: hackathon.id
      }
    })

    await logger.info(LogAction.DELETE, 'CalendarEventDismissal', 
      `Calendar event dismissal removed for event: ${id}`, 
      { 
        userEmail: session.user.email, 
        entityId: id, 
        metadata: { participantId: user.participant.id } 
      }
    )

    await logger.logApiSuccess('DELETE', `/api/calendar/${id}/dismiss`, session.user.email, id)
    return NextResponse.json({ message: 'Dismissal removed successfully' })
  } catch (error) {
    await logger.logApiError('DELETE', `/api/calendar/${id}/dismiss`, error instanceof Error ? error : new Error('Unknown error'), session?.user?.email || undefined)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}