/**
 * Grafana API Client for K6 Performance Metrics
 * 
 * Provides integration with Grafana API to fetch K6 performance test results
 * and metrics for team application monitoring. Enhanced with team-specific
 * test evaluation and Prometheus query support.
 */

import { createLogger, Logger } from './logger';
import { loadConfig } from '../config';

export interface GrafanaMetric {
  metric: Record<string, string>;
  value: [number, string]; // [timestamp, value]
  values?: [number, string][]; // for range queries
}

export interface GrafanaQueryResult {
  resultType: 'matrix' | 'vector' | 'scalar' | 'string';
  result: GrafanaMetric[];
}

export interface GrafanaResponse {
  status: 'success' | 'error';
  data: GrafanaQueryResult;
  errorType?: string;
  error?: string;
}

export interface GetEventsTestResult {
  teamSlug: string;
  userSize: number;
  testNumber: number;
  totalRequests: number;
  successRate: number;
  errorCount: number;
  peakRps: number; // Peak requests per second during the test
  p95Latency: number; // P95 response time in seconds
  testPassed: boolean; // true if >= 95% success rate
  score: number; // Points based on userSize and success
  grafanaDashboardUrl: string;
  testId: string;
  timestamp: Date;
  // Booking-specific metrics (optional)
  successfulBookings?: number;
  failedBookings?: number;
  conflictBookings?: number;
  failedSeatRequests?: number;
}

export interface TeamTestSummary {
  teamId: number;
  teamSlug: string;
  teamName: string;
  totalScore: number;
  testResults: GetEventsTestResult[];
  passedTests: number;
  totalTests: number;
  lastTestTime?: Date;
}

export class GrafanaClient {
  private readonly dashboardBaseUrl: string;
  private readonly prometheusUrl: string;
  private readonly logger: Logger;
  private readonly timeout: number;
  private readonly queryTimeRangeDays: number = 3; // Query last 3 days for better performance

  constructor() {
    const config = loadConfig();
    this.logger = createLogger(config.logLevel, 'GrafanaClient');
    
    this.dashboardBaseUrl = config.k6Services.dashboardBaseUrl;
    this.prometheusUrl = config.k6Services.dashboardBaseUrl.replace('/grafana', '/prometheus');
    this.timeout = config.api.timeout;
    
    this.logger.debug('GrafanaClient initialized', {
      dashboardBaseUrl: this.dashboardBaseUrl,
      prometheusUrl: this.prometheusUrl
    });
  }

  /**
   * Check if Grafana client is properly configured
   */
  isConfigured(): boolean {
    return !!this.dashboardBaseUrl;
  }

  /**
   * Execute Prometheus range query to find data over hackathon period
   */
  async prometheusRangeQuery(query: string): Promise<GrafanaResponse> {
    if (!this.prometheusUrl) {
      throw new Error('Prometheus URL not configured');
    }

    const url = new URL(`${this.prometheusUrl}/api/v1/query_range`);
    // Properly encode the query parameter
    url.searchParams.set('query', query);
    
    // Set time range to cover when tests are likely to run (configurable time range for better performance)
    const now = Math.floor(Date.now() / 1000);
    const startTime = now - (this.queryTimeRangeDays * 24 * 60 * 60); // N days ago in seconds
    
    url.searchParams.set('start', startTime.toString());
    url.searchParams.set('end', now.toString());
    url.searchParams.set('step', '60'); // 1 minute steps for better resolution

    this.logger.info(`Prometheus Query URL: ${url.toString()}`);
    this.logger.debug(`Executing Prometheus range query: ${query} from ${startTime} to ${now} (last ${this.queryTimeRangeDays} days)`);

    try {
      const response = await this.makeRequest(url.toString());
      const data = await response.json() as GrafanaResponse;
      
      // Log response for debugging
      this.logger.info('Prometheus response:', {
        status: data.status,
        resultType: data.data?.resultType,
        resultCount: data.data?.result?.length || 0
      });
      
      if (data.status === 'error') {
        this.logger.error('Prometheus query error:', data.error, data.errorType);
        throw new Error(`Prometheus range query error: ${data.error}`);
      }
      
      return data;
    } catch (error) {
      this.logger.error('Prometheus range query failed:', error);
      throw error;
    }
  }

  /**
   * Execute Prometheus instant query (for backwards compatibility)
   */
  async prometheusQuery(query: string, time?: Date): Promise<GrafanaResponse> {
    if (!this.prometheusUrl) {
      throw new Error('Prometheus URL not configured');
    }

    const url = new URL(`${this.prometheusUrl}/api/v1/query`);
    url.searchParams.set('query', query);
    
    if (time) {
      url.searchParams.set('time', (time.getTime() / 1000).toString());
    }

    this.logger.debug(`Executing Prometheus instant query: ${query}`);

    try {
      const response = await this.makeRequest(url.toString());
      const data = await response.json() as GrafanaResponse;
      
      if (data.status === 'error') {
        throw new Error(`Prometheus query error: ${data.error}`);
      }
      
      return data;
    } catch (error) {
      this.logger.error('Prometheus query failed:', error);
      throw error;
    }
  }

  /**
   * Generate Grafana dashboard URL for specific test
   */
  generateGrafanaDashboardUrl(testId: string): string {
    const dashboardId = 'a3b2aaa8-bb66-4008-a1d8-16c49afedbf0';
    
    // Extended time range to cover recent period where tests are likely
    const now = Date.now();
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000); // 7 days ago in milliseconds
    
    return `${this.dashboardBaseUrl}/d/${dashboardId}/k6-prometheus-native-histograms?` +
           `orgId=1&` +
           `var-DS_PROMETHEUS=Prometheus&` +
           `var-testid=${encodeURIComponent(testId)}&` +
           `var-quantile=0.99&` +
           `from=${weekAgo}&` +
           `to=${now}`;
  }

  /**
   * Evaluate load testing task performance for a specific team
   */
  async evaluateGetEventsTask(teamSlug: string, teamId: number): Promise<GetEventsTestResult[]> {
    return this.evaluateLoadTestingTask(teamSlug, teamId, 'events');
  }

  /**
   * Evaluate archive testing task performance for a specific team
   */
  async evaluateArchiveTask(teamSlug: string, teamId: number): Promise<GetEventsTestResult[]> {
    return this.evaluateLoadTestingTask(teamSlug, teamId, 'archive');
  }

  /**
   * Evaluate authorization testing task performance for a specific team
   * Only considers the last test execution by testId
   */
  async evaluateAuthorizationTask(teamSlug: string, teamId: number): Promise<GetEventsTestResult[]> {
    const results: GetEventsTestResult[] = [];

    this.logger.info(`Evaluating authorization load testing task for team: ${teamSlug}`);

    try {
      // Find all authorization test IDs for this team first
      // Try multiple patterns to be more flexible
      const testIdPatterns = [
        `${teamSlug}-check-authorizations-.*-.*`,
        `${teamSlug}-check-authorization-.*-.*`,
        `${teamSlug}-authorization-.*`,
        `${teamSlug}-auth-.*`
      ];
      
      let testIds: string[] = [];
      for (const pattern of testIdPatterns) {
        testIds = await this.getAuthorizationTestIds(pattern);
        if (testIds.length > 0) {
          this.logger.info(`Found authorization test IDs using pattern: ${pattern}`);
          break;
        }
      }
      
      if (testIds.length === 0) {
        this.logger.warn(`No authorization test IDs found for any patterns: ${testIdPatterns.join(', ')}, falling back to old evaluation method`);
        // Fallback to the old pattern-based evaluation
        try {
          const fallbackResult = await this.getLatestTestResult(`${teamSlug}-check-authorizations-.*-.*`, teamId, 'authorization', 0);
          if (fallbackResult) {
            results.push(fallbackResult);
          }
        } catch (fallbackError) {
          this.logger.error(`Fallback authorization evaluation also failed:`, fallbackError);
        }
        return results;
      }

      // Get only the latest test ID (most recent execution)
      const latestTestId = testIds[testIds.length - 1]; // testIds should be chronologically ordered
      
      if (!latestTestId) {
        this.logger.warn(`No valid test ID found from authorization test IDs: ${testIds}`);
        return results;
      }
      
      this.logger.info(`Processing latest authorization test: ${latestTestId}`);
      const testResult = await this.getAuthorizationTestResult(latestTestId, teamId);
      
      if (testResult) {
        results.push(testResult);
      }
    } catch (error) {
      this.logger.error(`Failed to evaluate authorization test for team ${teamSlug}:`, error);
    }

    return results;
  }

  /**
   * Evaluate booking testing task performance for a specific team
   * Uses scalar queries for booking metrics
   */
  async evaluateBookingTask(teamSlug: string, teamId: number): Promise<GetEventsTestResult[]> {
    const results: GetEventsTestResult[] = [];

    this.logger.info(`Evaluating booking load testing task for team: ${teamSlug}`);

    try {
      // Pattern: <teamSlug>-booking-script-* for booking (e.g., alem-booking-script-212)
      const testIdPattern = `${teamSlug}-booking-.*`;
      
      // Get all booking test IDs for this team first
      const testIds = await this.getBookingTestIds(testIdPattern);
      
      if (testIds.length === 0) {
        this.logger.debug(`No booking test IDs found for pattern: ${testIdPattern}`);
        return results;
      }

      // Get only the latest test ID (most recent execution)
      const latestTestId = testIds[testIds.length - 1];
      
      if (!latestTestId) {
        this.logger.warn(`No valid test ID found from booking test IDs: ${testIds}`);
        return results;
      }
      
      this.logger.info(`Processing latest booking test: ${latestTestId}`);
      const testResult = await this.getBookingTestResult(latestTestId, teamId);
      
      if (testResult) {
        results.push(testResult);
      }
    } catch (error) {
      this.logger.error(`Failed to evaluate booking test for team ${teamSlug}:`, error);
    }

    return results;
  }

  /**
   * Generic load testing evaluation for different API endpoints
   */
  async evaluateLoadTestingTask(teamSlug: string, teamId: number, taskType: 'events' | 'archive' | 'authorization' | 'booking'): Promise<GetEventsTestResult[]> {
    const results: GetEventsTestResult[] = [];

    this.logger.info(`Evaluating ${taskType} load testing task for team: ${teamSlug}`);

    if (taskType === 'authorization') {
      // Authorization tests don't have user sizes, just check for any authorization tests
      try {
        // Pattern: <teamSlug>-check-authorizations-*-<testId> for authorization
        const testIdPattern = `${teamSlug}-check-authorizations-.*-.*`;
        const testResult = await this.getLatestTestResult(testIdPattern, teamId, taskType, 0); // userSize 0 for auth tests
        
        if (testResult) {
          results.push(testResult);
        }
      } catch (error) {
        this.logger.error(`Failed to evaluate authorization test for team ${teamSlug}:`, error);
      }
    } else if (taskType === 'booking') {
      // Booking tests don't have user sizes, just check for any booking tests
      try {
        // Pattern: <teamSlug>-booking-script-* for booking (e.g., orobotics-booking-script-162)
        const testIdPattern = `${teamSlug}-booking-.*`;
        const testResult = await this.getLatestTestResult(testIdPattern, teamId, taskType, 0); // userSize 0 for booking tests
        
        if (testResult) {
          results.push(testResult);
        }
      } catch (error) {
        this.logger.error(`Failed to evaluate booking test for team ${teamSlug}:`, error);
      }
    } else {
      // Events and Archive tests have user sizes
      let userSizes: number[];
      if (taskType === 'archive') {
        userSizes = [1000, 5000, 10000, 50000, 100000]; // Archive user sizes
      } else {
        userSizes = [1000, 5000, 10000, 25000, 50000, 100000]; // Events user sizes
      }
      
      for (const userSize of userSizes) {
        try {
          // Build test pattern based on task type
          // Pattern: <teamSlug>-events-<userSize>-events-<testNumber> for events
          // Pattern: <teamSlug>-archive-<userSize>-*-<testId> for archive
          let testIdPattern: string;
          if (taskType === 'events') {
            testIdPattern = `${teamSlug}-events-${userSize}-events-.*`;
          } else { // archive
            testIdPattern = `${teamSlug}-archive-${userSize}-.*-.*`;
          }
            
          const testResult = await this.getLatestTestResult(testIdPattern, teamId, taskType, userSize);
          
          if (testResult) {
            results.push(testResult);
          }
        } catch (error) {
          this.logger.error(`Failed to evaluate ${userSize} user ${taskType} test for team ${teamSlug}:`, error);
        }
      }
    }

    return results;
  }

  /**
   * Get the latest test result for a specific test pattern
   */
  async getLatestTestResult(testIdPattern: string, _teamId: number, _taskType: 'events' | 'archive' | 'authorization' | 'booking' = 'events', userSize: number): Promise<GetEventsTestResult | null> {
    this.logger.info(`Getting test result for pattern: ${testIdPattern}, userSize: ${userSize}`);
    try {
      // Extract components from pattern
      // Pattern for events: <teamSlug>-events-<userSize>-events-.*
      // Pattern for archive: <teamSlug>-archive-<userSize>-*-.*
      // Pattern for authorization: <teamSlug>-check-authorizations-*-.*
      const eventsMatch = testIdPattern.match(/(\w+)-(events)-(\d+)-events-.*/);
      const archiveMatch = testIdPattern.match(/(\w+)-(archive)-(\d+)-.*-.*/);
      const authMatch = testIdPattern.match(/(\w+)-(check-authorizations)-.*-.*/);
      
      const match = eventsMatch || archiveMatch || authMatch;
      if (!match) {
        throw new Error(`Invalid test ID pattern: ${testIdPattern}`);
      }

      const [, teamSlug] = match;
      
      // Query for total requests for this test pattern using range query
      const totalRequestsQuery = `sum(k6_http_reqs_total{testid=~"${testIdPattern}"})`;
      const totalResponse = await this.prometheusRangeQuery(totalRequestsQuery);
      
      if (!totalResponse || totalResponse.status !== 'success') {
        this.logger.debug(`Failed to get total requests for pattern: ${testIdPattern}`);
        return null;
      }
      
      const totalRequests = this.extractMaxValue(totalResponse) || 0;
      
      if (totalRequests === 0) {
        this.logger.debug(`No test data found for pattern: ${testIdPattern}`);
        return null;
      }

      // Add delay before next query
      await this.delayBetweenQueries();

      // Query for failed requests (expected_response="false") using range query
      const failedRequestsQuery = `sum(k6_http_reqs_total{testid=~"${testIdPattern}", expected_response="false"})`;
      const failedResponse = await this.prometheusRangeQuery(failedRequestsQuery);
      const failedRequests = this.extractMaxValue(failedResponse) || 0;

      // For booking tests, calculate special booking success rate
      let bookingSuccessRate: number | null = null;
      if (_taskType === 'booking') {
        try {
          // Query for successful bookings
          const successfulBookingsQuery = `sum(k6_successful_bookings_total{testid=~"${testIdPattern}"})`;
          const successfulBookingsResponse = await this.prometheusRangeQuery(successfulBookingsQuery);
          const successfulBookings = this.extractMaxValue(successfulBookingsResponse) || 0;

          // Add delay before next query
          await this.delayBetweenQueries(200);

          // Query for failed bookings
          const failedBookingsQuery = `sum(k6_failed_bookings_total{testid=~"${testIdPattern}"})`;
          const failedBookingsResponse = await this.prometheusRangeQuery(failedBookingsQuery);
          const failedBookings = this.extractMaxValue(failedBookingsResponse) || 0;

          // Add delay before next query
          await this.delayBetweenQueries(200);

          // Query for conflict bookings (seat already taken)
          const conflictBookingsQuery = `sum(k6_conflict_bookings_total{testid=~"${testIdPattern}"})`;
          const conflictBookingsResponse = await this.prometheusRangeQuery(conflictBookingsQuery);
          const conflictBookings = this.extractMaxValue(conflictBookingsResponse) || 0;

          // Calculate booking success rate: successful_bookings / total_booking_attempts
          const totalBookingAttempts = successfulBookings + failedBookings + conflictBookings;
          if (totalBookingAttempts > 0) {
            bookingSuccessRate = (successfulBookings / totalBookingAttempts) * 100;
            this.logger.info(`Booking success rate calculated: ${successfulBookings}/${totalBookingAttempts} = ${bookingSuccessRate.toFixed(2)}%`, {
              successfulBookings,
              failedBookings,
              conflictBookings,
              totalBookingAttempts
            });
          }
        } catch (error) {
          this.logger.warn(`Failed to calculate booking success rate for ${testIdPattern}:`, error);
        }
      }

      // Add delay before next query
      await this.delayBetweenQueries();

      // Query for peak RPS (maximum instantaneous rate during the test) using range query
      const peakRpsQuery = `max(sum(irate(k6_http_reqs_total{testid=~"${testIdPattern}"}[1m])))`;
      const peakRpsResponse = await this.prometheusRangeQuery(peakRpsQuery);
      const peakRps = this.extractMaxValue(peakRpsResponse) || 0;

      // Add delay before next query
      await this.delayBetweenQueries();

      // Query for P95 latency using histogram_quantile
      const p95LatencyQuery = `histogram_quantile(0.95, sum by(le, name, method, status) (rate(k6_http_req_duration_seconds{testid=~"${testIdPattern}"}[5m])))`;
      const p95Response = await this.prometheusRangeQuery(p95LatencyQuery);
      const p95Latency = this.extractMaxValue(p95Response) || 0;

      // Calculate success rate
      const successfulRequests = totalRequests - failedRequests;
      let successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
      
      // For booking tests, use the booking-specific success rate if available
      if (_taskType === 'booking' && bookingSuccessRate !== null) {
        successRate = bookingSuccessRate;
      }
      
      const errorCount = failedRequests;
      
      // For authorization tests, check K6 thresholds instead of HTTP success rate
      let testPassed = false;
      
      if (_taskType === 'authorization') {
        try {
          // Check if exactly 42 HTTP requests were made (from K6 threshold: 'http_reqs': ['count===42'])
          const httpReqsMatch = totalRequests === 42;
          
          // Check if checks passed (from K6 threshold: 'checks': ['rate>=0.95'])
          const checksQuery = `k6_checks_total{testid=~"${testIdPattern}"} - k6_checks_failed_total{testid=~"${testIdPattern}"}`;
          const checksResponse = await this.prometheusRangeQuery(checksQuery);
          const passedChecks = this.extractMaxValue(checksResponse) || 0;
          
          // Add delay before next query
          await this.delayBetweenQueries(200);
          
          const totalChecksQuery = `k6_checks_total{testid=~"${testIdPattern}"}`;
          const totalChecksResponse = await this.prometheusRangeQuery(totalChecksQuery);
          const totalChecks = this.extractMaxValue(totalChecksResponse) || 0;
          
          const checksRate = totalChecks > 0 ? (passedChecks / totalChecks) : 0;
          const checksMatch = checksRate >= 0.95; // 95% checks must pass
          
          testPassed = httpReqsMatch && checksMatch;
          
          this.logger.info(`Authorization test thresholds for ${testIdPattern}:`, {
            httpReqs: totalRequests,
            httpReqsMatch,
            checksRate: checksRate.toFixed(3),
            checksMatch,
            testPassed
          });
          
        } catch (error) {
          this.logger.warn(`Failed to check authorization thresholds for ${testIdPattern}:`, error);
          testPassed = successRate >= 95; // Fallback to 95% success rate
        }
      } else {
        // For other test types, use success rate thresholds
        const successThreshold = _taskType === 'booking' ? 95 : 95; // 95% for most tests
        testPassed = successRate >= successThreshold;
      }

      // Calculate score based on task type and success
      let score = 0;
      if (testPassed) {
        if (_taskType === 'authorization') {
          // Authorization tests get a fixed score if they pass (no user size scaling)
          score = 100;
        } else {
          // Base scores for each user size level (events/archive/booking)
          const baseScores: Record<number, number> = {
            162: 5,      // 162 users get 5 points (booking specific)
            1000: 10,
            5000: 20,
            10000: 30,   // 10K users get 30 points
            25000: 30,   // 25K users get 30 points (equal to 10K)
            50000: 40,
            100000: 50
          };
          score = baseScores[userSize] || 0;
        }
      }

      // Find the specific test ID from the metrics using range query
      const testIdFromMetrics = await this.extractTestIdFromRange(testIdPattern);
      
      if (!testIdFromMetrics) {
        throw new Error(`Could not extract test ID from pattern: ${testIdPattern}`);
      }
      
      const result: GetEventsTestResult = {
        teamSlug: teamSlug || 'unknown',
        userSize,
        testNumber: this.extractTestNumber(testIdFromMetrics),
        totalRequests,
        successRate,
        errorCount,
        peakRps: Math.round(peakRps * 100) / 100, // Round to 2 decimal places
        p95Latency: Math.round(p95Latency * 1000 * 100) / 100, // Convert to milliseconds and round to 2 decimal places
        testPassed,
        score,
        grafanaDashboardUrl: this.generateGrafanaDashboardUrl(testIdFromMetrics),
        testId: testIdFromMetrics,
        timestamp: new Date()
      };

      this.logger.info(`Test result for ${testIdPattern}:`, {
        totalRequests,
        successRate: successRate.toFixed(2),
        peakRps: peakRps.toFixed(2),
        p95Latency: p95Latency.toFixed(3),
        testPassed,
        score
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to get test result for pattern ${testIdPattern}:`, error);
      return null;
    }
  }

  /**
   * Generate comprehensive team summary for Get Events task
   */
  async generateTeamSummary(teamId: number, teamSlug: string, teamName: string): Promise<TeamTestSummary> {
    this.logger.info(`Starting team summary generation for: ${teamName} (${teamSlug})`);
    const testResults = await this.evaluateGetEventsTask(teamSlug, teamId);
    
    // Calculate score based on maximum successful user load (not cumulative)
    const passedTests = testResults.filter(result => result.testPassed);
    const totalScore = passedTests.length > 0 
      ? Math.max(...passedTests.map(result => result.score))
      : 0;
    
    const lastTestTime = testResults.length > 0 
      ? new Date(Math.max(...testResults.map(r => r.timestamp.getTime()))) 
      : undefined;

    return {
      teamId,
      teamSlug,
      teamName,
      totalScore,
      testResults,
      passedTests: passedTests.length,
      totalTests: testResults.length,
      lastTestTime
    };
  }

  /**
   * Generate comprehensive team summary for Archive task
   */
  async generateArchiveTeamSummary(teamId: number, teamSlug: string, teamName: string): Promise<TeamTestSummary> {
    const testResults = await this.evaluateArchiveTask(teamSlug, teamId);
    
    // Calculate score based on maximum successful user load (not cumulative)
    const passedTests = testResults.filter(result => result.testPassed);
    const totalScore = passedTests.length > 0 
      ? Math.max(...passedTests.map(result => result.score))
      : 0;
      
    const lastTestTime = testResults.length > 0 
      ? new Date(Math.max(...testResults.map(r => r.timestamp.getTime()))) 
      : undefined;

    return {
      teamId,
      teamSlug,
      teamName,
      totalScore,
      testResults,
      passedTests: passedTests.length,
      totalTests: testResults.length,
      lastTestTime
    };
  }

  /**
   * Generate comprehensive team summary for Authorization task
   */
  async generateAuthorizationTeamSummary(teamId: number, teamSlug: string, teamName: string): Promise<TeamTestSummary> {
    const testResults = await this.evaluateAuthorizationTask(teamSlug, teamId);
    
    // Calculate score - use the actual calculated score from the test result (0-30 points)
    const totalScore = testResults.length > 0 ? (testResults[0]?.score || 0) : 0;
    
    // Count tests as passed if they have K6 thresholds met (not based on score)
    const passedTests = testResults.filter(result => result.testPassed);
      
    const lastTestTime = testResults.length > 0 
      ? new Date(Math.max(...testResults.map(r => r.timestamp.getTime()))) 
      : undefined;

    return {
      teamId,
      teamSlug,
      teamName,
      totalScore,
      testResults,
      passedTests: passedTests.length,
      totalTests: testResults.length,
      lastTestTime
    };
  }

  /**
   * Generate comprehensive team summary for Booking task
   */
  async generateBookingTeamSummary(teamId: number, teamSlug: string, teamName: string): Promise<TeamTestSummary> {
    const testResults = await this.evaluateBookingTask(teamSlug, teamId);
    
    // Calculate score - use the actual calculated score from the test result (0-30 points)
    const totalScore = testResults.length > 0 ? (testResults[0]?.score || 0) : 0;
    
    // Count tests as passed if they meet the success rate threshold
    const passedTests = testResults.filter(result => result.testPassed);
      
    const lastTestTime = testResults.length > 0 
      ? new Date(Math.max(...testResults.map(r => r.timestamp.getTime()))) 
      : undefined;

    return {
      teamId,
      teamSlug,
      teamName,
      totalScore,
      testResults,
      passedTests: passedTests.length,
      totalTests: testResults.length,
      lastTestTime
    };
  }

  /**
   * Get all booking test IDs for a given pattern, sorted chronologically
   */
  private async getBookingTestIds(testIdPattern: string): Promise<string[]> {
    try {
      const query = `group by (testid) (k6_successful_bookings_total{testid=~"${testIdPattern}"})`;
      const response = await this.prometheusRangeQuery(query);
      
      const testIds: string[] = [];
      
      if (response.data.result.length > 0) {
        for (const result of response.data.result) {
          if (result?.metric && 'testid' in result.metric) {
            const testid = result.metric['testid'];
            if (testid) {
              testIds.push(testid);
            }
          }
        }
      }
      
      // Sort testIds chronologically (assuming testId contains timestamp or incremental number)
      testIds.sort();
      
      this.logger.info(`Found ${testIds.length} booking test IDs:`, testIds);
      return testIds;
    } catch (error) {
      this.logger.error('Failed to get booking test IDs:', error);
      return [];
    }
  }

  /**
   * Get test result for a specific booking test ID using scalar queries
   */
  private async getBookingTestResult(testId: string, _teamId: number): Promise<GetEventsTestResult | null> {
    this.logger.info(`Getting booking test result for testId: ${testId}`);
    
    try {
      const teamSlugMatch = testId.match(/^(\w+)-booking/);
      const teamSlug = teamSlugMatch?.[1] || 'unknown';

      // Query for successful bookings (scalar value)
      const successfulBookingsQuery = `k6_successful_bookings_total{testid="${testId}"}`;
      const successfulBookingsResponse = await this.prometheusQuery(successfulBookingsQuery);
      const successfulBookings = this.extractScalarValue(successfulBookingsResponse) || 0;

      // Add delay before next query
      await this.delayBetweenQueries();

      // Query for failed bookings (scalar value)
      const failedBookingsQuery = `k6_failed_bookings_total{testid="${testId}"}`;
      const failedBookingsResponse = await this.prometheusQuery(failedBookingsQuery);
      const failedBookings = this.extractScalarValue(failedBookingsResponse) || 0;

      // Add delay before next query
      await this.delayBetweenQueries();

      // Query for conflict bookings (scalar value)
      const conflictBookingsQuery = `k6_conflict_bookings_total{testid="${testId}"}`;
      const conflictBookingsResponse = await this.prometheusQuery(conflictBookingsQuery);
      const conflictBookings = this.extractScalarValue(conflictBookingsResponse) || 0;

      // Add delay before next query
      await this.delayBetweenQueries();

      // Query for failed seat requests (scalar value)
      const failedSeatRequestsQuery = `k6_failed_seat_requests_total{testid="${testId}"}`;
      const failedSeatRequestsResponse = await this.prometheusQuery(failedSeatRequestsQuery);
      const failedSeatRequests = this.extractScalarValue(failedSeatRequestsResponse) || 0;

      // Calculate total booking attempts and success rate
      const totalBookingAttempts = successfulBookings + failedBookings + conflictBookings;
      const bookingSuccessRate = totalBookingAttempts > 0 ? (successfulBookings / totalBookingAttempts) * 100 : 0;

      // Add delay before next query
      await this.delayBetweenQueries();

      // Query for total HTTP requests (scalar value)
      const totalRequestsQuery = `k6_http_reqs_total{testid="${testId}"}`;
      const totalRequestsResponse = await this.prometheusQuery(totalRequestsQuery);
      const totalRequests = this.extractScalarValue(totalRequestsResponse) || 0;

      // Add delay before next query
      await this.delayBetweenQueries();

      // Query for P95 latency
      const p95LatencyQuery = `histogram_quantile(0.95, k6_http_req_duration_seconds{testid="${testId}"})`;
      const p95Response = await this.prometheusQuery(p95LatencyQuery);
      const p95Latency = this.extractScalarValue(p95Response) || 0;

      // Add delay before next query
      await this.delayBetweenQueries();

      // Query for peak RPS
      const peakRpsQuery = `max(irate(k6_http_reqs_total{testid="${testId}"}[1m]))`;
      const peakRpsResponse = await this.prometheusQuery(peakRpsQuery);
      const peakRps = this.extractScalarValue(peakRpsResponse) || 0;

      // Test passes if booking success rate >= 95%
      const testPassed = bookingSuccessRate >= 95.0;
      const score = testPassed ? 30 : 0; // Maximum 30 points for booking tests

      const result: GetEventsTestResult = {
        teamSlug,
        userSize: 0, // Booking tests don't have user sizes  
        testNumber: this.extractTestNumber(testId),
        totalRequests,
        successRate: bookingSuccessRate,
        errorCount: failedBookings + conflictBookings + failedSeatRequests,
        peakRps: Math.round(peakRps * 100) / 100,
        p95Latency: Math.round(p95Latency * 1000 * 100) / 100, // Convert to milliseconds
        testPassed,
        score,
        grafanaDashboardUrl: this.generateGrafanaDashboardUrl(testId),
        testId,
        timestamp: new Date(),
        // Include booking-specific metrics
        successfulBookings,
        failedBookings,
        conflictBookings,
        failedSeatRequests
      };

      this.logger.info(`Booking test result for ${testId}:`, {
        successfulBookings,
        failedBookings,
        conflictBookings,
        failedSeatRequests,
        totalBookingAttempts,
        bookingSuccessRate: bookingSuccessRate.toFixed(2),
        testPassed,
        score
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to get booking test result for ${testId}:`, error);
      return null;
    }
  }

  /**
   * Get all authorization test IDs for a given pattern, sorted chronologically
   */
  private async getAuthorizationTestIds(testIdPattern: string): Promise<string[]> {
    try {
      // Try multiple metric names to find authorization tests
      const metricQueries = [
        `group by (testid) (k6_http_reqs_total{testid=~"${testIdPattern}"})`,
        `group by (testid) (k6_checks_total{testid=~"${testIdPattern}"})`,
        `group by (testid) (k6_iterations_total{testid=~"${testIdPattern}"})`
      ];
      
      let testIds: string[] = [];
      
      for (const query of metricQueries) {
        this.logger.debug(`Trying authorization query: ${query}`);
        const response = await this.prometheusRangeQuery(query);
        
        if (response?.data?.result?.length > 0) {
          for (const result of response.data.result) {
            if (result?.metric && 'testid' in result.metric) {
              const testid = result.metric['testid'];
              if (testid && !testIds.includes(testid)) {
                testIds.push(testid);
              }
            }
          }
          
          if (testIds.length > 0) {
            this.logger.info(`Found authorization test IDs using query: ${query}`);
            break;
          }
        }
      }
      
      // Sort testIds chronologically (assuming testId contains timestamp or incremental number)
      testIds.sort();
      
      this.logger.info(`Found ${testIds.length} authorization test IDs for pattern ${testIdPattern}:`, testIds);
      return testIds;
    } catch (error) {
      this.logger.error(`Failed to get authorization test IDs for pattern ${testIdPattern}:`, error);
      return [];
    }
  }

  /**
   * Get test result for a specific authorization test ID
   */
  private async getAuthorizationTestResult(testId: string, _teamId: number): Promise<GetEventsTestResult | null> {
    this.logger.info(`Getting authorization test result for testId: ${testId}`);
    
    try {
      const teamSlugMatch = testId.match(/^(\w+)-check-authorizations/);
      const teamSlug = teamSlugMatch?.[1] || 'unknown';

      // Query for total requests for this specific test ID
      const totalRequestsQuery = `sum(k6_http_reqs_total{testid="${testId}"})`;
      const totalResponse = await this.prometheusRangeQuery(totalRequestsQuery);
      const totalRequests = this.extractMaxValue(totalResponse) || 0;
      
      if (totalRequests === 0) {
        this.logger.debug(`No test data found for testId: ${testId}`);
        return null;
      }

      // Add delay before next query
      await this.delayBetweenQueries();

      // Query for failed requests for this specific test ID
      const failedRequestsQuery = `sum(k6_http_reqs_total{testid="${testId}", expected_response="false"})`;
      const failedResponse = await this.prometheusRangeQuery(failedRequestsQuery);
      const failedRequests = this.extractMaxValue(failedResponse) || 0;

      // Add delay before next query
      await this.delayBetweenQueries();

      // Query for peak RPS for this specific test ID
      const peakRpsQuery = `max(sum(irate(k6_http_reqs_total{testid="${testId}"}[1m])))`;
      const peakRpsResponse = await this.prometheusRangeQuery(peakRpsQuery);
      const peakRps = this.extractMaxValue(peakRpsResponse) || 0;

      // Add delay before next query
      await this.delayBetweenQueries();

      // Query for P95 latency for this specific test ID
      const p95LatencyQuery = `histogram_quantile(0.95, sum by(le, name, method, status) (rate(k6_http_req_duration_seconds{testid="${testId}"}[5m])))`;
      const p95Response = await this.prometheusRangeQuery(p95LatencyQuery);
      const p95Latency = this.extractMaxValue(p95Response) || 0;

      // Calculate success rate
      const successfulRequests = totalRequests - failedRequests;
      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

      // Check K6 thresholds for authorization tests
      let testPassed = false;
      
      try {
        // Check if at least 42 HTTP requests were made (from K6 threshold: 'http_reqs': ['count===42'])
        // Allow teams to pass with >= 42 requests (meeting or exceeding the minimum)
        const httpReqsMatch = totalRequests >= 42;
        
        // Check if all checks passed (from K6 threshold: 'checks': ['rate>=1'])
        const checksQuery = `k6_checks_total{testid="${testId}"} - k6_checks_failed_total{testid="${testId}"}`;
        const checksResponse = await this.prometheusRangeQuery(checksQuery);
        const passedChecks = this.extractMaxValue(checksResponse) || 0;
        
        // Add delay before next query
        await this.delayBetweenQueries(200);
        
        const totalChecksQuery = `k6_checks_total{testid="${testId}"}`;
        const totalChecksResponse = await this.prometheusRangeQuery(totalChecksQuery);
        const totalChecks = this.extractMaxValue(totalChecksResponse) || 0;
        
        const checksRate = totalChecks > 0 ? (passedChecks / totalChecks) : 0;
        const checksMatch = checksRate >= 0.95; // 95% checks must pass
        
        testPassed = httpReqsMatch && checksMatch;
        
        this.logger.info(`Authorization test thresholds for ${testId}:`, {
          httpReqs: totalRequests,
          httpReqsMatch: `${totalRequests}>=42: ${httpReqsMatch}`,
          checksRate: checksRate.toFixed(3),
          checksMatch,
          testPassed
        });
        
      } catch (error) {
        this.logger.warn(`Failed to check authorization thresholds for ${testId}:`, error);
        testPassed = successRate >= 95; // Fallback to 95% success rate
      }

      // Calculate score - authorization tests use two-part scoring
      // 15 points for meeting HTTP request requirements + 15 points based on success percentage
      let score = 0;
      
      // Part 1: 15 points if at least 42 HTTP requests were made (meeting minimum requirement)
      const httpReqsMatch = totalRequests >= 42;
      if (httpReqsMatch) {
        score += 15;
        this.logger.info(`Authorization test ${testId}: +15 points for meeting minimum request count (${totalRequests}>=42)`);
      }
      
      // Part 2: 15 points based on success rate percentage (0-100% maps to 0-15 points)
      const successRatePoints = Math.round((successRate / 100) * 15);
      score += successRatePoints;
      this.logger.info(`Authorization test ${testId}: +${successRatePoints} points for ${successRate.toFixed(1)}% success rate`);
      
      this.logger.info(`Authorization test ${testId}: Total score = ${score}/30 points`);

      const result: GetEventsTestResult = {
        teamSlug,
        userSize: 0, // Authorization tests don't have user sizes
        testNumber: this.extractTestNumber(testId),
        totalRequests,
        successRate,
        errorCount: failedRequests,
        peakRps: Math.round(peakRps * 100) / 100,
        p95Latency: Math.round(p95Latency * 1000 * 100) / 100, // Convert to milliseconds
        testPassed,
        score,
        grafanaDashboardUrl: this.generateGrafanaDashboardUrl(testId),
        testId,
        timestamp: new Date()
      };

      this.logger.info(`Authorization test result for ${testId}:`, {
        totalRequests,
        successRate: successRate.toFixed(2),
        peakRps: peakRps.toFixed(2),
        p95Latency: p95Latency.toFixed(3),
        testPassed,
        score
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to get authorization test result for ${testId}:`, error);
      return null;
    }
  }

  /**
   * Extract specific test ID from metrics using range query
   */
  private async extractTestIdFromRange(pattern: string): Promise<string | null> {
    try {
      const query = `k6_http_reqs_total{testid=~"${pattern}"}`;
      const response = await this.prometheusRangeQuery(query);
      
      if (response.data.result.length > 0) {
        const firstResult = response.data.result[0];
        if (firstResult?.metric && 'testid' in firstResult.metric) {
          const testid = firstResult.metric['testid'];
          if (testid) {
            return testid;
          }
        }
      }
      
      // Fallback to pattern-based ID
      return pattern.replace('.*', '1');
    } catch (error) {
      this.logger.error('Failed to extract test ID from range:', error);
      return pattern.replace('.*', '1');
    }
  }


  /**
   * Extract test number from test ID
   */
  private extractTestNumber(testId: string | undefined): number {
    if (!testId) return 1;
    const match = testId.match(/-(\\d+)(?:-\\d+)?$/);
    return match ? parseInt(match[1] || '1', 10) : 1;
  }

  /**
   * Extract maximum value from range query response (time series data)
   */
  private extractMaxValue(response: GrafanaResponse | undefined): number | null {
    if (!response || response.data.result.length === 0) {
      return null;
    }

    const firstSeries = response.data.result[0];
    if (!firstSeries?.values || firstSeries.values.length === 0) {
      return null;
    }

    // Find the maximum value across all time points
    let maxValue = 0;
    for (const [, valueStr] of firstSeries.values) {
      const value = parseFloat(valueStr || '0');
      if (!isNaN(value) && value > maxValue) {
        maxValue = value;
      }
    }

    return maxValue;
  }

  /**
   * Extract scalar value from instant query response (single value)
   */
  private extractScalarValue(response: GrafanaResponse | undefined): number | null {
    if (!response || response.data.result.length === 0) {
      return null;
    }

    const firstResult = response.data.result[0];
    if (!firstResult?.value || firstResult.value.length < 2) {
      return null;
    }

    const value = parseFloat(firstResult.value[1] || '0');
    return isNaN(value) ? null : value;
  }


  /**
   * Add delay between queries to reduce load on Grafana
   */
  private async delayBetweenQueries(delayMs: number = 500): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  /**
   * Make HTTP request to Prometheus with retry logic for 503 errors
   */
  private async makeRequest(url: string): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'HackLoad-Job-Service/1.0'
    };

    const maxRetries = 5;
    const baseDelayMs = 2000; // Start with 2 second delay

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // If response is OK, return immediately
        if (response.ok) {
          return response;
        }

        // If it's a 503 Service Unavailable or 502/504 Gateway errors and we have retries left, retry
        if ((response.status === 503 || response.status === 502 || response.status === 504) && attempt < maxRetries) {
          const delayMs = baseDelayMs * Math.pow(2, attempt); // Exponential backoff
          console.log(`[GrafanaClient] Prometheus returned ${response.status}, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }

        // For other errors or if we've exhausted retries, throw
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      } catch (error) {
        clearTimeout(timeoutId);
        
        // Check if it's a retryable error (timeout, network error, or specific HTTP errors)
        const isRetryableError = error instanceof Error && (
          error.name === 'AbortError' || // Timeout
          error.message.includes('503') ||
          error.message.includes('502') ||
          error.message.includes('504') ||
          error.message.includes('ECONNRESET') ||
          error.message.includes('ETIMEDOUT')
        );
        
        // If we've exhausted retries or it's not a retryable error, throw immediately
        if (attempt === maxRetries || !isRetryableError) {
          throw error;
        }
        
        // Retry with exponential backoff
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        console.log(`[GrafanaClient] Request failed (${error.name || 'Error'}), retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries + 1}):`, error.message);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('Maximum retries exceeded');
  }
}