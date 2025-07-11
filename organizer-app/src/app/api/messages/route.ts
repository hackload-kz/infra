import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { messageService } from '@/lib/messages';
import { db } from '@/lib/db';
import { isOrganizer } from '@/lib/admin';
import { logger, LogAction } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    await logger.logApiCall('GET', '/api/messages', session?.user?.email || undefined);
    
    if (!session?.user?.email) {
      await logger.warn(LogAction.READ, 'API', 'Unauthorized access attempt', {
        userEmail: session?.user?.email || undefined,
        metadata: { endpoint: '/api/messages', method: 'GET' }
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const hackathonId = searchParams.get('hackathonId');
    
    if (!hackathonId) {
      return NextResponse.json({ error: 'Hackathon ID is required' }, { status: 400 });
    }

    // Check if user is organizer
    const isAdmin = await isOrganizer(session.user.email);
    
    let messages;
    if (isAdmin) {
      // Admin can see all messages
      messages = await messageService.getAllMessages(hackathonId);
      await logger.logRead('Message', 'all-messages', session.user.email, `Admin viewed all messages for hackathon ${hackathonId}`);
    } else {
      // Get participant for non-admin users
      const participant = await db.participant.findUnique({
        where: { email: session.user.email }
      });

      if (!participant) {
        return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
      }

      // Participant can only see their own messages
      messages = await messageService.getMessagesByRecipient(participant.id, hackathonId);
      await logger.logRead('Message', 'user-messages', session.user.email, `Participant viewed their messages for hackathon ${hackathonId}`);
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    const session = await auth();
    await logger.logError('Message', error as Error, session?.user?.email || undefined);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    await logger.logApiCall('POST', '/api/messages', session?.user?.email || undefined);
    
    if (!session?.user?.email) {
      await logger.warn(LogAction.READ, 'API', 'Unauthorized access attempt', {
        userEmail: session?.user?.email || undefined,
        metadata: { endpoint: '/api/messages', method: 'POST' }
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, messageBody, recipientId, teamId, hackathonId } = body;

    if (!subject || !messageBody || !hackathonId) {
      return NextResponse.json({ error: 'Subject, message body, and hackathon ID are required' }, { status: 400 });
    }

    // Check if user is organizer
    const isAdmin = await isOrganizer(session.user.email);
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only organizers can create new messages' }, { status: 403 });
    }

    // Get sender participant (optional for admins - they can send as system)
    const sender = await db.participant.findUnique({
      where: { email: session.user.email }
    });

    // Create message
    const message = await messageService.createMessage({
      subject,
      body: messageBody,
      senderId: sender?.id, // Optional - will be null for system messages
      recipientId,
      teamId,
      hackathonId
    });

    await logger.logCreate('Message', message.id, session.user.email, 'Message created by admin', {
      recipientId,
      teamId,
      hackathonId,
      subject
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error creating message:', error);
    const session = await auth();
    await logger.logApiError('POST', '/api/messages', error as Error, session?.user?.email || undefined);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}