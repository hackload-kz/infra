/**
 * Budget Tracking Service for "BUDGET_TRACKING" Criteria
 * 
 * Evaluates team spending based on the MONEY_SPEND environment variable.
 * Uses dynamic scoring: minimum spending gets 30 points, maximum gets 5 points.
 * Score is calculated proportionally based on spending relative to min/max range.
 */

import { BaseJobService } from './base-service';
import { CriteriaType, CriteriaStatus, Team, MetricsData } from '../types/criteria';

export class BudgetTrackingService extends BaseJobService {
  readonly criteriaType: CriteriaType = CriteriaType.BUDGET_TRACKING;
  readonly serviceName: string = 'BudgetTrackingService';

  private allTeamSpending: Array<{ teamId: string; amount: number }> = [];

  async collectMetrics(team: Team): Promise<MetricsData> {
    this.log('info', `Collecting budget tracking metrics for team ${team.nickname}`);

    try {
      // Get team environment data
      const envData = await this.getTeamEnvironmentData(team);
      const moneySpendStr = envData['MONEY_SPEND'];

      if (!moneySpendStr) {
        this.log('warn', `No MONEY_SPEND found for team ${team.nickname}`);
        return {
          totalSpent: 0,
          currency: 'KZT',
          hasSpendingData: false
        };
      }

      // Convert string to decimal
      let totalSpent = 0;
      try {
        totalSpent = parseFloat(moneySpendStr.replace(/[^\d.-]/g, ''));
        if (isNaN(totalSpent)) {
          totalSpent = 0;
        }
      } catch (error) {
        this.log('warn', `Failed to parse MONEY_SPEND for team ${team.nickname}: ${moneySpendStr}`, error);
        totalSpent = 0;
      }

      // Store spending data for dynamic scoring calculation
      this.allTeamSpending.push({ teamId: team.id, amount: totalSpent });

      this.log('info', `Team ${team.nickname} spent ${totalSpent} KZT`);

      return {
        totalSpent,
        currency: 'KZT',
        hasSpendingData: true,
        rawValue: moneySpendStr
      };
    } catch (error) {
      this.log('error', `Failed to collect budget metrics for team ${team.nickname}:`, error);
      throw error;
    }
  }

  override evaluateStatus(metrics: MetricsData): CriteriaStatus {
    // Budget tracking is always PASSED (green) as per requirements
    const hasSpendingData = metrics['hasSpendingData'] as boolean;
    return hasSpendingData ? CriteriaStatus.PASSED : CriteriaStatus.NO_DATA;
  }

  override calculateScore(status: CriteriaStatus, metrics: MetricsData): number {
    if (status === CriteriaStatus.NO_DATA) {
      return 0;
    }

    const totalSpent = (metrics['totalSpent'] as number) || 0;

    // If no spending data from all teams collected yet, return base score
    if (this.allTeamSpending.length === 0) {
      return 15; // Mid-range score as default
    }

    // Find min and max spending amounts
    const allAmounts = this.allTeamSpending.map(t => t.amount);
    const minSpent = Math.min(...allAmounts);
    const maxSpent = Math.max(...allAmounts);

    // If all teams spent the same amount
    if (minSpent === maxSpent) {
      return 30; // Maximum score for everyone
    }

    // Dynamic scoring: min spending = 30 pts, max spending = 5 pts
    // Linear interpolation between min and max
    const range = maxSpent - minSpent;
    const position = (totalSpent - minSpent) / range;
    
    // Inverse scoring: less spending = higher score
    const score = 30 - (position * 25); // 30 to 5 points range
    
    return Math.round(Math.max(5, Math.min(30, score)));
  }

  /**
   * Reset spending data for next evaluation cycle
   */
  public resetSpendingData(): void {
    this.allTeamSpending = [];
  }

  /**
   * Get current spending statistics
   */
  public getSpendingStats(): { min: number; max: number; average: number; count: number } {
    if (this.allTeamSpending.length === 0) {
      return { min: 0, max: 0, average: 0, count: 0 };
    }

    const amounts = this.allTeamSpending.map(t => t.amount);
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    const average = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;

    return { min, max, average, count: amounts.length };
  }
}