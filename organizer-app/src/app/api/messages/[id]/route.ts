import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { messageService } from '@/lib/messages';
import { db } from '@/lib/db';
import { isOrganizer } from '@/lib/admin';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: messageId } = await params;
    const message = await messageService.getMessageById(messageId);

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Get participant
    const participant = await db.participant.findUnique({
      where: { email: session.user.email }
    });

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // Check if user is organizer or the recipient
    const isAdmin = await isOrganizer(session.user.email);
    
    if (!isAdmin && message.recipientId !== participant.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error fetching message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: messageId } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action || !['read', 'unread'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get message
    const message = await messageService.getMessageById(messageId);
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Get participant
    const participant = await db.participant.findUnique({
      where: { email: session.user.email }
    });

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // Check if user is the recipient
    if (message.recipientId !== participant.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update message status
    if (action === 'read') {
      await messageService.markAsRead(messageId, session.user.email);
    } else {
      await messageService.markAsUnread(messageId, session.user.email);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating message:', error);
    const session = await auth();
    await logger.logError('Message', error as Error, session?.user?.email || undefined);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}