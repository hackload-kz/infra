import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { logger, LogAction } from '@/lib/logger'
import { getParticipantsFromLargeTeams, getParticipantsFromLargeTeamsRaw } from '@/lib/query-participants-large-teams'

type ParticipantExportData = {
  id: string
  name: string
  email: string
  city: string | null
  company: string | null
  experienceLevel: string | null
  technologies: string | null
  programmingLanguages: string[]
  databases: string[]
  githubUrl: string | null
  linkedinUrl: string | null
  telegram: string | null
  createdAt: Date
  team?: {
    name: string
    _count?: {
      members: number
    }
  } | null
}

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
    const useRawQuery = searchParams.get('raw') === 'true'
    const exportType = searchParams.get('type') || 'large-teams' // 'large-teams' or 'all'

    await logger.logApiCall('GET', '/api/dashboard/export/participants', session.user.email)

    // Get active hackathon
    const hackathon = await db.hackathon.findFirst({
      where: { isActive: true },
      select: { id: true, name: true }
    })

    if (!hackathon) {
      return NextResponse.json({ error: 'No active hackathon found' }, { status: 404 })
    }

    let participants: ParticipantExportData[]

    if (exportType === 'all') {
      // Export all participants
      const allParticipants = await db.participant.findMany({
        include: {
          team: {
            select: {
              name: true,
              _count: {
                select: {
                  members: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      
      participants = allParticipants as unknown as ParticipantExportData[]
    } else {
      // Export participants from large teams (3+ members)
      participants = useRawQuery 
        ? await getParticipantsFromLargeTeamsRaw(hackathon.id) as unknown as ParticipantExportData[]
        : await getParticipantsFromLargeTeams(hackathon.id) as unknown as ParticipantExportData[]
    }

    // Log export activity
    await logger.info(LogAction.READ, 'ParticipantsExport', 
      `Participants data exported in ${format} format`, {
        metadata: { 
          exportedParticipantsCount: participants.length,
          exportType,
          useRawQuery,
          format,
          hackathonId: hackathon.id,
          userEmail: session.user.email
        }
      })

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = participants.map((p: ParticipantExportData) => ({
        Name: p.name,
        Email: p.email,
        Location: p.city || 'Not specified',
        Company: p.company || 'Not specified',
        TeamName: 'teamName' in p ? (p as unknown as {teamName: string}).teamName : (p.team?.name || 'No team'),
        TeamMemberCount: 'teamMemberCount' in p ? (p as unknown as {teamMemberCount: number}).teamMemberCount : (p.team?._count?.members || 0),
        ExperienceLevel: p.experienceLevel || 'Not specified',
        Technologies: p.technologies || 'Not specified',
        ProgrammingLanguages: Array.isArray(p.programmingLanguages) 
          ? p.programmingLanguages.join(', ') 
          : 'None',
        Databases: Array.isArray(p.databases) 
          ? p.databases.join(', ') 
          : 'None',
        GitHub: p.githubUrl || 'Not provided',
        LinkedIn: p.linkedinUrl || 'Not provided',
        Telegram: p.telegram || 'Not provided',
        CreatedAt: new Date(p.createdAt).toISOString()
      }))

      // Convert to CSV string
      if (csvData.length === 0) {
        await logger.logApiSuccess('GET', '/api/dashboard/export/participants', session.user.email)
        return new NextResponse('No data found', {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="participants-${exportType}-${hackathon.name.replace(/\s+/g, '-')}.csv"`
          }
        })
      }

      const headers = Object.keys(csvData[0]).join(',')
      const rows = csvData.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' && value.includes(',') 
            ? `"${value.replace(/"/g, '""')}"` 
            : value
        ).join(',')
      )
      const csvContent = [headers, ...rows].join('\n')

      await logger.logApiSuccess('GET', '/api/dashboard/export/participants', session.user.email)

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="participants-${exportType}-${hackathon.name.replace(/\s+/g, '-')}.csv"`
        }
      })
    }

    await logger.logApiSuccess('GET', '/api/dashboard/export/participants', session.user.email)

    // Return JSON format
    return NextResponse.json({
      exportDate: new Date().toISOString(),
      totalParticipants: participants.length,
      exportType,
      hackathon: {
        id: hackathon.id,
        name: hackathon.name
      },
      filters: { exportType, useRawQuery },
      data: participants
    })

  } catch (error) {
    const errorSession = await auth()
    await logger.logApiError('GET', '/api/dashboard/export/participants', 
      error instanceof Error ? error : new Error('Unknown error'), 
      errorSession?.user?.email || undefined)
    
    console.error('Export participants error:', error)
    return NextResponse.json(
      { error: 'Failed to export participants data' }, 
      { status: 500 }
    )
  }
}