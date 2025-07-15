import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { hackathonId } = body

    if (!hackathonId) {
      return NextResponse.json({ error: 'Hackathon ID is required' }, { status: 400 })
    }

    // Find the participant
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { participant: true }
    })

    if (!user?.participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    // Check if banner exists and is dismissible
    const banner = await db.customBanner.findUnique({
      where: { id: params.id }
    })

    if (!banner) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 })
    }

    if (!banner.allowDismiss) {
      return NextResponse.json({ error: 'Banner cannot be dismissed' }, { status: 400 })
    }

    // Create or update dismissal record
    await db.customBannerDismissal.upsert({
      where: {
        customBannerId_participantId_hackathonId: {
          customBannerId: params.id,
          participantId: user.participant.id,
          hackathonId
        }
      },
      update: {
        dismissedAt: new Date()
      },
      create: {
        customBannerId: params.id,
        participantId: user.participant.id,
        hackathonId
      }
    })

    return NextResponse.json({ message: 'Banner dismissed successfully' })
  } catch (error) {
    console.error('Error dismissing custom banner:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}