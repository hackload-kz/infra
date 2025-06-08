'use client'

import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

interface HeaderProps {
    user?: {
        name?: string | null
        email?: string | null
    } | null
}

export function Header({ user }: HeaderProps) {
    return (
        <header className="bg-white border-b border-gray-300 px-6 py-4 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                        Панель управления
                    </h2>
                </div>
                <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-800 font-medium">
                        {user?.name || user?.email}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => signOut({ callbackUrl: '/login' })}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Выйти
                    </Button>
                </div>
            </div>
        </header>
    )
}
