'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface Participant {
  id: string;
  name: string;
  email: string;
}

interface Team {
  id: string;
  name: string;
  members: Participant[];
}

interface MessageComposeProps {
  hackathonId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MessageCompose({ hackathonId, onSuccess, onCancel }: MessageComposeProps) {
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [recipientType, setRecipientType] = useState<'participant' | 'team'>('participant');
  const [recipientId, setRecipientId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchParticipants();
    fetchTeams();
  }, [hackathonId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchParticipants = async () => {
    try {
      const response = await fetch(`/api/participants?hackathonId=${hackathonId}`);
      if (response.ok) {
        const data = await response.json();
        setParticipants(data.participants || []);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch(`/api/teams?hackathonId=${hackathonId}`);
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject || !messageBody) {
      alert('Пожалуйста, заполните все обязательные поля');
      return;
    }

    if (recipientType === 'participant' && !recipientId) {
      alert('Пожалуйста, выберите получателя');
      return;
    }

    if (recipientType === 'team' && !teamId) {
      alert('Пожалуйста, выберите команду');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          messageBody,
          recipientId: recipientType === 'participant' ? recipientId : undefined,
          teamId: recipientType === 'team' ? teamId : undefined,
          hackathonId,
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || 'Не удалось отправить сообщение');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Не удалось отправить сообщение');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Создать новое сообщение</CardTitle>
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
            <Label htmlFor="recipientType">Отправить</Label>
            <select
              id="recipientType"
              value={recipientType}
              onChange={(e) => setRecipientType(e.target.value as 'participant' | 'team')}
              className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="participant">Участнику</option>
              <option value="team">Всей команде</option>
            </select>
          </div>

          {recipientType === 'participant' && (
            <div>
              <Label htmlFor="recipient">Получатель *</Label>
              <select
                id="recipient"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="">Выберите участника</option>
                {participants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.name} ({participant.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {recipientType === 'team' && (
            <div>
              <Label htmlFor="team">Команда *</Label>
              <select
                id="team"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="">Выберите команду</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.members?.length || 0} участников)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label htmlFor="messageBody">Сообщение *</Label>
            <Textarea
              id="messageBody"
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder="Введите ваше сообщение (поддерживается HTML)"
              rows={6}
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Вы можете использовать HTML-форматирование в сообщении
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Отправка...' : 'Отправить сообщение'}
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