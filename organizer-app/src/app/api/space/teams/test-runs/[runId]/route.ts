import { auth } from '@/auth'
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { logger, LogAction } from '@/lib/logger'

// GET /api/space/teams/test-runs/[runId] - Получить детали запуска теста участником
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Найти участника
    const participant = await db.participant.findFirst({
      where: { 
        user: { email: session.user.email } 
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            nickname: true
          }
        },
        ledTeam: {
          select: {
            id: true,
            name: true,
            nickname: true
          }
        }
      }
    })

    if (!participant) {
      return NextResponse.json({ error: 'Участник не найден' }, { status: 404 })
    }

    // Участник должен состоять в команде
    const team = participant.team || participant.ledTeam
    if (!team) {
      return NextResponse.json({ error: 'Вы должны состоять в команде' }, { status: 400 })
    }

    // Найти тест и проверить, что он принадлежит команде участника
    const testRun = await db.testRun.findFirst({
      where: {
        id: runId,
        teamId: team.id,
        createdBy: {
          not: null // Только тесты, созданные участниками (не организаторами)
        }
      },
      include: {
        scenario: {
          include: {
            steps: {
              where: { isActive: true },
              orderBy: { stepOrder: 'asc' },
              select: {
                id: true,
                name: true,
                stepOrder: true,
                stepType: true,
                config: true,
                description: true
              }
            }
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            nickname: true
          }
        },
        steps: {
          orderBy: { stepOrder: 'asc' },
          select: {
            id: true,
            stepName: true,
            stepOrder: true,
            stepType: true,
            k6TestName: true,
            status: true,
            startedAt: true,
            completedAt: true,
            containerLogs: true,
            errorMessage: true
          }
        }
      }
    })

    if (!testRun) {
      // Проверим, существует ли тест вообще
      const anyTestRun = await db.testRun.findUnique({
        where: { id: runId },
        select: { id: true, teamId: true, createdBy: true }
      })
      
      if (anyTestRun && anyTestRun.createdBy === null) {
        return NextResponse.json({ 
          error: 'Тест создан организатором. Участники могут просматривать только тесты, созданные участниками команды.' 
        }, { status: 403 })
      }
      
      if (anyTestRun && anyTestRun.teamId !== team.id) {
        return NextResponse.json({ 
          error: 'Тест принадлежит другой команде.' 
        }, { status: 403 })
      }
      
      return NextResponse.json({ error: 'Тест не найден' }, { status: 404 })
    }

    // Fetch creator information if test was created by a participant
    let creator = null
    if (testRun.createdBy) {
      creator = await db.participant.findUnique({
        where: { id: testRun.createdBy },
        select: {
          id: true,
          name: true,
          user: {
            select: {
              email: true
            }
          }
        }
      })
    }

    await logger.info(LogAction.READ, 'TestRun', `Участник просмотрел детали теста #${testRun.runNumber}`, {
      userEmail: session.user.email,
      entityId: testRun.id
    })

    return NextResponse.json({ ...testRun, creator })
  } catch (error) {
    console.error('Error fetching test run details:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении деталей теста' },
      { status: 500 }
    )
  }
}