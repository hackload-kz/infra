import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { getJournalEntries, markJournalEntriesAsRead } from '@/lib/journal'
import { logger, LogAction } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find user and participant
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { participant: true },
    })

    if (!user?.participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')

    const entries = await getJournalEntries(user.participant.id, page, limit)
    
    return NextResponse.json({ entries })
  } catch (error) {
    await logger.error(LogAction.READ, 'Journal', `Error fetching journal entries: ${error instanceof Error ? error.message : 'Unknown error'}`, { userEmail: session?.user?.email, metadata: { error: error instanceof Error ? error.stack : error } })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action } = await request.json()

    if (action !== 'mark_read') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Find user and participant
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { participant: true },
    })

    if (!user?.participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    await markJournalEntriesAsRead(user.participant.id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    await logger.error(LogAction.UPDATE, 'Journal', `Error marking journal entries as read: ${error instanceof Error ? error.message : 'Unknown error'}`, { userEmail: session?.user?.email, metadata: { error: error instanceof Error ? error.stack : error } })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}