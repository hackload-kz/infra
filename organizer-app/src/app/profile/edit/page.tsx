import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { EditProfileForm } from './edit-profile-form';
import { isOrganizer } from '@/lib/admin';

export default async function EditProfilePage() {
    const session = await auth();

    if (!session?.user?.email) {
        redirect('/login');
    }

    // Check if user is an organizer - redirect to dashboard
    if (isOrganizer(session.user.email)) {
        redirect('/dashboard');
    }

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

    // Load available teams for selection
    const availableTeams = await db.team.findMany({
        select: {
            id: true,
            name: true,
            nickname: true,
        },
        orderBy: {
            name: 'asc',
        },
    });

    // User should exist because OAuth creates them in auth.config.ts
    if (!user) {
        console.error('User not found in database after OAuth login:', session.user.email);
        redirect('/login');
    }

    // If user doesn't have a participant profile, redirect to profile creation
    if (!user.participant) {
        redirect('/profile');
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="container mx-auto max-w-2xl">
                <div className="bg-white rounded-lg shadow-xl p-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Редактирование профиля
                        </h1>
                        <p className="text-gray-600">
                            Измените информацию о себе
                        </p>
                    </div>

                    <EditProfileForm
                        participant={user.participant}
                        userEmail={session.user.email}
                        availableTeams={availableTeams}
                    />
                </div>
            </div>
        </main>
    );
}
