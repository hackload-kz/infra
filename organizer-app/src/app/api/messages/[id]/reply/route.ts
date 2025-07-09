import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { messageService } from '@/lib/messages';
import { db } from '@/lib/db';

export async function POST(
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
    const { messageBody, body: replyBody } = body;
    const finalBody = messageBody || replyBody;

    if (!finalBody) {
      return NextResponse.json({ error: 'Message body is required' }, { status: 400 });
    }

    // Get original message
    const originalMessage = await messageService.getMessageById(messageId);
    if (!originalMessage) {
      return NextResponse.json({ error: 'Original message not found' }, { status: 404 });
    }

    // Check if user can reply (either the recipient or an organizer)
    const isAdmin = await (async () => {
      try {
        const { isOrganizer } = await import('@/lib/admin');
        return await isOrganizer(session.user.email);
      } catch {
        return false;
      }
    })();

    // Get sender participant (optional for admins)
    const sender = await db.participant.findUnique({
      where: { email: session.user.email }
    });

    // For non-admin users, ensure they are participants and can reply
    if (!isAdmin) {
      if (!sender) {
        return NextResponse.json({ error: 'Sender not found' }, { status: 404 });
      }
      if (originalMessage.recipientId !== sender.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Create reply
    const reply = await messageService.replyToMessage(messageId, sender?.id || null, finalBody);

    return NextResponse.json({ message: reply });
  } catch (error) {
    console.error('Error creating reply:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}