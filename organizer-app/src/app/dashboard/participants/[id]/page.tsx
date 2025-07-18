import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, Mail, Building, MapPin, Award, Github, Linkedin, MessageCircle, Calendar, Users, Crown } from 'lucide-react'
import { ParticipantPageClient } from '@/components/participant-page-client'

interface ParticipantPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function ParticipantPage({ params }: ParticipantPageProps) {
    const { id } = await params

    const participant = await db.participant.findUnique({
        where: { id },
        include: {
            user: true,
            team: true,
            ledTeam: true,
            hackathonParticipations: {
                include: {
                    hackathon: true
                }
            }
        },
    });

    if (!participant) {
        notFound()
    }

    // Get the current hackathon (assuming hackload-2025 for now)
    const hackathon = await db.hackathon.findFirst({
        where: { slug: 'hackload-2025' }
    });

    if (!hackathon) {
        notFound()
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Link href="/dashboard/teams">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Назад к командам
                    </Button>
                </Link>
                
                <ParticipantPageClient
                    participantId={participant.id}
                    participantName={participant.name}
                    hackathonId={hackathon.id}
                />
            </div>

            {/* Participant Header */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start space-x-4">
                    <div className="bg-gray-100 p-3 rounded-full">
                        <User className="w-8 h-8 text-gray-600" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold text-gray-900">{participant.name}</h1>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                participant.isActive 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                            }`}>
                                {participant.isActive ? 'Активен' : 'Заблокирован'}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-gray-600">
                            <div className="flex items-center">
                                <Mail className="w-4 h-4 mr-1" />
                                <a href={`mailto:${participant.email}`} className="text-blue-600 hover:text-blue-800">
                                    {participant.email}
                                </a>
                            </div>
                            {participant.company && (
                                <div className="flex items-center">
                                    <Building className="w-4 h-4 mr-1" />
                                    {participant.company}
                                </div>
                            )}
                            {participant.city && (
                                <div className="flex items-center">
                                    <MapPin className="w-4 h-4 mr-1" />
                                    {participant.city}
                                </div>
                            )}
                            {participant.telegram && (
                                <div className="flex items-center">
                                    <MessageCircle className="w-4 h-4 mr-1" />
                                    <a 
                                        href={participant.telegram.startsWith('http') ? participant.telegram : `https://t.me/${participant.telegram.replace('@', '')}`}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        Telegram
                                    </a>
                                </div>
                            )}
                            {participant.githubUrl && (
                                <div className="flex items-center">
                                    <Github className="w-4 h-4 mr-1" />
                                    <a 
                                        href={participant.githubUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        GitHub
                                    </a>
                                </div>
                            )}
                            {participant.linkedinUrl && (
                                <div className="flex items-center">
                                    <Linkedin className="w-4 h-4 mr-1" />
                                    <a 
                                        href={participant.linkedinUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        LinkedIn
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Participant Information */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Professional Information */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">Профессиональная информация</h2>
                    <div className="space-y-4">
                        {participant.experienceLevel && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Уровень опыта</label>
                                <p className="text-gray-700 flex items-center mt-1">
                                    <Award className="w-4 h-4 mr-2 text-amber-500" />
                                    {participant.experienceLevel}
                                </p>
                            </div>
                        )}
                        
                        {participant.technologies && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Используемые технологии</label>
                                <div className="mt-2">
                                    {(() => {
                                        try {
                                            const techs = JSON.parse(participant.technologies) as string[];
                                            return (
                                                <div className="flex flex-wrap gap-2">
                                                    {techs.map((tech, index) => (
                                                        <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm">
                                                            {tech}
                                                        </span>
                                                    ))}
                                                </div>
                                            );
                                        } catch {
                                            return <p className="text-gray-700">{participant.technologies}</p>;
                                        }
                                    })()}
                                </div>
                            </div>
                        )}

                        {participant.cloudServices && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Облачные сервисы</label>
                                <div className="mt-2">
                                    {(() => {
                                        try {
                                            const services = JSON.parse(participant.cloudServices) as string[];
                                            return (
                                                <div className="flex flex-wrap gap-2">
                                                    {services.map((service, index) => (
                                                        <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-sm">
                                                            {service}
                                                        </span>
                                                    ))}
                                                </div>
                                            );
                                        } catch {
                                            return <p className="text-gray-700">{participant.cloudServices}</p>;
                                        }
                                    })()}
                                </div>
                            </div>
                        )}

                        {participant.cloudProviders && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Облачные провайдеры</label>
                                <div className="mt-2">
                                    {(() => {
                                        try {
                                            const providers = JSON.parse(participant.cloudProviders) as string[];
                                            return (
                                                <div className="flex flex-wrap gap-2">
                                                    {providers.map((provider, index) => (
                                                        <span key={index} className="bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-sm">
                                                            {provider}
                                                        </span>
                                                    ))}
                                                </div>
                                            );
                                        } catch {
                                            return <p className="text-gray-700">{participant.cloudProviders}</p>;
                                        }
                                    })()}
                                </div>
                            </div>
                        )}

                        {/* Programming Languages */}
                        {participant.programmingLanguages && participant.programmingLanguages.length > 0 && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Языки программирования</label>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {participant.programmingLanguages.map((lang, index) => (
                                        <span key={index} className="bg-orange-100 text-orange-800 px-2 py-1 rounded-md text-sm">
                                            {lang}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Databases */}
                        {participant.databases && participant.databases.length > 0 && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Базы данных</label>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {participant.databases.map((db, index) => (
                                        <span key={index} className="bg-cyan-100 text-cyan-800 px-2 py-1 rounded-md text-sm">
                                            {db}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        {participant.description && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Описание профиля</label>
                                <p className="text-gray-700 mt-2 bg-gray-50 p-3 rounded-md text-sm">
                                    {participant.description}
                                </p>
                            </div>
                        )}

                        {/* Additional Technologies */}
                        {(participant.otherTechnologies || participant.otherCloudServices || participant.otherCloudProviders) && (
                            <div className="border-t pt-4">
                                <label className="text-sm font-medium text-gray-500">Дополнительная информация</label>
                                <div className="mt-2 space-y-2">
                                    {participant.otherTechnologies && (
                                        <div>
                                            <span className="text-xs font-medium text-gray-500">Другие технологии:</span>
                                            <p className="text-gray-700 text-sm">{participant.otherTechnologies}</p>
                                        </div>
                                    )}
                                    {participant.otherCloudServices && (
                                        <div>
                                            <span className="text-xs font-medium text-gray-500">Другие облачные сервисы:</span>
                                            <p className="text-gray-700 text-sm">{participant.otherCloudServices}</p>
                                        </div>
                                    )}
                                    {participant.otherCloudProviders && (
                                        <div>
                                            <span className="text-xs font-medium text-gray-500">Другие облачные провайдеры:</span>
                                            <p className="text-gray-700 text-sm">{participant.otherCloudProviders}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Team Information */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-blue-500" />
                        Командная информация
                    </h2>
                    <div className="space-y-4">
                        {participant.team ? (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Команда</label>
                                <div className="mt-1">
                                    <Link 
                                        href={`/dashboard/teams/${participant.team.nickname}`}
                                        className="block text-blue-600 hover:text-blue-800 font-medium text-lg"
                                    >
                                        {participant.team.name}
                                    </Link>
                                    <p className="text-sm text-gray-600">@{participant.team.nickname}</p>
                                    <div className="mt-2 flex items-center text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            participant.team.status === 'NEW' ? 'bg-gray-100 text-gray-800' :
                                            participant.team.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                            participant.team.status === 'IN_REVIEW' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                            {participant.team.status}
                                        </span>
                                        {participant.team.level && (
                                            <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                                {participant.team.level}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Команда</label>
                                <p className="text-gray-500 italic mt-1">Не состоит в команде</p>
                            </div>
                        )}

                        <div>
                            <label className="text-sm font-medium text-gray-500">Роль в команде</label>
                            <div className="mt-1">
                                {participant.ledTeam ? (
                                    <div className="flex items-center">
                                        <Crown className="w-4 h-4 mr-1 text-yellow-500" />
                                        <span className="bg-yellow-50 text-yellow-800 px-2 py-1 rounded text-sm font-medium">
                                            Лидер команды
                                        </span>
                                    </div>
                                ) : participant.team ? (
                                    <span className="bg-blue-50 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                                        Участник команды
                                    </span>
                                ) : (
                                    <span className="text-gray-500 italic">Без команды</span>
                                )}
                            </div>
                        </div>

                        {participant.team?.comment && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Описание проекта</label>
                                <p className="text-gray-700 mt-1 text-sm bg-gray-50 p-3 rounded-md">
                                    {participant.team.comment}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Hackathon Participation */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-green-500" />
                        Участие в хакатонах
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-500">Дата регистрации</label>
                            <p className="text-gray-900 mt-1 flex items-center">
                                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                {participant.createdAt.toLocaleDateString('ru-RU', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                        </div>

                        {participant.hackathonParticipations && participant.hackathonParticipations.length > 0 && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Участие в хакатонах</label>
                                <div className="mt-2 space-y-2">
                                    {participant.hackathonParticipations.map((participation, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-md">
                                            <div>
                                                <p className="font-medium text-green-800">{participation.hackathon.name}</p>
                                                <p className="text-sm text-green-600">
                                                    Зарегистрирован: {participation.registeredAt.toLocaleDateString('ru-RU')}
                                                </p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                participation.isActive 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {participation.isActive ? 'Активен' : 'Неактивен'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* User Account Information */}
                        <div className="border-t pt-4">
                            <label className="text-sm font-medium text-gray-500">Информация об аккаунте</label>
                            <div className="mt-2 text-sm text-gray-600 space-y-1">
                                <p><span className="font-medium">User ID:</span> <code className="bg-gray-100 px-1 rounded">{participant.userId}</code></p>
                                <p><span className="font-medium">Participant ID:</span> <code className="bg-gray-100 px-1 rounded">{participant.id}</code></p>
                                <p>
                                    <span className="font-medium">Последнее обновление:</span> 
                                    {' '}{participant.updatedAt.toLocaleDateString('ru-RU', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}