import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { MessageNotifications } from '@/components/message-notifications'
import Link from 'next/link'
import { 
  Trophy,
  Users,
  Edit,
  Plus,
  UserPlus,
  Search
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
      hackathonParticipations: {
        include: {
          hackathon: true
        }
      }
    },
  })

  if (!participant) {
    redirect('/login')
  }

  // Get the current hackathon (assuming hackload-2025 for now)
  const hackathon = await db.hackathon.findFirst({
    where: { slug: 'hackload-2025' }
  })

  const user = {
    name: participant.name,
    email: participant.email,
    image: session.user?.image || undefined
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
              {participant.githubUrl && (
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 text-amber-400">💻</div>
                  <a 
                    href={participant.githubUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-slate-300 hover:text-amber-400 transition-colors truncate"
                  >
                    GitHub/GitLab
                  </a>
                </div>
              )}
              {participant.linkedinUrl && (
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 text-amber-400">💼</div>
                  <a 
                    href={participant.linkedinUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-slate-300 hover:text-amber-400 transition-colors truncate"
                  >
                    LinkedIn
                  </a>
                </div>
              )}
            </div>
            <Link href="/space/info/edit" className="w-full mt-6 bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-3 rounded-lg font-medium transition-colors duration-150 text-center block">
              Редактировать профиль
            </Link>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="xl:col-span-2">
          {/* Profile Status Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Статус профиля</h3>
              <div className="bg-green-400/20 p-2 rounded-lg">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="bg-amber-400/20 p-3 rounded-lg mb-2 mx-auto w-fit">
                  <Users className="w-6 h-6 text-amber-400" />
                </div>
                <p className="text-slate-400 text-sm">Команда</p>
                <p className="text-lg font-semibold text-white">
                  {participant.team ? participant.team.name : 'Нет команды'}
                </p>
              </div>
              <div className="text-center">
                <div className="bg-amber-400/20 p-3 rounded-lg mb-2 mx-auto w-fit">
                  <Trophy className="w-6 h-6 text-amber-400" />
                </div>
                <p className="text-slate-400 text-sm">Роль</p>
                <p className="text-lg font-semibold text-white">
                  {participant.ledTeam ? 'Лидер команды' : 'Участник'}
                </p>
              </div>
              <div className="text-center">
                <div className="bg-amber-400/20 p-3 rounded-lg mb-2 mx-auto w-fit">
                  <Edit className="w-6 h-6 text-amber-400" />
                </div>
                <p className="text-slate-400 text-sm">Профиль</p>
                <p className="text-lg font-semibold text-white">Активен</p>
              </div>
            </div>
          </div>

          {/* Message Notifications */}
          {hackathon && (
            <div className="mb-8">
              <MessageNotifications hackathonId={hackathon.id} />
            </div>
          )}

          {/* Team Management Section */}
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30 mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">Управление командой</h3>
            {participant.team ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-700/30 rounded-lg border border-amber-400/20">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-medium text-white">{participant.team.name}</h4>
                    <span className="px-2 py-1 bg-amber-400/20 text-amber-400 text-sm rounded-full">
                      {participant.ledTeam ? 'Лидер' : 'Участник'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">
                    {participant.team.comment || 'Описание команды отсутствует'}
                  </p>
                  <div className="flex gap-3">
                    <Link href="/space/team" className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-2 rounded-lg font-medium transition-colors duration-150 text-sm">
                      Управление командой
                    </Link>
                    {participant.ledTeam && (
                      <Link href="/space/participants" className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-150 text-sm">
                        Найти участников
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-700/30 rounded-lg border border-dashed border-slate-600 text-center">
                <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h4 className="text-lg font-medium text-white mb-2">Вы не состоите в команде</h4>
                <p className="text-slate-400 mb-4">
                  Создайте свою команду или присоединитесь к существующей
                </p>
                <div className="flex gap-3 justify-center">
                  <Link href="/space/teams" className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-2 rounded-lg font-medium transition-colors duration-150">
                    Найти команду
                  </Link>
                  <Link href="/space/team" className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-150">
                    Создать команду
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
            <h3 className="text-xl font-semibold text-white mb-6">Быстрые действия</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Edit Profile */}
              <Link href="/space/info/edit" className="flex flex-col items-center space-y-3 p-6 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-all duration-150 border border-slate-600/30 hover:border-amber-400/30">
                <div className="bg-amber-400/20 p-3 rounded-lg">
                  <Edit className="w-6 h-6 text-amber-400" />
                </div>
                <span className="text-white text-center font-medium">Редактировать профиль</span>
              </Link>
              
              {/* Team Management */}
              {participant.team ? (
                <Link href="/space/team" className="flex flex-col items-center space-y-3 p-6 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-all duration-150 border border-slate-600/30 hover:border-amber-400/30">
                  <div className="bg-amber-400/20 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-amber-400" />
                  </div>
                  <span className="text-white text-center font-medium">Редактировать команду</span>
                </Link>
              ) : (
                <Link href="/space/team" className="flex flex-col items-center space-y-3 p-6 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-all duration-150 border border-slate-600/30 hover:border-amber-400/30">
                  <div className="bg-amber-400/20 p-3 rounded-lg">
                    <Plus className="w-6 h-6 text-amber-400" />
                  </div>
                  <span className="text-white text-center font-medium">Создать команду</span>
                </Link>
              )}
              
              {/* Join Team */}
              <Link href="/space/teams" className="flex flex-col items-center space-y-3 p-6 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-all duration-150 border border-slate-600/30 hover:border-amber-400/30">
                <div className="bg-amber-400/20 p-3 rounded-lg">
                  <UserPlus className="w-6 h-6 text-amber-400" />
                </div>
                <span className="text-white text-center font-medium">Присоединиться к команде</span>
              </Link>
              
              {/* Find Participants (for team leaders) */}
              {participant.ledTeam ? (
                <Link href="/space/participants" className="flex flex-col items-center space-y-3 p-6 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-all duration-150 border border-slate-600/30 hover:border-amber-400/30">
                  <div className="bg-amber-400/20 p-3 rounded-lg">
                    <Search className="w-6 h-6 text-amber-400" />
                  </div>
                  <span className="text-white text-center font-medium">Найти участника</span>
                </Link>
              ) : (
                <Link href="/space/teams" className="flex flex-col items-center space-y-3 p-6 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-all duration-150 border border-slate-600/30 hover:border-amber-400/30">
                  <div className="bg-amber-400/20 p-3 rounded-lg">
                    <Search className="w-6 h-6 text-amber-400" />
                  </div>
                  <span className="text-white text-center font-medium">Просмотр команд</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

    </PersonalCabinetLayout>
  )
}