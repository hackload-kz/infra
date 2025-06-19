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
            Добро пожаловать на хакатон!
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Присоединяйтесь к нам, создавайте команды и участвуйте в увлекательном хакатоне.
            Зарегистрируйтесь, чтобы найти команду или создать свою собственную!
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
                        <>
                          <Link href="/profile">
                            <Button size="lg">
                              Мой профиль
                            </Button>
                          </Link>
                          <Link href="/teams">
                            <Button variant="outline" size="lg">
                              Все команды
                            </Button>
                          </Link>
                        </>
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
          </div>        </div>

        {/* Show teams link only for participants or non-logged users */}
        {(!session || !userIsOrganizer) && (
          <div className="mt-12 text-center">
            <Link href="/teams">
              <Button variant="outline" size="lg">
                Просмотреть все команды
              </Button>
            </Link>
          </div>
        )}

        {/* Show participant-focused features only for non-organizers */}
        {(!session || !userIsOrganizer) && (
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-white rounded-lg shadow-md">
              <h3 className="text-2xl font-semibold mb-4">Создайте команду</h3>
              <p className="text-gray-600">
                Станьте лидером команды и найдите единомышленников для участия в хакатоне
              </p>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow-md">
              <h3 className="text-2xl font-semibold mb-4">Присоединитесь к команде</h3>
              <p className="text-gray-600">
                Найдите команду, которая соответствует вашим интересам и навыкам
              </p>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow-md">
              <h3 className="text-2xl font-semibold mb-4">Работайте самостоятельно</h3>
              <p className="text-gray-600">
                Участвуйте в хакатоне вне команды, если предпочитаете индивидуальную работу
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
