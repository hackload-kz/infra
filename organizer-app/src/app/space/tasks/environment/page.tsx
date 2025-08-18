import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import { redirect } from 'next/navigation'
import { TeamEnvironmentView } from '@/components/team-environment-view'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'

export const dynamic = 'force-dynamic'

export default async function EnvironmentPage() {
  const session = await auth()
  
  if (!session?.user?.email) {
    redirect('/login')
  }

  // Check if user is an organizer
  const userIsOrganizer = isOrganizer(session.user.email)

  // Get user and participant
  const participant = await db.participant.findFirst({
    where: { 
      user: { email: session.user.email } 
    },
    include: {
      user: true,
      team: {
        include: {
          environmentData: true
        }
      },
      ledTeam: {
        include: {
          environmentData: true
        }
      },
    },
  })

  // If no participant found and user is not an organizer, redirect to login
  if (!participant && !userIsOrganizer) {
    redirect('/login')
  }

  // For organizers without participant data, create a fallback user object
  const user = participant ? {
    name: participant.name,
    email: participant.email,
    image: session.user?.image || undefined
  } : {
    name: session.user.name || 'Организатор',
    email: session.user.email,
    image: session.user?.image || undefined
  }

  const hasTeam = !!(participant?.team || participant?.ledTeam)

  return (
    <PersonalCabinetLayout user={user} hasTeam={hasTeam} isAdmin={userIsOrganizer}>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Данные <span className="text-amber-400">окружения</span>
        </h1>
        <div className="w-16 h-1 bg-amber-400 rounded-full"></div>
        <p className="text-slate-400 mt-4">
          Данные для разработки и развертывания вашего проекта
        </p>
      </div>

      <TeamEnvironmentView
        participant={participant!}
        isOrganizer={userIsOrganizer}
      />
    </PersonalCabinetLayout>
  )
}