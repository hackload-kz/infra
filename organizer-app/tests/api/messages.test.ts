import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/messages/route';
import { auth } from '@/auth';
import { messageService } from '@/lib/messages';
import { db } from '@/lib/db';
import { isOrganizer } from '@/lib/admin';
import { logger } from '@/lib/logger';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/messages', () => ({
  messageService: {
    getAllMessages: jest.fn(),
    getMessagesByRecipient: jest.fn(),
    createMessage: jest.fn(),
  },
}));

jest.mock('@/lib/db', () => ({
  db: {
    participant: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/admin', () => ({
  isOrganizer: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    logApiCall: jest.fn().mockResolvedValue(undefined),
    logApiSuccess: jest.fn().mockResolvedValue(undefined),
    logApiError: jest.fn().mockResolvedValue(undefined),
    logCreate: jest.fn().mockResolvedValue(undefined),
    logUpdate: jest.fn().mockResolvedValue(undefined),
    logDelete: jest.fn().mockResolvedValue(undefined),
    logRead: jest.fn().mockResolvedValue(undefined),
    logStatusChange: jest.fn().mockResolvedValue(undefined),
    info: jest.fn().mockResolvedValue(undefined),
    warn: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
  },
  LogAction: {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    READ: 'READ',
    STATUS_CHANGE: 'STATUS_CHANGE',
  },
  LogLevel: {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
  },
}));

describe('/api/messages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockMessages = [
    {
      id: 'msg1',
      subject: 'Test Message',
      body: 'This is a test message',
      senderId: 'sender1',
      recipientId: 'recipient1',
      hackathonId: 'hackathon1',
    },
  ];

  describe('GET /api/messages', () => {
    it('should return all messages for admin users', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { email: 'admin@example.com' },
      });
      (isOrganizer as jest.Mock).mockResolvedValue(true);
      (messageService.getAllMessages as jest.Mock).mockResolvedValue(mockMessages);

      const request = new NextRequest('http://localhost:3000/api/messages?hackathonId=hackathon1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.messages).toEqual(mockMessages);
      expect(messageService.getAllMessages).toHaveBeenCalledWith('hackathon1');
      expect(logger.logRead).toHaveBeenCalledWith(
        'Message',
        'all-messages',
        'admin@example.com',
        'Admin viewed all messages for hackathon hackathon1'
      );
    });

    it('should return participant messages for non-admin users', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { email: 'user@example.com' },
      });
      (isOrganizer as jest.Mock).mockResolvedValue(false);
      (db.participant.findUnique as jest.Mock).mockResolvedValue({
        id: 'participant1',
        email: 'user@example.com',
      });
      (messageService.getMessagesByRecipient as jest.Mock).mockResolvedValue(mockMessages);

      const request = new NextRequest('http://localhost:3000/api/messages?hackathonId=hackathon1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.messages).toEqual(mockMessages);
      expect(messageService.getMessagesByRecipient).toHaveBeenCalledWith('participant1', 'hackathon1');
      expect(logger.logRead).toHaveBeenCalledWith(
        'Message',
        'user-messages',
        'user@example.com',
        'Participant viewed their messages for hackathon hackathon1'
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/messages?hackathonId=hackathon1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when hackathonId is missing', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { email: 'admin@example.com' },
      });

      const request = new NextRequest('http://localhost:3000/api/messages');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Hackathon ID is required');
    });

    it('should return 404 when participant not found', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { email: 'user@example.com' },
      });
      (isOrganizer as jest.Mock).mockResolvedValue(false);
      (db.participant.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/messages?hackathonId=hackathon1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Participant not found');
    });
  });

  describe('POST /api/messages', () => {
    const mockMessage = {
      id: 'msg1',
      subject: 'New Message',
      body: 'This is a new message',
      senderId: 'sender1',
      recipientId: 'recipient1',
      hackathonId: 'hackathon1',
    };

    it('should create message for admin users', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { email: 'admin@example.com' },
      });
      (isOrganizer as jest.Mock).mockResolvedValue(true);
      (db.participant.findUnique as jest.Mock).mockResolvedValue({
        id: 'sender1',
        email: 'admin@example.com',
      });
      (messageService.createMessage as jest.Mock).mockResolvedValue(mockMessage);

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          subject: 'New Message',
          messageBody: 'This is a new message',
          recipientId: 'recipient1',
          hackathonId: 'hackathon1',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toEqual(mockMessage);
      expect(messageService.createMessage).toHaveBeenCalledWith({
        subject: 'New Message',
        body: 'This is a new message',
        senderId: 'sender1',
        recipientId: 'recipient1',
        teamId: undefined,
        hackathonId: 'hackathon1',
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          subject: 'New Message',
          messageBody: 'This is a new message',
          hackathonId: 'hackathon1',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when required fields are missing', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { email: 'admin@example.com' },
      });

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          subject: 'New Message',
          // Missing messageBody and hackathonId
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Subject, message body, and hackathon ID are required');
    });

    it('should return 403 when user is not an organizer', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { email: 'user@example.com' },
      });
      (isOrganizer as jest.Mock).mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          subject: 'New Message',
          messageBody: 'This is a new message',
          hackathonId: 'hackathon1',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only organizers can create new messages');
    });
  });
});