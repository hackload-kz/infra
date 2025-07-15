import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { CustomBannerType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await isOrganizer(session.user.email)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const hackathonId = searchParams.get('hackathonId')
    const showActiveOnly = searchParams.get('activeOnly') === 'true'

    if (!hackathonId) {
      return NextResponse.json({ error: 'Hackathon ID is required' }, { status: 400 })
    }

    const now = new Date()
    const whereClause: Record<string, unknown> = { hackathonId }

    if (showActiveOnly) {
      whereClause.isActive = true
      whereClause.displayStart = { lte: now }
      whereClause.displayEnd = { gte: now }
    }

    const banners = await db.customBanner.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(banners)
  } catch (error) {
    console.error('Error fetching custom banners:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await isOrganizer(session.user.email)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, type, displayStart, displayEnd, allowDismiss, actionText, actionUrl, hackathonId } = body

    if (!title || !description || !type || !displayStart || !displayEnd || !hackathonId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!Object.values(CustomBannerType).includes(type)) {
      return NextResponse.json({ error: 'Invalid banner type' }, { status: 400 })
    }

    const banner = await db.customBanner.create({
      data: {
        title,
        description,
        type,
        displayStart: new Date(displayStart),
        displayEnd: new Date(displayEnd),
        allowDismiss: allowDismiss ?? true,
        actionText,
        actionUrl,
        hackathonId
      }
    })

    return NextResponse.json(banner, { status: 201 })
  } catch (error) {
    console.error('Error creating custom banner:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}