'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, X } from 'lucide-react'

interface Participant {
    id: string
    name: string
    email: string
    city: string | null
    company: string | null
    telegram?: string | null
    githubUrl?: string | null
    linkedinUrl?: string | null
    experienceLevel?: string | null
    technologies?: string | null
    cloudServices?: string | null
    cloudProviders?: string | null
    otherTechnologies?: string | null
    otherCloudServices?: string | null
    otherCloudProviders?: string | null
}

interface SpaceEditProfileFormProps {
    participant: Participant
    userEmail: string
}

export function SpaceEditProfileForm({ participant, userEmail }: SpaceEditProfileFormProps) {
    const [formData, setFormData] = useState({
        name: participant.name || '',
        city: participant.city || '',
        company: participant.company || '',
        telegram: participant.telegram || '',
        githubUrl: participant.githubUrl || '',
        linkedinUrl: participant.linkedinUrl || '',
        experienceLevel: participant.experienceLevel || '',
        technologies: participant.technologies ? JSON.parse(participant.technologies) : [],
        cloudServices: participant.cloudServices ? JSON.parse(participant.cloudServices) : [],
        cloudProviders: participant.cloudProviders ? JSON.parse(participant.cloudProviders) : [],
        otherTechnologies: participant.otherTechnologies || '',
        otherCloudServices: participant.otherCloudServices || '',
        otherCloudProviders: participant.otherCloudProviders || '',
    })

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const handleCheckboxChange = (field: 'technologies' | 'cloudServices' | 'cloudProviders', value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].includes(value)
                ? prev[field].filter((item: string) => item !== value)
                : [...prev[field], value]
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

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
            })

            if (response.ok) {
                router.push('/space/info')
                router.refresh()
            } else {
                const errorData = await response.json()
                setError(errorData.error || 'Ошибка при обновлении профиля')
            }
        } catch (error) {
            console.error('Profile update error:', error)
            setError('Ошибка при обновлении профиля')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl">
            {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
                    <p className="text-red-300 text-sm">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Personal Information */}
                <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
                    <h3 className="text-xl font-semibold text-white mb-6">Личная информация</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                                Имя *
                            </label>
                            <input
                                id="name"
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Ваше имя"
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50"
                            />
                        </div>

                        <div>
                            <label htmlFor="city" className="block text-sm font-medium text-slate-300 mb-2">
                                Город
                            </label>
                            <input
                                id="city"
                                type="text"
                                value={formData.city}
                                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                                placeholder="Ваш город"
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50"
                            />
                        </div>

                        <div>
                            <label htmlFor="company" className="block text-sm font-medium text-slate-300 mb-2">
                                Компания
                            </label>
                            <input
                                id="company"
                                type="text"
                                value={formData.company}
                                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                                placeholder="Название компании"
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50"
                            />
                        </div>

                        <div>
                            <label htmlFor="telegram" className="block text-sm font-medium text-slate-300 mb-2">
                                Telegram
                            </label>
                            <input
                                id="telegram"
                                type="text"
                                value={formData.telegram}
                                onChange={(e) => setFormData(prev => ({ ...prev, telegram: e.target.value }))}
                                placeholder="@username или https://t.me/username"
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50"
                            />
                            <p className="text-slate-500 text-xs mt-1">
                                Введите @username или полную ссылку на профиль
                            </p>
                        </div>

                        <div>
                            <label htmlFor="githubUrl" className="block text-sm font-medium text-slate-300 mb-2">
                                GitHub *
                            </label>
                            <input
                                id="githubUrl"
                                type="url"
                                required
                                value={formData.githubUrl}
                                onChange={(e) => setFormData(prev => ({ ...prev, githubUrl: e.target.value }))}
                                placeholder="https://github.com/username"
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50"
                            />
                            <p className="text-slate-500 text-xs mt-1">
                                Ссылка на ваш профиль GitHub (обязательное поле)
                            </p>
                        </div>

                        <div>
                            <label htmlFor="linkedinUrl" className="block text-sm font-medium text-slate-300 mb-2">
                                LinkedIn
                            </label>
                            <input
                                id="linkedinUrl"
                                type="url"
                                value={formData.linkedinUrl}
                                onChange={(e) => setFormData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                                placeholder="https://linkedin.com/in/username"
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50"
                            />
                            <p className="text-slate-500 text-xs mt-1">
                                Ссылка на ваш профиль LinkedIn (опционально)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Experience Section */}
                <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700/30">
                    <h3 className="text-xl font-semibold text-white mb-6">Ваш опыт</h3>

                    {/* Experience Level */}
                    <div className="mb-8">
                        <label className="block text-sm font-medium text-slate-300 mb-4">
                            Какой у вас опыт?
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                                'Junior (младший специалист)',
                                'Middle (специалист / инженер)',
                                'Senior (ведущий специалист / инженер)',
                                'Lead / Tech Lead / Team Lead',
                                'Principal / Staff Engineer / Expert',
                                'Engineering Manager / Architect / C-level (CTO, CIO)'
                            ].map(level => (
                                <label key={level} className="flex items-center p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer">
                                    <input
                                        type="radio"
                                        name="experienceLevel"
                                        value={level}
                                        checked={formData.experienceLevel === level}
                                        onChange={(e) => setFormData(prev => ({ ...prev, experienceLevel: e.target.value }))}
                                        className="mr-3 text-amber-400 focus:ring-amber-400/50"
                                    />
                                    <span className="text-slate-300 text-sm">{level}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Technologies */}
                    <div className="mb-8">
                        <label className="block text-sm font-medium text-slate-300 mb-4">
                            Какие сервисы / ПО ваша компания размещает в облаке? (выбор нескольких вариантов)
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                                <label key={tech} className="flex items-center p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.technologies.includes(tech)}
                                        onChange={() => handleCheckboxChange('technologies', tech)}
                                        className="mr-3 text-amber-400 focus:ring-amber-400/50"
                                    />
                                    <span className="text-slate-300 text-sm">{tech}</span>
                                </label>
                            ))}
                        </div>
                        {formData.technologies.includes('Другое') && (
                            <div className="mt-4">
                                <input
                                    type="text"
                                    value={formData.otherTechnologies}
                                    onChange={(e) => setFormData(prev => ({ ...prev, otherTechnologies: e.target.value }))}
                                    placeholder="Укажите другую технологию"
                                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50"
                                />
                            </div>
                        )}
                    </div>

                    {/* Cloud Services Usage */}
                    <div className="mb-8">
                        <label className="block text-sm font-medium text-slate-300 mb-4">
                            Какие облачные сервисы вы используете или хотели бы попробовать? (выбор нескольких вариантов)
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                                <label key={service} className="flex items-center p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.cloudServices.includes(service)}
                                        onChange={() => handleCheckboxChange('cloudServices', service)}
                                        className="mr-3 text-amber-400 focus:ring-amber-400/50"
                                    />
                                    <span className="text-slate-300 text-sm">{service}</span>
                                </label>
                            ))}
                        </div>
                        {formData.cloudServices.includes('Другое') && (
                            <div className="mt-4">
                                <input
                                    type="text"
                                    value={formData.otherCloudServices}
                                    onChange={(e) => setFormData(prev => ({ ...prev, otherCloudServices: e.target.value }))}
                                    placeholder="Укажите другой облачный сервис"
                                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50"
                                />
                            </div>
                        )}
                    </div>

                    {/* Cloud Providers */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-4">
                            Каких местных облачных провайдеров вы знаете? (выбор нескольких вариантов)
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                                <label key={provider} className="flex items-center p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.cloudProviders.includes(provider)}
                                        onChange={() => handleCheckboxChange('cloudProviders', provider)}
                                        className="mr-3 text-amber-400 focus:ring-amber-400/50"
                                    />
                                    <span className="text-slate-300 text-sm">{provider}</span>
                                </label>
                            ))}
                        </div>
                        {formData.cloudProviders.includes('Другое') && (
                            <div className="mt-4">
                                <input
                                    type="text"
                                    value={formData.otherCloudProviders}
                                    onChange={(e) => setFormData(prev => ({ ...prev, otherCloudProviders: e.target.value }))}
                                    placeholder="Укажите другого облачного провайдера"
                                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center space-x-2 bg-amber-400 hover:bg-amber-500 disabled:bg-amber-400/50 text-slate-900 px-6 py-3 rounded-lg font-medium transition-colors duration-150"
                    >
                        <Save className="w-4 h-4" />
                        <span>{loading ? 'Сохранение...' : 'Сохранить изменения'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/space/info')}
                        className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-150"
                    >
                        <X className="w-4 h-4" />
                        <span>Отмена</span>
                    </button>
                </div>
            </form>
        </div>
    )
}