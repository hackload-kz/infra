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
  
  // Allow access for organizers/admins anytime, or for teams during active hackathon
  if (!userIsOrganizer && !hackathonIsActive) {
    redirect('/space')
  }

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

  // For non-organizers, require team membership if no participant found
  if (!participant && !userIsOrganizer) {
    redirect('/login')
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