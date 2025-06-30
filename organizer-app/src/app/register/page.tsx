import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { RegistrationForm } from './registration-form';
import { Header } from '@/components/header';
import { db } from '@/lib/db';

interface RegisterPageProps {
    searchParams: Promise<{
        team?: string;
    }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
    const session = await auth();

    // If user is already logged in, redirect to profile setup or dashboard
    if (session) {
        redirect('/profile');
    }

    const { team } = await searchParams;

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

    return (
        <>
            <Header title="Регистрация" />
            <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-lg shadow-xl p-8">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Регистрация
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
                                    Присоединяйтесь к хакатону и найдите свою команду
                                </p>
                            )}
                        </div>

                        <RegistrationForm preselectedTeam={preselectedTeam} />
                    </div>
                </div>
            </main>
        </>
    );
}
