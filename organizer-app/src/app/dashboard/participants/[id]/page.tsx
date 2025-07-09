import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, Mail, Building, MapPin, Award } from 'lucide-react'
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
                        <h1 className="text-3xl font-bold text-gray-900">{participant.name}</h1>
                        <div className="flex items-center space-x-4 mt-2 text-gray-600">
                            <div className="flex items-center">
                                <Mail className="w-4 h-4 mr-1" />
                                {participant.email}
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
                        </div>
                    </div>
                </div>
            </div>

            {/* Participant Information */}
            <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">Профессиональная информация</h2>
                    <div className="space-y-4">
                        {participant.experienceLevel && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Уровень опыта</label>
                                <p className="text-gray-900 flex items-center">
                                    <Award className="w-4 h-4 mr-2" />
                                    {participant.experienceLevel}
                                </p>
                            </div>
                        )}
                        {participant.technologies && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Технологии</label>
                                <p className="text-gray-900">{participant.technologies}</p>
                            </div>
                        )}
                        {participant.cloudServices && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Облачные сервисы</label>
                                <p className="text-gray-900">{participant.cloudServices}</p>
                            </div>
                        )}
                        {participant.cloudProviders && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Облачные провайдеры</label>
                                <p className="text-gray-900">{participant.cloudProviders}</p>
                            </div>
                        )}
                        {participant.otherTechnologies && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Другие технологии</label>
                                <p className="text-gray-900">{participant.otherTechnologies}</p>
                            </div>
                        )}
                        {participant.otherCloudServices && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Другие облачные сервисы</label>
                                <p className="text-gray-900">{participant.otherCloudServices}</p>
                            </div>
                        )}
                        {participant.otherCloudProviders && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Другие облачные провайдеры</label>
                                <p className="text-gray-900">{participant.otherCloudProviders}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Team Information */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">Командная информация</h2>
                    <div className="space-y-4">
                        {participant.team ? (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Команда</label>
                                <Link 
                                    href={`/dashboard/teams/${participant.team.nickname}`}
                                    className="block text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    {participant.team.name}
                                </Link>
                                <p className="text-sm text-gray-600">@{participant.team.nickname}</p>
                            </div>
                        ) : (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Команда</label>
                                <p className="text-gray-500">Не состоит в команде</p>
                            </div>
                        )}

                        {participant.ledTeam && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Роль</label>
                                <p className="text-gray-900 bg-blue-50 px-2 py-1 rounded text-sm font-medium">
                                    Лидер команды
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="text-sm font-medium text-gray-500">Дата регистрации</label>
                            <p className="text-gray-900">
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
        </div>
    )
}