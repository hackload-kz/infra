import Link from 'next/link';
import { auth } from '@/auth';
import { Button } from '@/components/ui/button';
import { SignOutButton } from '@/components/sign-out-button';
import { isOrganizer } from '@/lib/admin';
import { db } from '@/lib/db';

export default async function Home() {
  const session = await auth();
  const userIsOrganizer = isOrganizer(session?.user?.email);

  // For organizers, check if they have a participant profile (they shouldn't)
  let userHasParticipantProfile = false;
  if (session?.user?.email && !userIsOrganizer) {
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { participant: true }
    });
    userHasParticipantProfile = !!user?.participant;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Добро пожаловать на HackLoad 2025!
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Присоединяйтесь к нам, создавайте команды и участвуйте в увлекательном хакатоне.
            Зарегистрируйтесь, чтобы найти команду или создать свою собственную.
          </p>

          <div className="space-x-4">
            {session ? (
              <div className="space-y-4">
                <p className="text-gray-700">Добро пожаловать, {session.user?.name || session.user?.email}!</p>
                <div className="flex flex-wrap justify-center gap-4">
                  {userIsOrganizer ? (
                    // Organizer interface
                    <>
                      <Link href="/dashboard">
                        <Button size="lg">
                          Панель управления
                        </Button>
                      </Link>
                      <Link href="/dashboard/teams">
                        <Button variant="outline" size="lg">
                          Управление командами
                        </Button>
                      </Link>
                    </>
                  ) : (
                    // Participant interface
                    <>
                      {userHasParticipantProfile ? (
                        <Link href="/profile">
                          <Button size="lg">
                            Мой профиль
                          </Button>
                        </Link>
                      ) : (
                        <Link href="/profile">
                          <Button size="lg">
                            Завершить регистрацию
                          </Button>
                        </Link>
                      )}
                    </>
                  )}
                  <SignOutButton />
                </div>
              </div>
            ) : (
              <div className="space-x-4">
                <Link href="/register">
                  <Button size="lg">
                    Зарегистрироваться
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg">
                    Войти
                  </Button>
                </Link>
              </div>
            )}
          </div>
          <p className="text-l text-gray-600 mt-8 mb-8 max-w-2xl mx-auto">
            Функционал сайта будет расширяться и мы будем оповещать вас об этом.
          </p>
        </div>
      </div>
    </main>
  );
}
