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

    // Check if user is organizer
    const isAdmin = await isOrganizer(session.user.email);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id: messageId } = await params;
    const body = await request.json();
    const { subject, messageBody } = body;

    if (!subject && !messageBody) {
      return NextResponse.json({ error: 'Subject or message body is required' }, { status: 400 });
    }

    const updatedMessage = await messageService.editMessage(
      messageId,
      { subject, body: messageBody },
      session.user.email
    );

    return NextResponse.json({ message: updatedMessage });
  } catch (error) {
    console.error('Error editing message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: messageId } = await params;

    await messageService.deleteMessage(messageId, session.user.email);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}