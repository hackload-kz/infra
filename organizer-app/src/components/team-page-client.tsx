'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { MessagePopup } from './message-popup';

interface TeamPageClientProps {
  teamId: string;
  teamName: string;
  hackathonId: string;
}

export function TeamPageClient({ teamId, teamName, hackathonId }: TeamPageClientProps) {
  const [isMessagePopupOpen, setIsMessagePopupOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsMessagePopupOpen(true)}
        className="flex items-center gap-2"
      >
        <MessageSquare className="w-4 h-4" />
        Отправить сообщение
      </Button>

      <MessagePopup
        hackathonId={hackathonId}
        recipientType="team"
        recipientId={teamId}
        recipientName={teamName}
        isOpen={isMessagePopupOpen}
        onClose={() => setIsMessagePopupOpen(false)}
      />
    </>
  );
}