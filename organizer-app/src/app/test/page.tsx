import { auth } from '@/auth';
import { isOrganizer } from '@/lib/admin';
import Link from 'next/link';

export default async function TestPage() {
    const session = await auth();
    const userIsOrganizer = isOrganizer(session?.user?.email);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
                <h1 className="text-2xl font-bold mb-4">Тест разделения интерфейсов</h1>

                {session ? (
                    <div className="space-y-4">
                        <p><strong>Email:</strong> {session.user?.email}</p>
                        <p><strong>Тип пользователя:</strong> {userIsOrganizer ? 'Организатор' : 'Участник'}</p>

                        <div className="border-t pt-4">
                            <h2 className="text-lg font-semibold mb-2">Доступные страницы:</h2>
                            <ul className="space-y-2">
                                {userIsOrganizer ? (
                                    <>
                                        <li>✅ <Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard (Панель управления)</Link></li>
                                        <li>✅ <Link href="/dashboard/teams" className="text-blue-600 hover:underline">Управление командами</Link></li>
                                        <li>❌ /profile (недоступно для организаторов)</li>
                                    </>
                                ) : (
                                    <>
                                        <li>✅ <Link href="/profile" className="text-blue-600 hover:underline">Профиль участника</Link></li>
                                        <li>❌ /dashboard (недоступно для участников)</li>
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>
                ) : (
                    <p>Вы не авторизованы. <Link href="/login" className="text-blue-600 hover:underline">Войти</Link></p>
                )}

                <div className="mt-6 pt-4 border-t">
                    <Link href="/" className="text-blue-600 hover:underline">← На главную</Link>
                </div>
            </div>
        </div>
    );
}
