'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Participant, Team } from '@prisma/client';

type ParticipantWithRelations = Participant & {
    user: User;
    team: Team | null;
}

interface EditParticipantFormProps {
    participant: ParticipantWithRelations;
    teams: Team[];
}

export function EditParticipantForm({ participant, teams }: EditParticipantFormProps) {
    const [formData, setFormData] = useState({
        name: participant.name || '',
        city: participant.city || '',
        company: participant.company || '',
        githubUrl: participant.githubUrl || '',
        linkedinUrl: participant.linkedinUrl || '',
        experienceLevel: participant.experienceLevel || '',
        technologies: participant.technologies ? JSON.parse(participant.technologies) : [],
        cloudServices: participant.cloudServices ? JSON.parse(participant.cloudServices) : [],
        cloudProviders: participant.cloudProviders ? JSON.parse(participant.cloudProviders) : [],
        otherTechnologies: participant.otherTechnologies || '',
        otherCloudServices: participant.otherCloudServices || '',
        otherCloudProviders: participant.otherCloudProviders || '',
        programmingLanguages: participant.programmingLanguages || [],
        databases: participant.databases || [],
        description: participant.description || '',
        teamId: participant.teamId || '',
        isActive: participant.isActive,
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleCheckboxChange = (field: 'technologies' | 'cloudServices' | 'cloudProviders' | 'programmingLanguages' | 'databases', value: string) => {
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
            const response = await fetch(`/api/participants/${participant.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                router.push('/dashboard/participants');
                router.refresh();
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Ошибка при обновлении участника');
            }
        } catch (error) {
            console.error('Participant update error:', error);
            setError('Ошибка при обновлении участника');
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

            {/* User Information */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Информация о пользователе</h3>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">User ID</label>
                            <p className="mt-1 text-sm font-mono text-gray-900">{participant.userId}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <p className="mt-1 text-sm text-gray-900">{participant.email}</p>
                        </div>
                    </div>
                </div>
            </div>

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
                        placeholder="Имя участника"
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
                        placeholder="Город"
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

                <div>
                    <label htmlFor="githubUrl" className="block text-sm font-semibold text-gray-800 mb-1">
                        GitHub *
                    </label>
                    <Input
                        id="githubUrl"
                        type="url"
                        required
                        value={formData.githubUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, githubUrl: e.target.value }))}
                        placeholder="https://github.com/username"
                    />
                </div>

                <div>
                    <label htmlFor="linkedinUrl" className="block text-sm font-semibold text-gray-800 mb-1">
                        LinkedIn
                    </label>
                    <Input
                        id="linkedinUrl"
                        type="url"
                        value={formData.linkedinUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                        placeholder="https://linkedin.com/in/username"
                    />
                </div>

                <div>
                    <label htmlFor="team" className="block text-sm font-semibold text-gray-800 mb-1">
                        Команда
                    </label>
                    <select
                        id="team"
                        value={formData.teamId}
                        onChange={(e) => setFormData(prev => ({ ...prev, teamId: e.target.value }))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">Не назначена</option>
                        {teams.map(team => (
                            <option key={team.id} value={team.id}>
                                {team.name} (@{team.nickname})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Account Status */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Статус аккаунта</h3>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                            className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div>
                            <span className="text-sm font-medium text-gray-900">
                                Активный аккаунт
                            </span>
                            <p className="text-sm text-gray-600">
                                Неактивные пользователи не смогут войти в систему и присоединиться к командам
                            </p>
                        </div>
                    </label>
                    
                    <div className="mt-2 flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            formData.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                        }`}>
                            {formData.isActive ? 'Активен' : 'Заблокирован'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Experience Level */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Опыт</h3>
                
                <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Уровень опыта
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
            </div>

            {/* Technologies */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Технологии</h3>
                
                <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Технологии
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
            </div>

            {/* Technical Skills */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Технические навыки</h3>
                
                <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Языки программирования
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Swift'].map(lang => (
                            <label key={lang} className="flex items-center font-medium text-gray-800">
                                <input
                                    type="checkbox"
                                    checked={formData.programmingLanguages.includes(lang)}
                                    onChange={() => handleCheckboxChange('programmingLanguages', lang)}
                                    className="mr-2"
                                />
                                {lang}
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Базы данных
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {['MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle', 'SQL Server', 'CouchDB', 'Firebase', 'Cassandra'].map(db => (
                            <label key={db} className="flex items-center font-medium text-gray-800">
                                <input
                                    type="checkbox"
                                    checked={formData.databases.includes(db)}
                                    onChange={() => handleCheckboxChange('databases', db)}
                                    className="mr-2"
                                />
                                {db}
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-semibold text-gray-800 mb-1">
                        Описание профиля
                    </label>
                    <textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Расскажите о себе, своих интересах и целях участия в хакатоне..."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            <div className="flex gap-4">
                <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? 'Сохранение...' : 'Сохранить изменения'}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/dashboard/participants')}
                    className="flex-1"
                >
                    Отмена
                </Button>
            </div>
        </form>
    );
}