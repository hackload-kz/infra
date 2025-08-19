import { 
  ApiClientConfig, 
  RequestOptions, 
  HttpError, 
 
  CriteriaListResponse,
  BulkCriteriaUpdateResponse,
  SingleCriteriaUpdateRequest,
  SingleCriteriaUpdateResponse,
} from '../types/api';
import { CriteriaType, CriteriaUpdate, Team } from '../types/criteria';

export class HubApiClient {
  private readonly config: ApiClientConfig;
  
  constructor(config: ApiClientConfig) {
    this.config = config;
  }
  
  async getTeams(): Promise<Team[]> {
    try {
      // Try the service-specific teams endpoint first
      let response: any;
      try {
        response = await this.request<{ teams: any[] }>('/api/service/teams');
      } catch (serviceError) {
        // Fallback to regular teams endpoint if service endpoint doesn't exist
        this.log('warn', 'Service teams endpoint not found, falling back to regular teams endpoint');
        response = await this.request<{ teams: any[] }>('/api/teams');
      }
      
      if (!response || !response.teams) {
        throw new Error(`Failed to fetch teams: Invalid response format`);
      }
      
      // Filter to only APPROVED teams and map to our Team interface
      return response.teams
        .filter((team: any) => team.status === 'APPROVED')
        .map((team: any) => ({
          id: team.id,
          nickname: team.nickname,
          hackathonId: team.hackathonId,
          name: team.name
        }));
    } catch (error) {
      this.log('error', 'Failed to fetch teams:', error);
      throw error;
    }
  }
  
  async getCriteria(params?: { teamSlug?: string; criteriaType?: CriteriaType }): Promise<CriteriaListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.teamSlug) {
      searchParams.append('teamSlug', params.teamSlug);
    }
    if (params?.criteriaType) {
      searchParams.append('criteriaType', params.criteriaType);
    }
    
    const url = `/api/service/team-criteria${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    try {
      const response = await this.request<CriteriaListResponse>(url);
      return response;
    } catch (error) {
      this.log('error', 'Failed to fetch criteria:', error);
      throw error;
    }
  }
  
  async updateIndividualCriteria(update: CriteriaUpdate): Promise<any> {
    const requestBody = {
      status: update.status,
      score: update.score,
      metrics: update.metrics,
      updatedBy: update.updatedBy
    };
    
    const url = `/api/service/team-criteria/${update.teamSlug}/${update.criteriaType}`;
    
    console.log(`[${new Date().toISOString()}] [JOB_SERVICE_API] Sending individual criteria update:`, {
      teamSlug: update.teamSlug,
      criteriaType: update.criteriaType,
      url: url,
      status: update.status,
      score: update.score,
      metricsSize: JSON.stringify(update.metrics).length,
      requestBodySize: JSON.stringify(requestBody).length
    });
    
    try {
      const response = await this.request<any>(url, {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      });
      
      console.log(`[${new Date().toISOString()}] [JOB_SERVICE_API] Individual criteria update successful:`, {
        teamSlug: update.teamSlug,
        criteriaType: update.criteriaType,
        responseStatus: response ? 'success' : 'no response',
        responseData: response ? {
          action: response.action,
          teamId: response.teamId,
          finalStatus: response.criteria?.status,
          finalScore: response.criteria?.score
        } : null
      });
      
      this.log('debug', `Updated criteria for ${update.teamSlug}/${update.criteriaType}:`, response);
      return response;
    } catch (error) {
      console.log(`[${new Date().toISOString()}] [JOB_SERVICE_API] Individual criteria update FAILED:`, {
        teamSlug: update.teamSlug,
        criteriaType: update.criteriaType,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : error
      });
      
      this.log('error', `Failed to update criteria for ${update.teamSlug}/${update.criteriaType}:`, error);
      throw error;
    }
  }

  async bulkUpdateCriteria(updates: CriteriaUpdate[]): Promise<BulkCriteriaUpdateResponse> {
    this.log('debug', `Sending ${updates.length} individual criteria updates...`);
    
    let updatedEntries = 0;
    let createdEntries = 0;
    const errors: Array<{ teamSlug: string; criteriaType: string; error: string }> = [];
    const processedTeams: string[] = [];

    // Process each update individually
    for (const update of updates) {
      try {
        const response = await this.updateIndividualCriteria(update);
        
        if (response.action === 'created') {
          createdEntries++;
        } else {
          updatedEntries++;
        }
        
        if (!processedTeams.includes(update.teamSlug)) {
          processedTeams.push(update.teamSlug);
        }
        
        this.log('debug', `Successfully processed ${update.teamSlug}/${update.criteriaType}`);
        
      } catch (error) {
        errors.push({
          teamSlug: update.teamSlug,
          criteriaType: update.criteriaType,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        this.log('warn', `Failed to process ${update.teamSlug}/${update.criteriaType}:`, error);
      }
    }

    const result: BulkCriteriaUpdateResponse = {
      success: errors.length === 0,
      data: {
        processed: updatedEntries + createdEntries,
        failed: errors.length,
        ...(errors.length > 0 && { errors: errors.map(e => `${e.teamSlug}/${e.criteriaType}: ${e.error}`) })
      },
      ...(errors.length > 0 && { message: `Completed with ${errors.length} errors` })
    };

    this.log('info', `Individual updates completed: ${updatedEntries} updated, ${createdEntries} created, ${errors.length} errors`);
    return result;
  }
  
  async updateSingleCriteria(
    teamSlug: string, 
    criteriaType: CriteriaType, 
    update: SingleCriteriaUpdateRequest
  ): Promise<SingleCriteriaUpdateResponse> {
    const url = `/api/service/team-criteria/${teamSlug}/${criteriaType}`;
    
    try {
      const response = await this.request<SingleCriteriaUpdateResponse>(
        url,
        {
          method: 'PUT',
          body: JSON.stringify(update)
        }
      );
      
      this.log('info', `Updated criteria ${criteriaType} for team ${teamSlug}:`, response);
      return response;
    } catch (error) {
      this.log('error', `Failed to update criteria for team ${teamSlug}:`, error);
      throw error;
    }
  }
  
  async getTeamEnvironmentData(): Promise<Record<string, string>> {
    // Deprecated: Use getTeamEnvironmentDataByNickname instead
    throw new Error('getTeamEnvironmentData is deprecated. Use getTeamEnvironmentDataByNickname with team nickname.');
  }
  
  async getTeamEnvironmentDataByNickname(teamNickname: string): Promise<Record<string, string>> {
    const searchParams = new URLSearchParams({
      team: teamNickname
    });
    
    const url = `/api/service/teams/environment?${searchParams.toString()}`;
    
    try {
      // The API returns direct JSON without success/data wrapper
      const response = await this.request<{
        teams: Array<{ 
          teamId: string;
          teamSlug: string;
          teamName: string;
          environment: Array<{key: string, value: string}>;
        }>;
        team?: { 
          teamId: string;
          teamSlug: string;
          teamName: string;
          environment: Array<{key: string, value: string}>;
        };
      }>(url);
      
      // Get the team data from the response
      const teamData = response.team || (response.teams && response.teams[0]);
      if (!teamData || !teamData.environment || teamData.environment.length === 0) {
        this.log('warn', `No environment data found for team ${teamNickname}`);
        return {};
      }
      
      // Convert array of environment data to a key-value map
      const envData: Record<string, string> = {};
      teamData.environment.forEach(item => {
        envData[item.key] = item.value;
      });
      
      this.log('debug', `Found ${teamData.environment.length} environment variables for team ${teamNickname}:`, Object.keys(envData));
      
      return envData;
    } catch (error) {
      this.log('error', `Failed to fetch environment data for team ${teamNickname}:`, error);
      throw error;
    }
  }
  
  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    
    // Auto-add Content-Type for requests with body
    const defaultHeaders: Record<string, string> = {
      'X-API-Key': this.config.apiKey,
      'User-Agent': 'HackLoad-JobService/1.0'
    };
    
    if (options.body) {
      defaultHeaders['Content-Type'] = 'application/json';
    }
    
    const requestOptions: RequestOptions = {
      method: 'GET',
      headers: {
        ...defaultHeaders,
        ...options.headers
      },
      timeout: options.timeout || this.config.timeout,
      ...options
    };
    
    // Detailed console logging for HTTP requests
    console.log(`[${new Date().toISOString()}] [HTTP_REQUEST] Making request:`, {
      method: requestOptions.method,
      url: url,
      baseUrl: this.config.baseUrl,
      path: path,
      hasBody: !!requestOptions.body,
      bodyLength: requestOptions.body ? requestOptions.body.length : 0,
      timeout: requestOptions.timeout,
      userAgent: requestOptions.headers?.['User-Agent'],
      hasApiKey: !!requestOptions.headers?.['X-API-Key']
    });
    
    // Debug log the exact request being made
    this.log('debug', `Request details: ${requestOptions.method} ${url}`);
    this.log('debug', `Headers:`, requestOptions.headers);
    if (requestOptions.body) {
      this.log('debug', `Body:`, requestOptions.body);
    }
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        this.log('debug', `Making request (attempt ${attempt + 1}/${this.config.retries + 1}): ${requestOptions.method} ${url}`);
        
        const response = await this.fetchWithTimeout(url, requestOptions);
        
        console.log(`[${new Date().toISOString()}] [HTTP_RESPONSE] Received response:`, {
          url: url,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
          attempt: attempt + 1
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log(`[${new Date().toISOString()}] [HTTP_ERROR] Response error:`, {
            url: url,
            status: response.status,
            statusText: response.statusText,
            errorBody: errorText
          });
          
          const error = await this.createHttpError(response, url);
          
          // Don't retry on 4xx errors (client errors)
          if (response.status >= 400 && response.status < 500) {
            throw error;
          }
          
          // Retry on 5xx errors (server errors) and network issues
          lastError = error;
          if (attempt < this.config.retries) {
            const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
            this.log('warn', `Request failed (attempt ${attempt + 1}), retrying in ${backoffMs}ms:`, error.message);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            continue;
          }
          throw error;
        }
        
        const data = await response.json() as T;
        
        console.log(`[${new Date().toISOString()}] [HTTP_SUCCESS] Request completed successfully:`, {
          url: url,
          status: response.status,
          responseDataKeys: Object.keys(data || {})
        });
        
        this.log('debug', `Request successful: ${requestOptions.method} ${url}`);
        return data;
        
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retries && this.isRetryableError(error)) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
          this.log('warn', `Request failed (attempt ${attempt + 1}), retrying in ${backoffMs}ms:`, error);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError || new Error('Unknown error occurred');
  }
  
  private async fetchWithTimeout(url: string, options: RequestOptions): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);
    
    try {
      const response = await fetch(url, {
        method: options.method,
        headers: options.headers,
        body: options.body,
        signal: controller.signal
      });
      
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
  
  private async createHttpError(response: Response, url: string): Promise<HttpError> {
    let responseBody: unknown = null;
    
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }
    } catch {
      // Ignore JSON parsing errors
    }
    
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as HttpError;
    error.status = response.status;
    error.statusText = response.statusText;
    error.url = url;
    error.response = responseBody;
    
    return error;
  }
  
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      // Network errors, timeout errors, etc.
      return error.name === 'AbortError' || 
             error.message.includes('network') || 
             error.message.includes('timeout');
    }
    
    return false;
  }
  
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: unknown[]): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [HubApiClient] ${message}`;
    
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