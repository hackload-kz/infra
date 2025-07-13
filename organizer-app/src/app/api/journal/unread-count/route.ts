import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { getUnreadJournalCount } from '@/lib/journal'

export async function GET() {
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

    const count = await getUnreadJournalCount(user.participant.id)
    
    return NextResponse.json({ count })
  } catch (error) {
    console.error('Error fetching unread journal count:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}