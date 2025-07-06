import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the participant
    const participant = await db.participant.findFirst({
      where: { user: { email: session.user.email } }
    })

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    // Get join requests for teams led by this participant
    const joinRequests = await db.joinRequest.findMany({
      where: {
        team: {
          leaderId: participant.id
        },
        status: 'PENDING'
      },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
            city: true,
            company: true,
            telegram: true,
            experienceLevel: true,
            technologies: true,
            cloudServices: true,
            cloudProviders: true,
            otherTechnologies: true,
            otherCloudServices: true,
            otherCloudProviders: true,
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            nickname: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(joinRequests)
  } catch (error) {
    console.error('Error fetching join requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}