import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { CopyTeamLink } from '@/components/copy-team-link'
import Link from 'next/link'
import { 
  Users,
  Crown,
  Calendar,
  Mail,
  MapPin,
  Building,
  Send,
  CheckCircle,
  Info,
  AlertCircle,
  Clock,
  XCircle,
  ArrowLeft,
  UserPlus,
  Code,
  Cloud,
  Briefcase
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{
    id: string
  }>
}

export default async function TeamDetailPage({ params }: Props) {
  const resolvedParams = await params
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  const [participant, team] = await Promise.all([
    db.participant.findFirst({
      where: { 
        user: { email: session.user.email } 
      },
      include: {
        user: true,
        team: true,
        ledTeam: true,
        joinRequests: {
          where: { 
            teamId: resolvedParams.id,
            status: 'PENDING' 
          }
        }
      },
    }),
    db.team.findUnique({
      where: { id: resolvedParams.id },
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
            technologies: true,
            cloudServices: true,
            cloudProviders: true,
            otherTechnologies: true,
            otherCloudServices: true,
            otherCloudProviders: true,
          }
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
      }
    })
  ])

  if (!participant) {
    redirect('/login')
  }

  if (!team) {
    notFound()
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

  const canJoin = !participant.teamId && 
                  team.members.length < 4 && 
                  ['NEW', 'INCOMPLETED'].includes(team.status) &&
                  participant.joinRequests.length === 0

  const hasPendingRequest = participant.joinRequests.length > 0

  const parseTechnologies = (techString: string | null) => {
    if (!techString) return []
    try {
      return JSON.parse(techString)
    } catch {
      return []
    }
  }

  return (
    <PersonalCabinetLayout user={user}>
      {/* Back Navigation */}
      <div className="mb-6">
        <Link
          href="/space/teams"
          className="inline-flex items-center space-x-2 text-slate-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад к поиску команд</span>
        </Link>
      </div>

      {/* Team Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{team.name}</h1>
            <p className="text-slate-400">@{team.nickname}</p>
          </div>
          <div className="flex items-center space-x-3">
            <CopyTeamLink teamNickname={team.nickname} />
            <div className="flex items-center space-x-2">
              {team.status === 'NEW' && <Clock className="w-4 h-4 text-blue-400" />}
              {team.status === 'INCOMPLETED' && <AlertCircle className="w-4 h-4 text-yellow-400" />}
              {team.status === 'FINISHED' && <CheckCircle className="w-4 h-4 text-green-400" />}
              {team.status === 'IN_REVIEW' && <Info className="w-4 h-4 text-purple-400" />}
              {team.status === 'APPROVED' && <CheckCircle className="w-4 h-4 text-green-400" />}
              {team.status === 'CANCELED' && <XCircle className="w-4 h-4 text-gray-400" />}
              {team.status === 'REJECTED' && <XCircle className="w-4 h-4 text-red-400" />}
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[team.status as keyof typeof statusColors]}`}>
                {statusLabels[team.status as keyof typeof statusLabels]}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-700/30 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-amber-400" />
              <div>
                <p className="text-slate-400 text-sm">Участники</p>
                <p className="text-white font-semibold">{team.members.length} / 4</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-700/30 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <Calendar className="w-6 h-6 text-amber-400" />
              <div>
                <p className="text-slate-400 text-sm">Создана</p>
                <p className="text-white font-semibold">
                  {team.createdAt.toLocaleDateString('ru-RU')}
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
                  {team.leader ? team.leader.name : 'Не назначен'}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-700/30 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <UserPlus className="w-6 h-6 text-amber-400" />
              <div>
                <p className="text-slate-400 text-sm">Заявки</p>
                <p className="text-white font-semibold">{team._count.joinRequests}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Join Action */}
        <div className="mt-6 pt-6 border-t border-slate-700/30">
          {participant.teamId && participant.teamId === team.id ? (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <p className="text-green-200 font-medium">Вы участник этой команды</p>
              </div>
            </div>
          ) : participant.teamId ? (
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Info className="w-5 h-5 text-blue-400" />
                <p className="text-blue-200">
                  Вы состоите в другой команде. Для присоединения к этой команде сначала покиньте текущую.
                </p>
              </div>
            </div>
          ) : hasPendingRequest ? (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-yellow-400" />
                <p className="text-yellow-200 font-medium">Ваша заявка отправлена и ожидает рассмотрения</p>
              </div>
            </div>
          ) : canJoin ? (
            <Link
              href={`/space/teams/${resolvedParams.id}/join`}
              className="inline-flex items-center space-x-2 bg-amber-400 hover:bg-amber-500 text-slate-900 px-6 py-3 rounded-lg font-medium transition-colors duration-150"
            >
              <UserPlus className="w-5 h-5" />
              <span>Подать заявку на вступление</span>
            </Link>
          ) : (
            <div className="bg-slate-700/30 rounded-lg p-4">
              <p className="text-slate-400">
                {team.members.length >= 4 ? 'Команда заполнена' : 'Команда не принимает новых участников'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
          <Users className="w-5 h-5 text-amber-400 mr-2" />
          Участники команды
        </h2>
        
        {team.members.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {team.members.map((member) => (
              <div key={member.id} className="bg-slate-700/30 p-4 rounded-lg">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full flex items-center justify-center">
                    <span className="text-slate-900 font-bold">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-white font-medium">{member.name}</h3>
                      {member.id === team.leader?.id && (
                        <Crown className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    
                    <div className="space-y-1 mb-3">
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

                    {/* Technical Skills */}
                    <div className="space-y-2">
                      {member.experienceLevel && (
                        <div className="flex items-center space-x-2 text-xs">
                          <Briefcase className="w-3 h-3 text-amber-400" />
                          <span className="text-slate-300">Опыт: {member.experienceLevel}</span>
                        </div>
                      )}
                      
                      {member.technologies && parseTechnologies(member.technologies).length > 0 && (
                        <div className="flex items-start space-x-2 text-xs">
                          <Code className="w-3 h-3 text-amber-400 mt-0.5" />
                          <div className="flex flex-wrap gap-1">
                            {parseTechnologies(member.technologies).slice(0, 3).map((tech: string) => (
                              <span key={tech} className="bg-slate-600/50 text-slate-300 px-2 py-0.5 rounded text-xs">
                                {tech}
                              </span>
                            ))}
                            {parseTechnologies(member.technologies).length > 3 && (
                              <span className="text-slate-400">+{parseTechnologies(member.technologies).length - 3}</span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {member.cloudServices && parseTechnologies(member.cloudServices).length > 0 && (
                        <div className="flex items-start space-x-2 text-xs">
                          <Cloud className="w-3 h-3 text-amber-400 mt-0.5" />
                          <div className="flex flex-wrap gap-1">
                            {parseTechnologies(member.cloudServices).slice(0, 3).map((service: string) => (
                              <span key={service} className="bg-slate-600/50 text-slate-300 px-2 py-0.5 rounded text-xs">
                                {service}
                              </span>
                            ))}
                            {parseTechnologies(member.cloudServices).length > 3 && (
                              <span className="text-slate-400">+{parseTechnologies(member.cloudServices).length - 3}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Link to profile */}
                    <div className="mt-3 pt-3 border-t border-slate-600/30">
                      <Link 
                        href={`/dashboard/participants/${member.id}`}
                        className="text-amber-400 hover:text-amber-300 text-xs transition-colors"
                      >
                        Посмотреть полный профиль →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400">В команде пока нет участников</p>
          </div>
        )}
      </div>
    </PersonalCabinetLayout>
  )
}