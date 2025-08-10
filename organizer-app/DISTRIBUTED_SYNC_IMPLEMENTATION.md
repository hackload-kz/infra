# Distributed K6 Sync Implementation for Multi-Replica Deployment

This document describes the implementation of database-based distributed synchronization for K6 TestRun status updates across multiple application replicas.

## Problem Statement

When running the application in multiple replicas (horizontal scaling), each replica would previously attempt to run the K6 status sync job simultaneously, causing:

- ❌ **Race conditions** when updating the same TestRunStep records
- ❌ **Redundant API calls** to Kubernetes, wasting resources
- ❌ **Database lock contention** and potential deadlocks
- ❌ **Duplicate log collection** and unnecessary work
- ❌ **Inconsistent sync timing** across replicas

## Solution Overview

The implementation provides **database-based distributed locking** to ensure only one replica can execute the sync job at any given time, while maintaining high availability and fault tolerance.

### Key Features

🔒 **Database-Based Locking**: Uses PostgreSQL for reliable distributed coordination  
⏱️ **Automatic Lock Expiration**: Prevents deadlocks with configurable TTL  
💓 **Heartbeat Mechanism**: Keeps active locks alive while work is in progress  
🔄 **Lock Recovery**: Automatically recovers from crashed replicas  
🧹 **Automatic Cleanup**: Periodic removal of expired locks  
📊 **Comprehensive Monitoring**: Full visibility into lock states and replica activity

## Architecture

### Database Schema

```sql
CREATE TABLE distributed_locks (
  id          TEXT PRIMARY KEY,
  lock_name   TEXT UNIQUE NOT NULL,
  instance_id TEXT NOT NULL,          -- Unique replica identifier
  acquired_at TIMESTAMP DEFAULT NOW(),
  expires_at  TIMESTAMP NOT NULL,     -- Automatic expiration
  heartbeat_at TIMESTAMP DEFAULT NOW(), -- Last heartbeat from holder
  metadata    JSONB,                  -- Additional lock information
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);
```

### Instance Identification

Each application replica gets a unique instance ID:
```
{environment}-{hostname}-{pid}-{random}
```

Example: `production-pod-1-abc123-x7f9e2a4`

## Implementation Components

### 1. Distributed Lock Manager (`src/lib/distributed-lock.ts`)

Core lock management with enterprise-grade features:

```typescript
class DistributedLockManager {
  async acquireLock(options: LockOptions): Promise<DistributedLockResult>
  async releaseLock(lockName: string): Promise<boolean>
  async hasLock(lockName: string): Promise<boolean>
  async cleanupExpiredLocks(): Promise<number>
  async releaseAllLocks(): Promise<number>
}
```

**Key Features:**
- **Optimistic Locking**: Uses database unique constraints
- **Retry Logic**: Configurable timeout with intelligent backoff
- **Heartbeat System**: Automatic keep-alive for long-running operations
- **Graceful Takeover**: Expired locks can be safely acquired by other replicas
- **Metadata Support**: Rich context information stored with locks

### 2. Enhanced Sync Job (`src/lib/cron-jobs.ts`)

The K6 sync job now runs within distributed lock protection:

```typescript
async function runSyncWithErrorHandling() {
  const lockName = 'k6-steps-sync'
  const instanceId = distributedLockManager.getInstanceId()
  
  // Execute sync within distributed lock
  const result = await withLock(
    lockName,
    async () => {
      console.log(`🔒 [${instanceId}] Lock acquired, starting K6 steps sync...`)
      return await syncK6TestRunSteps()
    },
    {
      ttlMs: 90000,           // 90 second TTL
      heartbeatIntervalMs: 20000, // 20 second heartbeat  
      acquireTimeoutMs: 2000,     // 2 second acquire timeout
      metadata: { operation: 'k6-steps-sync', instanceId }
    }
  )
  
  if (result === null) {
    console.log(`🔒 [${instanceId}] Sync skipped - lock held by another instance`)
  }
}
```

**Benefits:**
- ✅ **Non-blocking**: Failed lock acquisition doesn't crash the job
- ✅ **Instance Identification**: Clear logging of which replica is active
- ✅ **Timeout Protection**: Prevents indefinite waiting for locks
- ✅ **Heartbeat Protection**: Long-running syncs maintain their locks

### 3. Automatic Cleanup System

Two levels of automatic cleanup prevent lock buildup:

#### Periodic Cleanup Job (Every 5 Minutes)
```typescript
export function startLockCleanupJob() {
  const cleanupIntervalMs = 5 * 60 * 1000 // 5 minutes
  
  setInterval(async () => {
    const cleanedCount = await distributedLockManager.cleanupExpiredLocks()
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired locks`)
    }
  }, cleanupIntervalMs)
}
```

#### Graceful Shutdown Cleanup
```typescript
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully')
  await distributedLockManager.releaseAllLocks()
  process.exit(0)
})
```

## Configuration

### Environment Variables

```bash
# Sync interval (affects lock acquisition frequency)
K6_SYNC_INTERVAL_SECONDS=20

# Enable/disable auto-sync (default: true)  
K6_AUTO_SYNC_ENABLED=true

# Database connection (standard Prisma config)
DATABASE_URL="postgresql://user:pass@host:5432/db"
```

### Lock Parameters

```typescript
const lockOptions = {
  lockName: 'k6-steps-sync',
  ttlMs: 90000,              // 90 seconds (longer than sync interval)
  heartbeatIntervalMs: 20000, // 20 seconds (keep lock alive)
  acquireTimeoutMs: 2000,     // 2 seconds (don't wait too long)
  metadata: {                 // Debugging information
    operation: 'k6-steps-sync',
    instanceId: instanceId,
    startedAt: new Date().toISOString()
  }
}
```

## Monitoring and Observability

### Console Logging

Each replica logs its sync attempts with instance identification:

```
⏰ [2025-01-08T15:30:00.123Z] [prod-pod-1-abc123-x7f9] Attempting to acquire sync lock...
🔒 [2025-01-08T15:30:00.234Z] [prod-pod-1-abc123-x7f9] Lock acquired, starting K6 steps sync...
✅ [2025-01-08T15:30:02.567Z] [prod-pod-1-abc123-x7f9] K6 steps sync completed: {
  total: 5, updated: 3, errors: 0, logsUpdated: 3, duration: "2333ms", instance: "prod-pod-1-abc123-x7f9"
}

⏰ [2025-01-08T15:30:20.123Z] [prod-pod-2-def456-y8g1] Attempting to acquire sync lock...
🔒 [2025-01-08T15:30:20.145Z] [prod-pod-2-def456-y8g1] Sync skipped - lock held by another instance (22ms)
```

### API Endpoints

#### Get Sync Job Status
```bash
GET /api/dashboard/load-testing/sync-job
```

**Response:**
```json
{
  "success": true,
  "job": {
    "isRunning": true,
    "intervalSeconds": 20,
    "instanceId": "production-pod-1-abc123-x7f9e2a4",
    "distributedLock": {
      "currentHolder": "production-pod-1-abc123-x7f9e2a4", 
      "isOwnedByThisInstance": true,
      "acquiredAt": "2025-01-08T15:30:00.000Z",
      "expiresAt": "2025-01-08T15:31:30.000Z",
      "lastHeartbeat": "2025-01-08T15:30:20.000Z"
    }
  }
}
```

#### View All Active Locks
```bash  
GET /api/dashboard/load-testing/distributed-locks
```

**Response:**
```json
{
  "success": true,
  "currentInstanceId": "production-pod-2-def456-y8g1e3b5",
  "activeLocks": [
    {
      "lockName": "k6-steps-sync",
      "instanceId": "production-pod-1-abc123-x7f9e2a4",
      "acquiredAt": "2025-01-08T15:30:00.000Z",
      "expiresAt": "2025-01-08T15:31:30.000Z", 
      "lastHeartbeat": "2025-01-08T15:30:40.000Z",
      "isOwnedByCurrentInstance": false,
      "isExpired": false,
      "timeToExpiry": 45000
    }
  ],
  "totalActiveLocks": 1
}
```

#### Manual Lock Management
```bash
# Clean up expired locks
DELETE /api/dashboard/load-testing/distributed-locks
{
  "action": "cleanup-expired"
}

# Release current instance's locks  
DELETE /api/dashboard/load-testing/distributed-locks
{
  "action": "release-own-locks"  
}

# Force release specific lock (emergency use)
DELETE /api/dashboard/load-testing/distributed-locks
{
  "action": "force-release",
  "lockName": "k6-steps-sync"
}
```

## Deployment Scenarios

### Single Replica (Traditional)
- ✅ **No changes needed**: Distributed locking adds minimal overhead
- ✅ **Same functionality**: All sync operations work identically  
- ✅ **Clean shutdown**: Locks are properly released on termination

### Multiple Replicas (Horizontal Scaling)

#### 2-3 Replicas (Recommended)
- ✅ **Optimal performance**: One replica runs sync, others remain responsive
- ✅ **High availability**: If sync replica crashes, others take over quickly
- ✅ **Load distribution**: Non-sync work is distributed across all replicas

#### 4+ Replicas (Large Scale)
- ✅ **Efficient resource usage**: Only one replica does sync work
- ✅ **Automatic failover**: Crashed sync replica is replaced within 20-90 seconds  
- ✅ **Monitoring visibility**: Clear view of which replica is handling sync

### Rolling Deployments
- ✅ **Graceful transitions**: Old replica releases locks before termination
- ✅ **Zero downtime**: New replicas can acquire locks immediately
- ✅ **State consistency**: No sync operations are lost during deployment

## Performance Impact

### Database Load
- **Lock Operations**: ~1-2 queries per sync attempt per replica
- **Cleanup Operations**: ~1 query per 5 minutes across all replicas  
- **Storage Overhead**: ~200 bytes per active lock
- **Index Usage**: Efficient queries on `lock_name` unique index

### Memory Usage
- **Lock Manager**: ~1KB per replica (minimal overhead)
- **Heartbeat Timers**: ~100 bytes per active lock
- **Instance Metadata**: ~500 bytes per replica

### Network Overhead
- **Heartbeat Traffic**: ~1 DB query every 20 seconds per active lock
- **Lock Acquisition**: ~2-3 DB queries per sync attempt (acquire + release)
- **Cleanup Traffic**: ~1 DB query per 5 minutes per replica

## Testing

### Basic Functionality Test
```bash
node test-distributed-lock.js
```

Tests core distributed lock operations:
- ✅ Basic lock acquisition and release
- ✅ Lock contention simulation  
- ✅ `withLock` utility function
- ✅ Expired lock cleanup
- ✅ Active locks information

### Multi-Replica Simulation Test
```bash
node test-multi-replica-sync.js
```

Simulates 3 replicas running simultaneously:
- ✅ Only one replica acquires sync lock at a time
- ✅ Other replicas skip sync when lock is held
- ✅ Proper lock rotation between replicas
- ✅ No concurrent sync operations

### Expected Test Results

**Successful Multi-Replica Test Output:**
```
🔒 [replica-1] ACQUIRED LOCK - starting sync work
✅ [replica-1] SYNC COMPLETED  
🔒 [replica-2] Sync skipped - lock held by another replica
🔒 [replica-3] Sync skipped - lock held by another replica

🔒 [replica-2] ACQUIRED LOCK - starting sync work  
✅ [replica-2] SYNC COMPLETED
🔒 [replica-1] Sync skipped - lock held by another replica
🔒 [replica-3] Sync skipped - lock held by another replica
```

## Error Handling and Recovery

### Replica Crashes
- **Problem**: Replica holding sync lock crashes unexpectedly
- **Recovery**: Lock expires after TTL (90 seconds), other replicas take over
- **Detection**: Missing heartbeats indicate crashed replica
- **Timeline**: Maximum 90 seconds until sync resumes

### Database Connectivity Issues  
- **Problem**: Temporary database connection loss
- **Recovery**: Lock acquisition fails, replica retries on next sync cycle
- **Fallback**: Each replica continues trying independently
- **Timeline**: Sync resumes when database connectivity is restored

### Lock Contention Edge Cases
- **Problem**: Multiple replicas start simultaneously
- **Recovery**: Database unique constraints prevent duplicate locks
- **Behavior**: Only first replica succeeds, others skip gracefully  
- **Timeline**: Resolution within lock acquire timeout (2 seconds)

### Expired Lock Cleanup
- **Problem**: Expired locks accumulate over time
- **Recovery**: Automatic cleanup job runs every 5 minutes
- **Manual Option**: API endpoint for immediate cleanup
- **Prevention**: Graceful shutdown releases all locks

## Migration from Single to Multi-Replica

### Step 1: Database Migration
```bash
# Apply schema changes
npx prisma db push

# Or run migration
npx prisma migrate dev --name add-distributed-locks
```

### Step 2: Code Deployment
- ✅ **Zero downtime**: New code is backward compatible
- ✅ **Gradual rollout**: Can deploy to one replica at a time
- ✅ **Rollback safety**: Can revert without data loss

### Step 3: Scaling Up
- ✅ **Horizontal scaling**: Add replicas as needed
- ✅ **Load balancer**: Standard HTTP load balancing works
- ✅ **Health checks**: All replicas remain healthy

### Step 4: Monitoring
- ✅ **Check logs**: Verify only one replica runs sync
- ✅ **API monitoring**: Use sync job status endpoints
- ✅ **Database monitoring**: Watch for lock table growth

## Best Practices

### Lock Configuration
- ✅ **TTL > Sync Interval**: Prevents lock thrashing (90s TTL vs 20s interval)
- ✅ **Heartbeat < TTL/2**: Ensures heartbeat before expiration (20s vs 90s TTL)
- ✅ **Acquire Timeout**: Don't wait too long for lock acquisition (2s timeout)

### Monitoring and Alerting
- ✅ **Lock Age Alerts**: Alert if same replica holds lock too long (>5 minutes)
- ✅ **Failed Acquisition**: Monitor replicas that never acquire sync locks
- ✅ **Expired Lock Buildup**: Alert if expired locks accumulate (>10 expired)

### Operational Procedures
- ✅ **Graceful Shutdown**: Always use SIGTERM for proper lock cleanup
- ✅ **Emergency Release**: Use force-release API only in emergencies
- ✅ **Regular Cleanup**: Monitor expired lock cleanup job
- ✅ **Health Checks**: Include distributed lock status in health endpoints

## Troubleshooting

### Problem: No Sync Activity
```bash
# Check if any replica has the sync lock
GET /api/dashboard/load-testing/distributed-locks

# Check sync job status on each replica  
GET /api/dashboard/load-testing/sync-job

# Force cleanup expired locks
DELETE /api/dashboard/load-testing/distributed-locks
{"action": "cleanup-expired"}
```

### Problem: One Replica Monopolizing Sync
```bash
# Check lock age and heartbeat
GET /api/dashboard/load-testing/distributed-locks

# If lock is stale, force release it
DELETE /api/dashboard/load-testing/distributed-locks  
{"action": "force-release", "lockName": "k6-steps-sync"}
```

### Problem: Database Lock Table Growth
```sql
-- Check lock table size
SELECT COUNT(*) FROM distributed_locks;

-- View expired locks  
SELECT * FROM distributed_locks WHERE expires_at < NOW();

-- Manual cleanup (emergency only)
DELETE FROM distributed_locks WHERE expires_at < NOW();
```

## Security Considerations

- ✅ **API Authorization**: All lock management APIs require organizer role
- ✅ **Instance Isolation**: Replicas can only release their own locks
- ✅ **Forced Release**: Only available to administrators via API
- ✅ **Metadata Sanitization**: Lock metadata is JSON-validated
- ✅ **SQL Injection Protection**: All queries use Prisma parameterization

The distributed sync implementation provides enterprise-grade reliability and scalability for multi-replica K6 sync operations while maintaining simplicity and operational transparency.