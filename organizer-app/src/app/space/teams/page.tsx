import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import Link from 'next/link'
import { 
  Users,
  Crown,
  Calendar,
  Info,
  AlertCircle,
  Clock,
  Search,
  UserPlus
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SpaceTeamsPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  // Check if user is an organizer
  const userIsOrganizer = isOrganizer(session.user.email)

  const [participant, teams] = await Promise.all([
    db.participant.findFirst({
      where: { 
        user: { email: session.user.email } 
      },
      include: {
        user: true,
        team: true,
        ledTeam: true,
        joinRequests: {
          where: { status: 'PENDING' },
          include: { team: true }
        }
      },
    }),
    db.team.findMany({
      where: {
        status: {
          in: ['NEW', 'INCOMPLETED']
        }
      },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            city: true,
            company: true,
            telegram: true,
            experienceLevel: true,
            // Don't load large JSON fields in team browsing
            technologies: false,
            cloudServices: false,
            cloudProviders: false,
          },
          take: 5, // Limit members shown per team
        },
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        _count: {
          select: {
            members: true,
            joinRequests: {
              where: { status: 'PENDING' }
            }
          }
        }
      },
      take: 50, // Limit teams shown for browsing
      orderBy: {
        createdAt: 'desc'
      }
    })
  ])

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

  // Filter teams that user can join (not their own team, has space, accepting members)
  const joinableTeams = teams.filter(team => 
    team.id !== participant?.teamId && 
    team.members.length < 4 &&
    ['NEW', 'INCOMPLETED'].includes(team.status)
  )

  // Get pending join requests for this participant
  const pendingRequests = participant?.joinRequests || []

  return (
    <PersonalCabinetLayout user={user}>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Поиск <span className="text-amber-400">команды</span>
        </h1>
        <div className="w-16 h-1 bg-amber-400 rounded-full"></div>
        <p className="text-slate-400 mt-4">
          Найдите команду для участия в хакатоне или просмотрите информацию о других командах
        </p>
      </div>

      {/* User Status */}
      {participant?.teamId && (
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-8">
          <div className="flex items-center space-x-2">
            <Info className="w-5 h-5 text-blue-400" />
            <p className="text-blue-200">
              Вы уже состоите в команде. Для присоединения к другой команде сначала покиньте текущую.
            </p>
          </div>
        </div>
      )}

      {/* Organizer Notice */}
      {userIsOrganizer && !participant && (
        <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-4 mb-8">
          <div className="flex items-center space-x-2">
            <Info className="w-5 h-5 text-amber-400" />
            <p className="text-amber-200">
              Вы просматриваете команды как организатор. Для участия в хакатоне необходимо зарегистрироваться как участник.
            </p>
          </div>
        </div>
      )}

      {/* Pending Join Requests */}
      {pendingRequests.length > 0 && (
        <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Clock className="w-5 h-5 text-yellow-400 mr-2" />
            Ожидающие заявки ({pendingRequests.length})
          </h2>
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div key={request.id} className="bg-slate-700/30 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{request.team.name}</p>
                    <p className="text-slate-400 text-sm">@{request.team.nickname}</p>
                  </div>
                  <span className="text-yellow-300 text-sm">Ожидает ответа</span>
                </div>
                {request.message && (
                  <p className="text-slate-300 text-sm mt-2 italic">&quot;{request.message}&quot;</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Teams Grid */}
      <div className="space-y-6">
        {joinableTeams.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                Доступные команды ({joinableTeams.length})
              </h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {joinableTeams.map((team) => (
                <div key={team.id} className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
                  {/* Team Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{team.name}</h3>
                      <p className="text-slate-400 text-sm">@{team.nickname}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {team.status === 'NEW' && <Clock className="w-4 h-4 text-blue-400" />}
                      {team.status === 'INCOMPLETED' && <AlertCircle className="w-4 h-4 text-yellow-400" />}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[team.status as keyof typeof statusColors]}`}>
                        {statusLabels[team.status as keyof typeof statusLabels]}
                      </span>
                    </div>
                  </div>

                  {/* Team Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-700/30 p-3 rounded-lg text-center">
                      <div className="flex items-center justify-center space-x-2 mb-1">
                        <Users className="w-4 h-4 text-amber-400" />
                        <span className="text-white font-semibold">{team.members.length}/4</span>
                      </div>
                      <p className="text-slate-400 text-xs">Участники</p>
                    </div>
                    <div className="bg-slate-700/30 p-3 rounded-lg text-center">
                      <div className="flex items-center justify-center space-x-2 mb-1">
                        <Calendar className="w-4 h-4 text-amber-400" />
                        <span className="text-white font-semibold">{team.createdAt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-400 text-xs">Создана</p>
                    </div>
                    <div className="bg-slate-700/30 p-3 rounded-lg text-center">
                      <div className="flex items-center justify-center space-x-2 mb-1">
                        <UserPlus className="w-4 h-4 text-amber-400" />
                        <span className="text-white font-semibold">{team._count.joinRequests}</span>
                      </div>
                      <p className="text-slate-400 text-xs">Заявки</p>
                    </div>
                  </div>

                  {/* Team Leader */}
                  {team.leader && (
                    <div className="mb-4">
                      <p className="text-slate-400 text-sm mb-2">Лидер команды:</p>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full flex items-center justify-center">
                          <span className="text-slate-900 font-bold text-sm">
                            {team.leader.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="text-white font-medium text-sm">{team.leader.name}</p>
                            <Crown className="w-3 h-3 text-amber-400" />
                          </div>
                          <p className="text-slate-400 text-xs">{team.leader.email}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Team Members Preview */}
                  {team.members.length > 0 && (
                    <div className="mb-6">
                      <p className="text-slate-400 text-sm mb-3">Участники команды:</p>
                      <div className="space-y-2">
                        {team.members.slice(0, 2).map((member) => (
                          <div key={member.id} className="flex items-center space-x-3 bg-slate-700/20 p-3 rounded-lg">
                            <div className="w-6 h-6 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full flex items-center justify-center">
                              <span className="text-slate-900 font-bold text-xs">
                                {member.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <p className="text-white text-sm font-medium truncate">{member.name}</p>
                                {member.id === team.leader?.id && (
                                  <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center space-x-3 text-xs text-slate-400">
                                {member.company && <span>{member.company}</span>}
                                {member.city && <span>{member.city}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                        {team.members.length > 2 && (
                          <p className="text-slate-400 text-xs text-center">
                            и ещё {team.members.length - 2} участник(ов)
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Team Tech Info */}
                  <div className="space-y-3 mb-6">
                    {team.acceptedLanguages && team.acceptedLanguages.length > 0 && (
                      <div>
                        <p className="text-slate-400 text-sm mb-2">Принимаемые языки:</p>
                        <div className="flex flex-wrap gap-2">
                          {team.acceptedLanguages.slice(0, 4).map((lang) => (
                            <span key={lang} className="bg-amber-400/20 text-amber-300 px-2 py-1 rounded text-xs">
                              {lang}
                            </span>
                          ))}
                          {team.acceptedLanguages.length > 4 && (
                            <span className="text-slate-400 text-xs">+{team.acceptedLanguages.length - 4} ещё</span>
                          )}
                        </div>
                      </div>
                    )}

                    {team.techStack && team.techStack.length > 0 && (
                      <div>
                        <p className="text-slate-400 text-sm mb-2">Технологии:</p>
                        <div className="flex flex-wrap gap-2">
                          {team.techStack.slice(0, 4).map((tech) => (
                            <span key={tech} className="bg-blue-400/20 text-blue-300 px-2 py-1 rounded text-xs">
                              {tech}
                            </span>
                          ))}
                          {team.techStack.length > 4 && (
                            <span className="text-slate-400 text-xs">+{team.techStack.length - 4} ещё</span>
                          )}
                        </div>
                      </div>
                    )}

                    {team.description && (
                      <div>
                        <p className="text-slate-400 text-sm mb-2">Описание команды:</p>
                        <p className="text-slate-300 text-sm bg-slate-700/30 p-3 rounded-lg">
                          {team.description}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Link
                      href={`/space/teams/${team.id}`}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-150 text-center"
                    >
                      Подробнее
                    </Link>
                    
                    {participant && !participant.teamId && !pendingRequests.some(req => req.teamId === team.id) && (
                      <Link
                        href={`/space/teams/${team.id}/join`}
                        className="flex-1 bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-150 text-center"
                      >
                        Подать заявку
                      </Link>
                    )}
                    
                    {pendingRequests.some(req => req.teamId === team.id) && (
                      <div className="flex-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 px-4 py-3 rounded-lg text-sm font-medium text-center">
                        Заявка отправлена
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-slate-800/50 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Search className="w-12 h-12 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Нет доступных команд
            </h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              В данный момент нет команд, принимающих новых участников. Создайте свою команду или попробуйте позже.
            </p>
            <Link
              href="/space/team"
              className="inline-flex items-center space-x-2 bg-amber-400 hover:bg-amber-500 text-slate-900 px-6 py-3 rounded-lg font-medium transition-colors duration-150"
            >
              <Users className="w-5 h-5" />
              <span>Управление командой</span>
            </Link>
          </div>
        )}
      </div>
    </PersonalCabinetLayout>
  )
}