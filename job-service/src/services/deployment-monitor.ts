import { BaseJobService } from './base-service';
import { CriteriaType, CriteriaStatus, Team, DeploymentMetrics } from '../types/criteria';

export interface DeploymentMonitorConfig {
  httpTimeout: number;
  userAgent: string;
}

interface ApiEndpointTest {
  path: string;
  method: 'GET' | 'POST' | 'PATCH';
  description: string;
  expectedStatus: number[];
  requiresAuth?: boolean;
  queryParams?: Record<string, string>;
  body?: Record<string, unknown>;
}

export class DeploymentMonitorService extends BaseJobService {
  readonly criteriaType = CriteriaType.DEPLOYED_SOLUTION;
  readonly serviceName = 'deployment-monitor-service';
  
  private config: DeploymentMonitorConfig;
  
  // All API endpoints from Biletter-api.json
  private readonly apiEndpoints: ApiEndpointTest[] = [
    // Events API
    {
      path: '/api/events',
      method: 'GET',
      description: 'List Events',
      expectedStatus: [200],
      queryParams: { page: '1', pageSize: '20' }
    },
    
    // Bookings API
    {
      path: '/api/bookings',
      method: 'POST',
      description: 'Create Booking',
      expectedStatus: [201, 400, 401, 403],
      requiresAuth: true,
      body: { event_id: 1 }
    },
    {
      path: '/api/bookings',
      method: 'GET',
      description: 'List Bookings',
      expectedStatus: [200, 401, 403],
      requiresAuth: true
    },
    {
      path: '/api/bookings/initiatePayment',
      method: 'PATCH',
      description: 'Initiate Payment',
      expectedStatus: [302, 400, 401, 403, 404],
      requiresAuth: true,
      body: { booking_id: 1 }
    },
    {
      path: '/api/bookings/cancel',
      method: 'PATCH',
      description: 'Cancel Booking',
      expectedStatus: [200, 400, 401, 403, 404],
      requiresAuth: true,
      body: { booking_id: 1 }
    },
    
    // Seats API
    {
      path: '/api/seats',
      method: 'GET',
      description: 'List Seats',
      expectedStatus: [200, 400, 401],
      queryParams: { event_id: '1', page: '1', pageSize: '20' }
    },
    {
      path: '/api/seats/select',
      method: 'PATCH',
      description: 'Select Seat',
      expectedStatus: [200, 400, 401, 403, 419],
      requiresAuth: true,
      body: { booking_id: 1, seat_id: 1 }
    },
    {
      path: '/api/seats/release',
      method: 'PATCH',
      description: 'Release Seat',
      expectedStatus: [200, 400, 401, 403, 419],
      requiresAuth: true,
      body: { seat_id: 1 }
    },
    
    // Payments API
    {
      path: '/api/payments/success',
      method: 'GET',
      description: 'Payment Success Notification',
      expectedStatus: [200, 400, 404],
      queryParams: { orderId: '1' }
    },
    {
      path: '/api/payments/fail',
      method: 'GET',
      description: 'Payment Fail Notification',
      expectedStatus: [200, 400, 404],
      queryParams: { orderId: '1' }
    },
    {
      path: '/api/payments/notifications',
      method: 'POST',
      description: 'Payment Webhook',
      expectedStatus: [200, 400],
      body: {
        paymentId: 'test-payment-id',
        status: 'success',
        teamSlug: 'test-team',
        timestamp: new Date().toISOString(),
        data: {}
      }
    },
    
    // Analytics API
    {
      path: '/api/analytics',
      method: 'GET',
      description: 'Event Analytics',
      expectedStatus: [200, 400, 401, 404],
      queryParams: { id: '1' }
    },
    
    // System API
    {
      path: '/api/reset',
      method: 'POST',
      description: 'Reset Database',
      expectedStatus: [200, 204]
    }
  ];
  
  constructor(config: DeploymentMonitorConfig) {
    super();
    this.config = config;
  }
  
  async collectMetrics(team: Team): Promise<DeploymentMetrics> {
    try {
      const envData = await this.getTeamEnvironmentData(team);
      const endpointUrl = envData['ENDPOINT_URL'];
      
      if (!endpointUrl) {
        this.log('debug', `No application URL found for team ${team.nickname}`);
        return {
          isDeployed: false,
          confirmationTitle: 'API Endpoints',
          confirmationDescription: 'URL эндпойнта не найден'
        };
      }
      
      // Extract base URL
      const urlObject = new URL(endpointUrl);
      const baseUrl = `${urlObject.protocol}//${urlObject.hostname}${urlObject.port ? ':' + urlObject.port : ''}`;
      
      this.log('debug', `Testing comprehensive API endpoints for team ${team.nickname} at ${baseUrl}`);
      
      // First, check DNS resolution
      const dnsResolution = await this.checkDnsResolution(endpointUrl);
      if (!dnsResolution.resolved) {
        this.log('warn', `DNS resolution failed for team ${team.nickname} at ${endpointUrl}: ${dnsResolution.error}`);
        return {
          isDeployed: true,
          endpointUrl: baseUrl,
          responseTime: 0,
          statusCode: 0,
          lastChecked: new Date().toISOString(),
          isAccessible: false,
          error: dnsResolution.error,
          isDnsResolved: false,
          confirmationUrl: baseUrl,
          confirmationTitle: 'API Endpoints',
          confirmationDescription: 'DNS не найден (домен не разрешается)'
        };
      }
      
      // Test all API endpoints
      const endpointResults = await this.testAllApiEndpoints(baseUrl, team.nickname);
      
      // Calculate overall metrics
      const totalEndpoints = endpointResults.length;
      const workingEndpoints = endpointResults.filter(r => r.working).length;
      const criticalEndpoints = endpointResults.filter(r => r.critical && r.working).length;
      const totalCritical = endpointResults.filter(r => r.critical).length;
      
      const successRate = totalEndpoints > 0 ? (workingEndpoints / totalEndpoints) * 100 : 0;
      const criticalSuccessRate = totalCritical > 0 ? (criticalEndpoints / totalCritical) * 100 : 100;
      
      // Overall accessibility requires critical endpoints to work
      const isAccessible = criticalSuccessRate >= 75; // At least 75% of critical endpoints must work
      
      const avgResponseTime = endpointResults.length > 0 
        ? endpointResults.reduce((sum, r) => sum + r.responseTime, 0) / endpointResults.length 
        : 0;
      
      // Create detailed metrics
      const metrics: DeploymentMetrics = {
        isDeployed: true,
        endpointUrl: baseUrl,
        responseTime: Math.round(avgResponseTime),
        statusCode: isAccessible ? 200 : 503, // Service unavailable if critical endpoints fail
        lastChecked: new Date().toISOString(),
        isAccessible,
        isDnsResolved: true,
        confirmationUrl: baseUrl,
        confirmationTitle: 'API Endpoints',
        confirmationDescription: `${workingEndpoints}/${totalEndpoints} эндпойнтов работают (${successRate.toFixed(1)}%)`
      };
      
      // Add extended metrics with endpoint test results
      const extendedMetrics = metrics as DeploymentMetrics & Record<string, unknown>;
      extendedMetrics['totalEndpoints'] = totalEndpoints;
      extendedMetrics['workingEndpoints'] = workingEndpoints;
      extendedMetrics['successRate'] = parseFloat(successRate.toFixed(1));
      extendedMetrics['criticalEndpoints'] = totalCritical;
      extendedMetrics['workingCriticalEndpoints'] = criticalEndpoints;
      extendedMetrics['criticalSuccessRate'] = parseFloat(criticalSuccessRate.toFixed(1));
      extendedMetrics['endpointResults'] = endpointResults;
      extendedMetrics['avgResponseTime'] = Math.round(avgResponseTime);
      
      this.log('info', `Comprehensive API test for team ${team.nickname} completed:`, {
        totalEndpoints,
        workingEndpoints,
        successRate: successRate.toFixed(1) + '%',
        criticalSuccessRate: criticalSuccessRate.toFixed(1) + '%',
        isAccessible,
        avgResponseTime: Math.round(avgResponseTime) + 'ms'
      });
      
      return metrics;
      
    } catch (error) {
      this.log('error', `Failed to collect deployment metrics for team ${team.nickname}:`, error);
      
      return {
        isDeployed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        confirmationTitle: 'API Endpoints',
        confirmationDescription: 'API недоступен (ошибка при проверке)'
      };
    }
  }
  
  override evaluateStatus(metrics: DeploymentMetrics): CriteriaStatus {
    if (!metrics.isDeployed) {
      return CriteriaStatus.NO_DATA;
    }
    
    // Check for DNS resolution failure
    const metricsWithDns = metrics as DeploymentMetrics & Record<string, unknown>;
    if (metricsWithDns['isDnsResolved'] === false) {
      return CriteriaStatus.NO_DATA; // DNS unresolved = 0 points
    }
    
    // If we have an error at the metrics level, consider it as failed
    const metricsWithError = metrics as DeploymentMetrics & Record<string, unknown>;
    if (metricsWithError['error'] && !metrics.endpointUrl) {
      return CriteriaStatus.FAILED;
    }
    
    // If the application is accessible, it passes
    if (metrics.isAccessible) {
      return CriteriaStatus.PASSED;
    }
    
    // If we have an endpoint but it's not accessible, it's failed
    if (metrics.endpointUrl) {
      return CriteriaStatus.FAILED;
    }
    
    return CriteriaStatus.NO_DATA;
  }
  
  override calculateScore(status: CriteriaStatus, metrics: DeploymentMetrics): number {
    if (status === CriteriaStatus.NO_DATA) {
      return 0;
    }
    
    const extendedMetrics = metrics as DeploymentMetrics & Record<string, unknown>;
    
    if (status === CriteriaStatus.PASSED) {
      // Base score for successful deployment
      let score = 0;
      
      // Score based on endpoint coverage
      const successRate = (extendedMetrics['successRate'] as number) || 0;
      const criticalSuccessRate = (extendedMetrics['criticalSuccessRate'] as number) || 0;
      const workingEndpoints = (extendedMetrics['workingEndpoints'] as number) || 0;
      const totalEndpoints = (extendedMetrics['totalEndpoints'] as number) || 1;
      
      // Base score from overall API coverage (0-60 points)
      score += Math.floor(successRate * 0.6); // 60% of score from overall coverage
      
      // Bonus for critical endpoint coverage (0-30 points)
      score += Math.floor(criticalSuccessRate * 0.3); // 30% from critical endpoints
      
      // Response time bonus (0-10 points)
      const avgResponseTime = (extendedMetrics['avgResponseTime'] as number) || 10000;
      if (avgResponseTime < 500) {
        score += 10; // Excellent response time
      } else if (avgResponseTime < 1000) {
        score += 7; // Good response time
      } else if (avgResponseTime < 2000) {
        score += 5; // Acceptable response time
      } else if (avgResponseTime < 5000) {
        score += 2; // Slow but working
      }
      
      // HTTPS bonus
      const isHttps = metrics.endpointUrl?.startsWith('https://') || false;
      if (isHttps) {
        score += 5; // Small bonus for HTTPS
      }
      
      // Minimum score for any working deployment
      score = Math.max(score, workingEndpoints > 0 ? 25 : 0);
      
      return Math.min(score, 110); // Cap at 110 (100 + bonuses)
    }
    
    if (status === CriteriaStatus.FAILED) {
      // Partial credit based on what's working
      let score = 0;
      
      const workingEndpoints = (extendedMetrics['workingEndpoints'] as number) || 0;
      const totalEndpoints = (extendedMetrics['totalEndpoints'] as number) || 1;
      const successRate = (extendedMetrics['successRate'] as number) || 0;
      
      // Credit for having a deployed endpoint
      if (metrics.endpointUrl) {
        score += 10;
      }
      
      // Credit for any working endpoints
      if (workingEndpoints > 0) {
        score += Math.floor(successRate * 0.5); // Half credit for partial functionality
      }
      
      // Credit for getting responses (even if wrong status)
      if (metrics.statusCode && metrics.statusCode > 0) {
        score += 10;
      }
      
      // Credit for reasonable response time
      if (metrics.responseTime && metrics.responseTime < 5000) {
        score += 5;
      }
      
      return Math.min(score, 70); // Cap at 70 to distinguish from passed
    }
    
    return 0;
  }
  
  async getEndpointUrl(team: Team): Promise<string | null> {
    try {
      const envData = await this.getTeamEnvironmentData(team);
      return envData['ENDPOINT_URL'] || null;
    } catch (error) {
      this.log('error', `Failed to get endpoint URL for team ${team.nickname}:`, error);
      return null;
    }
  }
  
  private async testAllApiEndpoints(baseUrl: string, teamNickname: string): Promise<Array<{
    endpoint: string;
    method: string;
    description: string;
    working: boolean;
    statusCode: number;
    responseTime: number;
    critical: boolean;
    error?: string;
  }>> {
    const results = [];
    
    // Define critical endpoints (core functionality)
    const criticalPaths = ['/api/events', '/api/seats', '/api/bookings', '/api/reset'];
    
    for (const apiTest of this.apiEndpoints) {
      const isCritical = criticalPaths.some(path => apiTest.path.startsWith(path));
      
      try {
        const result = await this.testSingleEndpoint(baseUrl, apiTest, teamNickname);
        results.push({
          endpoint: apiTest.path,
          method: apiTest.method,
          description: apiTest.description,
          working: result.working,
          statusCode: result.statusCode,
          responseTime: result.responseTime,
          critical: isCritical,
          error: result.error
        });
      } catch (error) {
        results.push({
          endpoint: apiTest.path,
          method: apiTest.method,
          description: apiTest.description,
          working: false,
          statusCode: 0,
          responseTime: 0,
          critical: isCritical,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Small delay between requests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }
  
  private async testSingleEndpoint(baseUrl: string, apiTest: ApiEndpointTest, teamNickname: string): Promise<{
    working: boolean;
    statusCode: number;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Build URL with query parameters
      let url = `${baseUrl}${apiTest.path}`;
      if (apiTest.queryParams) {
        const params = new URLSearchParams(apiTest.queryParams);
        url += `?${params.toString()}`;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), Math.min(this.config.httpTimeout, 5000)); // Max 5s per endpoint
      
      const requestOptions: RequestInit = {
        method: apiTest.method,
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal,
        redirect: 'manual' // Don't follow redirects automatically
      };
      
      // Add request body for POST/PATCH methods
      if (apiTest.body && (apiTest.method === 'POST' || apiTest.method === 'PATCH')) {
        requestOptions.body = JSON.stringify(apiTest.body);
      }
      
      // Add basic auth for endpoints that require it (use dummy credentials for testing)
      if (apiTest.requiresAuth) {
        requestOptions.headers = {
          ...requestOptions.headers,
          'Authorization': 'Basic ' + Buffer.from('test:test').toString('base64')
        };
      }
      
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      const statusCode = response.status;
      
      // Check if status code is in expected range
      const working = apiTest.expectedStatus.includes(statusCode);
      
      this.log('debug', `Endpoint ${apiTest.method} ${apiTest.path} for team ${teamNickname}: ${statusCode} (${working ? 'OK' : 'FAIL'})`);
      
      return {
        working,
        statusCode,
        responseTime,
        error: working ? undefined : `Unexpected status ${statusCode}, expected one of: ${apiTest.expectedStatus.join(', ')}`
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timeout';
        } else if (error.message.includes('ECONNREFUSED')) {
          errorMessage = 'Connection refused';
        } else if (error.message.includes('ENOTFOUND')) {
          errorMessage = 'Host not found';
        } else {
          errorMessage = error.message;
        }
      }
      
      this.log('debug', `Endpoint ${apiTest.method} ${apiTest.path} for team ${teamNickname} failed: ${errorMessage}`);
      
      return {
        working: false,
        statusCode: 0,
        responseTime,
        error: errorMessage
      };
    }
  }
  
  private async testEndpoint(endpoint: string, teamNickname: string, isHttps: boolean): Promise<DeploymentMetrics> {
    const startTime = Date.now();
    const protocol = isHttps ? 'HTTPS' : 'HTTP';
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.httpTimeout);
      
      this.log('debug', `Testing ${protocol} endpoint for team ${teamNickname}: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal,
        // Don't follow redirects for API endpoints
        redirect: 'manual'
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      // For API endpoints, we only accept HTTP 200 as success
      const isAccessible = response.status === 200;
      
      const metrics: DeploymentMetrics = {
        isDeployed: true,
        endpointUrl: endpoint,
        responseTime,
        statusCode: response.status,
        lastChecked: new Date().toISOString(),
        isAccessible,
        isDnsResolved: true,
        confirmationUrl: endpoint,
        confirmationTitle: 'API Endpoints',
        confirmationDescription: isAccessible 
          ? `${protocol} API работает и отвечает на запросы`
          : `${protocol} API не отвечает со статусом 200 (статус: ${response.status})`
      };
      
      // Add additional response information
      const extendedMetrics = metrics as DeploymentMetrics & Record<string, unknown>;
      extendedMetrics['statusText'] = response.statusText;
      extendedMetrics['isHttps'] = isHttps;
      extendedMetrics['protocol'] = protocol;
      
      // Try to get API response information for successful requests
      if (isAccessible) {
        try {
          const contentType = response.headers.get('content-type');
          extendedMetrics['contentType'] = contentType;
          
          // If it's JSON, try to parse and validate the response
          if (contentType?.includes('application/json')) {
            const responseText = await response.text();
            extendedMetrics['contentLength'] = responseText.length;
            
            try {
              const jsonData = JSON.parse(responseText);
              extendedMetrics['hasValidJson'] = true;
              extendedMetrics['responseStructure'] = typeof jsonData === 'object' ? Object.keys(jsonData) : 'primitive';
            } catch (jsonError) {
              extendedMetrics['hasValidJson'] = false;
              extendedMetrics['jsonError'] = 'Invalid JSON response';
            }
          } else {
            extendedMetrics['hasValidJson'] = false;
            extendedMetrics['unexpectedContentType'] = true;
          }
        } catch (contentError) {
          // Don't fail the entire check if content reading fails
          this.log('debug', `Could not read ${protocol} response content for team ${teamNickname}:`, contentError);
        }
      }
      
      this.log('debug', `${protocol} endpoint check for team ${teamNickname} completed:`, {
        statusCode: response.status,
        responseTime,
        isAccessible,
        endpoint
      });
      
      return metrics;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      let errorMessage = 'Unknown error';
      let statusCode = 0;
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        if (error.name === 'AbortError') {
          errorMessage = 'Request timeout';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error';
        } else if (error.message.includes('ECONNREFUSED')) {
          errorMessage = 'Connection refused';
        } else if (error.message.includes('ENOTFOUND')) {
          errorMessage = 'Host not found';
        } else if (isHttps && (error.message.includes('certificate') || error.message.includes('SSL') || error.message.includes('TLS'))) {
          errorMessage = 'SSL/TLS certificate error';
        }
      }
      
      this.log('debug', `${protocol} endpoint check failed for team ${teamNickname} at ${endpoint}: ${errorMessage}`);
      
      return {
        isDeployed: true,
        endpointUrl: endpoint,
        responseTime,
        statusCode,
        lastChecked: new Date().toISOString(),
        isAccessible: false,
        isDnsResolved: true, // DNS was resolved at the parent level
        error: errorMessage,
        confirmationUrl: endpoint,
        confirmationTitle: 'API Endpoints',
        confirmationDescription: `${protocol} API недоступен: ${errorMessage}`
      };
    }
  }

  private async checkDnsResolution(url: string): Promise<{ resolved: boolean; error?: string }> {
    try {
      // Extract hostname from URL
      const hostname = new URL(url).hostname;
      
      // Use Node.js dns module to check resolution
      const dns = await import('dns');
      const { promisify } = await import('util');
      const lookup = promisify(dns.lookup);
      
      try {
        await lookup(hostname);
        return { resolved: true };
      } catch (dnsError) {
        const errorMessage = dnsError instanceof Error ? dnsError.message : 'DNS resolution failed';
        
        // Check for specific DNS error types
        if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('NXDOMAIN')) {
          return { resolved: false, error: 'DNS_PROBE_FINISHED_NXDOMAIN' };
        } else if (errorMessage.includes('ECONNREFUSED')) {
          return { resolved: true }; // DNS resolved but connection refused
        } else if (errorMessage.includes('ETIMEDOUT')) {
          return { resolved: false, error: 'DNS_TIMEOUT' };
        }
        
        return { resolved: false, error: errorMessage };
      }
    } catch (error) {
      this.log('warn', `DNS resolution check failed: ${error}`);
      return { resolved: false, error: 'DNS_CHECK_ERROR' };
    }
  }
}