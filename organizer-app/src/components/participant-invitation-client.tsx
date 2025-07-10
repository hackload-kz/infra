'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { TeamInvitationPopup } from './team-invitation-popup';

interface ParticipantInvitationClientProps {
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
}

export function ParticipantInvitationClient({ 
  team, 
  teamLeader, 
  targetParticipant, 
  hackathonId 
}: ParticipantInvitationClientProps) {
  const [isInvitationPopupOpen, setIsInvitationPopupOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsInvitationPopupOpen(true)}
        className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-150"
      >
        <MessageSquare className="w-4 h-4" />
        <span>Пригласить в команду</span>
      </Button>

      <TeamInvitationPopup
        team={team}
        teamLeader={teamLeader}
        targetParticipant={targetParticipant}
        hackathonId={hackathonId}
        isOpen={isInvitationPopupOpen}
        onClose={() => setIsInvitationPopupOpen(false)}
        onSuccess={() => {
          // You could add a success toast here if needed
          console.log('Invitation sent successfully');
        }}
      />
    </>
  );
}