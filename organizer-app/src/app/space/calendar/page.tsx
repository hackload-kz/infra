import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { Calendar } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SpaceCalendarPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

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

  if (!participant) {
    redirect('/login')
  }

  const user = {
    name: participant.name,
    email: participant.email,
    image: session.user?.image || undefined
  }

  // Mock calendar events
  const events = [
    {
      id: 1,
      title: 'HackLoad 2025 - Регистрация',
      date: '2025-02-01',
      time: '09:00',
      type: 'deadline',
      description: 'Завершение регистрации участников'
    },
    {
      id: 2,
      title: 'Командная встреча',
      date: '2025-02-15',
      time: '18:00',
      type: 'meeting',
      description: 'Обсуждение проекта и распределение задач'
    },
    {
      id: 3,
      title: 'HackLoad 2025 - Начало',
      date: '2025-03-15',
      time: '10:00',
      type: 'event',
      description: 'Официальное открытие хакатона'
    }
  ]


  return (
    <PersonalCabinetLayout user={user}>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          <span className="text-amber-400">Календарь</span>
        </h1>
        <div className="w-16 h-1 bg-amber-400 rounded-full"></div>
      </div>

      <div className="text-center py-16">
        <div className="w-24 h-24 bg-slate-800/50 rounded-full mx-auto mb-6 flex items-center justify-center">
          <Calendar className="w-12 h-12 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">
          Календарь событий
        </h2>
        <p className="text-slate-400 mb-8 max-w-md mx-auto">
          Раздел календаря находится в разработке. Здесь будут отображаться важные даты и события хакатона.
        </p>
        
        {/* Upcoming Events Preview */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold text-white mb-4">Ближайшие события</h3>
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="bg-slate-800/50 backdrop-blur-sm p-4 rounded-lg border border-slate-700/30 text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">{event.title}</h4>
                    <p className="text-slate-400 text-sm">{event.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-400 text-sm font-medium">
                      {new Date(event.date).toLocaleDateString('ru-RU')}
                    </div>
                    <div className="text-slate-400 text-xs">{event.time}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PersonalCabinetLayout>
  )
}