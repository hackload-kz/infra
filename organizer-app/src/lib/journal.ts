'use server'

import { db } from '@/lib/db'
import { JournalEventType } from '@prisma/client'
import { getCurrentHackathon } from '@/lib/hackathon'
import { logger, LogAction } from '@/lib/logger'

export interface JournalEventData {
  participantId: string
  eventType: JournalEventType
  title: string
  description?: string
  entityId?: string
  entityType?: string
}

export async function createJournalEntry(data: JournalEventData) {
  try {
    const hackathon = await getCurrentHackathon()
    if (!hackathon) {
      await logger.error(LogAction.CREATE, 'Journal', 'Active hackathon not found for journal entry', {})
      return
    }

    await db.journalEntry.create({
      data: {
        ...data,
        hackathonId: hackathon.id,
      },
    })
  } catch (error) {
    await logger.error(LogAction.CREATE, 'Journal', `Error creating journal entry: ${error instanceof Error ? error.message : 'Unknown error'}`, { metadata: { error: error instanceof Error ? error.stack : error } })
  }
}

export async function markJournalEntriesAsRead(participantId: string) {
  try {
    const hackathon = await getCurrentHackathon()
    if (!hackathon) {
      throw new Error('Активный хакатон не найден')
    }

    await db.journalEntry.updateMany({
      where: {
        participantId,
        hackathonId: hackathon.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    })
  } catch (error) {
    await logger.error(LogAction.UPDATE, 'Journal', `Error marking journal entries as read: ${error instanceof Error ? error.message : 'Unknown error'}`, { metadata: { error: error instanceof Error ? error.stack : error } })
    throw error
  }
}

export async function getJournalEntries(participantId: string, page = 1, limit = 20) {
  try {
    const hackathon = await getCurrentHackathon()
    if (!hackathon) {
      throw new Error('Активный хакатон не найден')
    }

    const entries = await db.journalEntry.findMany({
      where: {
        participantId,
        hackathonId: hackathon.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    })

    return entries
  } catch (error) {
    await logger.error(LogAction.READ, 'Journal', `Error fetching journal entries: ${error instanceof Error ? error.message : 'Unknown error'}`, { metadata: { error: error instanceof Error ? error.stack : error } })
    throw error
  }
}

export async function getUnreadJournalCount(participantId: string): Promise<number> {
  try {
    const hackathon = await getCurrentHackathon()
    if (!hackathon) {
      return 0
    }

    const count = await db.journalEntry.count({
      where: {
        participantId,
        hackathonId: hackathon.id,
        isRead: false,
      },
    })

    return count
  } catch (error) {
    await logger.error(LogAction.READ, 'Journal', `Error getting unread journal count: ${error instanceof Error ? error.message : 'Unknown error'}`, { metadata: { error: error instanceof Error ? error.stack : error } })
    return 0
  }
}

// Вспомогательные функции для создания конкретных записей журнала
export async function trackParticipantCreated(participantId: string) {
  await createJournalEntry({
    participantId,
    eventType: 'PARTICIPANT_CREATED',
    title: 'Добро пожаловать в хакатон!',
    description: `Ваш профиль участника был создан.`,
    entityId: participantId,
    entityType: 'participant',
  })
}

export async function trackProfileUpdated(participantId: string) {
  await createJournalEntry({
    participantId,
    eventType: 'PROFILE_UPDATED',
    title: 'Профиль обновлен',
    description: 'Информация в вашем профиле была обновлена.',
    entityId: participantId,
    entityType: 'participant',
  })
}

export async function trackMessageReceived(participantId: string, messageId: string, senderName?: string) {
  await createJournalEntry({
    participantId,
    eventType: 'MESSAGE_RECEIVED',
    title: 'Получено новое сообщение',
    description: senderName ? `Вы получили сообщение от ${senderName}` : 'Вы получили новое сообщение',
    entityId: messageId,
    entityType: 'message',
  })
}

export async function trackTeamCreated(participantId: string, teamId: string, teamName: string) {
  await createJournalEntry({
    participantId,
    eventType: 'TEAM_CREATED',
    title: 'Команда создана',
    description: `Вы создали команду "${teamName}"`,
    entityId: teamId,
    entityType: 'team',
  })
}

export async function trackTeamUpdated(participantId: string, teamId: string, teamName: string) {
  await createJournalEntry({
    participantId,
    eventType: 'TEAM_UPDATED',
    title: 'Команда обновлена',
    description: `Команда "${teamName}" была обновлена`,
    entityId: teamId,
    entityType: 'team',
  })
}

export async function trackTeamDeleted(participantId: string, teamName: string) {
  await createJournalEntry({
    participantId,
    eventType: 'TEAM_DELETED',
    title: 'Команда удалена',
    description: `Команда "${teamName}" была удалена`,
    entityType: 'team',
  })
}

export async function trackJoinRequestCreated(participantId: string, requestId: string, teamName: string) {
  await createJournalEntry({
    participantId,
    eventType: 'JOIN_REQUEST_CREATED',
    title: 'Заявка на вступление отправлена',
    description: `Вы отправили заявку на вступление в команду "${teamName}"`,
    entityId: requestId,
    entityType: 'join_request',
  })
}

export async function trackJoinRequestApproved(participantId: string, requestId: string, teamName: string) {
  await createJournalEntry({
    participantId,
    eventType: 'JOIN_REQUEST_APPROVED',
    title: 'Заявка на вступление одобрена',
    description: `Ваша заявка на вступление в команду "${teamName}" была одобрена`,
    entityId: requestId,
    entityType: 'join_request',
  })
}

export async function trackJoinRequestRejected(participantId: string, requestId: string, teamName: string) {
  await createJournalEntry({
    participantId,
    eventType: 'JOIN_REQUEST_REJECTED',
    title: 'Заявка на вступление отклонена',
    description: `Ваша заявка на вступление в команду "${teamName}" была отклонена`,
    entityId: requestId,
    entityType: 'join_request',
  })
}

export async function trackJoinedTeam(participantId: string, teamId: string, teamName: string) {
  await createJournalEntry({
    participantId,
    eventType: 'JOINED_TEAM',
    title: 'Вступление в команду',
    description: `Вы вступили в команду "${teamName}"`,
    entityId: teamId,
    entityType: 'team',
  })
}

export async function trackLeftTeam(participantId: string, teamName: string) {
  await createJournalEntry({
    participantId,
    eventType: 'LEFT_TEAM',
    title: 'Выход из команды',
    description: `Вы покинули команду "${teamName}"`,
    entityType: 'team',
  })
}

export async function trackInvitedToTeam(participantId: string, teamId: string, teamName: string) {
  await createJournalEntry({
    participantId,
    eventType: 'INVITED_TO_TEAM',
    title: 'Приглашение в команду',
    description: `Вас пригласили присоединиться к команде "${teamName}"`,
    entityId: teamId,
    entityType: 'team',
  })
}

export async function trackTeamStatusUpdated(participantId: string, teamId: string, teamName: string, newStatus: string) {
  await createJournalEntry({
    participantId,
    eventType: 'TEAM_STATUS_UPDATED',
    title: 'Статус команды изменен',
    description: `Статус команды "${teamName}" изменен на ${newStatus}`,
    entityId: teamId,
    entityType: 'team',
  })
}

export async function trackAdminTeamEdit(participantId: string, teamId: string, teamName: string) {
  await createJournalEntry({
    participantId,
    eventType: 'ADMIN_TEAM_EDIT',
    title: 'Команда обновлена администратором',
    description: `Команда "${teamName}" была обновлена администратором`,
    entityId: teamId,
    entityType: 'team',
  })
}

export async function trackJoinRequestWithdrawn(participantId: string, requestId: string, teamName: string) {
  await createJournalEntry({
    participantId,
    eventType: 'JOIN_REQUEST_REJECTED',
    title: 'Заявка на вступление отозвана',
    description: `Вы отозвали заявку на вступление в команду "${teamName}"`,
    entityId: requestId,
    entityType: 'join_request',
  })
}

export async function trackSystemEvent(participantId: string, title: string, description?: string) {
  await createJournalEntry({
    participantId,
    eventType: 'SYSTEM_EVENT',
    title,
    description,
    entityType: 'system',
  })
}

export async function trackTeamEnvironmentUpdated(
  participantId: string, 
  teamId: string, 
  teamName: string, 
  changedKeys: string[]
) {
  await createJournalEntry({
    participantId,
    eventType: 'TEAM_ENVIRONMENT_UPDATED',
    title: 'Данные окружения обновлены',
    description: `Обновлены параметры окружения команды "${teamName}": ${changedKeys.join(', ')}`,
    entityId: teamId,
    entityType: 'team',
  })
}

export async function trackTeamEnvironmentDeleted(
  participantId: string, 
  teamId: string, 
  teamName: string, 
  deletedKeys: string[]
) {
  await createJournalEntry({
    participantId,
    eventType: 'TEAM_ENVIRONMENT_DELETED',
    title: 'Данные окружения удалены',
    description: `Удалены параметры окружения команды "${teamName}": ${deletedKeys.join(', ')}`,
    entityId: teamId,
    entityType: 'team',
  })
}

// Notify all team members when environment data changes
export async function notifyTeamEnvironmentUpdate(
  teamId: string, 
  changedKeys: string[]
) {
  const team = await db.team.findUnique({
    where: { id: teamId },
    include: { members: true, leader: true }
  })
  
  const allMembers = [...(team?.members || []), team?.leader].filter(Boolean)
  
  for (const member of allMembers) {
    if (member?.id) {
      await trackTeamEnvironmentUpdated(
        member.id, 
        teamId, 
        team?.name || '', 
        changedKeys
      )
    }
  }
}

export async function notifyTeamEnvironmentDelete(
  teamId: string, 
  deletedKeys: string[]
) {
  const team = await db.team.findUnique({
    where: { id: teamId },
    include: { members: true, leader: true }
  })
  
  const allMembers = [...(team?.members || []), team?.leader].filter(Boolean)
  
  for (const member of allMembers) {
    if (member?.id) {
      await trackTeamEnvironmentDeleted(
        member.id, 
        teamId, 
        team?.name || '', 
        deletedKeys
      )
    }
  }
}