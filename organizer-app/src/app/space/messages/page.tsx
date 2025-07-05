import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { MessageSquare } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SpaceMessagesPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const participant = await db.participant.findFirst({
    where: { 
      user: { email: session.user?.email } 
    },
    include: {
      user: true,
      team: true,
      ledTeam: true,
    },
  })

  if (!participant) {
    redirect('/login')
  }

  const user = {
    name: participant.name,
    email: participant.email,
    image: session.user?.image
  }

  return (
    <PersonalCabinetLayout user={user}>
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-slate-800/50 rounded-full mx-auto mb-6 flex items-center justify-center">
          <MessageSquare className="w-12 h-12 text-slate-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">
          <span className="text-amber-400">Сообщения</span>
        </h1>
        <p className="text-slate-400 mb-8 max-w-md mx-auto">
          Система сообщений находится в разработке. Здесь будет чат с командой и организаторами.
        </p>
      </div>
    </PersonalCabinetLayout>
  )
}