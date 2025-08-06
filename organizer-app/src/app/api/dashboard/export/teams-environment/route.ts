import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { logger, LogAction } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is organizer
    const isOrganizerUser = isOrganizer(session.user.email)
    if (!isOrganizerUser) {
      return NextResponse.json({ error: 'Organizer access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    const includeValues = searchParams.get('includeValues') === 'true'
    const teamIds = searchParams.get('teamIds')?.split(',').filter(Boolean) || []
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || []

    await logger.logApiCall('GET', '/api/dashboard/export/teams-environment', session.user.email)

    // Build query filters
    const whereClause: Record<string, { in: string[] }> = {}
    if (teamIds.length > 0) {
      whereClause.teamId = { in: teamIds }
    }
    if (categories.length > 0) {
      whereClause.category = { in: categories }
    }

    // Fetch teams with environment data
    const teams = await db.team.findMany({
      where: teamIds.length > 0 ? { id: { in: teamIds } } : {},
      include: {
        environmentData: {
          where: categories.length > 0 ? { category: { in: categories } } : {},
          orderBy: [
            { category: 'asc' },
            { key: 'asc' }
          ]
        },
        leader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        hackathon: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Prepare export data
    const exportData = teams.map(team => ({
      teamId: team.id,
      teamName: team.name,
      teamNickname: team.nickname,
      teamStatus: team.status,
      teamLevel: team.level,
      hackathon: team.hackathon?.name,
      leader: team.leader ? {
        name: team.leader.name,
        email: team.leader.email
      } : null,
      memberCount: team.members.length,
      members: team.members.map(member => ({
        name: member.name,
        email: member.email
      })),
      environmentVariables: team.environmentData.map(envVar => ({
        key: envVar.key,
        value: includeValues ? envVar.value : (envVar.isSecure ? '[SECURE]' : '[HIDDEN]'),
        description: envVar.description,
        category: envVar.category,
        isSecure: envVar.isSecure,
        isEditable: envVar.isEditable,
        createdAt: envVar.createdAt,
        updatedAt: envVar.updatedAt
      }))
    }))

    // Log export activity
    await logger.info(LogAction.READ, 'TeamEnvironmentExport', 
      `Teams environment data exported in ${format} format`, {
        metadata: { 
          exportedTeamsCount: teams.length,
          totalEnvVars: teams.reduce((sum, team) => sum + team.environmentData.length, 0),
          includeValues,
          format,
          filters: { teamIds, categories },
          userEmail: session.user.email
        }
      })

    if (format === 'csv') {
      // Flatten data for CSV export  
      const csvData: Array<Record<string, string | number | boolean | null>> = []
      
      exportData.forEach(team => {
        if (team.environmentVariables.length === 0) {
          // Include teams without environment variables
          csvData.push({
            teamId: team.teamId,
            teamName: team.teamName,
            teamNickname: team.teamNickname,
            teamStatus: team.teamStatus,
            teamLevel: team.teamLevel || '',
            hackathon: team.hackathon,
            leaderName: team.leader?.name || '',
            leaderEmail: team.leader?.email || '',
            memberCount: team.memberCount,
            envKey: '',
            envValue: '',
            envDescription: '',
            envCategory: '',
            envIsSecure: '',
            envIsEditable: '',
            envCreatedAt: '',
            envUpdatedAt: ''
          })
        } else {
          team.environmentVariables.forEach(envVar => {
            csvData.push({
              teamId: team.teamId,
              teamName: team.teamName,
              teamNickname: team.teamNickname,
              teamStatus: team.teamStatus,
              teamLevel: team.teamLevel || '',
              hackathon: team.hackathon,
              leaderName: team.leader?.name || '',
              leaderEmail: team.leader?.email || '',
              memberCount: team.memberCount,
              envKey: envVar.key,
              envValue: envVar.value,
              envDescription: envVar.description || '',
              envCategory: envVar.category || '',
              envIsSecure: envVar.isSecure,
              envIsEditable: envVar.isEditable,
              envCreatedAt: envVar.createdAt.toISOString(),
              envUpdatedAt: envVar.updatedAt.toISOString()
            })
          })
        }
      })

      // Convert to CSV
      const headers = Object.keys(csvData[0] || {})
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => {
            const value = row[header]
            const stringValue = value === null || value === undefined ? '' : String(value)
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
              ? `"${stringValue.replace(/"/g, '""')}"`
              : stringValue
          }).join(',')
        )
      ].join('\n')

      await logger.logApiSuccess('GET', '/api/dashboard/export/teams-environment', session.user.email)

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="teams-environment-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    await logger.logApiSuccess('GET', '/api/dashboard/export/teams-environment', session.user.email)

    return NextResponse.json({
      exportDate: new Date().toISOString(),
      totalTeams: exportData.length,
      totalEnvironmentVariables: exportData.reduce((sum, team) => sum + team.environmentVariables.length, 0),
      filters: { teamIds, categories, includeValues },
      data: exportData
    })

  } catch (error) {
    const errorSession = await auth()
    await logger.logApiError('GET', '/api/dashboard/export/teams-environment', 
      error instanceof Error ? error : new Error('Unknown error'), 
      errorSession?.user?.email || undefined)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}