import { NextRequest } from 'next/server';
import { GET } from '@/app/api/participants/route';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import { isOrganizer } from '@/lib/admin';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  db: {
    participant: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/admin', () => ({
  isOrganizer: jest.fn(),
}));

describe('/api/participants', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockParticipants = [
    {
      id: 'participant1',
      name: 'John Doe',
      email: 'john@example.com',
      city: 'New York',
      company: 'TechCorp',
      experienceLevel: 'INTERMEDIATE',
      teamId: 'team1',
      team: {
        id: 'team1',
        name: 'Team Alpha',
      },
    },
    {
      id: 'participant2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      city: 'San Francisco',
      company: 'StartupInc',
      experienceLevel: 'ADVANCED',
      teamId: null,
      team: null,
    },
  ];

  it('should return participants when user is authenticated and authorized', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { email: 'admin@example.com' },
    });
    (isOrganizer as jest.Mock).mockResolvedValue(true);
    (db.participant.findMany as jest.Mock).mockResolvedValue(mockParticipants);

    const request = new NextRequest('http://localhost:3000/api/participants?hackathonId=hackathon1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.participants).toEqual(mockParticipants);
    expect(db.participant.findMany).toHaveBeenCalledWith({
      where: {
        hackathonParticipations: {
          some: {
            hackathonId: 'hackathon1',
          },
        },
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
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  });

  it('should return 401 when user is not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/participants?hackathonId=hackathon1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 401 when user has no email', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { email: null },
    });

    const request = new NextRequest('http://localhost:3000/api/participants?hackathonId=hackathon1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 when user is not an organizer', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { email: 'user@example.com' },
    });
    (isOrganizer as jest.Mock).mockResolvedValue(false);

    const request = new NextRequest('http://localhost:3000/api/participants?hackathonId=hackathon1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Access denied');
  });

  it('should return 400 when hackathonId is missing', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { email: 'admin@example.com' },
    });
    (isOrganizer as jest.Mock).mockResolvedValue(true);

    const request = new NextRequest('http://localhost:3000/api/participants');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Hackathon ID is required');
  });

  it('should return 500 when database query fails', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { email: 'admin@example.com' },
    });
    (isOrganizer as jest.Mock).mockResolvedValue(true);
    (db.participant.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/participants?hackathonId=hackathon1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('should return empty array when no participants found', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { email: 'admin@example.com' },
    });
    (isOrganizer as jest.Mock).mockResolvedValue(true);
    (db.participant.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/participants?hackathonId=hackathon1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.participants).toEqual([]);
  });
});