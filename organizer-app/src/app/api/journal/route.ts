import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { getJournalEntries, markJournalEntriesAsRead } from '@/lib/journal'

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
    console.error('Ошибка при получении записей журнала:', error)
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
    console.error('Ошибка при отметке записей журнала как прочитанных:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}