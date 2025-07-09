import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { messageService } from '@/lib/messages';
import { isOrganizer } from '@/lib/admin';

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

    // Check if user is organizer or the message recipient
    const isAdmin = await isOrganizer(session.user.email);
    
    if (!isAdmin) {
      // If not admin, check if user is the recipient
      const message = await messageService.getMessageById(messageId);
      if (!message || message.recipient.email !== session.user.email) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    await messageService.markAsRead(messageId, session.user.email);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking message as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}