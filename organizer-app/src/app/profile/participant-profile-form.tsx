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

interface PreselectedTeam {
    id: string;
    name: string;
    nickname: string;
}

interface ParticipantProfileFormProps {
    userEmail: string;
    preselectedTeam?: PreselectedTeam | null;
}

export function ParticipantProfileForm({ userEmail, preselectedTeam }: ParticipantProfileFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        city: '',
        company: '',
        teamOption: preselectedTeam ? 'existing' : 'none', // Auto-select existing team if preselected
        selectedTeam: preselectedTeam?.id || '',
        newTeamName: '',
        newTeamNickname: '',
        // Experience fields
        experienceLevel: '',
        technologies: [] as string[],
        cloudServices: [] as string[],
        cloudProviders: [] as string[],
        otherTechnologies: '',
        otherCloudServices: '',
        otherCloudProviders: '',
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

    const handleCheckboxChange = (field: 'technologies' | 'cloudServices' | 'cloudProviders', value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].includes(value)
                ? prev[field].filter(item => item !== value)
                : [...prev[field], value]
        }));
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
                        Пока без команды, вступлю позже
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
                        Создать новую команду (даже если вы единственный член команды)
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
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            required={formData.teamOption === 'existing'}
                        >
                            <option value="" className="text-gray-500">Выберите команду...</option>
                            {preselectedTeam && (
                                <option key={preselectedTeam.id} value={preselectedTeam.id} className="text-gray-900">
                                    {preselectedTeam.name} (@{preselectedTeam.nickname}) - Приглашение
                                </option>
                            )}
                            {teams.filter(team => !preselectedTeam || team.id !== preselectedTeam.id).map((team) => (
                                <option key={team.id} value={team.id} className="text-gray-900">
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

            {/* Experience Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Ваш опыт</h3>

                {/* Experience Level */}
                <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Какой у вас опыт?
                    </label>
                    <div className="space-y-2">
                        {[
                            'Junior (младший специалист)',
                            'Middle (специалист / инженер)',
                            'Senior (ведущий специалист / инженер)',
                            'Lead / Tech Lead / Team Lead',
                            'Principal / Staff Engineer / Expert',
                            'Engineering Manager / Architect / C-level (CTO, CIO)'
                        ].map(level => (
                            <label key={level} className="flex items-center font-medium text-gray-800">
                                <input
                                    type="radio"
                                    name="experienceLevel"
                                    value={level}
                                    checked={formData.experienceLevel === level}
                                    onChange={(e) => setFormData(prev => ({ ...prev, experienceLevel: e.target.value }))}
                                    className="mr-2"
                                />
                                {level}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Technologies */}
                <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Какие сервисы / ПО ваша компания размещает в облаке? (выбор нескольких вариантов)
                    </label>
                    <div className="space-y-2">
                        {[
                            'Офисные приложения (ЭДО / почта)',
                            'Web-приложения / Backend',
                            'Система учета (1С, SAP, ERP)',
                            'Базы данных',
                            'Всё перечисленное (частично)',
                            'Не используем облачные технологии',
                            'Затрудняюсь ответить',
                            'Другое'
                        ].map(tech => (
                            <label key={tech} className="flex items-center font-medium text-gray-800">
                                <input
                                    type="checkbox"
                                    checked={formData.technologies.includes(tech)}
                                    onChange={() => handleCheckboxChange('technologies', tech)}
                                    className="mr-2"
                                />
                                {tech}
                            </label>
                        ))}
                        {formData.technologies.includes('Другое') && (
                            <div className="ml-6">
                                <Input
                                    type="text"
                                    value={formData.otherTechnologies}
                                    onChange={(e) => setFormData(prev => ({ ...prev, otherTechnologies: e.target.value }))}
                                    placeholder="Укажите другую технологию"
                                    className="mt-2"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Cloud Services Usage */}
                <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Какие облачные сервисы вы используете или хотели бы попробовать? (выбор нескольких вариантов)
                    </label>
                    <div className="space-y-2">
                        {[
                            'Infrastructure as a Service',
                            'Kubernetes as a Service',
                            'Database as a Service',
                            'Monitoring as a Service',
                            'Backup as a Service',
                            'Disaster Recovery as a Service',
                            'Не используем облачные технологии',
                            'Затрудняюсь ответить',
                            'Другое'
                        ].map(service => (
                            <label key={service} className="flex items-center font-medium text-gray-800">
                                <input
                                    type="checkbox"
                                    checked={formData.cloudServices.includes(service)}
                                    onChange={() => handleCheckboxChange('cloudServices', service)}
                                    className="mr-2"
                                />
                                {service}
                            </label>
                        ))}
                        {formData.cloudServices.includes('Другое') && (
                            <div className="ml-6">
                                <Input
                                    type="text"
                                    value={formData.otherCloudServices}
                                    onChange={(e) => setFormData(prev => ({ ...prev, otherCloudServices: e.target.value }))}
                                    placeholder="Укажите другой облачный сервис"
                                    className="mt-2"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Cloud Providers */}
                <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Каких местных облачных провайдеров вы знаете? (выбор нескольких вариантов)
                    </label>
                    <div className="space-y-2">
                        {[
                            'PS Cloud Services',
                            'KT Cloud Lab',
                            'Serverspace',
                            'Yandex Cloud',
                            'VK Cloud',
                            'SmartCloud',
                            'Hoster.KZ',
                            'Oblako.kz',
                            'Cloud24',
                            'Cloupard',
                            'NLS Kazakhstan',
                            'Затрудняюсь ответить',
                            'Другое'
                        ].map(provider => (
                            <label key={provider} className="flex items-center font-medium text-gray-800">
                                <input
                                    type="checkbox"
                                    checked={formData.cloudProviders.includes(provider)}
                                    onChange={() => handleCheckboxChange('cloudProviders', provider)}
                                    className="mr-2"
                                />
                                {provider}
                            </label>
                        ))}
                        {formData.cloudProviders.includes('Другое') && (
                            <div className="ml-6">
                                <Input
                                    type="text"
                                    value={formData.otherCloudProviders}
                                    onChange={(e) => setFormData(prev => ({ ...prev, otherCloudProviders: e.target.value }))}
                                    placeholder="Укажите другого облачного провайдера"
                                    className="mt-2"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Сохранение...' : 'Зарегистрироваться'}
            </Button>
        </form>
    );
}
