#!/usr/bin/env node
/**
 * Simple test script to verify distributed lock basic functionality
 */

const { distributedLockManager, withLock } = require('./src/lib/distributed-lock');

async function testDistributedLock() {
  console.log('🧪 Testing Distributed Lock Functionality');
  console.log('==========================================');
  
  const instanceId = distributedLockManager.getInstanceId();
  console.log(`Instance ID: ${instanceId}\n`);

  try {
    // Test 1: Basic lock acquisition and release
    console.log('Test 1: Basic lock acquisition and release');
    console.log('--------------------------------------------');
    
    const lockResult1 = await distributedLockManager.acquireLock({
      lockName: 'test-lock-1',
      ttlMs: 30000, // 30 seconds
      metadata: { test: 'basic-functionality' }
    });
    
    if (lockResult1.acquired) {
      console.log('✅ Lock acquired successfully');
      console.log(`   Instance: ${lockResult1.instanceId}`);
      console.log(`   Expires: ${lockResult1.expiresAt}`);
      
      // Check if we have the lock
      const hasLock = await distributedLockManager.hasLock('test-lock-1');
      console.log(`✅ Has lock check: ${hasLock}`);
      
      // Release the lock
      const released = await distributedLockManager.releaseLock('test-lock-1');
      console.log(`✅ Lock released: ${released}`);
      
      // Check if we still have the lock
      const stillHasLock = await distributedLockManager.hasLock('test-lock-1');
      console.log(`✅ Has lock after release: ${stillHasLock}`);
    } else {
      console.log('❌ Failed to acquire lock:', lockResult1.error);
    }

    console.log('\\n');

    // Test 2: Lock contention (try to acquire same lock twice)
    console.log('Test 2: Lock contention simulation');
    console.log('-----------------------------------');
    
    const lockResult2a = await distributedLockManager.acquireLock({
      lockName: 'test-lock-2',
      ttlMs: 10000, // 10 seconds
      acquireTimeoutMs: 1000, // 1 second timeout
      metadata: { test: 'contention-test', attempt: 'first' }
    });
    
    if (lockResult2a.acquired) {
      console.log('✅ First lock acquisition succeeded');
      
      // Try to acquire the same lock again (should fail quickly)
      const lockResult2b = await distributedLockManager.acquireLock({
        lockName: 'test-lock-2',
        ttlMs: 10000,
        acquireTimeoutMs: 2000, // 2 second timeout
        metadata: { test: 'contention-test', attempt: 'second' }
      });
      
      if (lockResult2b.acquired) {
        console.log('❌ Second lock acquisition succeeded (unexpected - same instance)');
        await distributedLockManager.releaseLock('test-lock-2');
      } else {
        console.log('✅ Second lock acquisition failed as expected:', lockResult2b.error);
      }
      
      // Release the first lock
      await distributedLockManager.releaseLock('test-lock-2');
      console.log('✅ Released first lock');
    } else {
      console.log('❌ First lock acquisition failed:', lockResult2a.error);
    }

    console.log('\\n');

    // Test 3: withLock utility function
    console.log('Test 3: withLock utility function');
    console.log('----------------------------------');
    
    const workResult = await withLock(
      'test-lock-3',
      async () => {
        console.log('🔒 Inside locked operation');
        console.log('   Simulating work for 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ Work completed');
        return { success: true, data: 'test-result' };
      },
      {
        ttlMs: 15000, // 15 seconds
        heartbeatIntervalMs: 5000, // 5 second heartbeat
        acquireTimeoutMs: 3000, // 3 second timeout
        metadata: { test: 'with-lock-utility' }
      }
    );
    
    if (workResult) {
      console.log('✅ withLock operation succeeded:', workResult);
    } else {
      console.log('❌ withLock operation failed (lock not acquired)');
    }

    console.log('\\n');

    // Test 4: Lock cleanup
    console.log('Test 4: Lock cleanup');
    console.log('--------------------');
    
    // Create an expired lock manually for testing
    const expiredTime = new Date(Date.now() - 60000); // 1 minute ago
    try {
      await require('./src/lib/db').db.distributedLock.create({
        data: {
          lockName: 'expired-test-lock',
          instanceId: 'fake-instance-expired',
          expiresAt: expiredTime,
          heartbeatAt: expiredTime,
          metadata: { test: 'expired-lock' }
        }
      });
      console.log('✅ Created expired test lock');
    } catch (error) {
      console.log('⚠️ Could not create expired test lock (may already exist)');
    }
    
    // Clean up expired locks
    const cleanedCount = await distributedLockManager.cleanupExpiredLocks();
    console.log(`✅ Cleaned up ${cleanedCount} expired locks`);
    
    // Test 5: Get all active locks
    console.log('\\nTest 5: Get active locks information');
    console.log('------------------------------------');
    
    // Create a test lock to see in the list
    await distributedLockManager.acquireLock({
      lockName: 'info-test-lock',
      ttlMs: 60000,
      metadata: { test: 'info-display' }
    });
    
    const activeLocks = await distributedLockManager.getAllActiveLocks();
    console.log(`✅ Found ${activeLocks.length} active locks:`);
    
    activeLocks.forEach((lock, index) => {
      console.log(`   ${index + 1}. ${lock.lockName}`);
      console.log(`      Instance: ${lock.instanceId}`);
      console.log(`      Acquired: ${lock.acquiredAt}`);
      console.log(`      Expires: ${lock.expiresAt}`);
      console.log(`      Is Mine: ${lock.instanceId === instanceId}`);
    });
    
    // Clean up test lock
    await distributedLockManager.releaseLock('info-test-lock');
    console.log('✅ Cleaned up test lock');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up all locks created by this instance
    console.log('\\n🧹 Final cleanup...');
    const releasedCount = await distributedLockManager.releaseAllLocks();
    console.log(`✅ Released ${releasedCount} locks`);
    
    const finalCleanedCount = await distributedLockManager.cleanupExpiredLocks();
    if (finalCleanedCount > 0) {
      console.log(`✅ Final cleanup: ${finalCleanedCount} expired locks`);
    }
  }
  
  console.log('\\n🏁 Distributed lock test completed!');
}

// Only run if called directly
if (require.main === module) {
  testDistributedLock().catch(console.error);
}

module.exports = { testDistributedLock };