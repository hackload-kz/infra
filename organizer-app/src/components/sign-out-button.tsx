'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function SignOutButton() {
    const handleSignOut = async () => {
        await signOut({
            callbackUrl: '/',
        });
    };

    return (
        <Button
            onClick={handleSignOut}
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
        >
            Выйти из аккаунта
        </Button>
    );
}
