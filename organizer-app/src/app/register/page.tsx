import { db } from '@/lib/db';
import Link from 'next/link';
import { Globe, Users, Calendar, BookOpen } from 'lucide-react';

interface RegisterPageProps {
    searchParams: Promise<{
        team?: string;
    }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
    // Register page is just for showing OAuth login options
    // After OAuth, users go to /profile to complete registration

    const { team } = await searchParams;

    // Check if team parameter exists and find the team
    let preselectedTeam = null;
    if (team) {
        try {
            preselectedTeam = await db.team.findUnique({
                where: {
                    nickname: team,
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

    // Store team info in URL parameters for after OAuth login
    const loginUrl = team ? `/login?team=${team}` : '/login';

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute top-40 right-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute bottom-20 left-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
            </div>

            <main className="relative z-10 flex items-center justify-center min-h-screen p-4">
                <div className="w-full max-w-4xl">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="text-4xl font-bold mb-4">
                            <span className="text-amber-400">Hack</span><span className="text-white">Load</span> 2025
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-extrabold mb-4">
                            Регистрация на <span className="text-amber-400">хакатон</span>
                        </h1>
                        <div className="w-24 h-1 bg-amber-400 mx-auto rounded-full mb-6"></div>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                            Присоединяйтесь к крупнейшему хакатону года и создайте что-то невероятное
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                        {/* Left Column - Registration */}
                        <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-lg border border-slate-700/30">
                            {preselectedTeam ? (
                                <div className="mb-8">
                                    <h2 className="text-2xl font-semibold text-white mb-4">
                                        Присоединение к команде
                                    </h2>
                                    <div className="bg-amber-400/10 border border-amber-400/30 rounded-lg p-6">
                                        <div className="flex items-center space-x-4 mb-4">
                                            <div className="bg-amber-400/20 p-3 rounded-lg">
                                                <Users className="w-6 h-6 text-amber-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-semibold text-white">
                                                    {preselectedTeam.name}
                                                </h3>
                                                <p className="text-amber-400 text-sm">
                                                    @{preselectedTeam.nickname}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-slate-300 mb-4">
                                            Вас пригласили присоединиться к команде. Завершите регистрацию для продолжения.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-8">
                                    <h2 className="text-2xl font-semibold text-white mb-4">
                                        Начните свое участие
                                    </h2>
                                    <p className="text-slate-400 mb-6">
                                        Создайте свою команду или найдите единомышленников для участия в хакатоне
                                    </p>
                                </div>
                            )}

                            <div className="space-y-6">
                                <div className="bg-slate-700/30 p-6 rounded-lg border border-slate-600/30">
                                    <h3 className="text-lg font-semibold text-white mb-4">
                                        Войти через OAuth
                                    </h3>
                                    <p className="text-slate-400 text-sm mb-6">
                                        Для регистрации необходимо войти через Google или GitHub. 
                                        После входа вы сможете заполнить свой профиль и указать Telegram для связи.
                                    </p>
                                    
                                    <div className="space-y-3">
                                        <Link
                                            href={loginUrl}
                                            className="w-full bg-amber-400 hover:bg-amber-500 text-slate-900 px-6 py-4 rounded-lg font-semibold transition-all duration-150 flex items-center justify-center space-x-3"
                                        >
                                            <Globe className="w-5 h-5" />
                                            <span>Войти через Google</span>
                                        </Link>
                                        
                                        <Link
                                            href={loginUrl}
                                            className="w-full bg-slate-600 hover:bg-slate-500 text-white px-6 py-4 rounded-lg font-semibold transition-all duration-150 flex items-center justify-center space-x-3"
                                        >
                                            <Globe className="w-5 h-5" />
                                            <span>Войти через GitHub</span>
                                        </Link>
                                    </div>
                                </div>

                                <div className="text-center">
                                    <p className="text-slate-500 text-sm">
                                        После входа вы сможете заполнить профиль, включая контакты в Telegram
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Features */}
                        <div className="space-y-6">
                            <div className="bg-slate-800/30 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
                                <h3 className="text-xl font-semibold text-white mb-4">
                                    Что вас ждет
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-start space-x-4">
                                        <div className="bg-amber-400/20 p-2 rounded-lg mt-1">
                                            <Users className="w-5 h-5 text-amber-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-white">Командная работа</h4>
                                            <p className="text-slate-400 text-sm">
                                                Создайте команду до 4 человек или присоединитесь к существующей
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start space-x-4">
                                        <div className="bg-amber-400/20 p-2 rounded-lg mt-1">
                                            <Calendar className="w-5 h-5 text-amber-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-white">60 часов разработки</h4>
                                            <p className="text-slate-400 text-sm">
                                                Интенсивная работа над проектом с 15 по 17 августа
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start space-x-4">
                                        <div className="bg-amber-400/20 p-2 rounded-lg mt-1">
                                            <BookOpen className="w-5 h-5 text-amber-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-white">Образовательные мастер-классы</h4>
                                            <p className="text-slate-400 text-sm">
                                                Обучающие воркшопы от экспертов индустрии
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-amber-400/10 to-amber-500/10 p-6 rounded-lg border border-amber-400/30">
                                <h3 className="text-xl font-semibold text-white mb-2">
                                    Тема хакатона
                                </h3>
                                <p className="text-amber-400 font-semibold text-lg mb-2">
                                    &ldquo;Система продажи билетов&rdquo;
                                </p>
                                <p className="text-slate-300 text-sm">
                                    Создайте инновационное решение для продажи и управления билетами
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-12 text-slate-500 text-sm">
                        <p>HackLoad 2025 • 15-17 августа • Казахстан</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
