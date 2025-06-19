'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Team {
    id: string;
    name: string;
    nickname: string;
}

interface PreselectedTeam {
    id: string;
    name: string;
    nickname: string;
}

interface RegistrationFormProps {
    preselectedTeam?: PreselectedTeam | null;
}

export function RegistrationForm({ preselectedTeam }: RegistrationFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        city: '',
        company: '',
        teamOption: preselectedTeam ? 'existing' : 'none', // Автоматически выбираем существующую команду, если есть
        selectedTeam: preselectedTeam?.id || '',
        newTeamName: '',
        newTeamNickname: '',
    });

    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(false);
    const [teamsLoaded, setTeamsLoaded] = useState(false);

    const router = useRouter();

    // Автоматически загружаем команды, если есть предвыбранная команда
    useEffect(() => {
        if (preselectedTeam) {
            loadTeams();
        }
    }, [preselectedTeam]);

    const loadTeams = async () => {
        if (teamsLoaded) return;

        try {
            const response = await fetch('/api/teams');
            if (response.ok) {
                const data = await response.json();
                // Если есть предвыбранная команда, убеждаемся, что она включена в список
                let allTeams = data;
                if (preselectedTeam && !data.find((t: Team) => t.id === preselectedTeam.id)) {
                    allTeams = [preselectedTeam, ...data];
                }
                setTeams(allTeams);
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

        // Validate password
        if (formData.password.length < 6) {
            alert('Пароль должен содержать минимум 6 символов');
            setLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            alert('Пароли не совпадают');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const result = await response.json();
                // Redirect to login with success message
                router.push('/login?message=registration-success');
            } else {
                const error = await response.json();
                alert(error.error || 'Ошибка при регистрации');
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('Ошибка при регистрации');
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
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-1">
                        Email *
                    </label>
                    <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="your@email.com"
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-1">
                        Пароль *
                    </label>
                    <Input
                        id="password"
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Минимум 6 символов"
                        minLength={6}
                    />
                </div>

                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-800 mb-1">
                        Подтвердите пароль *
                    </label>
                    <Input
                        id="confirmPassword"
                        type="password"
                        required
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Повторите пароль"
                        minLength={6}
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

                {preselectedTeam ? (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-700 mb-2">
                            Вы регистрируетесь по приглашению в команду:
                        </p>
                        <div className="font-semibold text-blue-900">
                            {preselectedTeam.name} (@{preselectedTeam.nickname})
                        </div>
                        <p className="text-xs text-blue-600 mt-1">
                            Команда выбрана автоматически
                        </p>
                    </div>
                ) : (
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
                )}

                {/* Existing Team Selection */}
                {formData.teamOption === 'existing' && !preselectedTeam && (
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
                {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </Button>
        </form>
    );
}
