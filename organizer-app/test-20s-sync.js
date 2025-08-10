#!/usr/bin/env node
/**
 * Test script to verify 20-second sync interval functionality
 */

const { getK6StepsSyncJobInfo, startK6StepsSyncJob, stopK6StepsSyncJob } = require('./src/lib/cron-jobs');

async function test20SecondSync() {
  console.log('🧪 Testing 20-second K6 sync interval');
  console.log('===================================');
  
  try {
    // First, stop any existing sync job
    console.log('🛑 Stopping any existing sync job...');
    stopK6StepsSyncJob();
    
    // Get initial job info
    let jobInfo = getK6StepsSyncJobInfo();
    console.log('📊 Initial job status:', {
      isRunning: jobInfo.isRunning,
      intervalSeconds: jobInfo.intervalSeconds,
      configuredVia: jobInfo.configuredVia
    });
    
    console.log('\n🚀 Starting sync job with 20-second interval...');
    
    // Set environment variable for 20-second interval
    process.env.K6_SYNC_INTERVAL_SECONDS = '20';
    
    // Start the sync job
    startK6StepsSyncJob();
    
    // Get updated job info
    jobInfo = getK6StepsSyncJobInfo();
    console.log('✅ Sync job started:', {
      isRunning: jobInfo.isRunning,
      intervalSeconds: jobInfo.intervalSeconds,
      intervalMs: jobInfo.intervalMs,
      configuredVia: jobInfo.configuredVia,
      nextRunIn: jobInfo.nextRunIn
    });
    
    // Test with custom interval (30 seconds)
    console.log('\n🔄 Testing custom interval (30 seconds)...');
    stopK6StepsSyncJob();
    startK6StepsSyncJob(30000); // 30 seconds in ms
    
    jobInfo = getK6StepsSyncJobInfo();
    console.log('✅ Custom interval set:', {
      isRunning: jobInfo.isRunning,
      intervalSeconds: jobInfo.intervalSeconds,
      intervalMs: jobInfo.intervalMs
    });
    
    // Wait for a couple of sync cycles to verify it's working
    console.log('\n⏳ Monitoring sync for 1 minute (should see 2-3 sync cycles)...');
    console.log('Watch the console for sync messages...\n');
    
    let syncCount = 0;
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      const message = args.join(' ');
      if (message.includes('K6 steps sync completed:')) {
        syncCount++;
        originalConsoleLog(`🔄 Sync cycle #${syncCount} completed`);
      } else if (message.includes('Starting scheduled K6 steps sync')) {
        originalConsoleLog(`⚡ Sync cycle starting...`);
      }
      originalConsoleLog(...args);
    };
    
    // Wait 70 seconds to see multiple sync cycles (should be 2-3 cycles at 30s interval)
    await new Promise(resolve => setTimeout(resolve, 70000));
    
    // Restore original console.log
    console.log = originalConsoleLog;
    
    console.log(`\n📊 Test Results:`);
    console.log(`- Sync cycles observed: ${syncCount}`);
    console.log(`- Expected cycles: 2-3 (in 70 seconds with 30s interval)`);
    
    if (syncCount >= 2) {
      console.log('✅ SUCCESS: Periodic sync is working correctly!');
    } else {
      console.log('⚠️ WARNING: Expected at least 2 sync cycles, but got', syncCount);
    }
    
    // Clean up
    console.log('\n🧹 Cleaning up...');
    stopK6StepsSyncJob();
    delete process.env.K6_SYNC_INTERVAL_SECONDS;
    
    jobInfo = getK6StepsSyncJobInfo();
    console.log('🛑 Sync job stopped:', {
      isRunning: jobInfo.isRunning,
      intervalSeconds: jobInfo.intervalSeconds
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
  
  console.log('\n🏁 Test completed');
}

// Only run if called directly
if (require.main === module) {
  test20SecondSync().catch(console.error);
}

module.exports = { test20SecondSync };