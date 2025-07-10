import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Check database connection
    await db.$queryRaw`SELECT 1`;
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'organizer-app',
      database: 'connected',
      version: process.env.npm_package_version || '0.1.0'
    };
    
    return NextResponse.json(healthStatus, { status: 200 });
  } catch (error) {
    const healthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'organizer-app',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    return NextResponse.json(healthStatus, { status: 503 });
  }
}