import { db } from '@/lib/db'
import { CriteriaType } from '@prisma/client'

export interface TeamCriteriaData {
  id: string
  criteriaType: string
  status: 'PASSED' | 'FAILED' | 'NO_DATA'
  score?: number
  lastUpdated: Date
  metrics?: {
    // Common fields
    p95?: number
    successRate?: number
    
    // CODE_REPO specific
    commitsCount?: number
    lastCommitTime?: string
    repositoryUrl?: string
    hasRecentActivity?: boolean
    
    // DEPLOYED_SOLUTION specific
    endpointUrl?: string
    responseTime?: number
    statusCode?: number
    isAccessible?: boolean
    
    // Performance test specific
    testDuration?: number
    userLoad?: number
    
    // TICKET_BOOKING/CANCELLATION specific
    bookedTickets?: number
    cancelledTickets?: number
    
    // BUDGET_TRACKING specific
    totalSpent?: number
    currency?: string
    breakdown?: Record<string, number>
    
    // Confirmation metadata
    confirmationUrl?: string
    confirmationTitle?: string
    confirmationDescription?: string
    
    [key: string]: unknown
  }
}

export interface TeamResultsData {
  id: string
  name: string
  nickname: string
  status: 'APPROVED' | 'IN_REVIEW' | 'FINISHED' | 'NEW' | 'INCOMPLETED' | 'CANCELED' | 'REJECTED'
  criteria: TeamCriteriaData[]
  lastCriteriaUpdate?: Date
  totalScore: number
  passedCriteria: number
}

export async function getTeamResults(hackathonId?: string): Promise<TeamResultsData[]> {
  try {
    // Get current hackathon if not provided
    let targetHackathonId = hackathonId
    if (!targetHackathonId) {
      const currentHackathon = await db.hackathon.findFirst({
        where: { slug: 'hackload-2025' }
      })
      if (!currentHackathon) {
        return []
      }
      targetHackathonId = currentHackathon.id
    }

    // Fetch approved teams with their criteria
    const teams = await db.team.findMany({
      where: {
        hackathonId: targetHackathonId,
        status: 'APPROVED'
      },
      include: {
        criteria: {
          orderBy: {
            lastUpdated: 'desc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Transform the data
    const teamResults: TeamResultsData[] = teams.map(team => {
      const criteria: TeamCriteriaData[] = []
      
      // Ensure we have entries for all criteria types
      Object.values(CriteriaType).forEach(criteriaType => {
        const existingCriteria = team.criteria.find(c => c.criteriaType === criteriaType)
        
        if (existingCriteria) {
          criteria.push({
            id: existingCriteria.id,
            criteriaType: existingCriteria.criteriaType,
            status: existingCriteria.status as 'PASSED' | 'FAILED' | 'NO_DATA',
            score: existingCriteria.score || undefined,
            lastUpdated: existingCriteria.lastUpdated,
            metrics: existingCriteria.metrics as Record<string, unknown> || undefined
          })
        } else {
          // Create placeholder for missing criteria
          criteria.push({
            id: `${team.id}-${criteriaType}`,
            criteriaType,
            status: 'NO_DATA',
            lastUpdated: new Date(0) // epoch time for sorting
          })
        }
      })

      // Calculate statistics
      const passedCriteria = criteria.filter(c => c.status === 'PASSED').length
      const totalScore = criteria.reduce((sum, c) => sum + (c.score || 0), 0)
      
      // Find the most recent criteria update
      const lastCriteriaUpdate = criteria
        .filter(c => c.status !== 'NO_DATA')
        .map(c => c.lastUpdated)
        .sort((a, b) => b.getTime() - a.getTime())[0]

      return {
        id: team.id,
        name: team.name,
        nickname: team.nickname,
        status: team.status as TeamResultsData['status'],
        criteria,
        lastCriteriaUpdate,
        totalScore,
        passedCriteria
      }
    })

    return teamResults
  } catch (error) {
    console.error('Error fetching team results:', error)
    return []
  }
}

export async function getTeamResultsCount(hackathonId?: string): Promise<{
  total: number
  withData: number
  averageScore: number
  averagePassed: number
}> {
  try {
    const teamResults = await getTeamResults(hackathonId)
    
    const teamsWithData = teamResults.filter(team => 
      team.criteria.some(c => c.status !== 'NO_DATA')
    )
    
    const totalScore = teamResults.reduce((sum, team) => sum + team.totalScore, 0)
    const totalPassed = teamResults.reduce((sum, team) => sum + team.passedCriteria, 0)
    
    return {
      total: teamResults.length,
      withData: teamsWithData.length,
      averageScore: teamResults.length > 0 ? totalScore / teamResults.length : 0,
      averagePassed: teamResults.length > 0 ? totalPassed / teamResults.length : 0
    }
  } catch (error) {
    console.error('Error fetching team results count:', error)
    return {
      total: 0,
      withData: 0,
      averageScore: 0,
      averagePassed: 0
    }
  }
}