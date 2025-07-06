import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { SignOutButton } from '@/components/sign-out-button'
import { isOrganizer } from '@/lib/admin'
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
  Code,
  Cloud,
  Briefcase
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{
    nickname: string
  }>
}

export default async function PublicTeamPage({ params }: Props) {
  const resolvedParams = await params
  const session = await auth()
  const userIsOrganizer = isOrganizer(session?.user?.email)

  const team = await db.team.findUnique({
    where: { nickname: resolvedParams.nickname },
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
        }
      }
    }
  })

  if (!team) {
    notFound()
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
    NEW: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
    INCOMPLETED: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
    FINISHED: 'bg-green-500/20 text-green-600 border-green-500/30',
    IN_REVIEW: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
    APPROVED: 'bg-green-500/20 text-green-600 border-green-500/30',
    CANCELED: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
    REJECTED: 'bg-red-500/20 text-red-600 border-red-500/30',
  }

  const parseTechnologies = (techString: string | null) => {
    if (!techString) return []
    try {
      return JSON.parse(techString)
    } catch {
      return []
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <Link
                href="/teams"
                className="inline-flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад к списку команд</span>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {team.name}
              </h1>
              <p className="text-gray-700 font-medium">
                @{team.nickname}
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                На главную
              </Link>
              {session ? (
                <>
                  {userIsOrganizer ? (
                    <Link
                      href="/dashboard"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Панель управления
                    </Link>
                  ) : (
                    <Link
                      href="/profile"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Мой профиль
                    </Link>
                  )}
                  <SignOutButton />
                </>
              ) : (
                <Link
                  href="/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Присоединиться
                </Link>
              )}
            </div>
          </div>

          {/* Team Info */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                {team.status === 'NEW' && <Clock className="w-5 h-5 text-blue-600" />}
                {team.status === 'INCOMPLETED' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                {team.status === 'FINISHED' && <CheckCircle className="w-5 h-5 text-green-600" />}
                {team.status === 'IN_REVIEW' && <Info className="w-5 h-5 text-purple-600" />}
                {team.status === 'APPROVED' && <CheckCircle className="w-5 h-5 text-green-600" />}
                {team.status === 'CANCELED' && <XCircle className="w-5 h-5 text-gray-600" />}
                {team.status === 'REJECTED' && <XCircle className="w-5 h-5 text-red-600" />}
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[team.status as keyof typeof statusColors]}`}>
                  {statusLabels[team.status as keyof typeof statusLabels]}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Users className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="text-gray-600 text-sm">Участники</p>
                    <p className="text-gray-900 font-semibold">{team._count.members} / 4</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="text-gray-600 text-sm">Создана</p>
                    <p className="text-gray-900 font-semibold">
                      {team.createdAt.toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Crown className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="text-gray-600 text-sm">Лидер</p>
                    <p className="text-gray-900 font-semibold">
                      {team.leader ? team.leader.name : 'Не назначен'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs">
                      {team.members.length}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Статус</p>
                    <p className="text-gray-900 font-semibold">Активна</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Users className="w-5 h-5 text-blue-600 mr-2" />
              Участники команды
            </h2>
            
            {team.members.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {team.members.map((member) => (
                  <div key={member.id} className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-gray-900 font-medium">{member.name}</h3>
                          {member.id === team.leader?.id && (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        
                        <div className="space-y-1 mb-3">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Mail className="w-3 h-3" />
                            <span>{member.email}</span>
                          </div>
                          {member.company && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Building className="w-3 h-3" />
                              <span>{member.company}</span>
                            </div>
                          )}
                          {member.city && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <MapPin className="w-3 h-3" />
                              <span>{member.city}</span>
                            </div>
                          )}
                          {member.telegram && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Send className="w-3 h-3" />
                              <a
                                href={member.telegram.startsWith('http') ? member.telegram : `https://t.me/${member.telegram.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-blue-600 transition-colors"
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
                              <Briefcase className="w-3 h-3 text-blue-600" />
                              <span className="text-gray-700">Опыт: {member.experienceLevel}</span>
                            </div>
                          )}
                          
                          {member.technologies && parseTechnologies(member.technologies).length > 0 && (
                            <div className="flex items-start space-x-2 text-xs">
                              <Code className="w-3 h-3 text-blue-600 mt-0.5" />
                              <div className="flex flex-wrap gap-1">
                                {parseTechnologies(member.technologies).slice(0, 3).map((tech: string) => (
                                  <span key={tech} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                                    {tech}
                                  </span>
                                ))}
                                {parseTechnologies(member.technologies).length > 3 && (
                                  <span className="text-gray-500">+{parseTechnologies(member.technologies).length - 3}</span>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {member.cloudServices && parseTechnologies(member.cloudServices).length > 0 && (
                            <div className="flex items-start space-x-2 text-xs">
                              <Cloud className="w-3 h-3 text-blue-600 mt-0.5" />
                              <div className="flex flex-wrap gap-1">
                                {parseTechnologies(member.cloudServices).slice(0, 3).map((service: string) => (
                                  <span key={service} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                                    {service}
                                  </span>
                                ))}
                                {parseTechnologies(member.cloudServices).length > 3 && (
                                  <span className="text-gray-500">+{parseTechnologies(member.cloudServices).length - 3}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">В команде пока нет участников</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}