import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { 
  Trophy,
  Calendar,
  Users,
  Check,
  Edit,
  Plus,
  Settings,
  Zap
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PersonalCabinetPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  // Get user participant data
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
    image: session.user?.image
  }

  return (
    <PersonalCabinetLayout user={user}>
      {/* Page Title */}
      <div className="text-center mb-12">
        <h1 className="text-4xl lg:text-5xl font-extrabold mb-4">
          Личный <span className="text-amber-400">кабинет</span>
        </h1>
        <div className="w-24 h-1 bg-amber-400 mx-auto rounded-full"></div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="xl:col-span-1">
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <div className="w-12 h-12 text-slate-900 font-bold text-2xl">
                  {participant.name.charAt(0).toUpperCase()}
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">{participant.name}</h2>
              <p className="text-slate-400">{participant.experienceLevel || 'Участник'}</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 text-amber-400">📧</div>
                <span className="text-slate-300 truncate">{participant.email}</span>
              </div>
              {participant.company && (
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 text-amber-400">🏢</div>
                  <span className="text-slate-300">{participant.company}</span>
                </div>
              )}
              {participant.city && (
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 text-amber-400">📍</div>
                  <span className="text-slate-300">{participant.city}</span>
                </div>
              )}
            </div>
            <button className="w-full mt-6 bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-3 rounded-lg font-medium transition-colors duration-150">
              Редактировать профиль
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="xl:col-span-2">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Команда</p>
                  <p className="text-2xl font-bold text-white">
                    {participant.team ? participant.team.name : 'Нет команды'}
                  </p>
                </div>
                <div className="bg-amber-400/20 p-3 rounded-lg">
                  <Users className="w-6 h-6 text-amber-400" />
                </div>
              </div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Роль</p>
                  <p className="text-2xl font-bold text-white">
                    {participant.ledTeam ? 'Лидер' : 'Участник'}
                  </p>
                </div>
                <div className="bg-amber-400/20 p-3 rounded-lg">
                  <Trophy className="w-6 h-6 text-amber-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30 mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">Последняя активность</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-slate-700/30 rounded-lg">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">Регистрация на HackLoad 2025</p>
                  <p className="text-slate-400 text-sm">
                    {participant.createdAt.toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>
              {participant.team && (
                <div className="flex items-center space-x-4 p-4 bg-slate-700/30 rounded-lg">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">Присоединение к команде &quot;{participant.team.name}&quot;</p>
                    <p className="text-slate-400 text-sm">
                      {participant.team.createdAt.toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-4 p-4 bg-slate-700/30 rounded-lg">
                <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <Edit className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">Обновление профиля</p>
                  <p className="text-slate-400 text-sm">
                    {participant.updatedAt.toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
            <h3 className="text-xl font-semibold text-white mb-4">Быстрые действия</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="flex items-center space-x-3 p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-all duration-150">
                <Plus className="w-5 h-5 text-amber-400" />
                <span className="text-white">Создать команду</span>
              </button>
              <button className="flex items-center space-x-3 p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-all duration-150">
                <Users className="w-5 h-5 text-amber-400" />
                <span className="text-white">Найти команду</span>
              </button>
              <button className="flex items-center space-x-3 p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-all duration-150">
                <Calendar className="w-5 h-5 text-amber-400" />
                <span className="text-white">Мои события</span>
              </button>
              <button className="flex items-center space-x-3 p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-all duration-150">
                <Settings className="w-5 h-5 text-amber-400" />
                <span className="text-white">Настройки</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* HackLoad 2025 Registration Status */}
      <div className="mt-12">
        <div className="bg-gradient-to-r from-amber-400/20 to-amber-500/20 backdrop-blur-sm p-6 rounded-lg border border-amber-400/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6 text-slate-900" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">HackLoad 2025</h3>
                <p className="text-amber-200">Вы зарегистрированы на хакатон!</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-amber-200 text-sm">Дата проведения</p>
                <p className="text-white font-semibold">15-17 марта 2025</p>
              </div>
              <button className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-6 py-3 rounded-lg font-medium transition-colors duration-150">
                Подробнее
              </button>
            </div>
          </div>
        </div>
      </div>
    </PersonalCabinetLayout>
  )
}