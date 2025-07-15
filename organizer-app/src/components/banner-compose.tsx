'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CustomBannerType } from '@prisma/client';
import { ArrowLeft, Save, Edit, Type, Eye, EyeOff } from 'lucide-react';
import dynamic from 'next/dynamic';
import { markdownToHtml } from '@/lib/markdown';

// Dynamic import to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

interface CustomBannerData {
  id: string;
  title: string;
  description: string;
  type: CustomBannerType;
  displayStart: string;
  displayEnd: string;
  allowDismiss: boolean;
  actionText?: string | null;
  actionUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  hackathonId: string;
}

interface BannerComposeProps {
  hackathonId: string;
  editingBanner?: CustomBannerData | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function BannerCompose({ hackathonId, editingBanner, onClose, onSuccess }: BannerComposeProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [markdownContent, setMarkdownContent] = useState('');
  const [type, setType] = useState<CustomBannerType>(CustomBannerType.INFO);
  const [displayStart, setDisplayStart] = useState('');
  const [displayEnd, setDisplayEnd] = useState('');
  const [allowDismiss, setAllowDismiss] = useState(true);
  const [actionText, setActionText] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useWysiwyg, setUseWysiwyg] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  // Initialize form with editing data
  useEffect(() => {
    if (editingBanner) {
      setTitle(editingBanner.title);
      setDescription(editingBanner.description);
      setMarkdownContent(editingBanner.description);
      setType(editingBanner.type);
      setDisplayStart(editingBanner.displayStart.slice(0, 16)); // Format for datetime-local
      setDisplayEnd(editingBanner.displayEnd.slice(0, 16)); // Format for datetime-local
      setAllowDismiss(editingBanner.allowDismiss);
      setActionText(editingBanner.actionText || '');
      setActionUrl(editingBanner.actionUrl || '');
      setIsActive(editingBanner.isActive);
    } else {
      // Set default dates
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      setDisplayStart(tomorrow.toISOString().slice(0, 16));
      setDisplayEnd(nextWeek.toISOString().slice(0, 16));
    }
  }, [editingBanner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert('Пожалуйста, введите заголовок баннера');
      return;
    }

    const content = useWysiwyg ? markdownContent : description;
    if (!content.trim()) {
      alert('Пожалуйста, введите описание баннера');
      return;
    }

    if (new Date(displayStart) >= new Date(displayEnd)) {
      alert('Дата начала должна быть раньше даты окончания');
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingBanner 
        ? `/api/custom-banners/${editingBanner.id}`
        : '/api/custom-banners';
      
      const method = editingBanner ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: content.trim(),
          type,
          displayStart: new Date(displayStart).toISOString(),
          displayEnd: new Date(displayEnd).toISOString(),
          allowDismiss,
          actionText: actionText.trim() || null,
          actionUrl: actionUrl.trim() || null,
          isActive,
          hackathonId
        })
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Error saving banner:', error);
      alert('Произошла ошибка при сохранении баннера');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPreviewContent = () => {
    const content = useWysiwyg ? markdownContent : description;
    return markdownToHtml(content);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {editingBanner ? 'Редактировать баннер' : 'Создать баннер'}
          </h1>
        </div>
        <Button
          onClick={() => setShowPreview(!showPreview)}
          variant="outline"
          size="sm"
        >
          {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
          {showPreview ? 'Скрыть превью' : 'Показать превью'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white p-6 rounded-lg border">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Основная информация</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Заголовок баннера *
                  </label>
                  <Input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Введите заголовок баннера"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Тип баннера *
                  </label>
                  <select
                    id="type"
                    value={type}
                    onChange={(e) => setType(e.target.value as CustomBannerType)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value={CustomBannerType.INFO}>Информационный</option>
                    <option value={CustomBannerType.WARN}>Предупреждение</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Display Settings */}
            <div className="bg-white p-6 rounded-lg border">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Настройки отображения</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="displayStart" className="block text-sm font-medium text-gray-700 mb-1">
                      Дата начала *
                    </label>
                    <input
                      id="displayStart"
                      type="datetime-local"
                      value={displayStart}
                      onChange={(e) => setDisplayStart(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="displayEnd" className="block text-sm font-medium text-gray-700 mb-1">
                      Дата окончания *
                    </label>
                    <input
                      id="displayEnd"
                      type="datetime-local"
                      value={displayEnd}
                      onChange={(e) => setDisplayEnd(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="actionText" className="block text-sm font-medium text-gray-700 mb-1">
                      Текст кнопки (необязательно)
                    </label>
                    <Input
                      id="actionText"
                      type="text"
                      value={actionText}
                      onChange={(e) => setActionText(e.target.value)}
                      placeholder="Например: Узнать больше"
                    />
                  </div>

                  <div>
                    <label htmlFor="actionUrl" className="block text-sm font-medium text-gray-700 mb-1">
                      Ссылка кнопки (необязательно)
                    </label>
                    <Input
                      id="actionUrl"
                      type="url"
                      value={actionUrl}
                      onChange={(e) => setActionUrl(e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={allowDismiss}
                      onChange={(e) => setAllowDismiss(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Разрешить скрытие баннера</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Активен</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Content Editor */}
            <div className="bg-white p-6 rounded-lg border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Содержимое баннера</h2>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant={useWysiwyg ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUseWysiwyg(true)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Визуальный редактор
                  </Button>
                  <Button
                    type="button"
                    variant={!useWysiwyg ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUseWysiwyg(false)}
                  >
                    <Type className="w-4 h-4 mr-2" />
                    Текстовый редактор
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {useWysiwyg ? (
                  <MDEditor
                    value={markdownContent}
                    onChange={(value) => setMarkdownContent(value || '')}
                    preview="edit"
                    hideToolbar={false}
                    height={250}
                    data-color-mode="light"
                  />
                ) : (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Введите описание баннера (поддерживается Markdown)"
                    className="w-full h-64 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    required
                  />
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {editingBanner ? 'Сохранить изменения' : 'Создать баннер'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Превью баннера</h2>
              
              <div className={`relative rounded-lg border p-4 mb-4 ${
                type === CustomBannerType.WARN 
                  ? 'bg-amber-900/30 border-amber-500/50 text-amber-100' 
                  : 'bg-blue-900/30 border-blue-500/50 text-blue-100'
              }`}>
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 ${
                    type === CustomBannerType.WARN ? 'text-amber-400' : 'text-blue-400'
                  }`}>
                    {type === CustomBannerType.WARN ? (
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold mb-1">{title || 'Заголовок баннера'}</h3>
                    <div 
                      className="text-sm opacity-90 mb-3"
                      dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
                    />
                    
                    {actionText && actionUrl && (
                      <div className="flex items-center space-x-3">
                        <button
                          className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            type === CustomBannerType.WARN
                              ? 'bg-amber-600 hover:bg-amber-700 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {actionText}
                        </button>
                      </div>
                    )}
                  </div>

                  {allowDismiss && (
                    <button className="flex-shrink-0 text-slate-400 hover:text-white transition-colors">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Отображается:</strong> {new Date(displayStart).toLocaleString('ru-RU')} - {new Date(displayEnd).toLocaleString('ru-RU')}</p>
                <p><strong>Тип:</strong> {type === CustomBannerType.WARN ? 'Предупреждение' : 'Информационный'}</p>
                <p><strong>Можно скрыть:</strong> {allowDismiss ? 'Да' : 'Нет'}</p>
                <p><strong>Статус:</strong> {isActive ? 'Активен' : 'Неактивен'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}