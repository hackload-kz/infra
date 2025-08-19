export interface GrafanaMetric {
    metric: Record<string, string>;
    value: [number, string];
    values?: [number, string][];
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
    peakRps: number;
    testPassed: boolean;
    score: number;
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
export declare class GrafanaClient {
    private readonly dashboardBaseUrl;
    private readonly prometheusUrl;
    private readonly logger;
    private readonly timeout;
    constructor();
    isConfigured(): boolean;
    prometheusRangeQuery(query: string): Promise<GrafanaResponse>;
    prometheusQuery(query: string, time?: Date): Promise<GrafanaResponse>;
    generateGrafanaDashboardUrl(testId: string): string;
    evaluateGetEventsTask(teamSlug: string, teamId: number): Promise<GetEventsTestResult[]>;
    evaluateArchiveTask(teamSlug: string, teamId: number): Promise<GetEventsTestResult[]>;
    evaluateLoadTestingTask(teamSlug: string, teamId: number, taskType: 'events' | 'archive'): Promise<GetEventsTestResult[]>;
    getLatestTestResult(testIdPattern: string, _teamId: number, _taskType: "events" | "archive" | undefined, userSize: number): Promise<GetEventsTestResult | null>;
    generateTeamSummary(teamId: number, teamSlug: string, teamName: string): Promise<TeamTestSummary>;
    generateArchiveTeamSummary(teamId: number, teamSlug: string, teamName: string): Promise<TeamTestSummary>;
    private extractTestIdFromRange;
    private extractTestNumber;
    private extractMaxValue;
    private makeRequest;
}
//# sourceMappingURL=grafana-client.d.ts.map