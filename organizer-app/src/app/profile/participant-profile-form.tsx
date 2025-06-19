'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Team {
    id: string;
    name: string;
    nickname: string;
}

interface ParticipantProfileFormProps {
    userEmail: string;
}

export function ParticipantProfileForm({ userEmail }: ParticipantProfileFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        city: '',
        company: '',
        teamOption: 'none', // 'none', 'existing', 'new'
        selectedTeam: '',
        newTeamName: '',
        newTeamNickname: '',
    });

    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(false);
    const [teamsLoaded, setTeamsLoaded] = useState(false);

    const router = useRouter();

    const loadTeams = async () => {
        if (teamsLoaded) return;

        try {
            const response = await fetch('/api/teams');
            if (response.ok) {
                const data = await response.json();
                setTeams(data);
                setTeamsLoaded(true);
            }
        } catch (error) {
            console.error('Error loading teams:', error);
        }
    };

    const handleTeamOptionChange = (option: string) => {
        setFormData(prev => ({ ...prev, teamOption: option }));
        if (option === 'existing') {
            loadTeams();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/participant/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    email: userEmail,
                }),
            });

            if (response.ok) {
                router.push('/profile');
                router.refresh();
            } else {
                const error = await response.json();
                alert(error.error || 'Ошибка при сохранении профиля');
            }
        } catch (error) {
            console.error('Profile save error:', error);
            alert('Ошибка при сохранении профиля');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Личная информация</h3>

                <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-800 mb-1">
                        Имя *
                    </label>
                    <Input
                        id="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ваше имя"
                    />
                </div>

                <div>
                    <label htmlFor="city" className="block text-sm font-semibold text-gray-800 mb-1">
                        Город
                    </label>
                    <Input
                        id="city"
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="Ваш город"
                    />
                </div>

                <div>
                    <label htmlFor="company" className="block text-sm font-semibold text-gray-800 mb-1">
                        Компания
                    </label>
                    <Input
                        id="company"
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                        placeholder="Название компании"
                    />
                </div>
            </div>

            {/* Team Selection */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Команда</h3>

                <div className="space-y-3">
                    <label className="flex items-center font-medium text-gray-800">
                        <input
                            type="radio"
                            name="teamOption"
                            value="none"
                            checked={formData.teamOption === 'none'}
                            onChange={(e) => handleTeamOptionChange(e.target.value)}
                            className="mr-2"
                        />
                        Вне команды
                    </label>

                    <label className="flex items-center font-medium text-gray-800">
                        <input
                            type="radio"
                            name="teamOption"
                            value="existing"
                            checked={formData.teamOption === 'existing'}
                            onChange={(e) => handleTeamOptionChange(e.target.value)}
                            className="mr-2"
                        />
                        Присоединиться к существующей команде
                    </label>

                    <label className="flex items-center font-medium text-gray-800">
                        <input
                            type="radio"
                            name="teamOption"
                            value="new"
                            checked={formData.teamOption === 'new'}
                            onChange={(e) => handleTeamOptionChange(e.target.value)}
                            className="mr-2"
                        />
                        Создать новую команду
                    </label>
                </div>

                {/* Existing Team Selection */}
                {formData.teamOption === 'existing' && (
                    <div>
                        <label htmlFor="selectedTeam" className="block text-sm font-semibold text-gray-800 mb-1">
                            Выберите команду
                        </label>
                        <select
                            id="selectedTeam"
                            value={formData.selectedTeam}
                            onChange={(e) => setFormData(prev => ({ ...prev, selectedTeam: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            required={formData.teamOption === 'existing'}
                        >
                            <option value="">Выберите команду...</option>
                            {teams.map((team) => (
                                <option key={team.id} value={team.id}>
                                    {team.name} (@{team.nickname})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* New Team Creation */}
                {formData.teamOption === 'new' && (
                    <div className="space-y-3">
                        <div>
                            <label htmlFor="newTeamName" className="block text-sm font-semibold text-gray-800 mb-1">
                                Название команды *
                            </label>
                            <Input
                                id="newTeamName"
                                type="text"
                                value={formData.newTeamName}
                                onChange={(e) => setFormData(prev => ({ ...prev, newTeamName: e.target.value }))}
                                placeholder="Название новой команды"
                                required={formData.teamOption === 'new'}
                            />
                        </div>

                        <div>
                            <label htmlFor="newTeamNickname" className="block text-sm font-semibold text-gray-800 mb-1">
                                Краткое название (nickname) *
                            </label>
                            <Input
                                id="newTeamNickname"
                                type="text"
                                value={formData.newTeamNickname}
                                onChange={(e) => setFormData(prev => ({ ...prev, newTeamNickname: e.target.value }))}
                                placeholder="team-nickname"
                                required={formData.teamOption === 'new'}
                                pattern="[a-z0-9-]+"
                                title="Только строчные буквы, цифры и дефисы"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Только строчные буквы, цифры и дефисы
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Сохранение...' : 'Сохранить профиль'}
            </Button>
        </form>
    );
}
