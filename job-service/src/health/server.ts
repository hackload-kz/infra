import * as http from 'http';
import { JobScheduler } from '../scheduler';
import { metricsCollector } from '../lib/metrics';
import { logger } from '../lib/logger';

export interface HealthServerConfig {
  healthPort: number;
  metricsPort: number;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastRunTime?: string;
    lastSuccessTime?: string;
    errorRate: number;
    consecutiveFailures: number;
  }>;
  summary: {
    totalServices: number;
    healthyServices: number;
    degradedServices: number;
    unhealthyServices: number;
  };
}

export class HealthServer {
  private healthServer?: http.Server;
  private metricsServer?: http.Server;
  private scheduler?: JobScheduler;
  private config: HealthServerConfig;
  
  constructor(config: HealthServerConfig) {
    this.config = config;
  }
  
  setScheduler(scheduler: JobScheduler): void {
    this.scheduler = scheduler;
  }
  
  async start(): Promise<void> {
    await Promise.all([
      this.startHealthServer(),
      this.startMetricsServer()
    ]);
    
    logger.info(`Health server started on port ${this.config.healthPort}`);
    logger.info(`Metrics server started on port ${this.config.metricsPort}`);
  }
  
  async stop(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    if (this.healthServer) {
      promises.push(new Promise((resolve) => {
        this.healthServer?.close(() => resolve());
      }));
    }
    
    if (this.metricsServer) {
      promises.push(new Promise((resolve) => {
        this.metricsServer?.close(() => resolve());
      }));
    }
    
    await Promise.all(promises);
    logger.info('Health and metrics servers stopped');
  }
  
  private async startHealthServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.healthServer = http.createServer(async (req, res) => {
        try {
          await this.handleHealthRequest(req, res);
        } catch (error) {
          logger.error('Error handling health request:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
      
      this.healthServer.listen(this.config.healthPort, () => {
        resolve();
      });
      
      this.healthServer.on('error', (error) => {
        reject(error);
      });
    });
  }
  
  private async startMetricsServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.metricsServer = http.createServer(async (req, res) => {
        try {
          await this.handleMetricsRequest(req, res);
        } catch (error) {
          logger.error('Error handling metrics request:', error);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('# Error generating metrics\n');
        }
      });
      
      this.metricsServer.listen(this.config.metricsPort, () => {
        resolve();
      });
      
      this.metricsServer.on('error', (error) => {
        reject(error);
      });
    });
  }
  
  private async handleHealthRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    
    const url = req.url || '';
    
    if (url === '/health' || url === '/') {
      const health = this.getHealthStatus();
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health, null, 2));
      return;
    }
    
    if (url === '/health/ready') {
      // Readiness probe - check if all critical services are running
      const health = this.getHealthStatus();
      const isReady = health.status !== 'unhealthy';
      
      const statusCode = isReady ? 200 : 503;
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        ready: isReady, 
        status: health.status,
        timestamp: health.timestamp
      }));
      return;
    }
    
    if (url === '/health/live') {
      // Liveness probe - basic service availability
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        alive: true, 
        timestamp: new Date().toISOString() 
      }));
      return;
    }
    
    // 404 for unknown endpoints
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
  
  private async handleMetricsRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method not allowed\n');
      return;
    }
    
    const url = req.url || '';
    
    if (url === '/metrics' || url === '/') {
      const prometheusMetrics = metricsCollector.getPrometheusMetrics();
      
      res.writeHead(200, { 
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' 
      });
      res.end(prometheusMetrics);
      return;
    }
    
    if (url === '/metrics/json') {
      const metrics = metricsCollector.getMetrics();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(metrics, null, 2));
      return;
    }
    
    // 404 for unknown endpoints
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found\n');
  }
  
  private getHealthStatus(): HealthResponse {
    const services = this.scheduler?.getStatus() || [];
    const timestamp = new Date().toISOString();
    
    // Update metrics with current service health
    services.forEach(service => {
      metricsCollector.updateServiceHealth(service.serviceName, service);
    });
    metricsCollector.updateSystemMetrics(services.length);
    
    const summary = {
      totalServices: services.length,
      healthyServices: services.filter(s => s.status === 'healthy').length,
      degradedServices: services.filter(s => s.status === 'degraded').length,
      unhealthyServices: services.filter(s => s.status === 'unhealthy').length
    };
    
    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (summary.unhealthyServices > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.degradedServices > 0) {
      overallStatus = 'degraded';
    }
    
    // If no services are registered, consider it unhealthy
    if (summary.totalServices === 0) {
      overallStatus = 'unhealthy';
    }
    
    const systemMetrics = metricsCollector.getMetrics().systemMetrics;
    
    return {
      status: overallStatus,
      timestamp,
      uptime: systemMetrics.uptime,
      services: services.map(service => ({
        name: service.serviceName,
        status: service.status,
        lastRunTime: service.lastRunTime?.toISOString(),
        lastSuccessTime: service.lastSuccessTime?.toISOString(),
        errorRate: service.errorRate,
        consecutiveFailures: service.consecutiveFailures
      })),
      summary
    };
  }
}