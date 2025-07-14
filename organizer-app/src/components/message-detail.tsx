'use client';

import { MessageWithRelations } from '@/lib/messages';
import { markdownToHtml } from '@/lib/markdown';
import { Button } from './ui/button';
import { ArrowLeft, Clock, User, Mail, Reply, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MessageDetailProps {
  message: MessageWithRelations;
  isAdmin?: boolean;
}

export function MessageDetail({ message, isAdmin = false }: MessageDetailProps) {
  const router = useRouter();

  const handleReply = () => {
    // TODO: Implement reply functionality
    console.log('Reply functionality not implemented yet');
  };

  const renderMarkdown = (content: string) => {
    const html = markdownToHtml(content);
    return (
      <div 
        className="prose prose-slate max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    return status === 'READ' ? 'text-green-600' : 'text-blue-600';
  };

  const getStatusText = (status: string) => {
    return status === 'READ' ? 'Прочитано' : 'Не прочитано';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к сообщениям
        </Button>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 text-sm ${getStatusColor(message.status)}`}>
            <Eye className="h-4 w-4" />
            {getStatusText(message.status)}
          </div>
        </div>
      </div>

      {/* Message Content */}
      <div className="bg-white rounded-lg shadow-sm">
        {/* Message Header */}
        <div className="border-b border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {message.subject}
          </h1>
          
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>От: {message.sender?.name || 'Система'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>Кому: {message.recipient.name}</span>
              </div>
              
              {message.team && (
                <div className="flex items-center gap-2">
                  <span>Команда: {message.team.name}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{formatDate(message.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Message Body */}
        <div className="p-6">
          <div className="prose prose-slate max-w-none">
            {renderMarkdown(message.body)}
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {message.updatedAt.getTime() !== message.createdAt.getTime() && (
                <span>Обновлено: {formatDate(message.updatedAt)}</span>
              )}
            </div>
            
            {!isAdmin && (
              <Button
                onClick={handleReply}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Reply className="h-4 w-4" />
                Ответить
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Replies Section */}
      {message.replies && message.replies.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Ответы ({message.replies.length})
            </h2>
          </div>
          
          <div className="p-6 space-y-4">
            {message.replies.map((reply) => (
              <div key={reply.id} className="border-l-4 border-blue-200 pl-4">
                <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                  <span>{reply.sender?.name || 'Система'}</span>
                  <span>{formatDate(reply.createdAt)}</span>
                </div>
                
                <div className="prose prose-slate max-w-none">
                  {renderMarkdown(reply.body)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}