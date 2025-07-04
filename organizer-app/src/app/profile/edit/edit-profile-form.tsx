'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { changeTeam } from '@/lib/actions';

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
        members: {
            id: string;
            name: string;
            email: string;
        }[];
    } | null;
    ledTeam?: {
        id: string;
        name: string;
        nickname: string;
        members: {
            id: string;
            name: string;
            email: string;
        }[];
    } | null;
}

interface Team {
    id: string;
    name: string;
    nickname: string;
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
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [teamChangeMode, setTeamChangeMode] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<string>('');
    const [selectedNewLeader, setSelectedNewLeader] = useState<string>('');
    const [teamChangeLoading, setTeamChangeLoading] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamNickname, setNewTeamNickname] = useState('');
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

    const handleTeamChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setTeamChangeLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('participantId', participant.id);
            formData.append('newTeamId', selectedTeam);

            // If creating new team, add team details
            if (selectedTeam === 'new') {
                if (!newTeamName || !newTeamNickname) {
                    setError('Введите название и никнейм новой команды');
                    return;
                }
                formData.append('newTeamName', newTeamName);
                formData.append('newTeamNickname', newTeamNickname);
            }

            // If user is leaving as leader and team will have remaining members, require new leader
            const isLeader = !!participant.ledTeam;
            const teamMembers = participant.team?.members || [];
            const remainingMembers = teamMembers.filter(m => m.id !== participant.id);

            if (isLeader && remainingMembers.length > 0 && selectedTeam !== 'new') {
                if (!selectedNewLeader) {
                    setError('Выберите нового лидера команды');
                    return;
                }
                formData.append('newLeaderId', selectedNewLeader);
            }

            await changeTeam(formData);
            router.push('/profile');
            router.refresh();
        } catch (error) {
            console.error('Team change error:', error);
            setError(error instanceof Error ? error.message : 'Ошибка при смене команды');
        } finally {
            setTeamChangeLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 text-sm">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">{/* Profile form */}

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

                {!teamChangeMode && (
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
                )}
            </form>

            {/* Team Information */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Команда</h3>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    {participant.team ? (
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">
                                Текущая команда:
                            </p>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-gray-900">
                                        {participant.team.name}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        @{participant.team.nickname}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Участников: {participant.team.members.length}
                                    </p>
                                </div>
                                {participant.ledTeam && participant.ledTeam.id === participant.team.id && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        Лидер
                                    </span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-600">
                            Вы не состоите ни в одной команде
                        </p>
                    )}

                    <div className="mt-3 pt-3 border-t border-gray-200">
                        {!teamChangeMode ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setTeamChangeMode(true)}
                                className="w-full"
                            >
                                Сменить команду
                            </Button>
                        ) : (
                            <form onSubmit={handleTeamChange} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Выберите новую команду
                                    </label>
                                    <select
                                        value={selectedTeam}
                                        onChange={(e) => setSelectedTeam(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 font-medium"
                                        required
                                    >
                                        <option value="">Выберите команду</option>
                                        <option value="null">Покинуть команду</option>
                                        <option value="new">Создать новую команду</option>
                                        {availableTeams
                                            .filter(team => team.id !== participant.team?.id)
                                            .map(team => (
                                                <option key={team.id} value={team.id}>
                                                    {team.name} (@{team.nickname})
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                {/* Show new team creation fields */}
                                {selectedTeam === 'new' && (
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
                                                placeholder="nickname"
                                                pattern="^[a-zA-Z0-9_-]+$"
                                                title="Только буквы, цифры, дефисы и подчеркивания"
                                                required
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Только буквы, цифры, дефисы и подчеркивания
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Show leader selection if user is leader and team will have remaining members */}
                                {(() => {
                                    const isLeader = !!participant.ledTeam;
                                    const teamMembers = participant.team?.members || [];
                                    const remainingMembers = teamMembers.filter(m => m.id !== participant.id);

                                    if (isLeader && remainingMembers.length > 0) {
                                        return (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Выберите нового лидера команды
                                                </label>
                                                <select
                                                    value={selectedNewLeader}
                                                    onChange={(e) => setSelectedNewLeader(e.target.value)}
                                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 font-medium"
                                                    required
                                                >
                                                    <option value="">Выберите нового лидера</option>
                                                    {remainingMembers.map(member => (
                                                        <option key={member.id} value={member.id}>
                                                            {member.name} ({member.email})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                <div className="flex gap-2">
                                    <Button
                                        type="submit"
                                        disabled={teamChangeLoading}
                                        className="flex-1"
                                    >
                                        {teamChangeLoading ? 'Сохранение...' : 'Сменить команду'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setTeamChangeMode(false);
                                            setSelectedTeam('');
                                            setSelectedNewLeader('');
                                            setNewTeamName('');
                                            setNewTeamNickname('');
                                        }}
                                        className="flex-1"
                                    >
                                        Отмена
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}
