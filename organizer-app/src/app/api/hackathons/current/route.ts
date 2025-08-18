import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const hackathon = await db.hackathon.findFirst({
      where: { slug: 'hackload-2025' },
      select: {
        id: true,
        name: true,
        slug: true,
        startDate: true,
        endDate: true,
        isActive: true
      }
    })

    if (!hackathon) {
      return NextResponse.json({ error: 'No active hackathon found' }, { status: 404 })
    }

    return NextResponse.json(hackathon)
  } catch (error) {
    console.error('Error fetching current hackathon:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}