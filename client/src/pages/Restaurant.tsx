import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowRight, 
  Star, 
  Clock,
  AlertTriangle,
  Tag,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import MenuItemCard from '../components/MenuItemCard';
import type { Restaurant, MenuItem } from '@shared/schema';
import { getRestaurantStatus } from '../utils/restaurantHours';

function isCompanyOpen(openingTime: string, closingTime: string): boolean {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const cur = toMin(currentTime);
  const open = toMin(openingTime);
  const close = toMin(closingTime);
  if (close > open) return cur >= open && cur < close;
  return cur >= open || cur < close;
}

export default function Restaurant() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [selectedMenuCategory, setSelectedMenuCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('recommend');

  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant>({
    queryKey: ['/api/restaurants', id],
  });

  const { data: menuItems, isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ['/api/restaurants', id, 'menu'],
  });

  const { data: uiSettings } = useQuery<any[]>({
    queryKey: ['/api/ui-settings'],
  });

  const openingTime = uiSettings?.find((s: any) => s.key === 'opening_time')?.value || '11:00';
  const closingTime = uiSettings?.find((s: any) => s.key === 'closing_time')?.value || '23:00';
  const companyOpen = isCompanyOpen(openingTime, closingTime);

  const menuCategories = menuItems
    ? Array.from(new Set(menuItems.map(item => item.category).filter(Boolean)))
    : [];

  const filteredMenuItems = menuItems?.filter(item => {
    if (selectedMenuCategory && item.category !== selectedMenuCategory) return false;
    return true;
  }) || [];

  const sortedItems = [...filteredMenuItems].sort((a, b) => {
    if (sortBy === 'price-asc') return parseFloat(String(a.price)) - parseFloat(String(b.price));
    if (sortBy === 'price-desc') return parseFloat(String(b.price)) - parseFloat(String(a.price));
    return 0;
  });

  if (restaurantLoading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  );
  if (!restaurant) return (
    <div className="p-8 text-center text-gray-500">المتجر غير موجود</div>
  );

  const restaurantStatus = getRestaurantStatus(restaurant);

  // Determine if ordering is blocked
  const orderBlocked = !companyOpen || !restaurantStatus.isOpen;
  let blockMessage = '';
  if (!companyOpen) {
    blockMessage = `السريع ون مغلق حالياً. أوقات الدوام من ${openingTime} حتى ${closingTime}`;
  } else if (!restaurantStatus.isOpen) {
    blockMessage = `هذا المتجر مغلق حالياً. ${restaurantStatus.message}`;
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-24" dir="rtl">
      {/* Back button & header image */}
      <div className="relative">
        <div className="w-full h-52 md:h-72 overflow-hidden bg-gray-200">
          {restaurant.image && (
            <img
              src={restaurant.image}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </div>

        {/* Back button */}
        <button
          onClick={() => setLocation('/')}
          className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm text-white p-2 rounded-full hover:bg-[#C03A0A]/60 transition-colors"
        >
          <ArrowRight className="h-5 w-5" />
        </button>

        {/* Restaurant info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-full text-xs font-black ${restaurantStatus.isOpen && companyOpen ? 'bg-emerald-500' : 'bg-red-500'}`}>
                {restaurantStatus.isOpen && companyOpen ? 'مفتوح' : 'مغلق'}
              </div>
              {restaurant.rating && (
                <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
                  <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                  <span className="text-xs font-bold">{restaurant.rating}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-white/80 text-xs">
              {restaurant.deliveryTime && (
                <span className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
                  <Clock className="h-3 w-3" />
                  {restaurant.deliveryTime}
                </span>
              )}
              {restaurant.deliveryFee !== undefined && (
                <span className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
                  <Tag className="h-3 w-3" />
                  {restaurant.deliveryFee} ريال
                </span>
              )}
            </div>
          </div>
          <h1 className="text-xl md:text-2xl font-black mt-2 text-right">{restaurant.name}</h1>
          {restaurant.description && (
            <p className="text-white/80 text-sm mt-1 text-right line-clamp-2">{restaurant.description}</p>
          )}
        </div>
      </div>

      {/* Closed Alert */}
      {orderBlocked && (
        <Alert className="mx-4 mt-4 border-red-200 bg-red-50 rounded-xl">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <AlertDescription className="text-red-800 font-bold text-sm text-right">
            {blockMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Menu Category Tabs */}
      {menuCategories.length > 0 && (
        <div className="sticky top-0 bg-white border-b z-20 shadow-sm">
          <div className="flex overflow-x-auto no-scrollbar px-3 py-2 gap-2">
            <button
              onClick={() => setSelectedMenuCategory(null)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                !selectedMenuCategory ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              الكل
            </button>
            {menuCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedMenuCategory(cat)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                  selectedMenuCategory === cat ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sort Bar */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
          {[
            { key: 'recommend', label: 'الكل' },
            { key: 'price-asc', label: 'الأرخص' },
            { key: 'price-desc', label: 'الأغلى' },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key)}
              className={`text-xs font-bold shrink-0 pb-1 border-b-2 transition-all ${
                sortBy === s.key ? 'border-primary text-primary' : 'border-transparent text-gray-400'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 font-medium shrink-0">{sortedItems.length} منتج</span>
      </div>

      {/* Product Grid */}
      <div className="container mx-auto px-3 pt-4">
        {menuLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-gray-100 rounded-xl mb-2" />
                <div className="h-3 bg-gray-100 rounded w-3/4 mb-1" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : sortedItems.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {sortedItems.map(item => (
              <MenuItemCard
                key={item.id}
                item={item}
                restaurantId={restaurant.id}
                restaurantName={restaurant.name}
                disabled={orderBlocked}
                disabledMessage={blockMessage}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-gray-400 font-bold">لا توجد منتجات متاحة حالياً</p>
          </div>
        )}
      </div>
    </div>
  );
}
