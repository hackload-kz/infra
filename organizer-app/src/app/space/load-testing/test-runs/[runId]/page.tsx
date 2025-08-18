import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{
    runId: string
  }>
}

export default async function ParticipantTestRunDetailPage({ params }: Props) {
  const { runId } = await params
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  // Check if user is an organizer
  const userIsOrganizer = isOrganizer(session.user.email)

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

  // If no participant found and user is not an organizer, redirect to login
  if (!participant && !userIsOrganizer) {
    redirect('/login')
  }

  // Create user object for layout
  const user = participant ? {
    name: participant.name,
    email: participant.email,
    image: session.user?.image || undefined
  } : {
    name: session.user.name || 'Участник',
    email: session.user.email || '',
    image: session.user?.image || undefined
  }

  // Determine if user has team
  const hasTeam = !!(participant?.team || participant?.ledTeam)

  return (
    <PersonalCabinetLayout user={user} hasTeam={hasTeam} isAdmin={userIsOrganizer}>
      <div className="text-center py-12">
        <h1 className="text-2xl font-semibold text-white mb-4">Test Run Details</h1>
        <p className="text-slate-400">Run ID: {runId}</p>
        <p className="text-slate-500 mt-2">This page is under development.</p>
      </div>
    </PersonalCabinetLayout>
  )
}