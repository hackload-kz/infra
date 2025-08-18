import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { Bell } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SpaceNotificationsPage() {
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
      team: true,
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

  const hasTeam = !!(participant?.team || participant?.ledTeam)

  return (
    <PersonalCabinetLayout user={user} hasTeam={hasTeam} isAdmin={userIsOrganizer}>
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-slate-800/50 rounded-full mx-auto mb-6 flex items-center justify-center">
          <Bell className="w-12 h-12 text-slate-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">
          <span className="text-amber-400">Уведомления</span>
        </h1>
        <p className="text-slate-400 mb-8 max-w-md mx-auto">
          Центр уведомлений находится в разработке. Здесь будут важные обновления и сообщения.
        </p>
      </div>
    </PersonalCabinetLayout>
  )
}