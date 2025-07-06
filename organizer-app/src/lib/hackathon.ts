import { db } from '@/lib/db'
import { Hackathon } from '@prisma/client'

// Get the default/current hackathon
export async function getCurrentHackathon(): Promise<Hackathon | null> {
  return await db.hackathon.findFirst({
    where: {
      isActive: true,
      isPublic: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}

// Get hackathon by slug
export async function getHackathonBySlug(slug: string): Promise<Hackathon | null> {
  return await db.hackathon.findUnique({
    where: { slug }
  })
}

// Get all active hackathons
export async function getActiveHackathons(): Promise<Hackathon[]> {
  return await db.hackathon.findMany({
    where: {
      isActive: true,
      isPublic: true
    },
    orderBy: {
      startDate: 'desc'
    }
  })
}

// Check if a participant is registered for a hackathon
export async function isParticipantRegistered(
  participantId: string, 
  hackathonId: string
): Promise<boolean> {
  const participation = await db.hackathonParticipation.findUnique({
    where: {
      hackathonId_participantId: {
        hackathonId,
        participantId
      }
    }
  })
  return !!participation?.isActive
}

// Register participant for hackathon
export async function registerParticipantForHackathon(
  participantId: string,
  hackathonId: string
): Promise<void> {
  await db.hackathonParticipation.upsert({
    where: {
      hackathonId_participantId: {
        hackathonId,
        participantId
      }
    },
    update: {
      isActive: true
    },
    create: {
      hackathonId,
      participantId,
      isActive: true
    }
  })
}