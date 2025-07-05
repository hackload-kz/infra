import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import Link from 'next/link'
import { 
  Users,
  Crown,
  UserPlus,
  Settings,
  Calendar,
  Trophy,
  Mail,
  MapPin,
  Building,
  ExternalLink,
  Send
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ProfileTeamPage() {
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
      team: {
        include: {
          members: true,
          leader: true,
        }
      },
      ledTeam: {
        include: {
          members: true,
          leader: true,
        }
      },
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

  const statusLabels = {
    NEW: 'Новая',
    INCOMPLETED: 'Не завершена',
    FINISHED: 'Завершена',
    IN_REVIEW: 'На рассмотрении',
    APPROVED: 'Одобрена',
    CANCELED: 'Отменена',
    REJECTED: 'Отклонена',
  }

  const statusColors = {
    NEW: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    INCOMPLETED: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    FINISHED: 'bg-green-500/20 text-green-300 border-green-500/30',
    IN_REVIEW: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    APPROVED: 'bg-green-500/20 text-green-300 border-green-500/30',
    CANCELED: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    REJECTED: 'bg-red-500/20 text-red-300 border-red-500/30',
  }

  return (
    <PersonalCabinetLayout user={user}>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Моя <span className="text-amber-400">команда</span>
        </h1>
        <div className="w-16 h-1 bg-amber-400 rounded-full"></div>
      </div>

      {participant.team ? (
        <div className="space-y-8">
          {/* Team Header */}
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{participant.team.name}</h2>
                <p className="text-slate-400">@{participant.team.nickname}</p>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[participant.team.status as keyof typeof statusColors]}`}>
                  {statusLabels[participant.team.status as keyof typeof statusLabels]}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-700/30 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Users className="w-6 h-6 text-amber-400" />
                  <div>
                    <p className="text-slate-400 text-sm">Участники</p>
                    <p className="text-white font-semibold">{participant.team.members.length} / 4</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-700/30 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-6 h-6 text-amber-400" />
                  <div>
                    <p className="text-slate-400 text-sm">Создана</p>
                    <p className="text-white font-semibold">
                      {participant.team.createdAt.toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-700/30 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Crown className="w-6 h-6 text-amber-400" />
                  <div>
                    <p className="text-slate-400 text-sm">Лидер</p>
                    <p className="text-white font-semibold">
                      {participant.team.leader ? participant.team.leader.name : 'Не назначен'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Users className="w-5 h-5 text-amber-400 mr-2" />
              Участники команды
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {participant.team.members.map((member) => (
                <div key={member.id} className="bg-slate-700/30 p-4 rounded-lg">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full flex items-center justify-center">
                      <span className="text-slate-900 font-bold">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-white font-medium">{member.name}</h4>
                        {member.id === participant.team?.leader?.id && (
                          <Crown className="w-4 h-4 text-amber-400" />
                        )}
                        {member.id === participant.id && (
                          <span className="text-amber-400 text-sm">(Вы)</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-sm text-slate-400">
                          <Mail className="w-3 h-3" />
                          <span>{member.email}</span>
                        </div>
                        {member.company && (
                          <div className="flex items-center space-x-2 text-sm text-slate-400">
                            <Building className="w-3 h-3" />
                            <span>{member.company}</span>
                          </div>
                        )}
                        {member.city && (
                          <div className="flex items-center space-x-2 text-sm text-slate-400">
                            <MapPin className="w-3 h-3" />
                            <span>{member.city}</span>
                          </div>
                        )}
                        {member.telegram && (
                          <div className="flex items-center space-x-2 text-sm text-slate-400">
                            <Send className="w-3 h-3" />
                            <a
                              href={member.telegram.startsWith('http') ? member.telegram : `https://t.me/${member.telegram.replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-amber-400 transition-colors"
                            >
                              {member.telegram.startsWith('http') ? 
                                member.telegram.replace('https://t.me/', '@') : 
                                member.telegram.startsWith('@') ? member.telegram : `@${member.telegram}`
                              }
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    <Link 
                      href={`/dashboard/participants/${member.id}`}
                      className="text-slate-400 hover:text-amber-400 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team Actions */}
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
            <h3 className="text-xl font-semibold text-white mb-6">Действия с командой</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {participant.ledTeam && (
                <>
                  <button className="flex items-center space-x-3 p-4 bg-amber-400/20 hover:bg-amber-400/30 rounded-lg transition-all duration-150 border border-amber-400/30">
                    <UserPlus className="w-5 h-5 text-amber-400" />
                    <span className="text-white">Пригласить участника</span>
                  </button>
                  <button className="flex items-center space-x-3 p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-all duration-150">
                    <Settings className="w-5 h-5 text-slate-400" />
                    <span className="text-white">Настройки команды</span>
                  </button>
                </>
              )}
              <button className="flex items-center space-x-3 p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-all duration-150">
                <Trophy className="w-5 h-5 text-slate-400" />
                <span className="text-white">Статистика команды</span>
              </button>
              <button className="flex items-center space-x-3 p-4 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-all duration-150 border border-red-500/30">
                <Users className="w-5 h-5 text-red-400" />
                <span className="text-white">Покинуть команду</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-slate-800/50 rounded-full mx-auto mb-6 flex items-center justify-center">
            <Users className="w-12 h-12 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Вы не состоите в команде
          </h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            Создайте свою команду или присоединитесь к существующей для участия в хакатоне
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-6 py-3 rounded-lg font-medium transition-colors duration-150">
              Создать команду
            </button>
            <button className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-150">
              Найти команду
            </button>
          </div>
        </div>
      )}
    </PersonalCabinetLayout>
  )
}