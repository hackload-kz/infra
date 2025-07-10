import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { isOrganizer } from '@/lib/admin';
import { db } from '@/lib/db';

export default async function ProfilePage() {
    const session = await auth();

    if (!session?.user?.email) {
        redirect('/login');
    }

    // Check if user is an organizer - redirect to dashboard
    if (isOrganizer(session.user.email)) {
        redirect('/dashboard');
    }

    // Check if user has a participant profile
    const user = await db.user.findUnique({
        where: { email: session.user.email },
        include: {
            participant: true,
        },
    });

    // If user doesn't exist in database, something went wrong
    if (!user) {
        console.error('User not found in database after OAuth login:', session.user.email);
        redirect('/login');
    }

    // If user has a participant profile, redirect to space dashboard
    if (user.participant) {
        redirect('/space/');
    }

    // If user doesn't have a participant profile, redirect to edit page (create)
    redirect('/space/info/edit?first=true');
}