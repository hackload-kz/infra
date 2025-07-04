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

interface Participant {
    id: string;
    name: string;
    email: string;
    city: string | null;
    company: string | null;
    experienceLevel?: string | null;
    technologies?: string | null;
    cloudServices?: string | null;
    cloudProviders?: string | null;
    otherTechnologies?: string | null;
    otherCloudServices?: string | null;
    otherCloudProviders?: string | null;
    team?: {
        id: string;
        name: string;
        nickname: string;
    } | null;
    ledTeam?: {
        id: string;
        name: string;
        nickname: string;
    } | null;
}

interface EditProfileFormProps {
    participant: Participant;
    userEmail: string;
    availableTeams: Team[];
}

export function EditProfileForm({ participant, userEmail, availableTeams }: EditProfileFormProps) {
    const [formData, setFormData] = useState({
        name: participant.name || '',
        city: participant.city || '',
        company: participant.company || '',
        experienceLevel: participant.experienceLevel || '',
        technologies: participant.technologies ? JSON.parse(participant.technologies) : [],
        cloudServices: participant.cloudServices ? JSON.parse(participant.cloudServices) : [],
        cloudProviders: participant.cloudProviders ? JSON.parse(participant.cloudProviders) : [],
        otherTechnologies: participant.otherTechnologies || '',
        otherCloudServices: participant.otherCloudServices || '',
        otherCloudProviders: participant.otherCloudProviders || '',
        // Team fields
        teamOption: participant.team ? 'existing' : 'none',
        selectedTeam: participant.team?.id || '',
        newTeamName: '',
        newTeamNickname: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleCheckboxChange = (field: 'technologies' | 'cloudServices' | 'cloudProviders', value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].includes(value)
                ? prev[field].filter((item: string) => item !== value)
                : [...prev[field], value]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validate team selection
        if (formData.teamOption === 'existing' && !formData.selectedTeam) {
            setError('Выберите команду из списка');
            setLoading(false);
            return;
        }

        if (formData.teamOption === 'new') {
            if (!formData.newTeamName.trim()) {
                setError('Введите название команды');
                setLoading(false);
                return;
            }
            if (!formData.newTeamNickname.trim()) {
                setError('Введите nickname команды');
                setLoading(false);
                return;
            }
            if (!/^[a-zA-Z0-9_-]+$/.test(formData.newTeamNickname)) {
                setError('Nickname команды может содержать только латинские буквы, цифры, подчеркивания и дефисы');
                setLoading(false);
                return;
            }
        }

        try {
            const response = await fetch('/api/participant/profile', {
                method: 'PUT',
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
                const errorData = await response.json();
                setError(errorData.error || 'Ошибка при обновлении профиля');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            setError('Ошибка при обновлении профиля');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 text-sm">{error}</p>
                </div>
            )}

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

            {/* Team Information */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Команда</h3>

                <div className="space-y-3">
                    <label className="flex items-center font-medium text-gray-800">
                        <input
                            type="radio"
                            name="teamOption"
                            value="none"
                            checked={formData.teamOption === 'none'}
                            onChange={(e) => setFormData(prev => ({ ...prev, teamOption: e.target.value }))}
                            className="mr-2"
                        />
                        Не состоять в команде
                    </label>

                    <label className="flex items-center font-medium text-gray-800">
                        <input
                            type="radio"
                            name="teamOption"
                            value="existing"
                            checked={formData.teamOption === 'existing'}
                            onChange={(e) => setFormData(prev => ({ ...prev, teamOption: e.target.value }))}
                            className="mr-2"
                        />
                        Присоединиться к существующей команде
                    </label>

                    {formData.teamOption === 'existing' && (
                        <div className="ml-6">
                            <select
                                value={formData.selectedTeam}
                                onChange={(e) => setFormData(prev => ({ ...prev, selectedTeam: e.target.value }))}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                                required
                            >
                                <option value="">Выберите команду</option>
                                {availableTeams.map(team => (
                                    <option key={team.id} value={team.id}>
                                        {team.name} (@{team.nickname})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <label className="flex items-center font-medium text-gray-800">
                        <input
                            type="radio"
                            name="teamOption"
                            value="new"
                            checked={formData.teamOption === 'new'}
                            onChange={(e) => setFormData(prev => ({ ...prev, teamOption: e.target.value }))}
                            className="mr-2"
                        />
                        Создать новую команду
                    </label>

                    {formData.teamOption === 'new' && (
                        <div className="ml-6 space-y-3">
                            <div>
                                <label htmlFor="newTeamName" className="block text-sm font-medium text-gray-700 mb-1">
                                    Название команды
                                </label>
                                <Input
                                    id="newTeamName"
                                    type="text"
                                    value={formData.newTeamName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, newTeamName: e.target.value }))}
                                    placeholder="Название вашей команды"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="newTeamNickname" className="block text-sm font-medium text-gray-700 mb-1">
                                    Nickname команды
                                </label>
                                <Input
                                    id="newTeamNickname"
                                    type="text"
                                    value={formData.newTeamNickname}
                                    onChange={(e) => setFormData(prev => ({ ...prev, newTeamNickname: e.target.value }))}
                                    placeholder="nickname_команды"
                                    required
                                    pattern="[a-zA-Z0-9_-]+"
                                    title="Используйте только буквы, цифры, подчеркивания и дефисы"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Используйте только латинские буквы, цифры, подчеркивания и дефисы
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {participant.ledTeam && formData.teamOption !== 'new' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-yellow-800 text-sm">
                            ⚠️ <strong>Внимание:</strong> Вы являетесь лидером команды &quot;{participant.ledTeam.name}&quot;.
                            При изменении команды лидерство может быть передано другому участнику или команда может быть расформирована.
                        </p>
                    </div>
                )}
            </div>

            <div className="flex gap-4">
                <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? 'Сохранение...' : 'Сохранить изменения'}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/profile')}
                    className="flex-1"
                >
                    Отмена
                </Button>
            </div>
        </form>
    );
}
