import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { ParticipantProfileForm } from './participant-profile-form';
import { SignOutButton } from '@/components/sign-out-button';
import { TeamInviteLink } from '@/components/team-invite-link';
import { isOrganizer } from '@/lib/admin';
import Link from 'next/link';

interface ProfilePageProps {
    searchParams: Promise<{
        team?: string;
    }>;
}

interface ExtendedParticipant {
    id: string;
    name: string;
    email: string;
    city: string | null;
    company: string | null;
    experienceLevel?: string | null;
    technologies?: string | null;
    cloudServices?: string | null;
    cloudProviders?: string | null;
    otherTechnologies?: string | null;
    otherCloudServices?: string | null;
    otherCloudProviders?: string | null;
    team: {
        id: string;
        name: string;
        nickname: string;
        isDeleted: boolean;
        createdAt: Date;
        updatedAt: Date;
        leaderId: string | null;
    } | null;
    ledTeam: {
        id: string;
        name: string;
        nickname: string;
        isDeleted: boolean;
        createdAt: Date;
        updatedAt: Date;
        leaderId: string | null;
    } | null;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
    const session = await auth();

    if (!session?.user?.email) {
        redirect('/login');
    }

    // Check if user is an organizer - redirect to dashboard
    if (isOrganizer(session.user.email)) {
        redirect('/dashboard');
    }

    const { team } = await searchParams;

    // Check if user exists and has a participant profile
    const user = await db.user.findUnique({
        where: { email: session.user.email },
        include: {
            participant: {
                include: {
                    team: true,
                    ledTeam: true,
                },
            },
        },
    });

    if (!user) {
        redirect('/register');
    }

    // Check if team parameter exists and find the team
    let preselectedTeam = null;
    if (team) {
        try {
            preselectedTeam = await db.team.findUnique({
                where: {
                    nickname: team,
                    isDeleted: false
                },
                select: {
                    id: true,
                    name: true,
                    nickname: true,
                }
            });
        } catch (error) {
            console.error('Error finding team:', error);
        }
    }

    // If user exists but doesn't have a participant profile, show the form
    if (!user.participant) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-lg shadow-xl p-8">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Завершите регистрацию
                            </h1>
                            {preselectedTeam ? (
                                <div className="space-y-2">
                                    <p className="text-gray-600">
                                        Присоединяйтесь к команде
                                    </p>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <p className="text-blue-800 font-semibold">
                                            {preselectedTeam.name}
                                        </p>
                                        <p className="text-blue-600 text-sm">
                                            @{preselectedTeam.nickname}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-600">
                                    Пожалуйста, заполните информацию о себе
                                </p>
                            )}
                        </div>

                        <ParticipantProfileForm userEmail={session.user.email} preselectedTeam={preselectedTeam} />
                    </div>
                </div>
            </main>
        );
    }

    // User has a complete profile, show profile page
    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="container mx-auto max-w-4xl">
                <div className="bg-white rounded-lg shadow-xl p-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Мой профиль
                        </h1>
                        <p className="text-gray-600">
                            Ваша информация и команда
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Personal Information */}
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Личная информация</h2>
                            <div className="space-y-3">
                                <div>
                                    <span className="font-semibold text-gray-800">Имя:</span> <span className="text-gray-700">{user.participant.name}</span>
                                </div>
                                <div>
                                    <span className="font-semibold text-gray-800">Email:</span> <span className="text-gray-700">{user.participant.email}</span>
                                </div>
                                {user.participant.city && (
                                    <div>
                                        <span className="font-semibold text-gray-800">Город:</span> <span className="text-gray-700">{user.participant.city}</span>
                                    </div>
                                )}
                                {user.participant.company && (
                                    <div>
                                        <span className="font-semibold text-gray-800">Компания:</span> <span className="text-gray-700">{user.participant.company}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Team Information */}
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Команда</h2>
                            {user.participant.team ? (
                                <div className="space-y-3">
                                    <div>
                                        <span className="font-semibold text-gray-800">Название:</span> <span className="text-gray-700">{user.participant.team.name}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-gray-800">Nickname:</span> <span className="text-gray-700">@{user.participant.team.nickname}</span>
                                    </div>
                                    {user.participant.ledTeam && (
                                        <div className="text-green-600 font-medium">
                                            ⭐ Вы лидер этой команды
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-gray-600">Вы участвуете вне команды</p>
                            )}
                        </div>
                    </div>

                    {/* Experience Information */}
                    {((user.participant as ExtendedParticipant).experienceLevel || (user.participant as ExtendedParticipant).technologies || (user.participant as ExtendedParticipant).cloudServices || (user.participant as ExtendedParticipant).cloudProviders) && (
                        <div className="mt-8">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Опыт</h2>
                            <div className="space-y-3">
                                {(user.participant as ExtendedParticipant).experienceLevel && (
                                    <div>
                                        <span className="font-semibold text-gray-800">Уровень опыта:</span> <span className="text-gray-700">{(user.participant as ExtendedParticipant).experienceLevel}</span>
                                    </div>
                                )}
                                {(user.participant as ExtendedParticipant).technologies && (
                                    <div>
                                        <span className="font-semibold text-gray-800">Технологии:</span>
                                        <div className="mt-1">
                                            {JSON.parse((user.participant as ExtendedParticipant).technologies!).map((tech: string, index: number) => (
                                                <span key={index} className="inline-block bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded mr-2 mb-1">
                                                    {tech}
                                                </span>
                                            ))}
                                            {(user.participant as ExtendedParticipant).otherTechnologies && (
                                                <span className="inline-block bg-green-100 text-green-800 text-sm px-2 py-1 rounded mr-2 mb-1">
                                                    {(user.participant as ExtendedParticipant).otherTechnologies}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {(user.participant as ExtendedParticipant).cloudServices && (
                                    <div>
                                        <span className="font-semibold text-gray-800">Облачные сервисы:</span>
                                        <div className="mt-1">
                                            {JSON.parse((user.participant as ExtendedParticipant).cloudServices!).map((service: string, index: number) => (
                                                <span key={index} className="inline-block bg-purple-100 text-purple-800 text-sm px-2 py-1 rounded mr-2 mb-1">
                                                    {service}
                                                </span>
                                            ))}
                                            {(user.participant as ExtendedParticipant).otherCloudServices && (
                                                <span className="inline-block bg-green-100 text-green-800 text-sm px-2 py-1 rounded mr-2 mb-1">
                                                    {(user.participant as ExtendedParticipant).otherCloudServices}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {(user.participant as ExtendedParticipant).cloudProviders && (
                                    <div>
                                        <span className="font-semibold text-gray-800">Облачные провайдеры:</span>
                                        <div className="mt-1">
                                            {JSON.parse((user.participant as ExtendedParticipant).cloudProviders!).map((provider: string, index: number) => (
                                                <span key={index} className="inline-block bg-orange-100 text-orange-800 text-sm px-2 py-1 rounded mr-2 mb-1">
                                                    {provider}
                                                </span>
                                            ))}
                                            {(user.participant as ExtendedParticipant).otherCloudProviders && (
                                                <span className="inline-block bg-green-100 text-green-800 text-sm px-2 py-1 rounded mr-2 mb-1">
                                                    {(user.participant as ExtendedParticipant).otherCloudProviders}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Team Invite Link for Leaders */}
                    {user.participant.ledTeam && (
                        <div className="mt-8">
                            <TeamInviteLink teamNickname={user.participant.ledTeam.nickname} />
                        </div>
                    )}

                    <div className="mt-8 pt-8 border-t border-gray-200">
                        <div className="flex flex-wrap gap-4">
                            <Link
                                href="/"
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                            >
                                На главную
                            </Link>
                            <SignOutButton />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
