/**
 * Grafana Dashboard URL Generator for K6 Performance Metrics
 * 
 * Simplified client that generates public dashboard URLs for K6 load testing results.
 * No API authentication required since we're only linking to public dashboards.
 */

import { createLogger, Logger } from './logger';
import { loadConfig } from '../config';

/**
 * Simplified Grafana Client for Dashboard URL Generation
 */
export class GrafanaClient {
  private readonly dashboardBaseUrl: string;
  private readonly logger: Logger;

  constructor() {
    const config = loadConfig();
    this.logger = createLogger(config.logLevel, 'GrafanaClient');
    
    this.dashboardBaseUrl = config.k6Services.dashboardBaseUrl;
    
    this.logger.debug('GrafanaClient initialized', {
      dashboardBaseUrl: this.dashboardBaseUrl
    });
  }

  /**
   * Check if Grafana client is properly configured
   */
  isConfigured(): boolean {
    return !!this.dashboardBaseUrl;
  }

  /**
   * Generate Grafana dashboard URL for specific test
   */
  generateGrafanaDashboardUrl(testId: string): string {
    const dashboardId = 'a3b2aaa8-bb66-4008-a1d8-16c49afedbf0';
    
    // Extended time range to cover the entire hackathon period
    // From August 15, 2025 (hackathon start) to now
    const now = Date.now();
    const hackathonStart = new Date('2025-08-15T00:00:00Z').getTime();
    
    return `${this.dashboardBaseUrl}/d/${dashboardId}/k6-prometheus-native-histograms?` +
           `orgId=1&` +
           `var-DS_PROMETHEUS=Prometheus&` +
           `var-testid=${encodeURIComponent(testId)}&` +
           `var-quantile=0.99&` +
           `from=${hackathonStart}&` +
           `to=${now}`;
  }
}