'use client';

import { useState, useEffect } from 'react';
import { MessageWithRelations } from '@/lib/messages';
import { MessageItem } from './message-item';
import { MessageCompose } from './message-compose';
import { Button } from './ui/button';

interface MessageListProps {
  hackathonId: string;
  isAdmin?: boolean;
}

export function MessageList({ hackathonId, isAdmin = false }: MessageListProps) {
  const [messages, setMessages] = useState<MessageWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, [hackathonId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/messages?hackathonId=${hackathonId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageUpdate = () => {
    fetchMessages();
  };

  const handleNewMessage = () => {
    setShowCompose(false);
    fetchMessages();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Сообщения</h2>
          <Button onClick={() => setShowCompose(true)}>
            Новое сообщение
          </Button>
        </div>
      )}

      {showCompose && (
        <MessageCompose
          hackathonId={hackathonId}
          onSuccess={handleNewMessage}
          onCancel={() => setShowCompose(false)}
        />
      )}

      {messages.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Сообщений пока нет
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              onUpdate={handleMessageUpdate}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}