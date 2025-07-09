'use client';

import { useState } from 'react';
import { MessageWithRelations } from '@/lib/messages';
import { Button } from './ui/button';
import { MessageReply } from './message-reply';
import { formatDistanceToNow } from 'date-fns';
import { Mail, MailOpen, Reply, Users } from 'lucide-react';

interface MessageItemProps {
  message: MessageWithRelations;
  onUpdate: () => void;
  isAdmin?: boolean;
}

export function MessageItem({ message, onUpdate, isAdmin = false }: MessageItemProps) {
  const [showReply, setShowReply] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleStatusChange = async (action: 'read' | 'unread') => {
    try {
      const response = await fetch(`/api/messages/${message.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  };

  const handleReplySuccess = () => {
    setShowReply(false);
    onUpdate();
  };

  const isUnread = message.status === 'UNREAD';

  return (
    <div className={`border rounded-lg p-4 ${isUnread ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {isUnread ? (
              <Mail className="h-4 w-4 text-blue-600" />
            ) : (
              <MailOpen className="h-4 w-4 text-gray-400" />
            )}
            {message.team && (
              <Users className="h-4 w-4 text-purple-600" />
            )}
            <h3 className={`font-semibold ${isUnread ? 'text-blue-900' : 'text-gray-900'}`}>
              {message.subject}
            </h3>
            {isUnread && (
              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                Новое
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
            <span>
              <strong>От:</strong> {message.sender?.name || 'Система'}
            </span>
            <span>
              <strong>Кому:</strong> {message.recipient.name}
            </span>
            {message.team && (
              <span>
                <strong>Команда:</strong> {message.team.name}
              </span>
            )}
            <span>
              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
            </span>
          </div>

          <div className="mb-3">
            <div 
              className={`prose prose-sm max-w-none text-gray-900 ${expanded ? '' : 'line-clamp-3'}`}
              dangerouslySetInnerHTML={{ __html: message.body }}
            />
            {message.body.length > 200 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-blue-600 hover:text-blue-800 text-sm mt-1"
              >
                {expanded ? 'Скрыть' : 'Показать больше'}
              </button>
            )}
          </div>

          {message.replies && message.replies.length > 0 && (
            <div className="mt-4 pl-4 border-l-2 border-gray-200 space-y-3">
              <h4 className="font-medium text-gray-700">Ответы:</h4>
              {message.replies.map((reply) => (
                <div key={reply.id} className="bg-gray-50 p-3 rounded">
                  <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                    <strong>{reply.sender?.name || 'Система'}</strong>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}</span>
                  </div>
                  <div 
                    className="prose prose-sm max-w-none text-gray-900"
                    dangerouslySetInnerHTML={{ __html: reply.body }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowReply(true)}
          className="flex items-center gap-1"
        >
          <Reply className="h-4 w-4" />
          Ответить
        </Button>

        {!isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStatusChange(isUnread ? 'read' : 'unread')}
            className="flex items-center gap-1"
          >
            {isUnread ? (
              <>
                <MailOpen className="h-4 w-4" />
                Отметить как прочитанное
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Отметить как непрочитанное
              </>
            )}
          </Button>
        )}
      </div>

      {showReply && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <MessageReply
            messageId={message.id}
            onSuccess={handleReplySuccess}
            onCancel={() => setShowReply(false)}
          />
        </div>
      )}
    </div>
  );
}