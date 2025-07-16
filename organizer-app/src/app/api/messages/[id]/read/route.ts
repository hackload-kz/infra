import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { messageService } from '@/lib/messages';
import { isOrganizer } from '@/lib/admin';
import { logger, LogAction } from '@/lib/logger';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: messageId } = await params;
    
    await logger.logApiCall('PUT', `/api/messages/${messageId}/read`, session?.user?.email || undefined);
    
    if (!session?.user?.email) {
      await logger.warn(LogAction.READ, 'API', 'Unauthorized access attempt', {
        userEmail: session?.user?.email || undefined,
        entityId: messageId,
        metadata: { endpoint: `/api/messages/${messageId}/read`, method: 'PUT' }
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    await logger.logStatusChange('Message', messageId, session.user.email, 'UNREAD', 'READ');
    
    await logger.info(LogAction.UPDATE, 'Message', `Message state changed: ${session.user.email} marked message ${messageId} as read`, { userEmail: session.user.email, entityId: messageId });

    return NextResponse.json({ success: true });
  } catch (error) {
    await logger.error(LogAction.UPDATE, 'Message', `Error marking message as read: ${error instanceof Error ? error.message : 'Unknown error'}`, { userEmail: session?.user?.email || undefined, metadata: { error: error instanceof Error ? error.stack : error } });
    const session = await auth();
    const { id: messageId } = await params;
    await logger.logApiError('PUT', `/api/messages/${messageId}/read`, error as Error, session?.user?.email || undefined);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}