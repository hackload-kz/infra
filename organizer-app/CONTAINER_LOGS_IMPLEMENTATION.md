# K6 Container Logs Implementation

This document describes the implementation of container log collection for K6 TestRun steps with support for multiple parallel containers.

## Overview

When a K6 TestRun is created with `parallelism > 1`, multiple containers are spawned to execute the test in parallel. This implementation collects logs from all containers and stores them in the `TestRunStep.containerLogs` field with proper headers to identify each container.

## Implementation Details

### 1. Database Schema Changes

The `TestRunStep` model already had a `containerLogs` field, but the comment was updated to clarify its support for multiple containers:

```prisma
model TestRunStep {
  // ... other fields
  containerLogs    String?  // Container output logs with headers for multiple containers
  // ... other fields
}
```

### 2. Enhanced K6TestRunConfig Interface

Added optional `parallelism` parameter to control the number of parallel K6 containers:

```typescript
export interface K6TestRunConfig {
  // ... existing fields
  parallelism?: number // Number of parallel K6 containers (default: 1)
}
```

### 3. Enhanced Log Collection Function

Updated `getK6TestRunLogs()` to collect logs from all containers:

```typescript
export async function getK6TestRunLogs(testRunName: string, tailLines: number = 100)
```

**Key improvements:**
- Discovers all pods associated with the K6 TestRun job
- Collects logs from each pod individually
- Adds container headers in format: `=== Container: {pod-name} ===`
- Handles individual pod log retrieval failures gracefully
- Concatenates all logs with clear container separation

### 4. API Endpoint Enhancement

Updated the test run creation API to accept `parallelism` parameter:

```typescript
// POST /api/dashboard/load-testing/teams/[teamId]/test-runs
{
  "scenarioId": "scenario-id",
  "comment": "Test comment",
  "parallelism": 3  // Optional: 1-10 parallel containers
}
```

**Validation:**
- Parallelism must be between 1 and 10
- Defaults to 1 if not provided
- Validates as integer

### 5. Status Sync Logic Enhancement

Enhanced the sync logic to update logs more frequently:

```typescript
// Logs are updated when:
// 1. Status changes (always get fresh logs)
// 2. No logs exist yet (initial log collection)  
// 3. Logs content has changed (detect updates)
```

## Usage Example

### Creating a test with parallelism:

```bash
curl -X POST /api/dashboard/load-testing/teams/{teamId}/test-runs \
  -H "Content-Type: application/json" \
  -d '{
    "scenarioId": "load-test-scenario",
    "comment": "High load test with 5 parallel containers",
    "parallelism": 5
  }'
```

### Expected log format:

```
=== Container: k6-job-abc123-xyz789 ===
time="2025-01-08T10:15:30Z" level=info msg="Starting k6 test..."
time="2025-01-08T10:15:31Z" level=info msg="Running test iteration 1"
...

=== Container: k6-job-abc123-def456 ===
time="2025-01-08T10:15:30Z" level=info msg="Starting k6 test..."
time="2025-01-08T10:15:31Z" level=info msg="Running test iteration 1"
...
```

## Benefits

1. **Complete Visibility**: View logs from all parallel containers in a single place
2. **Container Identification**: Clear headers identify which logs came from which container
3. **Fault Tolerance**: Individual container log failures don't prevent collection from other containers
4. **Scalable**: Supports up to 10 parallel containers with validation
5. **Backward Compatible**: Single container tests work exactly as before

## Testing

The implementation includes a test script `test-container-logs.js` that:
1. Creates a K6 test with parallelism=2
2. Waits for test execution to begin
3. Collects and validates container logs
4. Verifies logs from all expected containers are present

Run the test:
```bash
node test-container-logs.js
```

## Error Handling

- Individual pod log failures are logged as warnings but don't stop other collections
- Failed pod logs include error headers: `=== Container: {pod-name} (ERROR) ===`
- Network timeouts and API errors are handled gracefully
- Database operations are wrapped in try-catch blocks

## Performance Considerations

- Log collection happens during status sync operations
- `tailLines` parameter limits log size (default: 1000 lines per container)
- Logs are only updated when status changes or logs are missing
- Database updates are batched with status changes to minimize queries

## Limitations

- Maximum parallelism is limited to 10 to prevent resource exhaustion
- Log storage is limited by database string field size
- Very large log volumes may impact database performance
- Pod discovery depends on Kubernetes job label selectors