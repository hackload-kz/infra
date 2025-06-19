'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { LogOut, Home, Users, User, Settings } from 'lucide-react'

interface HeaderProps {
    user?: {
        name?: string | null
        email?: string | null
        role?: string | null
    } | null
    title?: string
    isOrganizer?: boolean
}

export function Header({ user, title = "HackLoad 2025", isOrganizer = false }: HeaderProps) {
    return (
        <header className="bg-white border-b border-gray-300 px-6 py-4 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                    <Link href="/" className="text-lg font-bold text-blue-600 hover:text-blue-700">
                        {title}
                    </Link>
                    <nav className="hidden md:flex space-x-4">
                        <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
                            <Home className="w-4 h-4 mr-1" />
                            Главная
                        </Link>
                        {isOrganizer ? (
                            <>
                                <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
                                    <Settings className="w-4 h-4 mr-1" />
                                    Панель управления
                                </Link>
                                <Link href="/dashboard/teams" className="flex items-center text-gray-600 hover:text-gray-900">
                                    <Users className="w-4 h-4 mr-1" />
                                    Управление командами
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link href="/teams" className="flex items-center text-gray-600 hover:text-gray-900">
                                    <Users className="w-4 h-4 mr-1" />
                                    Команды
                                </Link>
                                {user && (
                                    <Link href="/profile" className="flex items-center text-gray-600 hover:text-gray-900">
                                        <User className="w-4 h-4 mr-1" />
                                        Профиль
                                    </Link>
                                )}
                            </>
                        )}
                    </nav>
                </div>
                <div className="flex items-center space-x-4">
                    {user ? (
                        <>
                            <span className="text-sm text-gray-800 font-medium">
                                {user?.name || user?.email}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Выйти
                            </Button>
                        </>
                    ) : (
                        <div className="space-x-2">
                            <Link href="/login">
                                <Button variant="outline" size="sm">
                                    Войти
                                </Button>
                            </Link>
                            <Link href="/register">
                                <Button size="sm">
                                    Регистрация
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
