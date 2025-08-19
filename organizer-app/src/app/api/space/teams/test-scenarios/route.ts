import { auth } from '@/auth'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/space/teams/test-scenarios - Get all active test scenarios for team members
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Find the user and their team participation
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

    if (!user?.participant) {
      return NextResponse.json({ error: 'Участник не найден' }, { status: 404 })
    }

    if (!user.participant.team) {
      return NextResponse.json({ error: 'Вы не состоите в команде' }, { status: 403 })
    }

    // Get all active test scenarios (scenarios are global and can be used by any team)
    const scenarios = await db.testScenario.findMany({
      where: {
        isActive: true
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        },
        _count: {
          select: { steps: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(scenarios)
  } catch (error) {
    console.error('Error fetching test scenarios for team:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении сценариев' },
      { status: 500 }
    )
  }
}