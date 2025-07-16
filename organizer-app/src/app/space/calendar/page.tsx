import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { CalendarView } from '@/components/calendar-view'

export const dynamic = 'force-dynamic'

export default async function SpaceCalendarPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  // Check if user is an organizer
  const userIsOrganizer = isOrganizer(session.user.email)

  const participant = await db.participant.findFirst({
    where: { 
      user: { email: session.user.email } 
    },
    include: {
      user: true,
      team: {
        select: {
          id: true,
          name: true,
          nickname: true
        }
      },
      ledTeam: true,
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
    name: session.user.name || 'Organizer',
    email: session.user.email || '',
    image: session.user?.image || undefined
  }

  return (
    <PersonalCabinetLayout user={user}>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          <span className="text-amber-400">Календарь</span>
        </h1>
        <div className="w-16 h-1 bg-amber-400 rounded-full"></div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/30">
        <div className="p-6">
          <CalendarView 
            teamId={participant?.team?.id}
            canDismiss={true}
            className="[&_h2]:text-white [&_h3]:text-white [&_p]:text-slate-300 [&_.text-gray-500]:text-slate-400 [&_.text-gray-600]:text-slate-300 [&_.text-gray-700]:text-slate-200 [&_.text-gray-900]:text-white [&_.bg-gray-100]:bg-slate-700/30 [&_.bg-gray-50]:bg-slate-700/20 [&_.border-gray-300]:border-slate-600/30"
          />
        </div>
      </div>
    </PersonalCabinetLayout>
  )
}