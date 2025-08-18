import * as cron from 'node-cron';
import { BaseJobService } from './services/base-service';
import { JobStatus, JobSchedulerInterface } from './types/services';
import { ServiceConfig } from './types/config';
import { metricsCollector } from './lib/metrics';

export class JobScheduler implements JobSchedulerInterface {
  private services: Map<string, BaseJobService> = new Map();
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private serviceConfigs: Map<string, ServiceConfig> = new Map();
  private isRunning: boolean = false;
  
  registerService(service: BaseJobService, config: ServiceConfig): void {
    this.services.set(service.serviceName, service);
    this.serviceConfigs.set(service.serviceName, config);
    this.log('info', `Registered service: ${service.serviceName}`);
  }
  
  async start(): Promise<void> {
    if (this.isRunning) {
      this.log('warn', 'Scheduler is already running');
      return;
    }
    
    this.log('info', 'Starting job scheduler...');
    
    for (const [serviceName, service] of this.services) {
      const config = this.serviceConfigs.get(serviceName);
      if (!config?.enabled) {
        this.log('info', `Skipping disabled service: ${serviceName}`);
        continue;
      }
      
      try {
        const task = cron.schedule(config.interval, async () => {
          await this.executeJob(service, config);
        }, { 
          scheduled: false,
          name: serviceName 
        });
        
        this.tasks.set(serviceName, task);
        task.start();
        
        this.log('info', `Scheduled ${serviceName}: ${config.interval}`);
      } catch (error) {
        this.log('error', `Failed to schedule ${serviceName}:`, error);
      }
    }
    
    this.isRunning = true;
    this.log('info', `Job scheduler started with ${this.tasks.size} active services`);
  }
  
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    
    this.log('info', 'Stopping job scheduler...');
    
    // Stop all scheduled tasks
    for (const [serviceName, task] of this.tasks) {
      try {
        task.stop();
        this.log('info', `Stopped scheduler for ${serviceName}`);
      } catch (error) {
        this.log('error', `Error stopping scheduler for ${serviceName}:`, error);
      }
    }
    
    // Wait a moment for any running jobs to finish
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.tasks.clear();
    this.isRunning = false;
    this.log('info', 'Job scheduler stopped');
  }
  
  pause(serviceName: string): void {
    const task = this.tasks.get(serviceName);
    if (!task) {
      this.log('warn', `Service ${serviceName} not found`);
      return;
    }
    
    task.stop();
    this.log('info', `Paused service: ${serviceName}`);
  }
  
  resume(serviceName: string): void {
    const task = this.tasks.get(serviceName);
    if (!task) {
      this.log('warn', `Service ${serviceName} not found`);
      return;
    }
    
    task.start();
    this.log('info', `Resumed service: ${serviceName}`);
  }
  
  getStatus(): JobStatus[] {
    const status: JobStatus[] = [];
    
    for (const [, service] of this.services) {
      const health = service.getHealth();
      status.push({
        serviceName: health.serviceName,
        status: health.status,
        lastRunTime: health.lastRunTime,
        lastSuccessTime: health.lastSuccessTime,
        errorRate: health.errorRate,
        consecutiveFailures: health.consecutiveFailures
      });
    }
    
    return status;
  }
  
  private async executeJob(service: BaseJobService, config: ServiceConfig): Promise<void> {
    const startTime = Date.now();
    let attempt = 0;
    const maxRetries = config.retries ?? 3;
    let teamsProcessed = 0;
    while (attempt <= maxRetries) {
      try {
        this.log('info', `Starting job: ${service.serviceName} (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        // Set up timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Job timeout')), config.timeout);
        });
        
        await Promise.race([
          service.run(),
          timeoutPromise
        ]);
        
        const duration = Date.now() - startTime;
        
        // Record successful execution
        metricsCollector.recordJobExecution(service.serviceName, true, duration, teamsProcessed);
        
        this.log('info', `Completed job: ${service.serviceName} in ${duration}ms`);
        return; // Success - exit retry loop
        
      } catch (error) {
        attempt++;
        const duration = Date.now() - startTime;
        
        if (attempt > maxRetries) {
          // Record failed execution
          metricsCollector.recordJobExecution(service.serviceName, false, duration, teamsProcessed);
          
          this.log('error', `Job failed after ${maxRetries + 1} attempts: ${service.serviceName} (${duration}ms)`, error);
          return;
        }
        
        // Exponential backoff for retries
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
        this.log('warn', `Job failed (attempt ${attempt}/${maxRetries + 1}): ${service.serviceName}, retrying in ${backoffMs}ms`, error);
        
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }
  
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: unknown[]): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [JobScheduler] ${message}`;
    
    switch (level) {
      case 'debug':
        console.debug(logMessage, ...args);
        break;
      case 'info':
        console.info(logMessage, ...args);
        break;
      case 'warn':
        console.warn(logMessage, ...args);
        break;
      case 'error':
        console.error(logMessage, ...args);
        break;
    }
  }
}