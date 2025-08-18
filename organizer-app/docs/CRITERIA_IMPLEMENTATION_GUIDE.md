# Team Criteria Implementation Guide

This guide explains how each team evaluation criteria works and how external services should update them via the API.

## API Authentication

All criteria updates require a service API key:

```bash
curl -X PUT \
  http://localhost:3000/api/service/team-criteria/team-slug/CRITERIA_TYPE \
  -H "X-API-Key: your-service-token" \
  -H "Content-Type: application/json" \
  -d '{"status": "PASSED", "score": 1, "metrics": {...}, "updatedBy": "service-name"}'
```

## Criteria 1: Code Repository (CODE_REPO)

**Points:** 1 балл  
**Check:** Наличие коммитов за последние 24 часа  

### Implementation
External git monitoring service should:
1. Check team repositories for commits in the last 24 hours
2. Update criteria based on commit activity

### API Update Example
```javascript
{
  "status": "PASSED",        // PASSED if commits found, FAILED if no recent commits
  "score": 1,                // 1 if passed, 0 if failed
  "metrics": {
    "commitsCount": 15,      // Number of commits in last 24h
    "lastCommitTime": "2025-08-17T14:30:00Z",
    "repositoryUrl": "https://github.com/team/repo",
    "hasRecentActivity": true
  },
  "updatedBy": "git-monitor-service"
}
```

## Criteria 2: Deployed Solution (DEPLOYED_SOLUTION)

**Points:** 1 балл  
**Check:** HTTP 200 response from team's endpoint

### Implementation
HTTP monitoring service should:
1. Test team's deployed endpoint
2. Check for HTTP 200 response
3. Measure response time

### API Update Example
```javascript
{
  "status": "PASSED",        // PASSED if HTTP 200, FAILED otherwise
  "score": 1,                // 1 if passed, 0 if failed
  "metrics": {
    "endpointUrl": "https://team.hackload.app",
    "responseTime": 245,     // Response time in ms
    "statusCode": 200,       // HTTP status code
    "lastChecked": "2025-08-17T14:30:00Z",
    "isAccessible": true
  },
  "updatedBy": "endpoint-monitor-service"
}
```

## Criteria 3: Event Search Performance (EVENT_SEARCH)

**Points:** 3 балла  
**Check:** Load testing at 5K, 25K, 50K users for 10 minutes  
**Criteria:** P95 < 2s, Success rate ≥ 95%

### Implementation
Load testing service (K6) should:
1. Run tests at different user loads
2. Measure P95 response times and success rates
3. Test duration: 10 minutes per load level

### API Update Example
```javascript
{
  "status": "PASSED",        // PASSED if all criteria met
  "score": 3,                // 3 if passed, 0 if failed
  "metrics": {
    "p95ResponseTime": 1.8,  // Overall P95 in seconds
    "successRate": 0.97,     // Overall success rate (0.95 = 95%)
    "testDuration": 600,     // 10 minutes in seconds
    "userLoads": {
      "5000": { "p95": 1.2, "successRate": 0.98 },
      "25000": { "p95": 1.8, "successRate": 0.97 },
      "50000": { "p95": 1.9, "successRate": 0.95 }
    },
    "passedCriteria": {
      "p95UnderTwoSeconds": true,
      "successRateAbove95Percent": true
    }
  },
  "updatedBy": "k6-load-testing-service"
}
```

## Criteria 4: Archive Search Performance (ARCHIVE_SEARCH)

**Points:** 1 балл  
**Check:** 5K users accessing random archive events for 10 minutes  
**Criteria:** P95 < 1s, Success rate ≥ 99%

### API Update Example
```javascript
{
  "status": "PASSED",
  "score": 1,
  "metrics": {
    "p95ResponseTime": 0.8,
    "successRate": 0.995,
    "testDuration": 600,
    "userLoad": 5000,
    "passedCriteria": {
      "p95UnderOneSecond": true,
      "successRateAbove99Percent": true
    }
  },
  "updatedBy": "k6-archive-testing-service"
}
```

## Criteria 5: Authentication Performance (AUTH_PERFORMANCE)

**Points:** 1 балл  
**Check:** 50K users authenticating in 10 minutes  
**Criteria:** P95 < 1s, Success rate ≥ 99%

### API Update Example
```javascript
{
  "status": "PASSED",
  "score": 1,
  "metrics": {
    "p95ResponseTime": 0.9,
    "successRate": 0.996,
    "testDuration": 600,
    "userLoad": 50000,
    "authenticationsPerformed": 49800,
    "passedCriteria": {
      "p95UnderOneSecond": true,
      "successRateAbove99Percent": true
    }
  },
  "updatedBy": "k6-auth-testing-service"
}
```

## Criteria 6: Ticket Booking Performance (TICKET_BOOKING)

**Points:** 3 балла  
**Check:** Load testing at 25K, 50K, 100K users  
**Criteria:** P95 < 3s, Success rate ≥ 99%, 100K tickets booked

### API Update Example
```javascript
{
  "status": "PASSED",
  "score": 3,
  "metrics": {
    "p95ResponseTime": 2.5,
    "successRate": 0.994,
    "bookedTickets": 100000,
    "testDuration": 900,     // Time taken to complete test
    "userLoads": {
      "25000": { "p95": 2.1, "successRate": 0.996, "bookedTickets": 25000 },
      "50000": { "p95": 2.5, "successRate": 0.994, "bookedTickets": 50000 },
      "100000": { "p95": 2.8, "successRate": 0.992, "bookedTickets": 100000 }
    },
    "passedCriteria": {
      "p95UnderThreeSeconds": true,
      "successRateAbove99Percent": true,
      "reached100kBookings": true
    }
  },
  "updatedBy": "k6-booking-testing-service"
}
```

## Criteria 7: Ticket Cancellation (TICKET_CANCELLATION)

**Points:** 1 балл  
**Check:** 90K bookings, then 10K cancellations after 3 minutes  
**Criteria:** P95 < 3s, Success rate ≥ 99%

### API Update Example
```javascript
{
  "status": "PASSED",
  "score": 1,
  "metrics": {
    "p95ResponseTime": 2.1,
    "successRate": 0.997,
    "bookedTickets": 90000,
    "cancelledTickets": 10000,
    "testDuration": 600,
    "phaseMetrics": {
      "booking": { "p95": 2.0, "successRate": 0.998, "duration": 360 },
      "cancellation": { "p95": 2.1, "successRate": 0.995, "duration": 240 }
    },
    "passedCriteria": {
      "p95UnderThreeSeconds": true,
      "successRateAbove99Percent": true
    }
  },
  "updatedBy": "k6-cancellation-testing-service"
}
```

## Criteria 8: Budget Tracking (BUDGET_TRACKING)

**Points:** Not scored (informational)  
**Check:** Cumulative spending since hackathon start

### Implementation
Cost tracking service should:
1. Monitor cloud and service expenses
2. Calculate cumulative costs since hackathon start
3. Update regularly with current spending

### API Update Example
```javascript
{
  "status": "NO_DATA",      // This is informational, not pass/fail
  "score": 0,               // Not scored
  "metrics": {
    "totalSpent": 156.78,
    "currency": "USD",
    "breakdown": {
      "cloudCompute": 89.45,
      "storage": 23.12,
      "networking": 15.67,
      "apis": 28.54
    },
    "lastUpdated": "2025-08-17T14:30:00Z",
    "hackathonStartDate": "2025-08-01T00:00:00Z",
    "spendingTrend": "increasing"
  },
  "updatedBy": "cost-tracking-service"
}
```

## Bulk Updates

For updating multiple criteria at once:

```javascript
POST /api/service/team-criteria
{
  "updates": [
    {
      "teamSlug": "team-alpha",
      "hackathonId": "hackload-2025-id",
      "criteriaType": "CODE_REPO",
      "status": "PASSED",
      "score": 1,
      "metrics": { ... },
      "updatedBy": "service-name"
    },
    // ... more updates
  ]
}
```

## Service Integration Checklist

For each external service:

1. **Obtain Service API Key** from dashboard security settings
2. **Implement Monitoring Logic** for your criteria
3. **Set Update Schedule** (recommended: every 15-30 minutes)
4. **Handle API Errors** gracefully with retries
5. **Log Updates** for debugging and audit trails
6. **Test with Sample Data** before production deployment

## Error Handling

The API returns standard HTTP status codes:
- `200` - Success
- `401` - Invalid API key
- `403` - Insufficient permissions
- `404` - Team not found
- `500` - Server error

Always implement proper error handling and retry logic in your monitoring services.