'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
}

export function EditProfileForm({ participant, userEmail }: EditProfileFormProps) {
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
                        <p className="text-xs text-gray-500">
                            💡 Для изменения команды (создать новую, присоединиться к существующей или покинуть текущую) обратитесь к организаторам. Либо дождитесь, когда этот функционал будет реализован. Это произойдёт в ближайшие дни.
                        </p>
                    </div>
                </div>
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
