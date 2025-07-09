'use client';

import { MessageCompose } from './message-compose';

interface MessagePopupProps {
  hackathonId: string;
  recipientType: 'participant' | 'team';
  recipientId: string;
  recipientName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MessagePopup({ 
  hackathonId, 
  recipientType, 
  recipientId, 
  recipientName, 
  isOpen, 
  onClose, 
  onSuccess 
}: MessagePopupProps) {
  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Отправить сообщение {recipientType === 'team' ? 'команде' : 'участнику'}: {recipientName}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
          
          <MessageCompose
            hackathonId={hackathonId}
            onSuccess={handleSuccess}
            onCancel={onClose}
            prefilledRecipientType={recipientType}
            prefilledRecipientId={recipientId}
          />
        </div>
      </div>
    </div>
  );
}