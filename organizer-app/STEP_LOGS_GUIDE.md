# 📊 Step-Level Test Run Logs UI Guide

## ✅ **Yes, you can now see logs in the step UI!**

The system now provides a comprehensive web interface for viewing step-level execution details and container logs.

## 🎯 **How to Access Step Logs**

### **1. Navigate to Test Runs**
```
Dashboard → Load Testing → [Select Team] → Test Runs List
```

### **2. View Test Run Details**
- Click the **👁️ eye icon** next to any test run
- This opens the detailed test run view with all steps

### **3. View Step Logs**
- In the test run details page, each step shows:
  - **Status** (PENDING, RUNNING, COMPLETED, FAILED, etc.)
  - **Timing information** (started, completed, duration)  
  - **K6 TestRun name** (for Kubernetes correlation)
  - **Error messages** (if failed)
- Click **"Логи" (Logs)** button on any step to expand logs view
- Logs are displayed in a **terminal-style interface** with syntax highlighting

### **4. Real-time Log Refresh**
- Use the **🔄 refresh button** to get latest logs
- Logs auto-update during status synchronization (every minute)

## 🖥️ **UI Features**

### **Step Status Indicators**
- 🕐 **PENDING** - Gray, waiting to start
- ▶️ **RUNNING** - Blue, currently executing  
- ✅ **COMPLETED** - Green, finished successfully
- ❌ **FAILED** - Red, failed with errors
- ⏸️ **CANCELLED** - Yellow, manually stopped
- 🗑️ **DELETED** - Gray, K6 resource not found

### **Step Information Display**
- **Step order number** (#1, #2, etc.)
- **Step name** and type (k6_script, http_request)
- **Execution timestamps** (created, started, completed)
- **Duration calculation** for completed steps
- **K6 TestRun name** for Kubernetes tracking
- **Error messages** with highlighting for failed steps

### **Log Viewer Features**
- **Expandable interface** - click to show/hide logs
- **Monospace font** with green terminal-style text
- **Scrollable container** (max height 400px)
- **Real-time updates** via refresh button
- **Loading indicators** while fetching logs

### **Summary Statistics**
Dashboard shows counts for:
- Total steps
- Pending/Running/Completed steps  
- Failed/Cancelled/Deleted steps
- Steps with available logs

## 📡 **API Endpoints Used**

The UI consumes these endpoints:

```bash
# Get all steps for a test run
GET /api/dashboard/load-testing/teams/{teamId}/test-runs/{runId}/steps

# Get detailed step info with logs  
GET /api/dashboard/load-testing/test-run-steps/{stepId}

# Get fresh logs for a step
POST /api/dashboard/load-testing/test-run-steps/{stepId}/logs
Body: { "tailLines": 500 }
```

## 🔄 **Background Synchronization**

### **Automatic Updates**
- Step statuses sync with K6 resources every minute
- Container logs are automatically collected and stored
- Missing K6 resources are detected and marked as DELETED

### **Manual Sync**
```bash
# Trigger manual synchronization
curl -X POST -H "Authorization: Bearer YOUR_API_KEY" \
  http://your-domain/api/dashboard/load-testing/sync-status-steps
```

## 🎯 **Typical Workflow**

1. **Create Test Run** - From team dashboard
2. **Monitor Progress** - Watch step statuses update in real-time
3. **Debug Issues** - Click into failed steps to view error logs
4. **Historical Analysis** - Review completed test logs after execution

## 🛠️ **Technical Details**

### **Log Storage**
- Logs stored in `TestRunStep.containerLogs` field
- Automatically retrieved from Kubernetes pod logs
- Configurable tail lines (default: 1000 lines)
- Timestamps included in log entries

### **Performance**
- Logs cached in database to reduce Kubernetes API calls
- On-demand refresh for active steps
- Lazy loading - logs only fetched when viewing

### **Error Handling**
- Graceful fallback if logs unavailable
- Clear indicators for missing/deleted resources
- Error messages preserved for debugging

## 🔧 **Setup Requirements**

### **Database**
```sql
-- New table created automatically via Prisma migration
-- Contains: stepName, status, logs, timing, error info
SELECT * FROM test_run_steps;
```

### **Kubernetes Permissions**
App needs permissions to:
- Read K6 TestRun resources
- List pods in k6-runs namespace  
- Read pod logs

### **Environment Variables**
```bash
# Optional: API key for secure sync endpoint
K6_SYNC_API_KEY=your-secure-api-key
```

This comprehensive step-level logging system provides full visibility into K6 test execution with an intuitive web interface for monitoring and debugging test runs.