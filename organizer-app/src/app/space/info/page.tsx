import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { isOrganizer } from '@/lib/admin'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { 
  Mail,
  MapPin,
  Building,
  Calendar,
  Award,
  Code,
  Edit,
  Send,
  Github
} from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ProfileInfoPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  // Check if user is an organizer
  const userIsOrganizer = isOrganizer(session.user.email)

  // Check if user exists and has a participant profile
  const user = await db.user.findUnique({
    where: { email: session.user.email },
    include: {
      participant: {
        include: {
          user: true,
          team: true,
          ledTeam: true,
        },
      },
    },
  })

  // User should exist because OAuth creates them in auth.config.ts
  // If for some reason they don't exist, something went wrong
  if (!user) {
    console.error('User not found in database after OAuth login:', session.user.email);
    redirect('/login');
  }

  // If user exists but doesn't have a participant profile, redirect to edit
  // But allow organizers to view the page even without participant profile
  if (!user.participant && !userIsOrganizer) {
    redirect('/space/info/edit?first=true');
  }

  const participant = user.participant;

  // For organizers without participant data, create a fallback user object
  const userForLayout = participant ? {
    name: participant.name,
    email: participant.email,
    image: session.user?.image || undefined
  } : {
    name: session.user.name || 'Организатор',
    email: session.user.email,
    image: session.user?.image || undefined
  }

  const hasTeam = !!(participant?.team || participant?.ledTeam)

  return (
    <PersonalCabinetLayout user={userForLayout} hasTeam={hasTeam}>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Информация о <span className="text-amber-400">профиле</span>
        </h1>
        <div className="w-16 h-1 bg-amber-400 rounded-full"></div>
      </div>

      {!participant && userIsOrganizer ? (
        <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-lg border border-slate-700/30 text-center">
          <div className="w-24 h-24 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full mx-auto mb-6 flex items-center justify-center">
            <div className="w-12 h-12 text-slate-900 font-bold text-2xl">
              {userForLayout.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">{userForLayout.name}</h2>
          <p className="text-amber-400 font-medium mb-4">Организатор</p>
          <p className="text-slate-300 mb-6 max-w-md mx-auto">
            Вы авторизованы как организатор. Чтобы участвовать в хакатоне как участник, необходимо создать профиль участника.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/space/info/edit?first=true" className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-6 py-3 rounded-lg font-medium transition-colors duration-150">
              Создать профиль участника
            </Link>
          </div>
        </div>
      ) : participant ? (
        <>
          {/* Profile Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Basic Information */}
        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Award className="w-5 h-5 text-amber-400 mr-2" />
            Основная информация
          </h2>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-amber-400/20 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 text-amber-400 font-bold">👤</div>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Имя</p>
                <p className="text-white font-medium">{participant.name}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-amber-400/20 rounded-lg flex items-center justify-center">
                <Mail className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Email</p>
                <p className="text-white font-medium">{participant.email}</p>
              </div>
            </div>
            {participant.city && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-amber-400/20 rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Город</p>
                  <p className="text-white font-medium">{participant.city}</p>
                </div>
              </div>
            )}
            {participant.company && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-amber-400/20 rounded-lg flex items-center justify-center">
                  <Building className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Компания</p>
                  <p className="text-white font-medium">{participant.company}</p>
                </div>
              </div>
            )}
            {participant.telegram && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-amber-400/20 rounded-lg flex items-center justify-center">
                  <Send className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Telegram</p>
                  <a
                    href={participant.telegram.startsWith('http') ? participant.telegram : `https://t.me/${participant.telegram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 font-medium hover:text-amber-300 transition-colors"
                  >
                    {participant.telegram.startsWith('http') ? 
                      participant.telegram.replace('https://t.me/', '@') : 
                      participant.telegram.startsWith('@') ? participant.telegram : `@${participant.telegram}`
                    }
                  </a>
                </div>
              </div>
            )}
            {participant.githubUrl && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-amber-400/20 rounded-lg flex items-center justify-center">
                  <Github className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">GitHub</p>
                  <a
                    href={participant.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 font-medium hover:text-amber-300 transition-colors"
                  >
                    GitHub Profile
                  </a>
                </div>
              </div>
            )}
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-amber-400/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Дата регистрации</p>
                <p className="text-white font-medium">
                  {participant.createdAt.toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Information */}
        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Code className="w-5 h-5 text-amber-400 mr-2" />
            Профессиональная информация
          </h2>
          <div className="space-y-6">
            {participant.experienceLevel && (
              <div>
                <p className="text-slate-400 text-sm mb-2">Уровень опыта</p>
                <div className="flex items-center space-x-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span className="text-white font-medium">{participant.experienceLevel}</span>
                </div>
              </div>
            )}
            
            {participant.technologies && (
              <div>
                <p className="text-slate-400 text-sm mb-2">Технологии</p>
                <div className="flex flex-wrap gap-2">
                  {JSON.parse(participant.technologies).map((tech: string, index: number) => (
                    <span key={index} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                      {tech}
                    </span>
                  ))}
                </div>
                {participant.otherTechnologies && (
                  <div className="mt-2">
                    <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
                      {participant.otherTechnologies}
                    </span>
                  </div>
                )}
              </div>
            )}

            {participant.cloudServices && (
              <div>
                <p className="text-slate-400 text-sm mb-2">Облачные сервисы</p>
                <div className="flex flex-wrap gap-2">
                  {JSON.parse(participant.cloudServices).map((service: string, index: number) => (
                    <span key={index} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                      {service}
                    </span>
                  ))}
                </div>
                {participant.otherCloudServices && (
                  <div className="mt-2">
                    <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
                      {participant.otherCloudServices}
                    </span>
                  </div>
                )}
              </div>
            )}

            {participant.cloudProviders && (
              <div>
                <p className="text-slate-400 text-sm mb-2">Облачные провайдеры</p>
                <div className="flex flex-wrap gap-2">
                  {JSON.parse(participant.cloudProviders).map((provider: string, index: number) => (
                    <span key={index} className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full text-sm">
                      {provider}
                    </span>
                  ))}
                </div>
                {participant.otherCloudProviders && (
                  <div className="mt-2">
                    <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
                      {participant.otherCloudProviders}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

          {/* Technical Skills */}
          {(participant.programmingLanguages?.length || participant.databases?.length || participant.description) && (
            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30 mt-8">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                <Code className="w-5 h-5 text-amber-400 mr-2" />
                Технические навыки
              </h2>
              <div className="space-y-6">
                {participant.programmingLanguages && participant.programmingLanguages.length > 0 && (
                  <div>
                    <p className="text-slate-400 text-sm mb-2">Языки программирования</p>
                    <div className="flex flex-wrap gap-2">
                      {participant.programmingLanguages.map((lang: string, index: number) => (
                        <span key={index} className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-sm">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {participant.databases && participant.databases.length > 0 && (
                  <div>
                    <p className="text-slate-400 text-sm mb-2">Базы данных</p>
                    <div className="flex flex-wrap gap-2">
                      {participant.databases.map((db: string, index: number) => (
                        <span key={index} className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-sm">
                          {db}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {participant.description && (
                  <div>
                    <p className="text-slate-400 text-sm mb-2">Описание профиля</p>
                    <p className="text-slate-300 bg-slate-700/30 p-4 rounded-lg">
                      {participant.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8">
            <Link
              href="/space/info/edit"
              className="inline-flex items-center space-x-2 bg-amber-400 hover:bg-amber-500 text-slate-900 px-6 py-3 rounded-lg font-medium transition-colors duration-150"
            >
              <Edit className="w-4 h-4" />
              <span>Редактировать профиль</span>
            </Link>
          </div>
        </>
      ) : null}
    </PersonalCabinetLayout>
  )
}