import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { getCurrentHackathon, isHackathonActive } from '@/lib/hackathon'
import { LoadTestingPageClient } from '@/components/load-testing-page-client'

export const dynamic = 'force-dynamic'

export default async function LoadTestingPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  // Get current hackathon to check timing
  const hackathon = await getCurrentHackathon()
  if (!hackathon) {
    redirect('/space')
  }

  // Check access permissions
  const userIsOrganizer = isOrganizer(session.user.email)
  const hackathonIsActive = isHackathonActive(hackathon)
  
  // Get user participant data to determine team status
  const participant = await db.participant.findFirst({
    where: { 
      user: { email: session.user.email } 
    },
    include: {
      team: true,
      ledTeam: true
    }
  })

  // Allow access for organizers/admins anytime, and for team members
  if (!userIsOrganizer) {
    // Require participant with team membership
    if (!participant) {
      redirect('/login')
    }
    
    const hasTeam = !!(participant.team || participant.ledTeam)
    if (!hasTeam) {
      redirect('/space')
    }
  }

  // Create user object for layout
  const user = participant ? {
    name: participant.name,
    email: participant.email,
    image: session.user?.image || undefined
  } : {
    name: session.user.name || 'Организатор',
    email: session.user.email,
    image: session.user?.image || undefined
  }

  // Determine if user has team
  const hasTeam = !!(participant?.team || participant?.ledTeam)

  return (
    <LoadTestingPageClient 
      user={user} 
      hasTeam={hasTeam} 
      isAdmin={userIsOrganizer}
    />
  )
}