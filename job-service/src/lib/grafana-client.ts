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
    
    // Set time range to cover when tests are likely to run (last 7 days with better granularity)
    const now = Math.floor(Date.now() / 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60); // 7 days ago in seconds
    
    url.searchParams.set('start', sevenDaysAgo.toString());
    url.searchParams.set('end', now.toString());
    url.searchParams.set('step', '60'); // 1 minute steps for better resolution

    this.logger.info(`Prometheus Query URL: ${url.toString()}`);
    this.logger.debug(`Executing Prometheus range query: ${query} from ${sevenDaysAgo} to ${now}`);

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
   * Generic load testing evaluation for different API endpoints
   */
  async evaluateLoadTestingTask(teamSlug: string, teamId: number, taskType: 'events' | 'archive'): Promise<GetEventsTestResult[]> {
    const userSizes = [1000, 5000, 25000, 50000, 100000];
    const results: GetEventsTestResult[] = [];

    this.logger.info(`Evaluating ${taskType} load testing task for team: ${teamSlug}`);

    for (const userSize of userSizes) {
      try {
        // Build test pattern based on task type
        // Pattern: <teamSlug>-<taskType>-<userSize>-<taskType>-<testNumber> for events
        // Pattern: <teamSlug>-<taskType>-<userSize>-<testNumber> for archive
        const testIdPattern = taskType === 'events' 
          ? `${teamSlug}-events-${userSize}-events-.*`
          : `${teamSlug}-archive-${userSize}-.*`;
          
        const testResult = await this.getLatestTestResult(testIdPattern, teamId, taskType, userSize);
        
        if (testResult) {
          results.push(testResult);
        }
      } catch (error) {
        this.logger.error(`Failed to evaluate ${userSize} user ${taskType} test for team ${teamSlug}:`, error);
      }
    }

    return results;
  }

  /**
   * Get the latest test result for a specific test pattern
   */
  async getLatestTestResult(testIdPattern: string, _teamId: number, _taskType: 'events' | 'archive' = 'events', userSize: number): Promise<GetEventsTestResult | null> {
    this.logger.info(`Getting test result for pattern: ${testIdPattern}, userSize: ${userSize}`);
    try {
      // Extract components from pattern
      // Pattern for events: <teamSlug>-events-<userSize>-events-.*
      // Pattern for archive: <teamSlug>-archive-<userSize>-.*
      const match = testIdPattern.match(/(\w+)-(events)-(\d+)-events-.*/) || 
                    testIdPattern.match(/(\w+)-(archive)-(\d+)-.*/);
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

      // Query for failed requests (expected_response="false") using range query
      const failedRequestsQuery = `sum(k6_http_reqs_total{testid=~"${testIdPattern}", expected_response="false"})`;
      const failedResponse = await this.prometheusRangeQuery(failedRequestsQuery);
      const failedRequests = this.extractMaxValue(failedResponse) || 0;

      // Query for peak RPS (maximum instantaneous rate during the test) using range query
      const peakRpsQuery = `max(sum(irate(k6_http_reqs_total{testid=~"${testIdPattern}"}[1m])))`;
      const peakRpsResponse = await this.prometheusRangeQuery(peakRpsQuery);
      const peakRps = this.extractMaxValue(peakRpsResponse) || 0;

      // Query for P95 latency using histogram_quantile
      const p95LatencyQuery = `histogram_quantile(0.95, sum by(le, name, method, status) (rate(k6_http_req_duration_seconds{testid=~"${testIdPattern}"}[5m])))`;
      const p95Response = await this.prometheusRangeQuery(p95LatencyQuery);
      const p95Latency = this.extractMaxValue(p95Response) || 0;

      // Calculate success rate
      const successfulRequests = totalRequests - failedRequests;
      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
      const errorCount = failedRequests;
      const testPassed = successRate >= 95;

      // Calculate score based on user size and success
      let score = 0;
      if (testPassed) {
        // Base scores for each user size level
        const baseScores: Record<number, number> = {
          1000: 10,
          5000: 20,
          25000: 30,
          50000: 40,
          100000: 50
        };
        score = baseScores[userSize] || 0;
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
   * Make HTTP request to Prometheus
   */
  private async makeRequest(url: string): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'HackLoad-Job-Service/1.0'
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}