import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createK6Test } from '@/lib/k6'
import { z } from 'zod'

const loadTestSchema = z.object({
  url: z.string().url('Invalid URL format')
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const { url } = loadTestSchema.parse(body)

    // Create K6 test with fixed configuration
    const testId = await createK6Test({
      url,
      virtualUsers: 100,
      duration: '5m'
    })

    return NextResponse.json({ 
      success: true, 
      testId,
      message: 'Load test started successfully'
    })

  } catch (error) {
    console.error('Load test creation failed:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to start load test' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const testId = searchParams.get('testId')

    if (!testId) {
      return NextResponse.json({ error: 'Test ID required' }, { status: 400 })
    }

    // This would get test status - implementation depends on k6 operator API
    // For now, return a placeholder
    return NextResponse.json({
      testId,
      status: 'running',
      message: 'Test status check not implemented yet'
    })

  } catch (error) {
    console.error('Failed to get test status:', error)
    return NextResponse.json(
      { error: 'Failed to get test status' },
      { status: 500 }
    )
  }
}