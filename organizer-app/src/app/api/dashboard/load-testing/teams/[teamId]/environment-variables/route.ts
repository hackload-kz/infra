import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status
    if (!(await isOrganizer(session.user.email))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { teamId } = await params
    const body = await request.json()
    const { environmentVars } = body

    // Validate environment variables
    if (environmentVars !== null && typeof environmentVars !== 'object') {
      return NextResponse.json({ error: 'Environment variables must be an object or null' }, { status: 400 })
    }

    if (environmentVars) {
      // Validate that all keys and values are strings
      for (const [key, value] of Object.entries(environmentVars)) {
        if (typeof key !== 'string' || typeof value !== 'string') {
          return NextResponse.json({ 
            error: `Environment variable "${key}" must have a string key and string value` 
          }, { status: 400 })
        }
        
        // Validate key format (should be valid environment variable name)
        if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
          return NextResponse.json({ 
            error: `Environment variable name "${key}" is invalid. Use only letters, numbers, and underscores, starting with a letter or underscore.` 
          }, { status: 400 })
        }
      }
    }

    // Update team environment variables
    const updatedTeam = await db.team.update({
      where: { id: teamId },
      data: {
        k6EnvironmentVars: environmentVars
      }
    })

    return NextResponse.json({
      id: updatedTeam.id,
      k6EnvironmentVars: updatedTeam.k6EnvironmentVars
    })

  } catch (error) {
    console.error('Error updating team environment variables:', error)
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status
    if (!(await isOrganizer(session.user.email))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { teamId } = await params

    // Get team environment variables
    const team = await db.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        nickname: true,
        k6EnvironmentVars: true
      }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: team.id,
      name: team.name,
      nickname: team.nickname,
      k6EnvironmentVars: team.k6EnvironmentVars
    })

  } catch (error) {
    console.error('Error getting team environment variables:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}