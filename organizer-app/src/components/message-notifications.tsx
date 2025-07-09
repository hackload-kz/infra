'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Mail } from 'lucide-react';
import Link from 'next/link';

interface MessageNotificationsProps {
  hackathonId: string;
}

export function MessageNotifications({ hackathonId }: MessageNotificationsProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnreadCount();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, [hackathonId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(`/api/messages/unread-count?hackathonId=${hackathonId}`);
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30 animate-pulse">
        <div className="h-6 bg-slate-700 rounded mb-4"></div>
        <div className="h-4 bg-slate-700 rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Сообщения</h3>
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-amber-400" />
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {unreadCount > 0 ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-blue-800 font-medium">
                  У вас {unreadCount} непрочитанных сообщений
                </p>
                <p className="text-blue-600 text-sm">
                  Проверьте новые сообщения от организаторов
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-700/30 rounded-lg">
            <div className="flex items-center space-x-3">
              <MessageSquare className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-slate-300 font-medium">
                  Нет новых сообщений
                </p>
                <p className="text-slate-400 text-sm">
                  Все сообщения прочитаны
                </p>
              </div>
            </div>
          </div>
        )}

        <Link
          href="/space/messages"
          className="block w-full bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-2 rounded-lg font-medium transition-colors duration-150 text-center"
        >
          Перейти к сообщениям
        </Link>
      </div>
    </div>
  );
}