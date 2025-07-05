import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import PersonalCabinetLayout from '@/components/personal-cabinet-layout'
import { 
  Mail,
  MapPin,
  Building,
  Calendar,
  Award,
  Code,
  Edit
} from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ProfileInfoPage() {
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
      team: true,
      ledTeam: true,
    },
  })

  if (!participant) {
    redirect('/login')
  }

  const user = {
    name: participant.name,
    email: participant.email,
    image: session.user?.image
  }

  return (
    <PersonalCabinetLayout user={user}>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Информация о <span className="text-amber-400">профиле</span>
        </h1>
        <div className="w-16 h-1 bg-amber-400 rounded-full"></div>
      </div>

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
    </PersonalCabinetLayout>
  )
}