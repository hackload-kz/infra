import { NextRequest } from 'next/server';
import { GET } from '@/app/api/teams/route';
import { db } from '@/lib/db';

// Mock the database
jest.mock('@/lib/db', () => ({
  db: {
    team: {
      findMany: jest.fn(),
    },
  },
}));

describe('/api/teams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockTeams = [
    {
      id: 'team1',
      name: 'Team Alpha',
      nickname: 'alpha',
      hackathonId: 'hackathon1',
      members: [
        {
          id: 'user1',
          name: 'John Doe',
          email: 'john@example.com',
        },
      ],
    },
    {
      id: 'team2',
      name: 'Team Beta',
      nickname: 'beta',
      hackathonId: 'hackathon1',
      members: [
        {
          id: 'user2',
          name: 'Jane Smith',
          email: 'jane@example.com',
        },
      ],
    },
  ];

  it('should return all teams when no hackathonId is provided', async () => {
    (db.team.findMany as jest.Mock).mockResolvedValue(mockTeams);

    const request = new NextRequest('http://localhost:3000/api/teams');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.teams).toEqual(mockTeams);
    expect(db.team.findMany).toHaveBeenCalledWith({
      where: {},
      select: {
        id: true,
        name: true,
        nickname: true,
        hackathonId: true,
        status: true,
        level: true,
        members: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  });

  it('should return filtered teams when hackathonId is provided', async () => {
    const filteredTeams = [mockTeams[0]];
    (db.team.findMany as jest.Mock).mockResolvedValue(filteredTeams);

    const request = new NextRequest('http://localhost:3000/api/teams?hackathonId=hackathon1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.teams).toEqual(filteredTeams);
    expect(db.team.findMany).toHaveBeenCalledWith({
      where: { hackathonId: 'hackathon1' },
      select: {
        id: true,
        name: true,
        nickname: true,
        hackathonId: true,
        status: true,
        level: true,
        members: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  });

  it('should return error when database query fails', async () => {
    (db.team.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/teams');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Ошибка при загрузке команд');
  });

  it('should return empty array when no teams found', async () => {
    (db.team.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/teams');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.teams).toEqual([]);
  });
});