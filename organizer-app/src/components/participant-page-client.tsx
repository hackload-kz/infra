'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { MessagePopup } from './message-popup';

interface ParticipantPageClientProps {
  participantId: string;
  participantName: string;
  hackathonId: string;
}

export function ParticipantPageClient({ participantId, participantName, hackathonId }: ParticipantPageClientProps) {
  const [isMessagePopupOpen, setIsMessagePopupOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsMessagePopupOpen(true)}
        variant="outline"
        className="flex items-center gap-2"
      >
        <MessageSquare className="w-4 h-4" />
        Отправить сообщение
      </Button>

      <MessagePopup
        hackathonId={hackathonId}
        recipientType="participant"
        recipientId={participantId}
        recipientName={participantName}
        isOpen={isMessagePopupOpen}
        onClose={() => setIsMessagePopupOpen(false)}
      />
    </>
  );
}