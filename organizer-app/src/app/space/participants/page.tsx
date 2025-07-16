import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import Link from 'next/link'
import { 
  Users,
  Crown,
  Mail,
  MapPin,
  Building,
  Send,
  UserPlus,
  Search,
  Award,
  Code,
  Cloud
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SpaceParticipantsPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  // Check if user is an organizer
  const userIsOrganizer = isOrganizer(session.user.email)

  const [participant, availableParticipants] = await Promise.all([
    db.participant.findFirst({
      where: { 
        user: { email: session.user.email } 
      },
      include: {
        user: true,
        team: {
          include: {
            members: true,
            leader: true
          }
        },
        ledTeam: true
      },
    }),
    db.participant.findMany({
      where: {
        AND: [
          { team: null }, // Not in any team
          { user: { email: { not: session.user.email } } }, // Not the current user
          { isActive: true } // Only active participants
        ]
      },
      include: {
        user: true,
        hackathonParticipations: {
          include: {
            hackathon: true
          }
        }
      },
      take: 50,
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

  const currentTeam = participant?.team
  const isLeader = !!participant?.ledTeam
  const teamHasSpace = currentTeam && currentTeam.members.length < 4

  return (
    <PersonalCabinetLayout user={user}>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Поиск <span className="text-amber-400">участников</span>
        </h1>
        <div className="w-16 h-1 bg-amber-400 rounded-full"></div>
        <p className="text-slate-400 mt-4">
          Найдите участников для приглашения в вашу команду
        </p>
      </div>

      {/* Team Status */}
      {!currentTeam && (
        <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 mb-8">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-yellow-400" />
            <p className="text-yellow-200">
              Сначала создайте команду, чтобы приглашать участников.
            </p>
          </div>
          <Link
            href="/space/team"
            className="inline-flex items-center space-x-2 bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-2 rounded-lg font-medium transition-colors duration-150 mt-3"
          >
            <Users className="w-4 h-4" />
            <span>Управление командой</span>
          </Link>
        </div>
      )}

      {currentTeam && !teamHasSpace && (
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-8">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-400" />
            <p className="text-blue-200">
              В вашей команде уже максимальное количество участников (4/4).
            </p>
          </div>
        </div>
      )}

      {currentTeam && !isLeader && (
        <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-4 mb-8">
          <div className="flex items-center space-x-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <p className="text-amber-200">
              Только лидер команды может приглашать новых участников.
            </p>
          </div>
        </div>
      )}

      {/* Current Team Info */}
      {currentTeam && (
        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Ваша команда</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">{currentTeam.name}</p>
              <p className="text-slate-400 text-sm">@{currentTeam.nickname}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <p className="text-white font-semibold">{currentTeam.members.length}/4</p>
                <p className="text-slate-400 text-xs">Участники</p>
              </div>
              {isLeader && (
                <div className="flex items-center space-x-2 text-amber-400">
                  <Crown className="w-4 h-4" />
                  <span className="text-sm">Лидер</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Available Participants */}
      <div className="space-y-6">
        {availableParticipants.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                Доступные участники ({availableParticipants.length})
              </h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {availableParticipants.map((availableParticipant) => (
                <div key={availableParticipant.id} className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
                  {/* Participant Header */}
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full flex items-center justify-center">
                      <span className="text-slate-900 font-bold text-xl">
                        {availableParticipant.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">{availableParticipant.name}</h3>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-sm text-slate-400">
                          <Mail className="w-3 h-3" />
                          <span>{availableParticipant.email}</span>
                        </div>
                        {availableParticipant.company && (
                          <div className="flex items-center space-x-2 text-sm text-slate-400">
                            <Building className="w-3 h-3" />
                            <span>{availableParticipant.company}</span>
                          </div>
                        )}
                        {availableParticipant.city && (
                          <div className="flex items-center space-x-2 text-sm text-slate-400">
                            <MapPin className="w-3 h-3" />
                            <span>{availableParticipant.city}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Experience Level */}
                  {availableParticipant.experienceLevel && (
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Award className="w-4 h-4 text-amber-400" />
                        <span className="text-white font-medium">Уровень опыта:</span>
                      </div>
                      <span className="bg-amber-400/20 text-amber-400 px-3 py-1 rounded-full text-sm">
                        {availableParticipant.experienceLevel}
                      </span>
                    </div>
                  )}

                  {/* Technologies */}
                  {availableParticipant.technologies && (() => {
                    try {
                      const techs = JSON.parse(availableParticipant.technologies)
                      return Array.isArray(techs) && techs.length > 0 ? (
                        <div className="mb-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Code className="w-4 h-4 text-amber-400" />
                            <span className="text-white font-medium">Технологии:</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {techs.slice(0, 6).map((tech, index) => (
                              <span key={index} className="bg-slate-700/50 text-slate-300 px-2 py-1 rounded text-xs">
                                {tech}
                              </span>
                            ))}
                            {techs.length > 6 && (
                              <span className="text-slate-400 text-xs">+{techs.length - 6} ещё</span>
                            )}
                          </div>
                        </div>
                      ) : null
                    } catch {
                      return null
                    }
                  })()}

                  {/* Cloud Services */}
                  {availableParticipant.cloudServices && (() => {
                    try {
                      const services = JSON.parse(availableParticipant.cloudServices)
                      return Array.isArray(services) && services.length > 0 ? (
                        <div className="mb-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Cloud className="w-4 h-4 text-amber-400" />
                            <span className="text-white font-medium">Облачные сервисы:</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {services.slice(0, 4).map((service, index) => (
                              <span key={index} className="bg-slate-700/50 text-slate-300 px-2 py-1 rounded text-xs">
                                {service}
                              </span>
                            ))}
                            {services.length > 4 && (
                              <span className="text-slate-400 text-xs">+{services.length - 4} ещё</span>
                            )}
                          </div>
                        </div>
                      ) : null
                    } catch {
                      return null
                    }
                  })()}

                  {/* Telegram Contact */}
                  {availableParticipant.telegram && (
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 text-sm text-slate-400">
                        <Send className="w-3 h-3" />
                        <a
                          href={availableParticipant.telegram.startsWith('http') ? availableParticipant.telegram : `https://t.me/${availableParticipant.telegram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-amber-400 transition-colors"
                        >
                          {availableParticipant.telegram.startsWith('http') ? 
                            availableParticipant.telegram.replace('https://t.me/', '@') : 
                            availableParticipant.telegram.startsWith('@') ? availableParticipant.telegram : `@${availableParticipant.telegram}`
                          }
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Link
                      href={`/space/participants/${availableParticipant.id}`}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-150 text-center"
                    >
                      Подробнее
                    </Link>
                    
                    {participant && currentTeam && isLeader && teamHasSpace && (
                      availableParticipant.telegram ? (
                        <a
                          href={`https://t.me/${availableParticipant.telegram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center space-x-2 flex-1 bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-150"
                        >
                          <Send className="w-4 h-4" />
                          <span>Написать в Telegram</span>
                        </a>
                      ) : (
                        <a
                          href={`mailto:${availableParticipant.email}?subject=Приглашение в команду ${currentTeam.name}&body=Привет! Меня зовут ${participant.name}, я лидер команды "${currentTeam.name}". Приглашаю тебя присоединиться к нашей команде для участия в хакатоне HackLoad 2025. Если интересно, напиши мне!`}
                          className="flex items-center justify-center space-x-2 flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-150"
                        >
                          <Mail className="w-4 h-4" />
                          <span>Написать на почту</span>
                        </a>
                      )
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
              Нет доступных участников
            </h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              В данный момент нет участников без команды. Попробуйте позже или найдите команду для присоединения.
            </p>
            <Link
              href="/space/teams"
              className="inline-flex items-center space-x-2 bg-amber-400 hover:bg-amber-500 text-slate-900 px-6 py-3 rounded-lg font-medium transition-colors duration-150"
            >
              <Users className="w-5 h-5" />
              <span>Найти команду</span>
            </Link>
          </div>
        )}
      </div>
    </PersonalCabinetLayout>
  )
}