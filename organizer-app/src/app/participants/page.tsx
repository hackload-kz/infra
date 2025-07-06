import { db } from '@/lib/db'
import Link from 'next/link'
import { auth } from '@/auth'
import { SignOutButton } from '@/components/sign-out-button'
import { isOrganizer } from '@/lib/admin'
import { getCurrentHackathon } from '@/lib/hackathon'
import { 
  Users,
  MapPin,
  Building,
  Briefcase,
  ArrowLeft,
  Search
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PublicParticipantsPage() {
  const session = await auth()
  const userIsOrganizer = isOrganizer(session?.user?.email)
  
  // Get current hackathon
  const hackathon = await getCurrentHackathon()

  const participants = await db.participant.findMany({
    select: {
      id: true,
      name: true,
      email: false, // Don't expose emails publicly
      city: true,
      company: true,
      telegram: false, // Don't expose telegram publicly
      experienceLevel: true,
      technologies: true,
      cloudServices: false, // Don't load large JSON in list view
      cloudProviders: false, // Don't load large JSON in list view
      team: {
        select: {
          id: true,
          name: true,
          nickname: true,
        }
      }
    },
    take: 100, // Limit to 100 participants
    orderBy: {
      createdAt: 'desc'
    }
  })

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
                href="/"
                className="inline-flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>На главную</span>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Участники {hackathon?.name || 'хакатона'}
              </h1>
              <p className="text-gray-600">
                Познакомьтесь с участниками {hackathon?.name || 'хакатона'}
              </p>
              {hackathon?.theme && (
                <p className="text-gray-600 text-sm mt-1">
                  Тема: {hackathon.theme}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/teams"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Команды
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
                      href="/space"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Мой кабинет
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

          {/* Stats */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border text-center">
                <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{participants.length}</p>
                <p className="text-gray-600 text-sm">Всего участников</p>
              </div>
              <div className="bg-white p-4 rounded-lg border text-center">
                <Building className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {participants.filter(p => p.company).length}
                </p>
                <p className="text-gray-600 text-sm">С указанной компанией</p>
              </div>
              <div className="bg-white p-4 rounded-lg border text-center">
                <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {participants.filter(p => p.team).length}
                </p>
                <p className="text-gray-600 text-sm">В командах</p>
              </div>
            </div>
          </div>

          {/* Participants List */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <Search className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Список участников
              </h2>
            </div>
            
            {participants.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {participants.map((participant) => (
                  <Link 
                    key={participant.id} 
                    href={`/participants/${participant.id}`}
                    className="bg-gray-50 p-6 rounded-lg border hover:shadow-md hover:border-blue-200 transition-all duration-200"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">
                          {participant.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-gray-900 font-medium mb-2 truncate">
                          {participant.name}
                        </h3>
                        
                        <div className="space-y-1 mb-3">
                          {participant.company && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Building className="w-3 h-3" />
                              <span className="truncate">{participant.company}</span>
                            </div>
                          )}
                          {participant.city && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <MapPin className="w-3 h-3" />
                              <span>{participant.city}</span>
                            </div>
                          )}
                          {participant.team && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Users className="w-3 h-3" />
                              <span className="truncate">{participant.team.name}</span>
                            </div>
                          )}
                        </div>

                        {/* Technical Skills Preview */}
                        <div className="space-y-2">
                          {participant.experienceLevel && (
                            <div className="flex items-center space-x-2 text-xs">
                              <Briefcase className="w-3 h-3 text-blue-600" />
                              <span className="text-gray-700">{participant.experienceLevel}</span>
                            </div>
                          )}
                          
                          {participant.technologies && parseTechnologies(participant.technologies).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {parseTechnologies(participant.technologies).slice(0, 2).map((tech: string) => (
                                <span key={tech} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                                  {tech}
                                </span>
                              ))}
                              {parseTechnologies(participant.technologies).length > 2 && (
                                <span className="text-gray-500 text-xs">+{parseTechnologies(participant.technologies).length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Участники еще не зарегистрированы</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}