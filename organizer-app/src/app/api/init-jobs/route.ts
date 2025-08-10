import { NextResponse } from 'next/server';
import { initializeBackgroundJobs } from '@/lib/app-startup';
import { isK6StepsSyncJobRunning } from '@/lib/cron-jobs';

export async function POST() {
  try {
    console.info('🚀 API: Initializing background jobs via /api/init-jobs...');
    
    // Check if already running
    const syncJobRunning = isK6StepsSyncJobRunning();
    if (syncJobRunning) {
      console.info('✅ API: Background jobs already running');
      return NextResponse.json({ 
        status: 'success', 
        message: 'Background jobs already running',
        syncJobRunning: true
      });
    }
    
    // Initialize background jobs
    initializeBackgroundJobs();
    
    console.info('✅ API: Background jobs initialized successfully via /api/init-jobs');
    
    return NextResponse.json({ 
      status: 'success', 
      message: 'Background jobs initialized successfully',
      syncJobRunning: isK6StepsSyncJobRunning()
    });
  } catch (error) {
    console.error('❌ API: Failed to initialize background jobs via /api/init-jobs:', error);
    
    return NextResponse.json({ 
      status: 'error', 
      message: 'Failed to initialize background jobs',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}