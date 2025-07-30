import { auth } from '@/auth'
import { isOrganizer } from '@/lib/admin'
import { NextResponse } from 'next/server'

// GET /api/auth/check-admin - Проверить права администратора
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json({ isAdmin: false })
    }

    const isAdmin = isOrganizer(session.user.email)
    
    return NextResponse.json({ 
      isAdmin,
      email: session.user.email 
    })
  } catch (error) {
    console.error('Error checking admin status:', error)
    return NextResponse.json({ isAdmin: false })
  }
}