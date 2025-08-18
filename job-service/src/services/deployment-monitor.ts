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
      const endpointUrl = envData['APPLICATION_URL'];
      
      if (!endpointUrl) {
        this.log('debug', `No application URL found for team ${team.nickname}`);
        return {
          isDeployed: false,
          confirmationTitle: 'Демо',
          confirmationDescription: 'Развернутое решение команды'
        };
      }
      
      this.log('debug', `Checking deployment for team ${team.nickname} at ${endpointUrl}`);
      
      const startTime = Date.now();
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.httpTimeout);
        
        const response = await fetch(endpointUrl, {
          method: 'GET',
          headers: {
            'User-Agent': this.config.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Cache-Control': 'no-cache'
          },
          signal: controller.signal,
          // Don't follow too many redirects
          redirect: 'manual'
        });
        
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        
        // Handle redirects manually to get more control
        let finalResponse = response;
        let redirectCount = 0;
        const maxRedirects = 5;
        
        while ((finalResponse.status === 301 || finalResponse.status === 302 || finalResponse.status === 307 || finalResponse.status === 308) && redirectCount < maxRedirects) {
          const location = finalResponse.headers.get('location');
          if (!location) break;
          
          redirectCount++;
          this.log('debug', `Following redirect ${redirectCount} to: ${location}`);
          
          const redirectController = new AbortController();
          const redirectTimeoutId = setTimeout(() => redirectController.abort(), this.config.httpTimeout);
          
          finalResponse = await fetch(location, {
            method: 'GET',
            headers: {
              'User-Agent': this.config.userAgent,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Cache-Control': 'no-cache'
            },
            signal: redirectController.signal,
            redirect: 'manual'
          });
          
          clearTimeout(redirectTimeoutId);
        }
        
        const isAccessible = finalResponse.ok || (finalResponse.status >= 200 && finalResponse.status < 400);
        
        const metrics: DeploymentMetrics = {
          isDeployed: true,
          endpointUrl,
          responseTime,
          statusCode: finalResponse.status,
          lastChecked: new Date().toISOString(),
          isAccessible,
          confirmationUrl: endpointUrl,
          confirmationTitle: 'Демо',
          confirmationDescription: 'Развернутое решение команды'
        };
        
        // Add additional response information
        const extendedMetrics = metrics as DeploymentMetrics & Record<string, unknown>;
        extendedMetrics['statusText'] = finalResponse.statusText;
        extendedMetrics['redirectCount'] = redirectCount;
        
        // Try to get some basic content information
        if (isAccessible) {
          try {
            const contentType = finalResponse.headers.get('content-type');
            extendedMetrics['contentType'] = contentType;
            
            // If it's HTML, we could check for basic indicators
            if (contentType?.includes('text/html')) {
              const text = await finalResponse.text();
              extendedMetrics['hasTitle'] = text.includes('<title>');
              extendedMetrics['contentLength'] = text.length;
              extendedMetrics['hasBody'] = text.includes('<body>') || text.includes('<body ');
            }
          } catch (contentError) {
            // Don't fail the entire check if content reading fails
            this.log('debug', `Could not read response content for team ${team.nickname}:`, contentError);
          }
        }
        
        this.log('debug', `Deployment check for team ${team.nickname} completed:`, {
          statusCode: finalResponse.status,
          responseTime,
          isAccessible,
          redirectCount
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
        
        this.log('warn', `Deployment check failed for team ${team.nickname} at ${endpointUrl}: ${errorMessage}`);
        
        return {
          isDeployed: true,
          endpointUrl,
          responseTime,
          statusCode,
          lastChecked: new Date().toISOString(),
          isAccessible: false,
          error: errorMessage,
          confirmationUrl: endpointUrl,
          confirmationTitle: 'Демо',
          confirmationDescription: 'Развернутое решение команды (недоступно)'
        };
      }
      
    } catch (error) {
      this.log('error', `Failed to collect deployment metrics for team ${team.nickname}:`, error);
      
      return {
        isDeployed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        confirmationTitle: 'Демо',
        confirmationDescription: 'Развернутое решение команды (ошибка при проверке)'
      };
    }
  }
  
  override evaluateStatus(metrics: DeploymentMetrics): CriteriaStatus {
    if (!metrics.isDeployed) {
      return CriteriaStatus.NO_DATA;
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
      return envData['APPLICATION_URL'] || null;
    } catch (error) {
      this.log('error', `Failed to get endpoint URL for team ${team.nickname}:`, error);
      return null;
    }
  }
}