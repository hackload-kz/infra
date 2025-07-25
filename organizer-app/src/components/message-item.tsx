'use client';

import { useState } from 'react';
import { MessageWithRelations } from '@/lib/messages';
import { Button } from './ui/button';
import { MessageReply } from './message-reply';
import { formatDistanceToNow } from 'date-fns';
import { Mail, MailOpen, Reply, Users, ExternalLink } from 'lucide-react';
import { markdownToHtml } from '@/lib/markdown';
import Link from 'next/link';

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
            <Link 
              href={`/space/messages/${message.id}`}
              className={`font-semibold hover:underline ${isUnread ? 'text-blue-900 hover:text-blue-700' : 'text-gray-900 hover:text-gray-700'}`}
            >
              {message.subject}
            </Link>
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
              className={`prose prose-sm prose-blue max-w-none text-gray-900 ${expanded ? '' : 'line-clamp-3'}`}
              style={{
                lineHeight: '1.6',
                fontSize: '14px'
              }}
              dangerouslySetInnerHTML={{ __html: markdownToHtml(message.body) }}
            />
            <style jsx>{`
              div :global(a) {
                color: #2563eb !important;
                text-decoration: underline !important;
                font-weight: 500 !important;
              }
              div :global(a:hover) {
                color: #1d4ed8 !important;
                text-decoration: underline !important;
              }
            `}</style>
            {message.body.length > 200 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-blue-600 hover:text-blue-800 text-sm mt-1 font-medium"
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
                    className="prose prose-sm prose-blue max-w-none text-gray-900"
                    style={{
                      lineHeight: '1.6',
                      fontSize: '13px'
                    }}
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(reply.body) }}
                  />
                  <style jsx>{`
                    div :global(a) {
                      color: #2563eb !important;
                      text-decoration: underline !important;
                      font-weight: 500 !important;
                    }
                    div :global(a:hover) {
                      color: #1d4ed8 !important;
                      text-decoration: underline !important;
                    }
                  `}</style>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200">
        <Link href={`/space/messages/${message.id}`}>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1"
          >
            <ExternalLink className="h-4 w-4" />
            Открыть
          </Button>
        </Link>
        
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