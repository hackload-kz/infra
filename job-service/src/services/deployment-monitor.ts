import { BaseJobService } from './base-service';
import { CriteriaType, CriteriaStatus, Team, DeploymentMetrics } from '../types/criteria';

export interface DeploymentMonitorConfig {
  httpTimeout: number;
  userAgent: string;
}

export class DeploymentMonitorService extends BaseJobService {
  readonly criteriaType = CriteriaType.DEPLOYED_SOLUTION;
  readonly serviceName = 'deployment-monitor-service';
  
  private config: DeploymentMonitorConfig;
  
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
          confirmationTitle: 'Демо',
          confirmationDescription: 'Развернутое решение команды'
        };
      }
      
      // Check the specific API endpoint for events
      const apiEndpoint = `${endpointUrl}/api/events?page=1&pageSize=20`;
      this.log('debug', `Checking API deployment for team ${team.nickname} at ${apiEndpoint}`);
      
      // First, check DNS resolution
      const dnsResolution = await this.checkDnsResolution(endpointUrl);
      if (!dnsResolution.resolved) {
        this.log('warn', `DNS resolution failed for team ${team.nickname} at ${endpointUrl}: ${dnsResolution.error}`);
        return {
          isDeployed: true,
          endpointUrl: apiEndpoint,
          responseTime: 0,
          statusCode: 0,
          lastChecked: new Date().toISOString(),
          isAccessible: false,
          error: dnsResolution.error,
          isDnsResolved: false,
          confirmationUrl: apiEndpoint,
          confirmationTitle: 'API Endpoints',
          confirmationDescription: 'DNS не найден (домен не разрешается)'
        };
      }
      
      const startTime = Date.now();
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.httpTimeout);
        
        const response = await fetch(apiEndpoint, {
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
          endpointUrl: apiEndpoint,
          responseTime,
          statusCode: response.status,
          lastChecked: new Date().toISOString(),
          isAccessible,
          isDnsResolved: true,
          confirmationUrl: apiEndpoint,
          confirmationTitle: 'API Endpoints',
          confirmationDescription: 'API работает и отвечает на запросы'
        };
        
        // Add additional response information
        const extendedMetrics = metrics as DeploymentMetrics & Record<string, unknown>;
        extendedMetrics['statusText'] = response.statusText;
        extendedMetrics['baseEndpoint'] = endpointUrl;
        
        // Try to get API response information
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
            this.log('debug', `Could not read response content for team ${team.nickname}:`, contentError);
          }
        }
        
        this.log('debug', `API endpoint check for team ${team.nickname} completed:`, {
          statusCode: response.status,
          responseTime,
          isAccessible,
          endpoint: apiEndpoint
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
          }
        }
        
        this.log('warn', `API endpoint check failed for team ${team.nickname} at ${apiEndpoint}: ${errorMessage}`);
        
        return {
          isDeployed: true,
          endpointUrl: apiEndpoint,
          responseTime,
          statusCode,
          lastChecked: new Date().toISOString(),
          isAccessible: false,
          isDnsResolved: true, // DNS was resolved, but request failed
          error: errorMessage,
          confirmationUrl: apiEndpoint,
          confirmationTitle: 'API Endpoints',
          confirmationDescription: 'API недоступен или не отвечает'
        };
      }
      
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
    
    if (status === CriteriaStatus.PASSED) {
      // Perfect score for accessible deployments
      let score = 100;
      
      // Small bonus for fast response times (under 2 seconds)
      if (metrics.responseTime && metrics.responseTime < 2000) {
        score = 100; // Keep at 100, no need for bonus above 100
      }
      
      return score;
    }
    
    if (status === CriteriaStatus.FAILED) {
      // Give partial credit based on what we can detect
      let score = 0;
      
      // Credit for having a deployed endpoint
      if (metrics.endpointUrl) {
        score += 30;
      }
      
      // Credit for getting a response (even if error)
      if (metrics.statusCode && metrics.statusCode > 0) {
        score += 20;
      }
      
      // Credit for reasonable response time
      if (metrics.responseTime && metrics.responseTime < 10000) {
        score += 10;
      }
      
      // Credit for HTTP errors vs network errors (shows deployment exists)
      if (metrics.statusCode && metrics.statusCode >= 400 && metrics.statusCode < 600) {
        score += 20; // Server errors still show there's a deployment
      }
      
      return Math.min(score, 80); // Cap at 80 to distinguish from passed
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