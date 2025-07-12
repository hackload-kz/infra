import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { messageService, MessageWithRelations } from '@/lib/messages';
import { db } from '@/lib/db';
import { isOrganizer } from '@/lib/admin';
import { logger, LogAction } from '@/lib/logger';
import { TeamStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    await logger.logApiCall('POST', '/api/messages/broadcast', session?.user?.email || undefined);
    
    if (!session?.user?.email) {
      await logger.warn(LogAction.READ, 'API', 'Unauthorized access attempt', {
        userEmail: session?.user?.email || undefined,
        metadata: { endpoint: '/api/messages/broadcast', method: 'POST' }
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, messageBody, hackathonId, broadcastType, teamStatusFilter } = body;

    if (!subject || !messageBody || !hackathonId || !broadcastType) {
      return NextResponse.json({ 
        error: 'Subject, message body, hackathon ID, and broadcast type are required' 
      }, { status: 400 });
    }

    // Check if user is organizer
    const isAdmin = await isOrganizer(session.user.email);
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only organizers can send broadcast messages' }, { status: 403 });
    }

    // Get sender participant (optional for admins)
    const sender = await db.participant.findUnique({
      where: { email: session.user.email }
    });

    let messages: MessageWithRelations[] = [];
    let recipientCount = 0;

    if (broadcastType === 'all-participants') {
      // Send to all participants
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
          email: true
        }
      });

      recipientCount = participants.length;

      console.log(`📧 Broadcasting to ${recipientCount} participants`);

      messages = await Promise.all(
        participants.map(async (participant) => {
          return await messageService.createMessage({
            subject,
            body: messageBody,
            senderId: sender?.id,
            recipientId: participant.id,
            hackathonId,
          });
        })
      );

      await logger.logCreate('Message', 'broadcast-all', session.user.email, 
        `Broadcast message sent to all ${recipientCount} participants`, {
          subject,
          recipientCount,
          hackathonId,
          broadcastType
        });

    } else if (broadcastType === 'teams-by-status') {
      // Send to teams filtered by status
      const teamFilter: {
        hackathonId: string;
        status?: TeamStatus;
      } = {
        hackathonId: hackathonId
      };

      if (teamStatusFilter && teamStatusFilter !== 'all') {
        teamFilter.status = teamStatusFilter as TeamStatus;
      }

      const teams = await db.team.findMany({
        where: teamFilter,
        include: {
          members: true,
          leader: true
        }
      });

      console.log(`📧 Found ${teams.length} teams for broadcast`);

      for (const team of teams) {
        const teamMessages = await messageService.sendToTeam(
          team.id,
          subject,
          messageBody,
          sender?.id,
          hackathonId
        );
        messages.push(...teamMessages);
      }

      recipientCount = messages.length;

      await logger.logCreate('Message', 'broadcast-teams', session.user.email, 
        `Broadcast message sent to ${teams.length} teams (${recipientCount} recipients) with status filter: ${teamStatusFilter || 'all'}`, {
          subject,
          teamCount: teams.length,
          recipientCount,
          teamStatusFilter,
          hackathonId,
          broadcastType
        });

    } else {
      return NextResponse.json({ error: 'Invalid broadcast type' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true,
      messageCount: messages.length,
      recipientCount,
      broadcastType,
      message: `Successfully sent ${messages.length} messages to ${recipientCount} recipients`
    });

  } catch (error) {
    console.error('Error sending broadcast message:', error);
    const session = await auth();
    await logger.logApiError('POST', '/api/messages/broadcast', error as Error, session?.user?.email || undefined);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}