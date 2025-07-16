import Link from 'next/link';
import { auth } from '@/auth';
import { SignOutButton } from '@/components/sign-out-button';
import { isOrganizer } from '@/lib/admin';
import { db } from '@/lib/db';
import { getCurrentHackathon } from '@/lib/hackathon';
import { OAuthLoginForm } from '@/components/oauth-login-form';
import { Suspense } from 'react';

export default async function Home() {
  const session = await auth();
  const userIsOrganizer = isOrganizer(session?.user?.email);

  // Get current hackathon
  const hackathon = await getCurrentHackathon();

  // For organizers, check if they have a participant profile (they shouldn't)
  let userHasParticipantProfile = false;
  let participantName = null;
  if (session?.user?.email && !userIsOrganizer) {
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { participant: true }
    });
    userHasParticipantProfile = !!user?.participant;
    participantName = user?.participant?.name;
  }

  // Determine the display name
  const displayName = participantName || session?.user?.name || session?.user?.email;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="text-center">
          {/* Main Heading */}
          <div className="mb-16">
            <h1 className="text-5xl lg:text-6xl font-extrabold mb-6">
              Добро пожаловать на <span className="text-amber-400">{hackathon?.name || 'Хакатон'}</span>!
            </h1>
            <div className="w-24 h-1 bg-amber-400 mx-auto rounded-full mb-8"></div>
            <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              {hackathon?.description || 'Присоединяйтесь к нам, создавайте команды и участвуйте в увлекательном хакатоне.'}
            </p>
          </div>

          {/* Hackathon Theme */}
          {hackathon?.theme && (
            <div className="mb-12">
              <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-xl border border-slate-700/30 max-w-2xl mx-auto">
                <p className="text-lg font-semibold text-amber-400 mb-3">Тема хакатона:</p>
                <p className="text-2xl text-white font-bold">{hackathon.theme}</p>
              </div>
            </div>
          )}

          {/* Action Section */}
          <div className="max-w-4xl mx-auto">
            {session ? (
              // Authenticated User Interface
              <div className="space-y-8">
                <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-xl border border-slate-700/30">
                  <div className="flex items-center justify-center space-x-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full flex items-center justify-center">
                      <div className="w-8 h-8 text-slate-900 font-bold text-xl">
                        {displayName?.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-white">Добро пожаловать, {displayName}!</h2>
                      <p className="text-slate-400">Готовы к участию в хакатоне?</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-4">
                    {userIsOrganizer ? (
                      // Organizer interface
                      <>
                        <Link href="/dashboard">
                          <div className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-8 py-4 rounded-lg font-semibold transition-colors duration-150 flex items-center space-x-2">
                            <span>Панель управления</span>
                          </div>
                        </Link>
                        <Link href="/dashboard/teams">
                          <div className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-4 rounded-lg font-semibold transition-colors duration-150 border border-slate-600">
                            <span>Управление командами</span>
                          </div>
                        </Link>
                        <Link href="/space">
                          <div className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-4 rounded-lg font-semibold transition-colors duration-150 border border-slate-600">
                            <span>Кабинет участника</span>
                          </div>
                        </Link>
                      </>
                    ) : (
                      // Participant interface
                      <>
                        {userHasParticipantProfile ? (
                          <Link href="/space/">
                            <div className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-8 py-4 rounded-lg font-semibold transition-colors duration-150 flex items-center space-x-2">
                              <span>Мой кабинет</span>
                            </div>
                          </Link>
                        ) : (
                          <Link href="/space/info/edit?first=true">
                            <div className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-8 py-4 rounded-lg font-semibold transition-colors duration-150 animate-pulse">
                              <span>Завершить регистрацию</span>
                            </div>
                          </Link>
                        )}
                      </>
                    )}
                    <SignOutButton />
                  </div>
                </div>
              </div>
            ) : (
              // Guest User Interface
              <div className="max-w-md mx-auto">
                <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-xl border border-slate-700/30">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <div className="w-8 h-8 text-slate-900 font-bold text-xl">🔑</div>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Войти в {hackathon?.name || 'Хакатон'}
                    </h3>
                    <p className="text-slate-400">
                      Используйте Google или GitHub для входа
                    </p>
                  </div>
                  <Suspense fallback={
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto"></div>
                      <p className="text-slate-400 mt-2">Загрузка...</p>
                    </div>
                  }>
                    <OAuthLoginForm />
                  </Suspense>
                </div>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="mt-16">
            <div className="bg-slate-800/30 backdrop-blur-sm p-6 rounded-xl border border-slate-700/20 max-w-2xl mx-auto">
              <p className="text-slate-400 leading-relaxed">
                Функционал сайта будет расширяться и мы будем оповещать вас об этом.
                Следите за обновлениями!
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
