'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { respondToJoinRequest } from '@/lib/actions'
import Link from 'next/link'
import { 
  Clock,
  Mail,
  MapPin,
  Building,
  Send,
  Code,
  Cloud,
  Briefcase,
  AlertCircle,
  UserCheck,
  UserX
} from 'lucide-react'

interface JoinRequest {
  id: string
  message: string | null
  createdAt: Date
  participant: {
    id: string
    name: string
    email: string
    city: string | null
    company: string | null
    telegram: string | null
    experienceLevel: string | null
    technologies: string | null
    cloudServices: string | null
    cloudProviders: string | null
    otherTechnologies: string | null
    otherCloudServices: string | null
    otherCloudProviders: string | null
  }
}

interface JoinRequestsManagementProps {
  joinRequests: JoinRequest[]
  teamLeaderId: string
  baseUrl?: string // Base URL for participant profiles, defaults to '/dashboard'
}

export function JoinRequestsManagement({ joinRequests, teamLeaderId, baseUrl = '/dashboard' }: JoinRequestsManagementProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleResponse = async (joinRequestId: string, action: 'approve' | 'decline') => {
    setLoading(joinRequestId)
    setError(null)

    try {
      await respondToJoinRequest(joinRequestId, action, teamLeaderId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка')
    } finally {
      setLoading(null)
    }
  }

  const parseTechnologies = (techString: string | null) => {
    if (!techString) return []
    try {
      return JSON.parse(techString)
    } catch {
      return []
    }
  }

  if (joinRequests.length === 0) {
    return null
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white flex items-center">
          <Clock className="w-5 h-5 text-amber-400 mr-2" />
          Заявки на вступление ({joinRequests.length})
        </h3>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {joinRequests.map((request) => (
          <div key={request.id} className="bg-slate-700/30 p-6 rounded-lg">
            {/* Participant Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full flex items-center justify-center">
                  <span className="text-slate-900 font-bold">
                    {request.participant.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="text-white font-medium text-lg">{request.participant.name}</h4>
                  <p className="text-slate-400 text-sm">
                    Заявка от {request.createdAt.toLocaleDateString('ru-RU', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleResponse(request.id, 'approve')}
                  disabled={loading === request.id}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 flex items-center space-x-2"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{loading === request.id ? 'Обработка...' : 'Принять'}</span>
                </button>
                <button
                  onClick={() => handleResponse(request.id, 'decline')}
                  disabled={loading === request.id}
                  className="bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 flex items-center space-x-2"
                >
                  <UserX className="w-4 h-4" />
                  <span>{loading === request.id ? 'Обработка...' : 'Отклонить'}</span>
                </button>
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <h5 className="text-slate-300 font-medium text-sm">Контактная информация:</h5>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-sm text-slate-400">
                    <Mail className="w-3 h-3" />
                    <span>{request.participant.email}</span>
                  </div>
                  {request.participant.company && (
                    <div className="flex items-center space-x-2 text-sm text-slate-400">
                      <Building className="w-3 h-3" />
                      <span>{request.participant.company}</span>
                    </div>
                  )}
                  {request.participant.city && (
                    <div className="flex items-center space-x-2 text-sm text-slate-400">
                      <MapPin className="w-3 h-3" />
                      <span>{request.participant.city}</span>
                    </div>
                  )}
                  {request.participant.telegram && (
                    <div className="flex items-center space-x-2 text-sm text-slate-400">
                      <Send className="w-3 h-3" />
                      <a
                        href={request.participant.telegram.startsWith('http') ? request.participant.telegram : `https://t.me/${request.participant.telegram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-amber-400 transition-colors"
                      >
                        {request.participant.telegram.startsWith('http') ? 
                          request.participant.telegram.replace('https://t.me/', '@') : 
                          request.participant.telegram.startsWith('@') ? request.participant.telegram : `@${request.participant.telegram}`
                        }
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-slate-300 font-medium text-sm">Опыт и навыки:</h5>
                <div className="space-y-2">
                  {request.participant.experienceLevel && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Briefcase className="w-3 h-3 text-amber-400" />
                      <span className="text-slate-300">Опыт: {request.participant.experienceLevel}</span>
                    </div>
                  )}
                  
                  {request.participant.technologies && parseTechnologies(request.participant.technologies).length > 0 && (
                    <div className="flex items-start space-x-2 text-sm">
                      <Code className="w-3 h-3 text-amber-400 mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {parseTechnologies(request.participant.technologies).slice(0, 5).map((tech: string) => (
                          <span key={tech} className="bg-slate-600/50 text-slate-300 px-2 py-0.5 rounded text-xs">
                            {tech}
                          </span>
                        ))}
                        {parseTechnologies(request.participant.technologies).length > 5 && (
                          <span className="text-slate-400 text-xs">+{parseTechnologies(request.participant.technologies).length - 5}</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {request.participant.cloudServices && parseTechnologies(request.participant.cloudServices).length > 0 && (
                    <div className="flex items-start space-x-2 text-sm">
                      <Cloud className="w-3 h-3 text-amber-400 mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {parseTechnologies(request.participant.cloudServices).slice(0, 3).map((service: string) => (
                          <span key={service} className="bg-slate-600/50 text-slate-300 px-2 py-0.5 rounded text-xs">
                            {service}
                          </span>
                        ))}
                        {parseTechnologies(request.participant.cloudServices).length > 3 && (
                          <span className="text-slate-400 text-xs">+{parseTechnologies(request.participant.cloudServices).length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Message */}
            {request.message && (
              <div className="bg-slate-800/50 p-4 rounded-lg mb-4">
                <h5 className="text-slate-300 font-medium text-sm mb-2">Сообщение от участника:</h5>
                <p className="text-slate-200 text-sm italic">&quot;{request.message}&quot;</p>
              </div>
            )}

            {/* Full Profile Link */}
            <div className="pt-4 border-t border-slate-600/30">
              <Link 
                href={`${baseUrl}/participants/${request.participant.id}`}
                className="text-amber-400 hover:text-amber-300 text-sm transition-colors"
              >
                Посмотреть полный профиль участника →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}