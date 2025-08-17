import { auth } from '@/auth'
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { logger, LogAction } from '@/lib/logger'

// PUT /api/space/teams/environment-variables - Обновить переменные окружения команды участником
export async function PUT(request: NextRequest) {
  try {
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
            nickname: true,
            k6EnvironmentVars: true
          }
        },
        ledTeam: {
          select: {
            id: true,
            name: true,
            nickname: true,
            k6EnvironmentVars: true
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

    const body = await request.json()
    const { environmentVars } = body

    if (!environmentVars || typeof environmentVars !== 'object') {
      return NextResponse.json(
        { error: 'Переменные окружения должны быть объектом' },
        { status: 400 }
      )
    }

    // Проверка, что участники не пытаются изменить API_URL
    if (Object.keys(environmentVars).some(key => key.toUpperCase() === 'API_URL')) {
      return NextResponse.json(
        { error: 'Участники не могут изменять переменную API_URL' },
        { status: 403 }
      )
    }

    // Получить текущие переменные команды
    const currentEnvVars = (team.k6EnvironmentVars as Record<string, string>) || {}

    // Сохранить API_URL если он был, добавить новые переменные
    const updatedEnvVars = {
      ...currentEnvVars, // Сохраняем все текущие переменные, включая API_URL
      ...environmentVars // Добавляем новые переменные (API_URL здесь быть не должно из-за проверки выше)
    }

    // Обновить команду
    const updatedTeam = await db.team.update({
      where: { id: team.id },
      data: {
        k6EnvironmentVars: updatedEnvVars
      }
    })

    await logger.info(LogAction.UPDATE, 'Team', `Участник обновил переменные окружения команды ${team.name}`, {
      userEmail: session.user.email,
      entityId: team.id,
      metadata: {
        updatedVars: Object.keys(environmentVars),
        totalVars: Object.keys(updatedEnvVars).length
      }
    })

    return NextResponse.json({
      k6EnvironmentVars: updatedTeam.k6EnvironmentVars
    })
  } catch (error) {
    console.error('Error updating team environment variables:', error)
    return NextResponse.json(
      { error: 'Ошибка при обновлении переменных окружения' },
      { status: 500 }
    )
  }
}