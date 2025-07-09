'use client';

import { useState } from 'react';
import { MessageWithRelations } from '@/lib/messages';
import { Button } from './ui/button';
import { MessageEdit } from './message-edit';
import { formatDistanceToNow } from 'date-fns';
import { 
  Mail, 
  MailOpen, 
  Edit, 
  Trash2, 
  Users, 
  User,
  MessageCircle,
  Calendar,
  Eye
} from 'lucide-react';

interface AdminMessageItemProps {
  message: MessageWithRelations;
  onUpdate: () => void;
  onShowConversation: (message: MessageWithRelations) => void;
}

export function AdminMessageItem({ message, onUpdate, onShowConversation }: AdminMessageItemProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleEditSuccess = () => {
    setShowEdit(false);
    onUpdate();
  };

  const handleDelete = async () => {
    if (!confirm('Вы уверены, что хотите удалить это сообщение?')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/messages/${message.id}/edit`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onUpdate();
      } else {
        alert('Не удалось удалить сообщение');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Не удалось удалить сообщение');
    } finally {
      setDeleting(false);
    }
  };

  const isUnread = message.status === 'UNREAD';
  const hasReplies = message.replies && message.replies.length > 0;

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            {isUnread ? (
              <Mail className="h-5 w-5 text-blue-600 flex-shrink-0" />
            ) : (
              <MailOpen className="h-5 w-5 text-gray-400 flex-shrink-0" />
            )}
            
            {message.team ? (
              <Users className="h-4 w-4 text-purple-600 flex-shrink-0" />
            ) : (
              <User className="h-4 w-4 text-green-600 flex-shrink-0" />
            )}

            <h3 className={`font-semibold text-lg ${isUnread ? 'text-blue-900' : 'text-gray-900'} truncate`}>
              {message.subject}
            </h3>

            {isUnread && (
              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full flex-shrink-0">
                Новое
              </span>
            )}

            {hasReplies && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex-shrink-0 flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {message.replies.length}
              </span>
            )}
          </div>

          {/* Message Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Кому:</span> {message.recipient.name}
              <br />
              <span className="text-gray-500">{message.recipient.email}</span>
            </div>
            
            <div>
              <span className="font-medium">От:</span> {message.sender?.name || 'Система'}
              {message.team && (
                <>
                  <br />
                  <span className="text-purple-600">Команда: {message.team.name}</span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</span>
            </div>
          </div>

          {/* Message Body */}
          <div className="mb-4">
            <div 
              className={`prose prose-sm max-w-none text-gray-900 ${expanded ? '' : 'line-clamp-3'}`}
              dangerouslySetInnerHTML={{ __html: message.body }}
            />
            {message.body.length > 300 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-blue-600 hover:text-blue-800 text-sm mt-2"
              >
                {expanded ? 'Скрыть' : 'Показать полностью'}
              </button>
            )}
          </div>

          {/* Replies Preview */}
          {hasReplies && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Ответы ({message.replies.length})
              </h4>
              <div className="space-y-2">
                {message.replies.slice(0, 2).map((reply) => (
                  <div key={reply.id} className="text-sm">
                    <span className="font-medium">{reply.sender?.name || 'Система'}:</span>
                    <span className="ml-2 text-gray-600">
                      {reply.body.replace(/<[^>]*>/g, '').slice(0, 100)}...
                    </span>
                  </div>
                ))}
                {message.replies.length > 2 && (
                  <p className="text-xs text-gray-500">
                    И еще {message.replies.length - 2} ответов...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onShowConversation(message)}
            className="flex items-center gap-1"
          >
            <Eye className="h-4 w-4" />
            Просмотр
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1"
          >
            <Edit className="h-4 w-4" />
            Изменить
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? 'Удаление...' : 'Удалить'}
          </Button>
        </div>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <MessageEdit
                message={message}
                onSuccess={handleEditSuccess}
                onCancel={() => setShowEdit(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}