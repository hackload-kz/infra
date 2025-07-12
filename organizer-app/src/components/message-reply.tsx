'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

interface MessageReplyProps {
  messageId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MessageReply({ messageId, onSuccess, onCancel }: MessageReplyProps) {
  const [messageBody, setMessageBody] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageBody.trim()) {
      alert('Пожалуйста, введите ответное сообщение');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/messages/${messageId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageBody,
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || 'Не удалось отправить ответ');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Не удалось отправить ответ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="replyBody">Ответ *</Label>
        <Textarea
          id="replyBody"
          value={messageBody}
          onChange={(e) => setMessageBody(e.target.value)}
          placeholder="Введите ваш ответ (поддерживается Markdown)"
          rows={4}
          required
        />
        <p className="text-sm text-gray-500 mt-1">
          Вы можете использовать Markdown-форматирование в ответе (**жирный**, *курсив*, [ссылки](url), списки и др.)
        </p>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading} size="sm">
          {loading ? 'Отправка...' : 'Отправить ответ'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </form>
  );
}