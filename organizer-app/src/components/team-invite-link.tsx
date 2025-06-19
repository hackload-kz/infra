'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TeamInviteLinkProps {
    teamNickname: string;
}

export function TeamInviteLink({ teamNickname }: TeamInviteLinkProps) {
    const [copied, setCopied] = useState(false);
    const [inviteUrl, setInviteUrl] = useState('');

    useEffect(() => {
        // Set the invite URL only on the client side
        setInviteUrl(`${window.location.origin}/register?team=${teamNickname}`);
    }, [teamNickname]);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = inviteUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Пригласить в команду
            </h3>
            <p className="text-sm text-gray-600 mb-3">
                Поделитесь этой ссылкой с участниками, чтобы они могли присоединиться к вашей команде при регистрации:
            </p>
            {inviteUrl && (
                <div className="flex gap-2">
                    <Input
                        type="text"
                        value={inviteUrl}
                        readOnly
                        className="flex-1 bg-white"
                    />
                    <Button
                        type="button"
                        onClick={copyToClipboard}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${copied
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                    >
                        {copied ? '✓ Скопировано!' : 'Копировать'}
                    </Button>
                </div>
            )}
        </div>
    );
}
