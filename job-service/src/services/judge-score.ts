/**
 * Judge Score Service for "JUDGE_SCORE" Criteria
 * 
 * Evaluates team scores based on the JUDJE_SCORE environment variable.
 * Maximum score is 10 points. If variable is null or 0, criteria shows as blank/no data.
 */

import { BaseJobService } from './base-service';
import { CriteriaType, CriteriaStatus, Team, MetricsData } from '../types/criteria';

export class JudgeScoreService extends BaseJobService {
  readonly criteriaType: CriteriaType = CriteriaType.JUDGE_SCORE;
  readonly serviceName: string = 'JudgeScoreService';

  async collectMetrics(team: Team): Promise<MetricsData> {
    this.log('info', `Collecting judge score metrics for team ${team.nickname}`);

    try {
      // Get team environment data
      const envData = await this.getTeamEnvironmentData(team);
      const judgeScoreStr = envData['JUDJE_SCORE']; // Note: keeping original variable name as specified

      if (!judgeScoreStr) {
        this.log('info', `No JUDJE_SCORE found for team ${team.nickname}`);
        return {
          judgeScore: null,
          hasJudgeScore: false
        };
      }

      // Convert string to number
      let judgeScore = 0;
      try {
        judgeScore = parseFloat(judgeScoreStr.replace(/[^\d.-]/g, ''));
        if (isNaN(judgeScore)) {
          judgeScore = 0;
        }
      } catch (error) {
        this.log('warn', `Failed to parse JUDJE_SCORE for team ${team.nickname}: ${judgeScoreStr}`, error);
        judgeScore = 0;
      }

      // If score is 0 or null, return no data
      if (judgeScore === 0) {
        this.log('info', `Team ${team.nickname} has zero judge score, treating as no data`);
        return {
          judgeScore: null,
          hasJudgeScore: false
        };
      }

      // Clamp score to maximum of 10 points and round to nearest integer
      const clampedScore = Math.round(Math.min(Math.max(0, judgeScore), 10));

      this.log('info', `Team ${team.nickname} judge score: ${clampedScore}/10`);

      return {
        judgeScore: clampedScore,
        hasJudgeScore: true,
        rawValue: judgeScoreStr
      };
    } catch (error) {
      this.log('error', `Failed to collect judge score metrics for team ${team.nickname}:`, error);
      throw error;
    }
  }

  override evaluateStatus(metrics: MetricsData): CriteriaStatus {
    const hasJudgeScore = metrics['hasJudgeScore'] as boolean;
    
    if (!hasJudgeScore) {
      return CriteriaStatus.NO_DATA; // Shows as blank when no score
    }

    // Always show as passed when there's a score > 0
    return CriteriaStatus.PASSED;
  }

  override calculateScore(status: CriteriaStatus, metrics: MetricsData): number {
    if (status === CriteriaStatus.NO_DATA) {
      return 0;
    }

    const judgeScore = metrics['judgeScore'] as number;
    
    // Return the judge score directly (already clamped to 0-10 range)
    return judgeScore || 0;
  }
}