'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Users, Home, UserCheck, Calendar, MessageSquare, AlertCircle, CalendarDays, User, Shield, Zap } from 'lucide-react'
import { LogoutButton } from './logout-button'

const navigation = [
    { name: 'Главная', href: '/dashboard', icon: Home },
    { name: 'Хакатоны', href: '/dashboard/hackathons', icon: Calendar },
    { name: 'Команды', href: '/dashboard/teams', icon: Users },
    { name: 'Участники', href: '/dashboard/participants', icon: UserCheck },
    { name: 'Сообщения', href: '/dashboard/messages', icon: MessageSquare },
    { name: 'Баннеры', href: '/dashboard/banners', icon: AlertCircle },
    { name: 'Календарь', href: '/dashboard/calendar', icon: CalendarDays },
    { name: 'Нагрузочное тестирование', href: '/dashboard/load-testing', icon: Zap },
    { name: 'Безопасность', href: '/dashboard/security', icon: Shield },
    { name: 'Кабинет участника', href: '/space', icon: User },
]

export function Sidebar() {
    const pathname = usePathname()

    return (
        <div className="flex flex-col w-64 bg-gray-900 border-r border-gray-700">
            <div className="flex items-center h-16 px-6 border-b border-gray-700">
                <h1 className="text-xl font-semibold text-white">
                    Панель управления
                </h1>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2">
                {navigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                                isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                            )}
                        >
                            <item.icon className="w-5 h-5 mr-3" />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>
            
            {/* Logout Button */}
            <div className="px-4 pb-6 border-t border-gray-700 pt-4">
                <LogoutButton 
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-gray-300 hover:bg-gray-800 hover:text-white"
                />
            </div>
        </div>
    )
}
