/**
 * URL configuration utility for generating consistent URLs across the application
 */

export interface URLConfig {
  baseUrl: string;
  domain: string;
}

class URLBuilder {
  private config: URLConfig;

  constructor() {
    this.config = {
      baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      domain: process.env.APP_DOMAIN || 'localhost:3000'
    };
  }

  /**
   * Get the base URL for the application
   */
  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * Get the domain for the application
   */
  getDomain(): string {
    return this.config.domain;
  }

  /**
   * Build a full URL from a relative path
   */
  buildUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.config.baseUrl}${cleanPath}`;
  }

  /**
   * Build URLs for specific sections
   */
  space = {
    team: () => this.buildUrl('/space/team'),
    teams: (id?: string) => id ? this.buildUrl(`/space/teams/${id}`) : this.buildUrl('/space/teams'),
    participants: (id?: string) => id ? this.buildUrl(`/space/participants/${id}`) : this.buildUrl('/space/participants'),
    messages: (id?: string) => id ? this.buildUrl(`/space/messages/${id}`) : this.buildUrl('/space/messages'),
  };

  /**
   * Build URLs for public sections
   */
  public = {
    profile: (id?: string) => id ? this.buildUrl(`/profile/${id}`) : this.buildUrl('/profile'),
    teams: (id?: string) => id ? this.buildUrl(`/teams/${id}`) : this.buildUrl('/teams'),
    participants: (id?: string) => id ? this.buildUrl(`/participants/${id}`) : this.buildUrl('/participants'),
  };

  /**
   * Build URLs for dashboard sections
   */
  dashboard = {
    teams: (nickname?: string) => nickname ? this.buildUrl(`/dashboard/teams/${nickname}`) : this.buildUrl('/dashboard/teams'),
    participants: (id?: string) => id ? this.buildUrl(`/dashboard/participants/${id}`) : this.buildUrl('/dashboard/participants'),
    messages: () => this.buildUrl('/dashboard/messages'),
  };

  /**
   * Build URLs for API endpoints
   */
  api = {
    teams: (id?: string) => id ? this.buildUrl(`/api/teams/${id}`) : this.buildUrl('/api/teams'),
    participants: (id?: string) => id ? this.buildUrl(`/api/participants/${id}`) : this.buildUrl('/api/participants'),
    messages: (id?: string) => id ? this.buildUrl(`/api/messages/${id}`) : this.buildUrl('/api/messages'),
  };
}

export const urlBuilder = new URLBuilder();

// Convenience functions for common URL patterns
export const buildFullUrl = (path: string): string => urlBuilder.buildUrl(path);
export const getBaseUrl = (): string => urlBuilder.getBaseUrl();
export const getDomain = (): string => urlBuilder.getDomain();