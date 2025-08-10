import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger, LogAction } from '@/lib/logger';
import { initializeBackgroundJobs } from '@/lib/app-startup';
import { isK6StepsSyncJobRunning } from '@/lib/cron-jobs';

export async function GET() {
  try {
    await logger.logApiCall('GET', '/api/health', 'system');
    
    // Инициализировать фоновые джобы при первом обращении к health check
    initializeBackgroundJobs();
    
    // Check database connection
    await db.$queryRaw`SELECT 1`;
    
    // Проверить статус джобы синхронизации
    const syncJobRunning = isK6StepsSyncJobRunning();
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'organizer-app',
      database: 'connected',
      version: process.env.npm_package_version || '0.1.0',
      backgroundJobs: {
        k6StepsSync: {
          enabled: process.env.K6_AUTO_SYNC_ENABLED !== 'false',
          running: syncJobRunning,
          intervalMs: 60000
        }
      },
      kubernetes: {
        namespace: process.env.KUBERNETES_NAMESPACE || 'unknown',
        podName: process.env.HOSTNAME || 'unknown'
      }
    };
    
    await logger.info(LogAction.READ, 'Health', 'Health check passed', {
      userEmail: 'system',
      metadata: { 
        status: 'healthy',
        k6SyncRunning: syncJobRunning
      }
    });
    
    // Enhanced console logging
    console.info('❤️ Health check: Health endpoint accessed successfully');
    console.info(`🔄 K6 sync job: ${syncJobRunning ? 'RUNNING' : 'STOPPED'}`);
    
    return NextResponse.json(healthStatus, { status: 200 });
  } catch (error) {
    const healthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'organizer-app',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      backgroundJobs: {
        k6StepsSync: {
          enabled: process.env.K6_AUTO_SYNC_ENABLED !== 'false',
          running: false,
          error: 'Could not check status due to health check failure'
        }
      }
    };
    
    await logger.error(LogAction.READ, 'Health', 'Health check failed', {
      userEmail: 'system',
      metadata: { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' }
    });
    
    return NextResponse.json(healthStatus, { status: 503 });
  }
}