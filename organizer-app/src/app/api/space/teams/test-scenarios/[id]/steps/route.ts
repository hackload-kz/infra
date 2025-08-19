import { auth } from '@/auth'
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/space/teams/test-scenarios/[id]/steps - Get scenario steps for team members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Check if scenario exists and is active
    const scenario = await db.testScenario.findUnique({
      where: { 
        id,
        isActive: true
      }
    })

    if (!scenario) {
      return NextResponse.json({ error: 'Сценарий не найден' }, { status: 404 })
    }

    // Get scenario steps
    const steps = await db.testScenarioStep.findMany({
      where: {
        scenarioId: id,
        isActive: true
      },
      orderBy: { stepOrder: 'asc' }
    })

    return NextResponse.json(steps)
  } catch (error) {
    console.error('Error fetching scenario steps for team:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении шагов сценария' },
      { status: 500 }
    )
  }
}