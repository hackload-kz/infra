import { GET } from '@/app/api/health/route';
import { db } from '@/lib/db';

// Mock the database
jest.mock('@/lib/db', () => ({
  db: {
    $queryRaw: jest.fn(),
  },
}));

describe('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return healthy status when database is connected', async () => {
    // Mock successful database query
    (db.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.service).toBe('organizer-app');
    expect(data.database).toBe('connected');
    expect(data.timestamp).toBeDefined();
    expect(data.version).toBeDefined();
  });

  it('should return unhealthy status when database is disconnected', async () => {
    // Mock database connection failure
    (db.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection refused'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.service).toBe('organizer-app');
    expect(data.database).toBe('disconnected');
    expect(data.error).toBe('Connection refused');
    expect(data.timestamp).toBeDefined();
  });

  it('should handle unknown errors gracefully', async () => {
    // Mock non-Error object being thrown
    (db.$queryRaw as jest.Mock).mockRejectedValue('Unknown error');

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.error).toBe('Unknown error');
  });
});