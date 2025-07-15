'use client';

import { useState, useEffect } from 'react';
import { CustomBannerType } from '@prisma/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Plus, Filter, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { BannerCompose } from './banner-compose';
import { AdminBannerItem } from './admin-banner-item';

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

interface AdminBannerListProps {
  hackathonId: string;
}

export function AdminBannerList({ hackathonId }: AdminBannerListProps) {
  const [banners, setBanners] = useState<CustomBannerData[]>([]);
  const [filteredBanners, setFilteredBanners] = useState<CustomBannerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [editingBanner, setEditingBanner] = useState<CustomBannerData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterType, setFilterType] = useState<'all' | 'INFO' | 'WARN'>('all');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  useEffect(() => {
    fetchBanners();
  }, [hackathonId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    filterBanners();
  }, [banners, searchTerm, filterStatus, filterType, showActiveOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/custom-banners?hackathonId=${hackathonId}&activeOnly=${showActiveOnly}`);
      if (response.ok) {
        const data = await response.json();
        setBanners(data);
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBanners = () => {
    let filtered = [...banners];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(banner =>
        banner.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        banner.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(banner => {
        if (filterStatus === 'active') return banner.isActive;
        if (filterStatus === 'inactive') return !banner.isActive;
        return true;
      });
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(banner => banner.type === filterType);
    }

    setFilteredBanners(filtered);
  };

  const handleBannerUpdate = () => {
    fetchBanners();
  };

  const handleNewBanner = () => {
    setShowCompose(false);
    setEditingBanner(null);
    fetchBanners();
  };

  const handleEditBanner = (banner: CustomBannerData) => {
    setEditingBanner(banner);
    setShowCompose(true);
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот баннер?')) return;

    try {
      const response = await fetch(`/api/custom-banners/${bannerId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        handleBannerUpdate();
      }
    } catch (error) {
      console.error('Error deleting banner:', error);
    }
  };


  const getBannerStats = () => {
    const total = banners.length;
    const active = banners.filter(b => b.isActive).length;
    const info = banners.filter(b => b.type === CustomBannerType.INFO).length;
    const warn = banners.filter(b => b.type === CustomBannerType.WARN).length;
    
    return { total, active, info, warn };
  };

  const stats = getBannerStats();

  if (showCompose) {
    return (
      <BannerCompose
        hackathonId={hackathonId}
        editingBanner={editingBanner}
        onClose={() => {
          setShowCompose(false);
          setEditingBanner(null);
        }}
        onSuccess={handleNewBanner}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление баннерами</h1>
          <p className="text-gray-600">Создавайте и управляйте пользовательскими баннерами для участников</p>
        </div>
        <Button onClick={() => setShowCompose(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Создать баннер
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-gray-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Всего баннеров</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <div>
              <p className="text-sm text-gray-600">Активных</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Info className="w-5 h-5 text-blue-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Информационных</p>
              <p className="text-2xl font-bold text-gray-900">{stats.info}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Предупреждений</p>
              <p className="text-2xl font-bold text-gray-900">{stats.warn}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-gray-500" />
            <Input
              placeholder="Поиск баннеров..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
              className="border rounded px-3 py-1 text-gray-900"
            >
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="inactive">Неактивные</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'INFO' | 'WARN')}
              className="border rounded px-3 py-1 text-gray-900"
            >
              <option value="all">Все типы</option>
              <option value="INFO">Информационные</option>
              <option value="WARN">Предупреждения</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="activeOnly"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="activeOnly" className="text-sm text-gray-700">
              Только активные по времени
            </label>
          </div>
        </div>
      </div>

      {/* Banner List */}
      <div className="bg-white rounded-lg border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Загрузка баннеров...</p>
          </div>
        ) : filteredBanners.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Баннеры не найдены</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                ? 'Попробуйте изменить параметры поиска или фильтры'
                : 'Создайте первый баннер для участников'}
            </p>
            {(!searchTerm && filterStatus === 'all' && filterType === 'all') && (
              <Button onClick={() => setShowCompose(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Создать баннер
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredBanners.map((banner) => (
              <AdminBannerItem
                key={banner.id}
                banner={banner}
                onEdit={() => handleEditBanner(banner)}
                onDelete={() => handleDeleteBanner(banner.id)}
                onUpdate={handleBannerUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}