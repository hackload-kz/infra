import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { SignOutButton } from '@/components/sign-out-button'
import { isOrganizer } from '@/lib/admin'
import { 
  Users,
  Crown,
  Mail,
  MapPin,
  Building,
  Send,
  Code,
  Cloud,
  Briefcase,
  ArrowLeft,
  Calendar,
  UserCheck,
  Award
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{
    id: string
  }>
}

export default async function PublicParticipantPage({ params }: Props) {
  const resolvedParams = await params
  const session = await auth()
  const userIsOrganizer = isOrganizer(session?.user?.email)

  const participant = await db.participant.findUnique({
    where: { id: resolvedParams.id },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          nickname: true,
          status: true,
          _count: {
            select: {
              members: true
            }
          }
        }
      },
      ledTeam: {
        select: {
          id: true,
          name: true,
          nickname: true,
          status: true,
          _count: {
            select: {
              members: true
            }
          }
        }
      }
    }
  })

  if (!participant) {
    notFound()
  }

  // Log profile viewing
  console.info(`👁️ Profile viewed: ${session?.user?.email || 'Anonymous'} viewed participant ${participant.name} (${participant.email})`)

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
      <div className="container mx-auto max-w-4xl">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <Link
                href="/participants"
                className="inline-flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад к участникам</span>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {participant.name}
              </h1>
              <p className="text-gray-600">
                Профиль участника HackLoad 2025
              </p>
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

          {/* Profile Card */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <div className="flex items-center space-x-6 mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-2xl">
                  {participant.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  {participant.name}
                </h2>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Участник с {participant.createdAt.toLocaleDateString('ru-RU')}</span>
                  </div>
                  {participant.ledTeam && (
                    <div className="flex items-center space-x-1">
                      <Crown className="w-4 h-4 text-yellow-500" />
                      <span className="text-yellow-600 font-medium">Лидер команды</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-gray-600 text-sm">Email</p>
                    <p className="text-gray-900 font-medium">{participant.email}</p>
                  </div>
                </div>
              </div>
              
              {participant.company && (
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <Building className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-gray-600 text-sm">Компания</p>
                      <p className="text-gray-900 font-medium">{participant.company}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {participant.city && (
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-gray-600 text-sm">Город</p>
                      <p className="text-gray-900 font-medium">{participant.city}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {participant.telegram && (
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <Send className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-gray-600 text-sm">Telegram</p>
                      <a
                        href={participant.telegram.startsWith('http') ? participant.telegram : `https://t.me/${participant.telegram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        {participant.telegram.startsWith('http') ? 
                          participant.telegram.replace('https://t.me/', '@') : 
                          participant.telegram.startsWith('@') ? participant.telegram : `@${participant.telegram}`
                        }
                      </a>
                    </div>
                  </div>
                </div>
              )}
              
              {participant.experienceLevel && (
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-gray-600 text-sm">Уровень опыта</p>
                      <p className="text-gray-900 font-medium">{participant.experienceLevel}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Team Information */}
          {(participant.team || participant.ledTeam) && (
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 text-blue-600 mr-2" />
                Команда
              </h3>
              
              {participant.ledTeam && (
                <div className="bg-white p-4 rounded-lg border mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Crown className="w-5 h-5 text-yellow-500" />
                      <div>
                        <p className="text-gray-900 font-medium">Лидер команды</p>
                        <Link 
                          href={`/teams/${participant.ledTeam.nickname}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {participant.ledTeam.name}
                        </Link>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Участников</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {participant.ledTeam._count.members}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {participant.team && participant.team.id !== participant.ledTeam?.id && (
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <UserCheck className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-gray-900 font-medium">Участник команды</p>
                        <Link 
                          href={`/teams/${participant.team.nickname}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {participant.team.name}
                        </Link>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Участников</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {participant.team._count.members}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Technical Skills */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Award className="w-5 h-5 text-blue-600 mr-2" />
              Технические навыки
            </h3>
            
            <div className="space-y-6">
              {participant.technologies && parseTechnologies(participant.technologies).length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Code className="w-4 h-4 text-blue-600" />
                    <h4 className="text-lg font-medium text-gray-900">Технологии разработки</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {parseTechnologies(participant.technologies).map((tech: string) => (
                      <span key={tech} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {participant.cloudServices && parseTechnologies(participant.cloudServices).length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Cloud className="w-4 h-4 text-blue-600" />
                    <h4 className="text-lg font-medium text-gray-900">Облачные сервисы</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {parseTechnologies(participant.cloudServices).map((service: string) => (
                      <span key={service} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {participant.cloudProviders && parseTechnologies(participant.cloudProviders).length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Cloud className="w-4 h-4 text-blue-600" />
                    <h4 className="text-lg font-medium text-gray-900">Облачные провайдеры</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {parseTechnologies(participant.cloudProviders).map((provider: string) => (
                      <span key={provider} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                        {provider}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {participant.otherTechnologies && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Code className="w-4 h-4 text-blue-600" />
                    <h4 className="text-lg font-medium text-gray-900">Другие технологии</h4>
                  </div>
                  <p className="text-gray-700 bg-white p-3 rounded-lg border">
                    {participant.otherTechnologies}
                  </p>
                </div>
              )}
              
              {participant.otherCloudServices && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Cloud className="w-4 h-4 text-blue-600" />
                    <h4 className="text-lg font-medium text-gray-900">Другие облачные сервисы</h4>
                  </div>
                  <p className="text-gray-700 bg-white p-3 rounded-lg border">
                    {participant.otherCloudServices}
                  </p>
                </div>
              )}
              
              {participant.otherCloudProviders && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Cloud className="w-4 h-4 text-blue-600" />
                    <h4 className="text-lg font-medium text-gray-900">Другие облачные провайдеры</h4>
                  </div>
                  <p className="text-gray-700 bg-white p-3 rounded-lg border">
                    {participant.otherCloudProviders}
                  </p>
                </div>
              )}
              
              {(!participant.technologies || parseTechnologies(participant.technologies).length === 0) && 
               (!participant.cloudServices || parseTechnologies(participant.cloudServices).length === 0) && 
               (!participant.cloudProviders || parseTechnologies(participant.cloudProviders).length === 0) && 
               !participant.otherTechnologies && 
               !participant.otherCloudServices && 
               !participant.otherCloudProviders && (
                <div className="text-center py-8">
                  <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Технические навыки не указаны</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}