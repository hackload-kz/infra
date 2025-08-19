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
      
      // Extract base URL without protocol to test both HTTP and HTTPS
      const urlObject = new URL(endpointUrl);
      const baseUrl = `${urlObject.hostname}${urlObject.port ? ':' + urlObject.port : ''}${urlObject.pathname}`;
      
      // Create both HTTP and HTTPS endpoints
      const httpEndpoint = `http://${baseUrl}/api/events?page=1&pageSize=20`.replace(/\/+/g, '/').replace(':/', '://');
      const httpsEndpoint = `https://${baseUrl}/api/events?page=1&pageSize=20`.replace(/\/+/g, '/').replace(':/', '://');
      
      this.log('debug', `Testing both HTTP and HTTPS for team ${team.nickname}`);
      this.log('debug', `HTTP endpoint: ${httpEndpoint}`);
      this.log('debug', `HTTPS endpoint: ${httpsEndpoint}`);
      
      // First, check DNS resolution using the original endpoint
      const dnsResolution = await this.checkDnsResolution(endpointUrl);
      if (!dnsResolution.resolved) {
        this.log('warn', `DNS resolution failed for team ${team.nickname} at ${endpointUrl}: ${dnsResolution.error}`);
        return {
          isDeployed: true,
          endpointUrl: httpEndpoint,
          responseTime: 0,
          statusCode: 0,
          lastChecked: new Date().toISOString(),
          isAccessible: false,
          error: dnsResolution.error,
          isDnsResolved: false,
          confirmationUrl: httpEndpoint,
          confirmationTitle: 'API Endpoints',
          confirmationDescription: 'DNS не найден (домен не разрешается)'
        };
      }
      
      // Test HTTP first, then HTTPS
      const httpResult = await this.testEndpoint(httpEndpoint, team.nickname, false);
      const httpsResult = await this.testEndpoint(httpsEndpoint, team.nickname, true);
      
      // Determine the final result based on availability
      let finalResult: DeploymentMetrics;
      let protocolStatus = '';
      
      if (httpResult.isAccessible && httpsResult.isAccessible) {
        // Both work - prefer HTTPS but note HTTP also works
        finalResult = httpsResult;
        protocolStatus = 'Оба HTTP и HTTPS работают (предпочтение HTTPS)';
      } else if (httpResult.isAccessible && !httpsResult.isAccessible) {
        // Only HTTP works - test passes but subtract points for no HTTPS
        finalResult = httpResult;
        protocolStatus = 'Только HTTP работает (нет HTTPS)';
        
        // Add HTTPS test info to metrics
        const extendedMetrics = finalResult as DeploymentMetrics & Record<string, unknown>;
        extendedMetrics['httpsAvailable'] = false;
        extendedMetrics['httpsError'] = httpsResult.error || 'HTTPS недоступен';
        extendedMetrics['httpsStatusCode'] = httpsResult.statusCode;
      } else if (!httpResult.isAccessible && httpsResult.isAccessible) {
        // Only HTTPS works - full points
        finalResult = httpsResult;
        protocolStatus = 'Только HTTPS работает';
      } else {
        // Neither works - use the result with more information (prefer HTTP result)
        finalResult = (httpResult.statusCode || 0) > 0 ? httpResult : httpsResult;
        protocolStatus = 'Ни HTTP, ни HTTPS не работают';
        
        // Add both test results to metrics
        const extendedMetrics = finalResult as DeploymentMetrics & Record<string, unknown>;
        extendedMetrics['httpStatusCode'] = httpResult.statusCode;
        extendedMetrics['httpsStatusCode'] = httpsResult.statusCode;
        extendedMetrics['httpError'] = httpResult.error;
        extendedMetrics['httpsError'] = httpsResult.error;
      }
      
      // Update confirmation description with protocol status
      finalResult.confirmationDescription = finalResult.isAccessible 
        ? `API работает: ${protocolStatus}`
        : `API не работает: ${protocolStatus}`;
      
      this.log('info', `Deployment check for team ${team.nickname} completed:`, {
        httpAccessible: httpResult.isAccessible,
        httpsAccessible: httpsResult.isAccessible,
        finalStatus: protocolStatus,
        selectedProtocol: finalResult.endpointUrl?.startsWith('https') ? 'HTTPS' : 'HTTP'
      });
      
      return finalResult;
      
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
      
      const extendedMetrics = metrics as DeploymentMetrics & Record<string, unknown>;
      const isHttps = metrics.endpointUrl?.startsWith('https://') || false;
      const httpsAvailable = extendedMetrics['httpsAvailable'] !== false; // Default to true if not set
      
      if (isHttps && httpsAvailable) {
        // Full HTTPS deployment - bonus points
        score += 10;
      } else if (!isHttps && httpsAvailable !== false) {
        // HTTP only, but HTTPS was not tested or is available
        // No penalty (default case)
        score = 100;
      } else if (!isHttps && extendedMetrics['httpsAvailable'] === false) {
        // HTTP works but HTTPS doesn't - subtract points
        score = 90; // 100 - 10 penalty for no HTTPS
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