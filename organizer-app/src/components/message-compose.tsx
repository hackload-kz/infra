'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { SearchableSelect } from './ui/searchable-select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Users, Mail, Send } from 'lucide-react';

// Dynamic import for the markdown editor to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

interface Participant {
  id: string;
  name: string;
  email: string;
}

interface Team {
  id: string;
  name: string;
  members: Participant[];
  status?: string;
  level?: string;
}

type RecipientType = 'participant' | 'team' | 'all-participants' | 'teams-by-status';

interface MessageComposeProps {
  hackathonId: string;
  onSuccess: () => void;
  onCancel: () => void;
  prefilledRecipientType?: RecipientType;
  prefilledRecipientId?: string;
}

export function MessageCompose({ hackathonId, onSuccess, onCancel, prefilledRecipientType, prefilledRecipientId }: MessageComposeProps) {
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState(''); // This will store markdown
  const [markdownContent, setMarkdownContent] = useState(''); // For the WYSIWYG editor
  const [useWysiwyg, setUseWysiwyg] = useState(true);
  const [recipientType, setRecipientType] = useState<RecipientType>(prefilledRecipientType || 'participant');
  const [recipientId, setRecipientId] = useState(prefilledRecipientType === 'participant' ? (prefilledRecipientId || '') : '');
  const [teamId, setTeamId] = useState(prefilledRecipientType === 'team' ? (prefilledRecipientId || '') : '');
  const [teamStatusFilter, setTeamStatusFilter] = useState<string>('all');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);

  // Status translations for team statuses
  const statusTranslations: Record<string, string> = {
    'NEW': 'Новая',
    'INCOMPLETED': 'Не завершена',
    'FINISHED': 'Завершена',
    'IN_REVIEW': 'На проверке',
    'APPROVED': 'Одобрена',
    'CANCELED': 'Отменена',
    'REJECTED': 'Отклонена'
  };

  // Options for searchable selects
  const participantOptions = participants.map(p => ({
    value: p.id,
    label: p.name,
    sublabel: p.email
  }));

  const teamOptions = teams.map(t => ({
    value: t.id,
    label: t.name,
    sublabel: `${t.members?.length || 0} участников • ${t.status ? statusTranslations[t.status as keyof typeof statusTranslations] || t.status : 'Статус не указан'}`
  }));

  // Team status options with Russian translations
  const teamStatuses = Array.from(new Set(teams.map(t => t.status).filter(Boolean))) as string[];
  const teamStatusOptions = [
    { value: 'all', label: 'Все команды' },
    ...teamStatuses.map(status => ({ 
      value: status, 
      label: statusTranslations[status as keyof typeof statusTranslations] || status 
    }))
  ];

  useEffect(() => {
    fetchParticipants();
    fetchTeams();
  }, [hackathonId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    calculateRecipientCount();
  }, [recipientType, recipientId, teamId, teamStatusFilter, participants, teams]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const calculateRecipientCount = () => {
    switch (recipientType) {
      case 'participant':
        setRecipientCount(recipientId ? 1 : 0);
        break;
      case 'team':
        const selectedTeam = teams.find(t => t.id === teamId);
        setRecipientCount(selectedTeam ? selectedTeam.members?.length || 0 : 0);
        break;
      case 'all-participants':
        setRecipientCount(participants.length);
        break;
      case 'teams-by-status':
        const filteredTeams = teamStatusFilter === 'all' 
          ? teams 
          : teams.filter(t => t.status === teamStatusFilter);
        const totalMembers = filteredTeams.reduce((sum, team) => sum + (team.members?.length || 0), 0);
        setRecipientCount(totalMembers);
        break;
      default:
        setRecipientCount(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const bodyContent = useWysiwyg ? markdownContent : messageBody;
    
    if (!subject || !bodyContent) {
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

    if (recipientType === 'teams-by-status' && teamStatusFilter === 'all' && teams.length === 0) {
      alert('Нет команд для отправки сообщения');
      return;
    }

    setLoading(true);

    try {
      let apiUrl = '/api/messages';
      const requestBody: {
        subject: string;
        messageBody: string;
        hackathonId: string;
        recipientId?: string;
        teamId?: string;
        broadcastType?: string;
        teamStatusFilter?: string;
      } = {
        subject,
        messageBody: bodyContent,
        hackathonId,
      };

      // Content is always stored as markdown now
      // No need for htmlBody - the server will convert markdown to HTML for emails

      // Handle different recipient types
      switch (recipientType) {
        case 'participant':
          requestBody.recipientId = recipientId;
          break;
        case 'team':
          requestBody.teamId = teamId;
          break;
        case 'all-participants':
          apiUrl = '/api/messages/broadcast';
          requestBody.broadcastType = 'all-participants';
          break;
        case 'teams-by-status':
          apiUrl = '/api/messages/broadcast';
          requestBody.broadcastType = 'teams-by-status';
          requestBody.teamStatusFilter = teamStatusFilter;
          break;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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
    <Card className="w-full max-w-2xl mx-auto bg-white shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700">
        <CardTitle className="text-white text-xl font-semibold">Создать новое сообщение</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="subject" className="text-gray-800 font-semibold text-sm">Тема *</Label>
            <Input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Введите тему сообщения"
              required
              className="mt-1 text-gray-800 font-medium bg-gray-50 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <Label htmlFor="recipientType" className="text-gray-800 font-semibold text-sm">Отправить</Label>
            <select
              id="recipientType"
              value={recipientType}
              onChange={(e) => setRecipientType(e.target.value as RecipientType)}
              disabled={!!prefilledRecipientType}
              className="mt-1 flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="participant">👤 Участнику</option>
              <option value="team">👥 Всей команде</option>
              <option value="all-participants">📢 Всем участникам</option>
              <option value="teams-by-status">🎯 Командам по статусу</option>
            </select>
          </div>

          {recipientType === 'participant' && (
            <div>
              <Label htmlFor="recipient" className="text-gray-800 font-semibold text-sm">Получатель *</Label>
              <div className="mt-1">
                <SearchableSelect
                  options={participantOptions}
                  value={recipientId}
                  onChange={setRecipientId}
                  placeholder="Поиск участника по имени или email..."
                  disabled={!!prefilledRecipientId}
                  required
                />
              </div>
            </div>
          )}

          {recipientType === 'team' && (
            <div>
              <Label htmlFor="team" className="text-gray-800 font-semibold text-sm">Команда *</Label>
              <div className="mt-1">
                <SearchableSelect
                  options={teamOptions}
                  value={teamId}
                  onChange={setTeamId}
                  placeholder="Поиск команды по названию..."
                  disabled={!!prefilledRecipientId}
                  required
                />
              </div>
            </div>
          )}

          {recipientType === 'all-participants' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Mail className="h-5 w-5" />
                <span className="font-semibold">Массовая рассылка</span>
              </div>
              <p className="text-blue-700 mt-1">
                Сообщение будет отправлено всем {participants.length} участникам хакатона.
              </p>
            </div>
          )}

          {recipientType === 'teams-by-status' && (
            <div>
              <Label htmlFor="teamStatus" className="text-gray-800 font-semibold text-sm">Статус команды</Label>
              <select
                id="teamStatus"
                value={teamStatusFilter}
                onChange={(e) => setTeamStatusFilter(e.target.value)}
                className="mt-1 flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-blue-500"
              >
                {teamStatusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-2">
                <div className="flex items-center gap-2 text-amber-800">
                  <Users className="h-5 w-5" />
                  <span className="font-semibold">Рассылка по командам</span>
                </div>
                <p className="text-amber-700 mt-1">
                  Сообщение будет отправлено участникам {teamStatusFilter === 'all' ? 'всех команд' : `команд со статусом "${statusTranslations[teamStatusFilter as keyof typeof statusTranslations] || teamStatusFilter}"`}.
                  Всего получателей: {recipientCount}
                </p>
              </div>
            </div>
          )}

          {/* Editor Toggle */}
          <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
            <Label className="text-gray-800 font-semibold text-sm">Режим редактирования</Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUseWysiwyg(false)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  !useWysiwyg 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                📝 Текст
              </button>
              <button
                type="button"
                onClick={() => setUseWysiwyg(true)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  useWysiwyg 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                ✨ Визуальный редактор
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="messageBody" className="text-gray-800 font-semibold text-sm">Сообщение *</Label>
            {useWysiwyg ? (
              <div className="mt-1 border border-gray-300 rounded-md bg-white">
                <MDEditor
                  value={markdownContent}
                  onChange={(value) => setMarkdownContent(value || '')}
                  preview="edit"
                  hideToolbar={false}
                  height={250}
                  data-color-mode="light"
                />
              </div>
            ) : (
              <Textarea
                id="messageBody"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Введите ваше сообщение в формате Markdown"
                rows={10}
                required
                className="mt-1 font-mono text-sm text-gray-800 bg-gray-50 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            )}
            <p className="text-xs text-gray-600 mt-2 font-medium">
              {useWysiwyg 
                ? '✨ Используйте визуальный редактор для создания Markdown-контента'
                : '📝 Введите сообщение в формате Markdown (поддерживается **жирный**, *курсив*, списки, ссылки и др.)'
              }
            </p>
          </div>

          {/* Recipient Summary */}
          {recipientCount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <Send className="h-5 w-5" />
                <span className="font-semibold">Готово к отправке</span>
              </div>
              <p className="text-green-700 mt-1">
                Сообщение будет доставлено {recipientCount} получател{recipientCount === 1 ? 'ю' : recipientCount < 5 ? 'ям' : 'ям'}.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <Button 
              type="submit" 
              disabled={loading || recipientCount === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 text-sm shadow-md disabled:opacity-50"
            >
              {loading ? '📤 Отправка...' : `📨 Отправить ${recipientCount > 1 ? `(${recipientCount})` : ''}`}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="text-gray-700 border-gray-300 hover:bg-gray-50 font-medium px-6 py-3 text-sm"
            >
              ❌ Отмена
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}