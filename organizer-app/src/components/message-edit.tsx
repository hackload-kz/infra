'use client';

import { useState } from 'react';
import { MessageWithRelations } from '@/lib/messages';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface MessageEditProps {
  message: MessageWithRelations;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MessageEdit({ message, onSuccess, onCancel }: MessageEditProps) {
  const [subject, setSubject] = useState(message.subject);
  const [messageBody, setMessageBody] = useState(message.body);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject || !messageBody) {
      alert('Пожалуйста, заполните все обязательные поля');
      return;
    }

    // Check if anything changed
    if (subject === message.subject && messageBody === message.body) {
      alert('Никаких изменений не было внесено');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/messages/${message.id}/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          messageBody,
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || 'Не удалось обновить сообщение');
      }
    } catch (error) {
      console.error('Error updating message:', error);
      alert('Не удалось обновить сообщение');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Редактировать сообщение</CardTitle>
        <div className="text-sm text-gray-600">
          <p><strong>Получатель:</strong> {message.recipient.name} ({message.recipient.email})</p>
          {message.team && <p><strong>Команда:</strong> {message.team.name}</p>}
          <p><strong>Создано:</strong> {new Date(message.createdAt).toLocaleString('ru-RU')}</p>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="subject">Тема *</Label>
            <Input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Введите тему сообщения"
              required
            />
          </div>

          <div>
            <Label htmlFor="messageBody">Сообщение *</Label>
            <Textarea
              id="messageBody"
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder="Введите ваше сообщение (поддерживается HTML)"
              rows={8}
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Вы можете использовать HTML-форматирование в сообщении
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Отмена
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}