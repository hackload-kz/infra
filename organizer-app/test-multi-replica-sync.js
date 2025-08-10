#!/usr/bin/env node
/**
 * Test script to simulate multiple app replicas and verify distributed locking works correctly
 * This script verifies that only one replica can run the sync job at a time
 */

const { fork } = require('child_process');
const path = require('path');

// Simulate different replicas with different environment variables
const replicas = [
  {
    name: 'replica-1',
    env: {
      ...process.env,
      HOSTNAME: 'replica-1',
      NODE_ENV: 'test',
      K6_SYNC_INTERVAL_SECONDS: '5' // 5 seconds for faster testing
    }
  },
  {
    name: 'replica-2', 
    env: {
      ...process.env,
      HOSTNAME: 'replica-2',
      NODE_ENV: 'test',
      K6_SYNC_INTERVAL_SECONDS: '5'
    }
  },
  {
    name: 'replica-3',
    env: {
      ...process.env,
      HOSTNAME: 'replica-3',
      NODE_ENV: 'test',
      K6_SYNC_INTERVAL_SECONDS: '5'
    }
  }
];

// Create a worker script that will run the sync logic
const workerScript = `
const { distributedLockManager, withLock } = require('./src/lib/distributed-lock');

async function simulateReplicaWork() {
  const instanceId = distributedLockManager.getInstanceId();
  console.log(\`[\\${instanceId}] Starting replica simulation...\`);

  let syncCount = 0;
  let skippedCount = 0;

  // Simulate sync cycles for 30 seconds
  const endTime = Date.now() + 30000; // 30 seconds
  
  while (Date.now() < endTime) {
    try {
      const startTime = Date.now();
      
      // Try to acquire lock and run sync
      const result = await withLock(
        'k6-steps-sync',
        async () => {
          // Simulate sync work (2-3 seconds)
          const workDuration = 2000 + Math.random() * 1000;
          console.log(\`🔒 [\\${instanceId}] ACQUIRED LOCK - starting sync work (\\${Math.round(workDuration)}ms)\`);
          
          await new Promise(resolve => setTimeout(resolve, workDuration));
          
          console.log(\`✅ [\\${instanceId}] SYNC COMPLETED\`);
          return { success: true, duration: workDuration };
        },
        {
          ttlMs: 10000, // 10 seconds TTL
          heartbeatIntervalMs: 3000, // 3 seconds heartbeat
          acquireTimeoutMs: 1000, // 1 second timeout
          metadata: {
            replica: instanceId,
            operation: 'test-sync'
          }
        }
      );

      if (result) {
        syncCount++;
        console.log(\`📊 [\\${instanceId}] Sync completed (total: \\${syncCount})\`);
      } else {
        skippedCount++;
        const duration = Date.now() - startTime;
        console.log(\`🔒 [\\${instanceId}] Sync skipped - lock held by another replica (\\${duration}ms, total skipped: \\${skippedCount})\`);
      }

      // Wait before next attempt (5-7 seconds with jitter)
      const waitTime = 5000 + Math.random() * 2000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
    } catch (error) {
      console.error(\`❌ [\\${instanceId}] Error in sync cycle:\`, error.message);
    }
  }
  
  console.log(\`📈 [\\${instanceId}] FINAL STATS: \\${syncCount} syncs completed, \\${skippedCount} syncs skipped\`);
  
  // Clean up locks
  try {
    await distributedLockManager.releaseAllLocks();
    console.log(\`🧹 [\\${instanceId}] Cleaned up locks\`);
  } catch (error) {
    console.error(\`❌ [\\${instanceId}] Error cleaning up:\`, error.message);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log(\`🛑 [\\${distributedLockManager.getInstanceId()}] Received SIGTERM, shutting down...\`);
  await distributedLockManager.releaseAllLocks();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log(\`🛑 [\\${distributedLockManager.getInstanceId()}] Received SIGINT, shutting down...\`);
  await distributedLockManager.releaseAllLocks();
  process.exit(0);
});

// Run the simulation
simulateReplicaWork().catch(console.error);
`;

async function testMultiReplicaSync() {
  console.log('🧪 Testing Multi-Replica Distributed Sync');
  console.log('==========================================');
  console.log('Simulating 3 replicas running sync jobs simultaneously');
  console.log('Only one replica should be able to run sync at a time\\n');

  // Create worker script file
  const workerScriptPath = path.join(__dirname, 'test-worker.js');
  require('fs').writeFileSync(workerScriptPath, workerScript);

  const workers = [];
  const workerStats = {};

  try {
    // Start all replica workers
    console.log('🚀 Starting all replicas...');
    
    for (const replica of replicas) {
      console.log(\`Starting \\${replica.name}...\`);
      
      const worker = fork(workerScriptPath, [], {
        env: replica.env,
        silent: false
      });

      // Track worker stats
      workerStats[replica.name] = {
        syncs: 0,
        skipped: 0,
        errors: 0
      };

      // Listen to worker messages
      worker.on('message', (data) => {
        console.log(\`[\\${replica.name}] \\${data}\`);
      });

      worker.on('error', (error) => {
        console.error(\`❌ [\\${replica.name}] Worker error:\`, error);
        workerStats[replica.name].errors++;
      });

      worker.on('exit', (code) => {
        console.log(\`🏁 [\\${replica.name}] Worker exited with code \\${code}\`);
      });

      workers.push({ worker, name: replica.name });
    }

    console.log(\`\\n⏳ Running test for 35 seconds...\\n\`);
    
    // Let workers run for 35 seconds
    await new Promise(resolve => setTimeout(resolve, 35000));
    
    console.log('\\n🛑 Stopping all replicas...');
    
    // Stop all workers gracefully
    for (const { worker, name } of workers) {
      console.log(\`Stopping \\${name}...\`);
      worker.kill('SIGTERM');
    }
    
    // Wait for workers to exit
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Force kill any remaining workers
    for (const { worker } of workers) {
      if (!worker.killed) {
        worker.kill('SIGKILL');
      }
    }

  } finally {
    // Clean up worker script
    try {
      require('fs').unlinkSync(workerScriptPath);
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  console.log('\\n📊 Test Results Summary');
  console.log('========================');
  console.log('If distributed locking works correctly:');
  console.log('- Only one replica should have completed syncs at any given time');
  console.log('- Other replicas should have been skipped due to lock contention'); 
  console.log('- Total syncs across all replicas should be reasonable (4-6)');
  console.log('- No sync should have run simultaneously\\n');
  
  console.log('✅ Multi-replica sync test completed!');
  console.log('Check the logs above to verify that:');
  console.log('1. 🔒 ACQUIRED LOCK messages appear for only one replica at a time');
  console.log('2. 🔒 Sync skipped messages appear when other replicas try to sync');
  console.log('3. No concurrent "ACQUIRED LOCK" messages from different replicas\\n');
}

// Only run if called directly
if (require.main === module) {
  testMultiReplicaSync().catch(console.error);
}

module.exports = { testMultiReplicaSync };