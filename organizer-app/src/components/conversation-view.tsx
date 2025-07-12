'use client';

import { useState, useEffect } from 'react';
import { MessageWithRelations } from '@/lib/messages';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { formatDistanceToNow } from 'date-fns';
import { 
  ArrowLeft, 
  Reply, 
  Send, 
  User, 
  Users, 
  Calendar,
  Mail,
  MailOpen
} from 'lucide-react';
import { markdownToHtml } from '@/lib/markdown';

interface ConversationViewProps {
  message: MessageWithRelations;
  onClose: () => void;
  hackathonId: string;
}

export function ConversationView({ message, onClose, hackathonId }: ConversationViewProps) {
  const [conversation, setConversation] = useState<MessageWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReply, setShowReply] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchConversation();
  }, [message.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchConversation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/messages/${message.id}/conversation`);
      if (response.ok) {
        const data = await response.json();
        setConversation(data.conversation || []);
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!replyBody.trim()) {
      alert('Пожалуйста, введите текст ответа');
      return;
    }

    setSending(true);

    try {
      const response = await fetch(`/api/messages/${message.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: replyBody,
          hackathonId,
        }),
      });

      if (response.ok) {
        setReplyBody('');
        setShowReply(false);
        fetchConversation(); // Refresh conversation
      } else {
        const error = await response.json();
        alert(error.error || 'Не удалось отправить ответ');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Не удалось отправить ответ');
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await fetch(`/api/messages/${messageId}/read`, {
        method: 'PUT',
      });
      fetchConversation(); // Refresh to update status
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={onClose}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к списку
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900">{message.subject}</h2>
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
            <div className="flex items-center gap-1">
              {message.team ? (
                <Users className="h-4 w-4 text-purple-600" />
              ) : (
                <User className="h-4 w-4 text-green-600" />
              )}
              <span>{message.recipient.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
        <Button
          onClick={() => setShowReply(true)}
          className="flex items-center gap-2"
        >
          <Reply className="h-4 w-4" />
          Ответить
        </Button>
      </div>

      {/* Conversation Thread */}
      <div className="space-y-4">
        {conversation.map((msg, index) => (
          <Card key={msg.id} className={`${index === 0 ? 'border-blue-200' : 'border-gray-200'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {msg.status === 'UNREAD' ? (
                    <Mail className="h-5 w-5 text-blue-600" />
                  ) : (
                    <MailOpen className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {msg.sender?.name || 'Система'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {msg.sender?.email || 'system@hackload.kz'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                  </span>
                  {msg.status === 'UNREAD' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(msg.id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Отметить как прочитанное
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div 
                className="prose prose-sm max-w-none text-gray-900"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.body) }}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reply Form */}
      {showReply && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-lg">Ответить на сообщение</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReply} className="space-y-4">
              <div>
                <Textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Введите ваш ответ (поддерживается Markdown)"
                  rows={4}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Вы можете использовать Markdown-форматирование в ответе
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={sending} className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  {sending ? 'Отправка...' : 'Отправить ответ'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowReply(false)}
                >
                  Отмена
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}