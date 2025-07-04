'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, LogOut, Plus, ArrowRightLeft } from 'lucide-react';

interface Team {
    id: string;
    name: string;
    nickname: string;
    members: {
        id: string;
        name: string;
        email: string;
    }[];
}

interface Participant {
    id: string;
    team?: Team | null;
    ledTeam?: Team | null;
}

interface TeamChangeData {
    teamId?: string;
    teamName?: string;
    teamNickname?: string;
    newLeaderId?: string | null;
}

interface TeamManagementProps {
    participant: Participant;
    availableTeams: { id: string; name: string; nickname: string; }[];
    onTeamChange: (action: string, data?: TeamChangeData) => Promise<void>;
}

export function TeamManagement({ participant, availableTeams, onTeamChange }: TeamManagementProps) {
    const [activeAction, setActiveAction] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Form states
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamNickname, setNewTeamNickname] = useState('');
    const [selectedNewLeader, setSelectedNewLeader] = useState('');

    const router = useRouter();
    const isLeader = !!participant.ledTeam;
    const currentTeam = participant.team;
    const teamMembers = currentTeam?.members || [];
    const otherMembers = teamMembers.filter(m => m.id !== participant.id);

    const handleAction = async (action: string, data?: TeamChangeData) => {
        setLoading(true);
        setError(null);
        
        try {
            await onTeamChange(action, data);
            setActiveAction(null);
            router.refresh();
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Произошла ошибка');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setActiveAction(null);
        setSelectedTeamId('');
        setNewTeamName('');
        setNewTeamNickname('');
        setSelectedNewLeader('');
        setError(null);
    };

    if (activeAction === 'leave') {
        return (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Покинуть команду</h3>
                
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-800 text-sm">{error}</p>
                    </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">
                        Вы собираетесь покинуть команду <strong>{currentTeam?.name}</strong>.
                    </p>
                    
                    {isLeader && otherMembers.length > 0 && (
                        <div className="mt-3">
                            <p className="text-yellow-800 text-sm font-medium mb-2">
                                Выберите нового лидера команды:
                            </p>
                            <select
                                value={selectedNewLeader}
                                onChange={(e) => setSelectedNewLeader(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 font-medium"
                                required
                            >
                                <option value="">Выберите нового лидера</option>
                                {otherMembers.map(member => (
                                    <option key={member.id} value={member.id}>
                                        {member.name} ({member.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                    {isLeader && otherMembers.length === 0 && (
                        <p className="text-yellow-800 text-sm mt-2">
                            ⚠️ Команда будет удалена, так как вы единственный участник.
                        </p>
                    )}
                </div>

                <div className="flex gap-3">
                    <Button
                        onClick={() => handleAction('leave', { 
                            newLeaderId: selectedNewLeader || null 
                        })}
                        disabled={loading || (isLeader && otherMembers.length > 0 && !selectedNewLeader)}
                        variant="destructive"
                        className="flex-1"
                    >
                        {loading ? 'Выход...' : 'Покинуть команду'}
                    </Button>
                    <Button onClick={resetForm} variant="outline" className="flex-1">
                        Отмена
                    </Button>
                </div>
            </div>
        );
    }

    if (activeAction === 'create') {
        return (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                    {currentTeam ? 'Покинуть и создать новую команду' : 'Создать новую команду'}
                </h3>
                
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-800 text-sm">{error}</p>
                    </div>
                )}

                {currentTeam && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-blue-800 text-sm">
                            Вы покинете команду <strong>{currentTeam.name}</strong> и создадите новую команду.
                        </p>
                        
                        {isLeader && otherMembers.length > 0 && (
                            <div className="mt-3">
                                <p className="text-blue-800 text-sm font-medium mb-2">
                                    Выберите нового лидера для текущей команды:
                                </p>
                                <select
                                    value={selectedNewLeader}
                                    onChange={(e) => setSelectedNewLeader(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 font-medium"
                                    required
                                >
                                    <option value="">Выберите нового лидера</option>
                                    {otherMembers.map(member => (
                                        <option key={member.id} value={member.id}>
                                            {member.name} ({member.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Название команды *
                        </label>
                        <Input
                            type="text"
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            placeholder="Введите название команды"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Никнейм команды *
                        </label>
                        <Input
                            type="text"
                            value={newTeamNickname}
                            onChange={(e) => setNewTeamNickname(e.target.value)}
                            placeholder="team-nickname"
                            pattern="^[a-zA-Z0-9_-]+$"
                            title="Только буквы, цифры, дефисы и подчеркивания"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Только буквы, цифры, дефисы и подчеркивания
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button
                        onClick={() => handleAction('create', {
                            teamName: newTeamName,
                            teamNickname: newTeamNickname,
                            newLeaderId: selectedNewLeader || null
                        })}
                        disabled={loading || !newTeamName || !newTeamNickname || 
                                Boolean(currentTeam && isLeader && otherMembers.length > 0 && !selectedNewLeader)}
                        className="flex-1"
                    >
                        {loading ? 'Создание...' : 'Создать команду'}
                    </Button>
                    <Button onClick={resetForm} variant="outline" className="flex-1">
                        Отмена
                    </Button>
                </div>
            </div>
        );
    }

    if (activeAction === 'join') {
        return (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                    {currentTeam ? 'Сменить команду' : 'Присоединиться к команде'}
                </h3>
                
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-800 text-sm">{error}</p>
                    </div>
                )}

                {currentTeam && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-blue-800 text-sm">
                            Вы покинете команду <strong>{currentTeam.name}</strong> и присоединитесь к новой команде.
                        </p>
                        
                        {isLeader && otherMembers.length > 0 && (
                            <div className="mt-3">
                                <p className="text-blue-800 text-sm font-medium mb-2">
                                    Выберите нового лидера для текущей команды:
                                </p>
                                <select
                                    value={selectedNewLeader}
                                    onChange={(e) => setSelectedNewLeader(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 font-medium"
                                    required
                                >
                                    <option value="">Выберите нового лидера</option>
                                    {otherMembers.map(member => (
                                        <option key={member.id} value={member.id}>
                                            {member.name} ({member.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Выберите команду
                    </label>
                    <select
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 font-medium"
                        required
                    >
                        <option value="">Выберите команду</option>
                        {availableTeams
                            .filter(team => team.id !== currentTeam?.id)
                            .map(team => (
                                <option key={team.id} value={team.id}>
                                    {team.name} (@{team.nickname})
                                </option>
                            ))}
                    </select>
                </div>

                <div className="flex gap-3">
                    <Button
                        onClick={() => handleAction('join', {
                            teamId: selectedTeamId,
                            newLeaderId: selectedNewLeader || null
                        })}
                        disabled={loading || !selectedTeamId || 
                                Boolean(currentTeam && isLeader && otherMembers.length > 0 && !selectedNewLeader)}
                        className="flex-1"
                    >
                        {loading ? 'Присоединение...' : 'Присоединиться'}
                    </Button>
                    <Button onClick={resetForm} variant="outline" className="flex-1">
                        Отмена
                    </Button>
                </div>
            </div>
        );
    }

    // Default view with action buttons
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Команда</h3>
            
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-800 text-sm">{error}</p>
                </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                {currentTeam ? (
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                            Текущая команда:
                        </p>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-gray-900">
                                    {currentTeam.name}
                                </p>
                                <p className="text-sm text-gray-600">
                                    @{currentTeam.nickname}
                                </p>
                                <p className="text-xs text-gray-500">
                                    Участников: {teamMembers.length}
                                </p>
                            </div>
                            {isLeader && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Лидер
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 font-medium mb-2">
                            Вы не состоите ни в одной команде
                        </p>
                        <p className="text-sm text-gray-500">
                            Создайте новую команду или присоединитесь к существующей
                        </p>
                    </div>
                )}
            </div>

            {!currentTeam ? (
                // Suggestions for users without teams
                <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">💡 Рекомендации для участия</h4>
                        <p className="text-sm text-blue-800 mb-3">
                            Для участия в хакатоне вам нужна команда. Выберите один из вариантов:
                        </p>
                        
                        <div className="space-y-2">
                            <Button
                                onClick={() => setActiveAction('create')}
                                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                            >
                                <Plus className="w-4 h-4" />
                                Создать новую команду
                            </Button>
                            
                            {availableTeams.length > 0 ? (
                                <Button
                                    onClick={() => setActiveAction('join')}
                                    variant="outline"
                                    className="w-full flex items-center justify-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                                >
                                    <ArrowRightLeft className="w-4 h-4" />
                                    Присоединиться к существующей команде
                                </Button>
                            ) : (
                                <div className="bg-gray-100 border border-gray-200 rounded-md p-3 text-center">
                                    <p className="text-sm text-gray-600">
                                        Пока нет доступных команд для присоединения
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {availableTeams.length > 0 && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-xs text-gray-600 mb-2 font-medium">
                                Доступные команды ({availableTeams.length}):
                            </p>
                            <div className="space-y-1">
                                {availableTeams.slice(0, 3).map(team => (
                                    <p key={team.id} className="text-xs text-gray-500">
                                        • {team.name} (@{team.nickname})
                                    </p>
                                ))}
                                {availableTeams.length > 3 && (
                                    <p className="text-xs text-gray-500">
                                        ... и еще {availableTeams.length - 3} команд
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // Actions for users with teams
                <div className="space-y-3">
                    <Button
                        onClick={() => setActiveAction('leave')}
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                        <LogOut className="w-4 h-4" />
                        Покинуть команду
                    </Button>

                    <Button
                        onClick={() => setActiveAction('create')}
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                        <Plus className="w-4 h-4" />
                        Покинуть и создать новую команду
                    </Button>

                    {availableTeams.filter(team => team.id !== currentTeam?.id).length > 0 && (
                        <Button
                            onClick={() => setActiveAction('join')}
                            variant="outline"
                            className="w-full flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                            <ArrowRightLeft className="w-4 h-4" />
                            Сменить команду
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}