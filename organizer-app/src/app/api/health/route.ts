import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger, LogAction } from '@/lib/logger';

export async function GET() {
  try {
    await logger.logApiCall('GET', '/api/health', 'system');
    
    // Check database connection
    await db.$queryRaw`SELECT 1`;
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'organizer-app',
      database: 'connected',
      version: process.env.npm_package_version || '0.1.0'
    };
    
    await logger.info(LogAction.READ, 'Health', 'Health check passed', {
      userEmail: 'system',
      metadata: { status: 'healthy' }
    });
    
    return NextResponse.json(healthStatus, { status: 200 });
  } catch (error) {
    const healthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'organizer-app',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    await logger.error(LogAction.READ, 'Health', 'Health check failed', {
      userEmail: 'system',
      metadata: { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' }
    });
    
    return NextResponse.json(healthStatus, { status: 503 });
  }
}