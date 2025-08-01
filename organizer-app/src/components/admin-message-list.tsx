'use client';

import { useState, useEffect } from 'react';
import { MessageWithRelations } from '@/lib/messages';
import { MessageStatus } from '@prisma/client';
import { AdminMessageItem } from './admin-message-item';
import { MessageCompose } from './message-compose';
import { ConversationView } from './conversation-view';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Plus, Filter, Users } from 'lucide-react';

interface AdminMessageListProps {
  hackathonId: string;
}

export function AdminMessageList({ hackathonId }: AdminMessageListProps) {
  const [messages, setMessages] = useState<MessageWithRelations[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<MessageWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableTeamStatuses, setAvailableTeamStatuses] = useState<string[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<MessageWithRelations | null>(null);
  const [showConversation, setShowConversation] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'read' | 'unread'>('all');
  const [filterRecipient, setFilterRecipient] = useState<'all' | 'individual' | 'team'>('all');
  const [filterTeamStatus, setFilterTeamStatus] = useState<string>('all');

  useEffect(() => {
    fetchMessages();
  }, [hackathonId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    filterMessages();
  }, [messages, searchTerm, filterStatus, filterRecipient, filterTeamStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/messages?hackathonId=${hackathonId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        
        // Extract available team statuses from messages
        const statuses = new Set<string>();
        data.messages.forEach((message: MessageWithRelations) => {
          if (message.team?.status) {
            statuses.add(message.team.status);
          }
        });
        setAvailableTeamStatuses(Array.from(statuses).sort());
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterMessages = () => {
    let filtered = [...messages];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(message =>
        message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.recipient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (message.sender?.name && message.sender.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(message => {
        if (filterStatus === 'read') return message.status === MessageStatus.READ;
        if (filterStatus === 'unread') return message.status === MessageStatus.UNREAD;
        return true;
      });
    }

    // Recipient type filter
    if (filterRecipient !== 'all') {
      filtered = filtered.filter(message => {
        if (filterRecipient === 'individual') return !message.teamId;
        if (filterRecipient === 'team') return !!message.teamId;
        return true;
      });
    }

    // Team status filter (only apply when filtering by teams)
    if (filterRecipient === 'team' && filterTeamStatus !== 'all') {
      filtered = filtered.filter(message => {
        if (!message.teamId) return false;
        // Check if the message's team has the selected status
        return message.team?.status === filterTeamStatus;
      });
    }

    setFilteredMessages(filtered);
  };

  const handleMessageUpdate = () => {
    fetchMessages();
  };

  const handleNewMessage = () => {
    setShowCompose(false);
    fetchMessages();
  };

  const handleShowConversation = (message: MessageWithRelations) => {
    setSelectedMessage(message);
    setShowConversation(true);
  };

  const handleCloseConversation = () => {
    setShowConversation(false);
    setSelectedMessage(null);
    fetchMessages();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showConversation && selectedMessage) {
    return (
      <ConversationView
        message={selectedMessage}
        onClose={handleCloseConversation}
        hackathonId={hackathonId}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Управление сообщениями</h2>
          <p className="text-gray-600 mt-1">
            Отправляйте и управляйте сообщениями для участников и команд
          </p>
        </div>
        <Button onClick={() => setShowCompose(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Новое сообщение
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Поиск по теме, содержанию или получателю..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'read' | 'unread')}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white"
            >
              <option value="all">Все статусы</option>
              <option value="read">Прочитанные</option>
              <option value="unread">Непрочитанные</option>
            </select>
          </div>

          {/* Recipient Type Filter */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <select
              value={filterRecipient}
              onChange={(e) => {
                const newValue = e.target.value as 'all' | 'individual' | 'team';
                setFilterRecipient(newValue);
                // Reset team status filter when changing recipient type
                if (newValue !== 'team') {
                  setFilterTeamStatus('all');
                }
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white"
            >
              <option value="all">Все получатели</option>
              <option value="individual">Участники</option>
              <option value="team">Команды</option>
            </select>
          </div>

          {/* Team Status Filter - only show when filtering by teams */}
          {filterRecipient === 'team' && availableTeamStatuses.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterTeamStatus}
                onChange={(e) => setFilterTeamStatus(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white"
              >
                <option value="all">Все статусы</option>
                {availableTeamStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center gap-6 text-sm text-gray-600">
          <span>Всего сообщений: {filteredMessages.length}</span>
          <span>Непрочитанных: {filteredMessages.filter(m => m.status === MessageStatus.UNREAD).length}</span>
          <span>Командных: {filteredMessages.filter(m => m.teamId).length}</span>
          {filterRecipient === 'team' && filterTeamStatus !== 'all' && (
            <span>Статус &quot;{filterTeamStatus}&quot;: {filteredMessages.filter(m => m.team?.status === filterTeamStatus).length}</span>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <MessageCompose
                hackathonId={hackathonId}
                onSuccess={handleNewMessage}
                onCancel={() => setShowCompose(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Messages List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">
              {searchTerm || filterStatus !== 'all' || filterRecipient !== 'all'
                ? 'Сообщения не найдены по заданным критериям'
                : 'Сообщений пока нет'
              }
            </div>
            {(!searchTerm && filterStatus === 'all' && filterRecipient === 'all') && (
              <Button onClick={() => setShowCompose(true)} variant="outline" className="mt-4">
                Отправить первое сообщение
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredMessages.map((message) => (
              <AdminMessageItem
                key={message.id}
                message={message}
                onUpdate={handleMessageUpdate}
                onShowConversation={handleShowConversation}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}