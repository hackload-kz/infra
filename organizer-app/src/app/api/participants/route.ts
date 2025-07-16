import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { isOrganizer } from '@/lib/admin';
import { logger, LogAction } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is organizer
    const isAdmin = await isOrganizer(session.user.email);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const hackathonId = searchParams.get('hackathonId');

    if (!hackathonId) {
      return NextResponse.json({ error: 'Hackathon ID is required' }, { status: 400 });
    }

    // Get participants for the hackathon
    const participants = await db.participant.findMany({
      where: {
        hackathonParticipations: {
          some: {
            hackathonId: hackathonId
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        city: true,
        company: true,
        experienceLevel: true,
        teamId: true,
        team: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({ participants });
  } catch (error) {
    const session = await auth();
    await logger.error(LogAction.READ, 'Participant', `Error fetching participants: ${error instanceof Error ? error.message : 'Unknown error'}`, { userEmail: session?.user?.email || undefined, metadata: { error: error instanceof Error ? error.stack : error } });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}