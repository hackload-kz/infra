'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  User, 
  Home, 
  Users, 
  Calendar, 
  Trophy, 
  Menu,
  X,
  ChevronRight,
  FileText,
  MessageSquare,
  HelpCircle,
  Search
} from 'lucide-react'
import { LogoutButton } from './logout-button'
import { JournalNotificationBell } from './journal-notification-bell'

interface PersonalCabinetLayoutProps {
  children: React.ReactNode
  user: {
    name: string
    email?: string
    image?: string
  } | null
  hasTeam?: boolean
}

interface SidebarItem {
  icon: React.ElementType
  label: string
  href: string
  badge?: string
}

const sidebarItems: SidebarItem[] = [
  { icon: Home, label: 'Главная', href: '/space' },
  { icon: User, label: 'Мой профиль', href: '/space/info' },
  { icon: Users, label: 'Моя команда', href: '/space/team' },
  { icon: Search, label: 'Поиск команд', href: '/space/teams' },
  { icon: Calendar, label: 'Календарь', href: '/space/calendar' },
  { icon: FileText, label: 'Задание', href: '/space/tasks' },
  { icon: Trophy, label: 'Журнал', href: '/space/journal' },
  { icon: MessageSquare, label: 'Сообщения', href: '/space/messages' },
  { icon: HelpCircle, label: 'FAQ', href: '/space/faq' },
]

export default function PersonalCabinetLayout({ children, user, hasTeam = false }: PersonalCabinetLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = usePathname()

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-80 bg-slate-900/95 backdrop-blur-sm border-r border-slate-800/50 z-50 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                <span className="text-amber-400">Hack</span><span className="text-white">Load</span>
              </div>
              <button 
                onClick={toggleSidebar}
                className="lg:hidden p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* User Profile */}
          <div className="p-6 border-b border-slate-800/50">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-slate-900" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name || 'Загрузка...'}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email || ''}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              const isTasksDisabled = item.href === '/space/tasks' && !hasTeam
              
              if (isTasksDisabled) {
                return (
                  <div
                    key={item.href}
                    className="flex items-center justify-between px-4 py-3 rounded-lg cursor-not-allowed opacity-50"
                    title="Доступно только участникам команд"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5 text-slate-500" />
                      <span className="font-medium text-slate-500">{item.label}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </div>
                  </div>
                )
              }
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 group
                    ${isActive 
                      ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' 
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-white'}`} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
                  </div>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800/50 space-y-3">
            <LogoutButton 
              variant="ghost"
              size="sm"
              className="w-full justify-start text-slate-300 hover:bg-slate-800/50 hover:text-white"
            />
            <div className="text-xs text-slate-500 text-center">
              HackLoad 2025
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-80">
        {/* Top Bar */}
        <header className="relative z-10 bg-slate-900/50 backdrop-blur-sm border-b border-slate-800/50">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={toggleSidebar}
                  className="lg:hidden p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="hidden md:flex items-center space-x-1 text-sm text-slate-400">
                  <span>HackLoad 2025</span>
                  <span>•</span>
                  <span>Личный кабинет</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {/* Journal Notifications */}
                <JournalNotificationBell />
                
                {/* Logout Button */}
                <LogoutButton 
                  variant="ghost"
                  size="sm"
                  className="text-slate-300 hover:bg-slate-800/50 hover:text-white"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="relative z-10 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}