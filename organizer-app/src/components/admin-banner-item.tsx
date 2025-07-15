'use client';

import { CustomBannerType } from '@prisma/client';
import { Button } from './ui/button';
import { AlertTriangle, Info, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { markdownToHtml } from '@/lib/markdown';

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

interface AdminBannerItemProps {
  banner: CustomBannerData;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: () => void;
}

export function AdminBannerItem({ banner, onEdit, onDelete, onUpdate }: AdminBannerItemProps) {
  const getTypeIcon = (type: CustomBannerType) => {
    switch (type) {
      case CustomBannerType.INFO:
        return <Info className="w-4 h-4 text-blue-500" />;
      case CustomBannerType.WARN:
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: CustomBannerType) => {
    switch (type) {
      case CustomBannerType.INFO:
        return 'Информационный';
      case CustomBannerType.WARN:
        return 'Предупреждение';
      default:
        return 'Неизвестный';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isCurrentlyActive = () => {
    const now = new Date();
    const start = new Date(banner.displayStart);
    const end = new Date(banner.displayEnd);
    return banner.isActive && now >= start && now <= end;
  };

  const toggleActive = async () => {
    try {
      const response = await fetch(`/api/custom-banners/${banner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...banner,
          isActive: !banner.isActive
        })
      });
      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error toggling banner status:', error);
    }
  };

  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            {getTypeIcon(banner.type)}
            <span className="text-sm font-medium text-gray-600">
              {getTypeLabel(banner.type)}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              banner.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {banner.isActive ? 'Активен' : 'Неактивен'}
            </span>
            {isCurrentlyActive() && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Отображается сейчас
              </span>
            )}
            {banner.allowDismiss && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Можно скрыть
              </span>
            )}
            {banner.actionText && banner.actionUrl && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Есть кнопка
              </span>
            )}
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {banner.title}
          </h3>
          
          <div 
            className="text-sm text-gray-600 mb-3 line-clamp-3"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(banner.description) }}
          />
          
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <span>Отображается: {formatDate(banner.displayStart)} - {formatDate(banner.displayEnd)}</span>
            <span>Создан: {formatDate(banner.createdAt)}</span>
            {banner.updatedAt !== banner.createdAt && (
              <span>Обновлён: {formatDate(banner.updatedAt)}</span>
            )}
            {banner.actionText && banner.actionUrl && (
              <span>Кнопка: &quot;{banner.actionText}&quot; → {banner.actionUrl}</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleActive}
            className={banner.isActive ? 'text-gray-600' : 'text-green-600'}
          >
            {banner.isActive ? (
              <><EyeOff className="w-4 h-4 mr-1" /> Скрыть</>
            ) : (
              <><Eye className="w-4 h-4 mr-1" /> Показать</>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-700"
          >
            <Edit className="w-4 h-4 mr-1" />
            Редактировать
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Удалить
          </Button>
        </div>
      </div>
    </div>
  );
}