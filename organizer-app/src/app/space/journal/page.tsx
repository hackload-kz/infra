import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SpaceJournalPage() {
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

  // System events and actions based on user activity
  const systemEvents = participant ? [
    {
      id: 1,
      action: 'Регистрация аккаунта',
      timestamp: participant.createdAt,
      type: 'system',
      description: 'Пользователь успешно зарегистрировался в системе через OAuth',
      icon: '👤'
    },
    {
      id: 2,
      action: 'Создание профиля участника',
      timestamp: participant.createdAt,
      type: 'profile',
      description: 'Заполнена информация профиля участника хакатона',
      icon: '📝'
    },
    ...(participant.team ? [{
      id: 3,
      action: participant.ledTeam ? 'Создание команды' : 'Присоединение к команде',
      timestamp: participant.team.createdAt,
      type: 'team',
      description: participant.ledTeam 
        ? `Создана команда "${participant.team.name}" с никнеймом @${participant.team.nickname}`
        : `Присоединение к команде "${participant.team.name}"`,
      icon: participant.ledTeam ? '👥' : '🤝'
    }] : []),
    {
      id: 4,
      action: 'Последнее обновление профиля',
      timestamp: participant.updatedAt,
      type: 'profile',
      description: 'Внесены изменения в профиль участника',
      icon: '✏️'
    }
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) : [
    {
      id: 1,
      action: 'Доступ к системе организатора',
      timestamp: new Date(),
      type: 'system',
      description: 'Организатор имеет доступ к административной панели',
      icon: '🛠️'
    }
  ]

  return (
    <PersonalCabinetLayout user={user}>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          <span className="text-amber-400">Журнал</span> событий
        </h1>
        <div className="w-16 h-1 bg-amber-400 rounded-full"></div>
      </div>

      {/* System Events Timeline */}
      <div className="space-y-4">
        {systemEvents.map((event) => (
          <div key={event.id} className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-slate-700/50 rounded-full flex items-center justify-center text-2xl">
                {event.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white">{event.action}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    event.type === 'system' 
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : event.type === 'profile'
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {event.type === 'system' ? 'Система' : 
                     event.type === 'profile' ? 'Профиль' : 'Команда'}
                  </span>
                </div>
                <p className="text-slate-400 mb-3">{event.description}</p>
                <div className="flex items-center space-x-2 text-sm text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span>
                    {event.timestamp.toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Summary */}
      <div className="mt-12 bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
        <h3 className="text-xl font-semibold text-white mb-6">Сводка активности</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-700/30 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-amber-400 mb-1">{systemEvents.length}</div>
            <div className="text-sm text-slate-400">Всего действий</div>
          </div>
          <div className="bg-slate-700/30 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {systemEvents.filter(e => e.type === 'profile').length}
            </div>
            <div className="text-sm text-slate-400">Обновления профиля</div>
          </div>
          <div className="bg-slate-700/30 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {systemEvents.filter(e => e.type === 'team').length}
            </div>
            <div className="text-sm text-slate-400">Командные действия</div>
          </div>
        </div>
      </div>
    </PersonalCabinetLayout>
  )
}