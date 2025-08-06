import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { CustomBannerType } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await isOrganizer(session.user.email)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const banner = await db.customBanner.findUnique({
      where: { id: (await params).id }
    })

    if (!banner) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 })
    }

    return NextResponse.json(banner)
  } catch (error) {
    console.error('Error fetching custom banner:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { title, description, type, displayStart, displayEnd, allowDismiss, actionText, actionUrl, isActive } = body

    if (!title || !description || !type || !displayStart || !displayEnd) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!Object.values(CustomBannerType).includes(type)) {
      return NextResponse.json({ error: 'Invalid banner type' }, { status: 400 })
    }

    const banner = await db.customBanner.update({
      where: { id: (await params).id },
      data: {
        title,
        description,
        type,
        displayStart: new Date(displayStart),
        displayEnd: new Date(displayEnd),
        allowDismiss: allowDismiss ?? true,
        actionText,
        actionUrl,
        isActive: isActive ?? true
      }
    })

    return NextResponse.json(banner)
  } catch (error) {
    console.error('Error updating custom banner:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await isOrganizer(session.user.email)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.customBanner.delete({
      where: { id: (await params).id }
    })

    return NextResponse.json({ message: 'Banner deleted successfully' })
  } catch (error) {
    console.error('Error deleting custom banner:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}