'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface TeamInvitationPopupProps {
  team: {
    id: string;
    name: string;
    nickname: string;
  };
  teamLeader: {
    id: string;
    name: string;
    email: string;
    telegram?: string | null;
  };
  targetParticipant: {
    id: string;
    name: string;
    email: string;
  };
  hackathonId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TeamInvitationPopup({ 
  team, 
  targetParticipant, 
  isOpen, 
  onClose, 
  onSuccess 
}: TeamInvitationPopupProps) {
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendInvitation = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/team-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teamId: team.id,
          targetParticipantId: targetParticipant.id,
          customMessage: customMessage.trim() || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invitation');
      }

      onSuccess?.();
      onClose();
      setCustomMessage('');
    } catch (err) {
      console.error('Failed to send invitation:', err);
      setError('Не удалось отправить приглашение. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setCustomMessage('');
      setError(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-slate-700">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              Пригласить участника в команду
            </h2>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-slate-400 hover:text-slate-300 text-2xl leading-none disabled:opacity-50"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="bg-slate-700/30 p-4 rounded-lg">
              <div className="text-sm text-slate-400 mb-1">Участник</div>
              <div className="text-white font-medium">{targetParticipant.name}</div>
              <div className="text-slate-400 text-sm">{targetParticipant.email}</div>
            </div>
            
            <div className="bg-slate-700/30 p-4 rounded-lg">
              <div className="text-sm text-slate-400 mb-1">Команда</div>
              <div className="text-white font-medium">{team.name}</div>
              <div className="text-slate-400 text-sm">@{team.nickname}</div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="customMessage" className="block text-sm font-medium text-slate-300 mb-2">
                Персональное сообщение (необязательно)
              </label>
              <Textarea
                id="customMessage"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Добавьте персональное сообщение к приглашению..."
                className="min-h-[100px] bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                disabled={loading}
              />
              <div className="text-xs text-slate-400 mt-1">
                Это сообщение будет добавлено к стандартному приглашению в команду
              </div>
            </div>
            
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-300 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSendInvitation}
                disabled={loading}
                className="flex-1 bg-amber-400 hover:bg-amber-500 text-slate-900 font-medium"
              >
                {loading ? 'Отправляем...' : 'Отправить приглашение'}
              </Button>
              <Button
                onClick={handleClose}
                disabled={loading}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Отмена
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}