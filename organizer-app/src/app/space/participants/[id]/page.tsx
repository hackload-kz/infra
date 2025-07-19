import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { ParticipantInvitationClient } from '@/components/participant-invitation-client'
import Link from 'next/link'
import { 
  Users,
  Crown,
  Mail,
  MapPin,
  Building,
  Send,
  ArrowLeft,
  Award,
  Code,
  Cloud,
  Calendar,
  User,
  Github
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{
    id: string
  }>
}

export default async function ParticipantProfilePage({ params }: Props) {
  const { id } = await params
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  const [currentParticipant, targetParticipant, hackathon] = await Promise.all([
    db.participant.findFirst({
      where: { 
        user: { email: session.user.email } 
      },
      include: {
        user: true,
        team: {
          include: {
            members: true
          }
        },
        ledTeam: true
      },
    }),
    db.participant.findUnique({
      where: { id: id },
      include: {
        user: true,
        team: {
          include: {
            members: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            leader: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        ledTeam: {
          include: {
            members: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        hackathonParticipations: {
          include: {
            hackathon: true
          }
        }
      }
    }),
    db.hackathon.findFirst({
      where: { slug: 'hackload-2025' }
    })
  ])

  if (!currentParticipant) {
    redirect('/login')
  }

  if (!targetParticipant || !hackathon) {
    notFound()
  }

  // Log profile viewing
  console.info(`👁️ Profile viewed: ${session.user.email} viewed participant ${targetParticipant.name} (${targetParticipant.email}) in personal cabinet`)

  // Check if participant is inactive
  const isInactive = !targetParticipant.isActive

  const user = {
    name: currentParticipant.name,
    email: currentParticipant.email,
    image: session.user?.image || undefined
  }

  const currentTeam = currentParticipant.team
  const isCurrentUserLeader = !!currentParticipant.ledTeam
  const teamHasSpace = currentTeam && currentTeam.members.length < 4

  // Parse JSON fields safely
  const parseJsonField = (field: string | null): string[] => {
    if (!field) return []
    try {
      const parsed = JSON.parse(field)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const technologies = parseJsonField(targetParticipant.technologies)
  const cloudServices = parseJsonField(targetParticipant.cloudServices)
  const cloudProviders = parseJsonField(targetParticipant.cloudProviders)
  const otherTechnologies = parseJsonField(targetParticipant.otherTechnologies)
  const otherCloudServices = parseJsonField(targetParticipant.otherCloudServices)
  const otherCloudProviders = parseJsonField(targetParticipant.otherCloudProviders)
  
  // New fields - these are already arrays in the database
  const programmingLanguages = targetParticipant.programmingLanguages || []
  const databases = targetParticipant.databases || []
  const description = targetParticipant.description

  const hasTeam = !!(currentParticipant?.team || currentParticipant?.ledTeam)

  return (
    <PersonalCabinetLayout user={user} hasTeam={hasTeam}>
      {/* Navigation */}
      <div className="mb-6">
        <Link
          href="/space/participants"
          className="inline-flex items-center space-x-2 text-slate-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад к участникам</span>
        </Link>
      </div>

      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Профиль <span className="text-amber-400">участника</span>
        </h1>
        <div className="w-16 h-1 bg-amber-400 rounded-full"></div>
      </div>

      {/* Inactive Status Banner */}
      {isInactive && (
        <div className="bg-red-500/20 border-l-4 border-red-500 p-4 rounded-lg mb-6">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-red-400" />
            <div>
              <h3 className="text-red-400 font-semibold">Аккаунт деактивирован</h3>
              <p className="text-red-300 text-sm">
                Этот участник был деактивирован и больше не может участвовать в хакатоне
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
            <div className="flex items-start space-x-6 mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full flex items-center justify-center">
                <span className="text-slate-900 font-bold text-2xl">
                  {targetParticipant.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">{targetParticipant.name}</h2>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-slate-400">
                    <Mail className="w-4 h-4" />
                    <span>{targetParticipant.email}</span>
                  </div>
                  {targetParticipant.company && (
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Building className="w-4 h-4" />
                      <span>{targetParticipant.company}</span>
                    </div>
                  )}
                  {targetParticipant.city && (
                    <div className="flex items-center space-x-2 text-slate-400">
                      <MapPin className="w-4 h-4" />
                      <span>{targetParticipant.city}</span>
                    </div>
                  )}
                  {targetParticipant.telegram && (
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Send className="w-4 h-4" />
                      <a
                        href={`https://t.me/${targetParticipant.telegram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-amber-400 transition-colors"
                      >
                        {targetParticipant.telegram.startsWith('@') ? targetParticipant.telegram : `@${targetParticipant.telegram}`}
                      </a>
                    </div>
                  )}
                  {targetParticipant.githubUrl && (
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Github className="w-4 h-4" />
                      <a
                        href={targetParticipant.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-amber-400 transition-colors"
                      >
                        GitHub
                      </a>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 text-slate-400">
                    <Calendar className="w-4 h-4" />
                    <span>Участник с {targetParticipant.createdAt.toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Experience Level */}
            {targetParticipant.experienceLevel && (
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-3">
                  <Award className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-semibold text-white">Уровень опыта</h3>
                </div>
                <span className="bg-amber-400/20 text-amber-400 px-4 py-2 rounded-full">
                  {targetParticipant.experienceLevel}
                </span>
              </div>
            )}

            {/* Contact Actions */}
            {currentTeam && isCurrentUserLeader && teamHasSpace && !targetParticipant.team && !isInactive && (
              <div className="border-t border-slate-700/30 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Пригласить в команду</h3>
                <div className="flex flex-wrap gap-3">
                  <ParticipantInvitationClient
                    team={{
                      id: currentTeam.id,
                      name: currentTeam.name,
                      nickname: currentTeam.nickname || ''
                    }}
                    teamLeader={{
                      id: currentParticipant.id,
                      name: currentParticipant.name,
                      email: currentParticipant.email,
                      telegram: currentParticipant.telegram
                    }}
                    targetParticipant={{
                      id: targetParticipant.id,
                      name: targetParticipant.name,
                      email: targetParticipant.email
                    }}
                    hackathonId={hackathon.id}
                  />
                  
                  {targetParticipant.telegram ? (
                    <a
                      href={`https://t.me/${targetParticipant.telegram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 bg-amber-400 hover:bg-amber-500 text-slate-900 px-6 py-3 rounded-lg font-medium transition-colors duration-150"
                    >
                      <Send className="w-4 h-4" />
                      <span>Написать в Telegram</span>
                    </a>
                  ) : (
                    <a
                      href={`mailto:${targetParticipant.email}?subject=Приглашение в команду ${currentTeam.name}&body=Привет! Меня зовут ${currentParticipant.name}, я лидер команды "${currentTeam.name}". Приглашаю тебя присоединиться к нашей команде для участия в хакатоне HackLoad 2025. Если интересно, напиши мне!`}
                      className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-150"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Написать на почту</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Programming Languages & Databases */}
          {(programmingLanguages.length > 0 || databases.length > 0) && (
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
              <div className="flex items-center space-x-2 mb-4">
                <Code className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-white">Технические навыки</h3>
              </div>
              
              {programmingLanguages.length > 0 && (
                <div className="mb-4">
                  <p className="text-slate-400 text-sm mb-2">Языки программирования:</p>
                  <div className="flex flex-wrap gap-2">
                    {programmingLanguages.map((lang: string, index: number) => (
                      <span key={index} className="bg-orange-400/20 text-orange-300 px-3 py-2 rounded-lg text-sm">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {databases.length > 0 && (
                <div>
                  <p className="text-slate-400 text-sm mb-2">Базы данных:</p>
                  <div className="flex flex-wrap gap-2">
                    {databases.map((db: string, index: number) => (
                      <span key={index} className="bg-cyan-400/20 text-cyan-300 px-3 py-2 rounded-lg text-sm">
                        {db}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {description && (
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
              <div className="flex items-center space-x-2 mb-4">
                <User className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-white">О себе</h3>
              </div>
              <p className="text-slate-300 leading-relaxed">{description}</p>
            </div>
          )}

          {/* Technologies */}
          {technologies.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
              <div className="flex items-center space-x-2 mb-4">
                <Code className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-white">Технологии</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {technologies.map((tech, index) => (
                  <span key={index} className="bg-slate-700/50 text-slate-300 px-3 py-2 rounded-lg text-sm">
                    {tech}
                  </span>
                ))}
              </div>
              {otherTechnologies.length > 0 && (
                <div className="mt-4">
                  <p className="text-slate-400 text-sm mb-2">Другие технологии:</p>
                  <div className="flex flex-wrap gap-2">
                    {otherTechnologies.map((tech, index) => (
                      <span key={index} className="bg-slate-700/30 text-slate-400 px-3 py-2 rounded-lg text-sm">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cloud Services */}
          {(cloudServices.length > 0 || cloudProviders.length > 0) && (
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
              <div className="flex items-center space-x-2 mb-4">
                <Cloud className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-white">Облачные технологии</h3>
              </div>
              
              {cloudProviders.length > 0 && (
                <div className="mb-4">
                  <p className="text-slate-400 text-sm mb-2">Облачные провайдеры:</p>
                  <div className="flex flex-wrap gap-2">
                    {cloudProviders.map((provider, index) => (
                      <span key={index} className="bg-blue-500/20 text-blue-300 px-3 py-2 rounded-lg text-sm">
                        {provider}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {cloudServices.length > 0 && (
                <div className="mb-4">
                  <p className="text-slate-400 text-sm mb-2">Облачные сервисы:</p>
                  <div className="flex flex-wrap gap-2">
                    {cloudServices.map((service, index) => (
                      <span key={index} className="bg-slate-700/50 text-slate-300 px-3 py-2 rounded-lg text-sm">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(otherCloudProviders.length > 0 || otherCloudServices.length > 0) && (
                <div className="border-t border-slate-700/30 pt-4">
                  {otherCloudProviders.length > 0 && (
                    <div className="mb-2">
                      <p className="text-slate-400 text-sm mb-2">Другие провайдеры:</p>
                      <div className="flex flex-wrap gap-2">
                        {otherCloudProviders.map((provider, index) => (
                          <span key={index} className="bg-slate-700/30 text-slate-400 px-3 py-2 rounded-lg text-sm">
                            {provider}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {otherCloudServices.length > 0 && (
                    <div>
                      <p className="text-slate-400 text-sm mb-2">Другие сервисы:</p>
                      <div className="flex flex-wrap gap-2">
                        {otherCloudServices.map((service, index) => (
                          <span key={index} className="bg-slate-700/30 text-slate-400 px-3 py-2 rounded-lg text-sm">
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Team Info */}
          {targetParticipant.team && (
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
              <div className="flex items-center space-x-2 mb-4">
                <Users className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-white">Команда</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <h4 className="text-white font-medium">{targetParticipant.team.name}</h4>
                  <p className="text-slate-400 text-sm">@{targetParticipant.team.nickname}</p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Участники:</span>
                  <span className="text-white">{targetParticipant.team.members.length}/4</span>
                </div>
                {targetParticipant.team.leader && (
                  <div className="flex items-center space-x-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <div>
                      <p className="text-white text-sm font-medium">{targetParticipant.team.leader.name}</p>
                      <p className="text-slate-400 text-xs">Лидер команды</p>
                    </div>
                  </div>
                )}
                <Link
                  href={`/space/teams/${targetParticipant.team.id}`}
                  className="block w-full bg-slate-700 hover:bg-slate-600 text-white text-center py-2 rounded-lg text-sm font-medium transition-colors duration-150"
                >
                  Посмотреть команду
                </Link>
              </div>
            </div>
          )}

          {/* Leader Info */}
          {targetParticipant.ledTeam && (
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
              <div className="flex items-center space-x-2 mb-4">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-white">Лидер команды</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <h4 className="text-white font-medium">{targetParticipant.ledTeam.name}</h4>
                  <p className="text-slate-400 text-sm">@{targetParticipant.ledTeam.nickname}</p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Участники:</span>
                  <span className="text-white">{targetParticipant.ledTeam.members.length}/4</span>
                </div>
              </div>
            </div>
          )}

          {/* No Team */}
          {!targetParticipant.team && !targetParticipant.ledTeam && (
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
              <div className="flex items-center space-x-2 mb-4">
                <User className="w-5 h-5 text-slate-400" />
                <h3 className="text-lg font-semibold text-white">Статус</h3>
              </div>
              {isInactive ? (
                <div className="space-y-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Заблокирован
                  </span>
                  <p className="text-slate-400 text-sm">
                    Участник был деактивирован и не может присоединиться к команде
                  </p>
                </div>
              ) : (
                <p className="text-slate-400 text-sm">
                  Не состоит в команде и ищет возможности для участия в хакатоне
                </p>
              )}
            </div>
          )}

          {/* Hackathon Participation */}
          {targetParticipant.hackathonParticipations.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
              <h3 className="text-lg font-semibold text-white mb-4">Участие в хакатонах</h3>
              <div className="space-y-3">
                {targetParticipant.hackathonParticipations.map((participation) => (
                  <div key={participation.id} className="bg-slate-700/30 p-3 rounded-lg">
                    <h4 className="text-white font-medium text-sm">{participation.hackathon.name}</h4>
                    <p className="text-slate-400 text-xs">
                      Регистрация: {participation.registeredAt.toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PersonalCabinetLayout>
  )
}