import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { messageService } from '@/lib/messages';
import { db } from '@/lib/db';
import { isOrganizer } from '@/lib/admin';
import { logger, LogAction } from '@/lib/logger';

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
    const errorSession = await auth()
    await logger.error(LogAction.READ, 'Message', `Error fetching message: ${error instanceof Error ? error.message : 'Unknown error'}`, { userEmail: errorSession?.user?.email || undefined, metadata: { error: error instanceof Error ? error.stack : error } });
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
      await logger.info(LogAction.UPDATE, 'Message', `Message state changed: ${session.user.email} marked message ${messageId} as read`, { userEmail: session.user.email, entityId: messageId });
    } else {
      await messageService.markAsUnread(messageId, session.user.email);
      await logger.info(LogAction.UPDATE, 'Message', `Message state changed: ${session.user.email} marked message ${messageId} as unread`, { userEmail: session.user.email, entityId: messageId });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating message:', error);
    const session = await auth();
    await logger.logError('Message', error as Error, session?.user?.email || undefined);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}