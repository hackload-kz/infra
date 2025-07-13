'use server'

import { db } from '@/lib/db'
import { JournalEventType } from '@prisma/client'
import { getCurrentHackathon } from '@/lib/hackathon'

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
      console.error('No active hackathon found for journal entry')
      return
    }

    await db.journalEntry.create({
      data: {
        ...data,
        hackathonId: hackathon.id,
      },
    })
  } catch (error) {
    console.error('Error creating journal entry:', error)
  }
}

export async function markJournalEntriesAsRead(participantId: string) {
  try {
    const hackathon = await getCurrentHackathon()
    if (!hackathon) {
      throw new Error('No active hackathon found')
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
    console.error('Error marking journal entries as read:', error)
    throw error
  }
}

export async function getJournalEntries(participantId: string, page = 1, limit = 20) {
  try {
    const hackathon = await getCurrentHackathon()
    if (!hackathon) {
      throw new Error('No active hackathon found')
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
    console.error('Error fetching journal entries:', error)
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
    console.error('Error fetching unread journal count:', error)
    return 0
  }
}

// Helper functions for creating specific journal entries
export async function trackParticipantCreated(participantId: string) {
  await createJournalEntry({
    participantId,
    eventType: 'PARTICIPANT_CREATED',
    title: 'Welcome to the hackathon!',
    description: `Your participant profile has been created.`,
    entityId: participantId,
    entityType: 'participant',
  })
}

export async function trackProfileUpdated(participantId: string) {
  await createJournalEntry({
    participantId,
    eventType: 'PROFILE_UPDATED',
    title: 'Profile updated',
    description: 'Your profile information has been updated.',
    entityId: participantId,
    entityType: 'participant',
  })
}

export async function trackMessageReceived(participantId: string, messageId: string, senderName?: string) {
  await createJournalEntry({
    participantId,
    eventType: 'MESSAGE_RECEIVED',
    title: 'New message received',
    description: senderName ? `You received a message from ${senderName}` : 'You received a new message',
    entityId: messageId,
    entityType: 'message',
  })
}

export async function trackTeamCreated(participantId: string, teamId: string, teamName: string) {
  await createJournalEntry({
    participantId,
    eventType: 'TEAM_CREATED',
    title: 'Team created',
    description: `You created team "${teamName}"`,
    entityId: teamId,
    entityType: 'team',
  })
}

export async function trackTeamUpdated(participantId: string, teamId: string, teamName: string) {
  await createJournalEntry({
    participantId,
    eventType: 'TEAM_UPDATED',
    title: 'Team updated',
    description: `Team "${teamName}" has been updated`,
    entityId: teamId,
    entityType: 'team',
  })
}

export async function trackTeamDeleted(participantId: string, teamName: string) {
  await createJournalEntry({
    participantId,
    eventType: 'TEAM_DELETED',
    title: 'Team deleted',
    description: `Team "${teamName}" has been deleted`,
    entityType: 'team',
  })
}

export async function trackJoinRequestCreated(participantId: string, requestId: string, teamName: string) {
  await createJournalEntry({
    participantId,
    eventType: 'JOIN_REQUEST_CREATED',
    title: 'Join request sent',
    description: `You sent a join request to team "${teamName}"`,
    entityId: requestId,
    entityType: 'join_request',
  })
}

export async function trackJoinRequestApproved(participantId: string, requestId: string, teamName: string) {
  await createJournalEntry({
    participantId,
    eventType: 'JOIN_REQUEST_APPROVED',
    title: 'Join request approved',
    description: `Your join request to team "${teamName}" has been approved`,
    entityId: requestId,
    entityType: 'join_request',
  })
}

export async function trackJoinRequestRejected(participantId: string, requestId: string, teamName: string) {
  await createJournalEntry({
    participantId,
    eventType: 'JOIN_REQUEST_REJECTED',
    title: 'Join request rejected',
    description: `Your join request to team "${teamName}" has been rejected`,
    entityId: requestId,
    entityType: 'join_request',
  })
}

export async function trackJoinedTeam(participantId: string, teamId: string, teamName: string) {
  await createJournalEntry({
    participantId,
    eventType: 'JOINED_TEAM',
    title: 'Joined team',
    description: `You joined team "${teamName}"`,
    entityId: teamId,
    entityType: 'team',
  })
}

export async function trackLeftTeam(participantId: string, teamName: string) {
  await createJournalEntry({
    participantId,
    eventType: 'LEFT_TEAM',
    title: 'Left team',
    description: `You left team "${teamName}"`,
    entityType: 'team',
  })
}

export async function trackInvitedToTeam(participantId: string, teamId: string, teamName: string) {
  await createJournalEntry({
    participantId,
    eventType: 'INVITED_TO_TEAM',
    title: 'Team invitation',
    description: `You were invited to join team "${teamName}"`,
    entityId: teamId,
    entityType: 'team',
  })
}

export async function trackTeamStatusUpdated(participantId: string, teamId: string, teamName: string, newStatus: string) {
  await createJournalEntry({
    participantId,
    eventType: 'TEAM_STATUS_UPDATED',
    title: 'Team status changed',
    description: `Team "${teamName}" status changed to ${newStatus}`,
    entityId: teamId,
    entityType: 'team',
  })
}

export async function trackAdminTeamEdit(participantId: string, teamId: string, teamName: string) {
  await createJournalEntry({
    participantId,
    eventType: 'ADMIN_TEAM_EDIT',
    title: 'Team updated by admin',
    description: `Team "${teamName}" was updated by an administrator`,
    entityId: teamId,
    entityType: 'team',
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