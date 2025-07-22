import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { isOrganizer } from '@/lib/admin'
import { createK6Test } from '@/lib/k6'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an admin/organizer
    const isAdmin = await isOrganizer(session.user.email)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // Create K6 test with default configuration
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
    console.error('Load test error:', error)
    return NextResponse.json(
      { error: 'Failed to start load test' },
      { status: 500 }
    )
  }
}