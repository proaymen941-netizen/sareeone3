import { useState, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowRight,
  Star,
  Clock,
  Heart,
  AlertTriangle,
  UtensilsCrossed,
  Plus,
  Minus,
  X,
} from 'lucide-react';
import type { Restaurant, MenuItem, RestaurantSection } from '@shared/schema';
import { getRestaurantStatus, canOrderFromRestaurant, getAppStatus } from '../utils/restaurantHours';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import StoreClosedDialog from '@/components/StoreClosedDialog';
import { useUiSettings } from '@/context/UiSettingsContext';

const MEAL_FAV_KEY = 'meal_favorites';
function loadMealFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(MEAL_FAV_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
function saveMealFavorites(s: Set<string>) {
  localStorage.setItem(MEAL_FAV_KEY, JSON.stringify([...s]));
}

const REST_FAV_KEY = 'restaurant_favorites';
function loadRestFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(REST_FAV_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
function saveRestFavorites(s: Set<string>) {
  localStorage.setItem(REST_FAV_KEY, JSON.stringify([...s]));
}

function RatingModal({
  restaurantId,
  restaurantName,
  onClose,
}: {
  restaurantId: string;
  restaurantName: string;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: selected, comment }),
      });
      if (!res.ok) throw new Error('فشل في إرسال التقييم');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'شكراً لتقييمك!', description: 'تم إرسال تقييمك بنجاح.' });
      onClose();
    },
    onError: () => {
      toast({ title: 'خطأ', description: 'تعذّر إرسال التقييم، حاول مجدداً.', variant: 'destructive' });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-t-3xl p-6 pb-10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
            <X className="h-4 w-4 text-gray-600" />
          </button>
          <h2 className="text-base font-black text-gray-900">قيّم {restaurantName}</h2>
          <div className="w-8" />
        </div>

        <p className="text-center text-gray-500 text-sm mb-4">كيف كانت تجربتك مع هذا المطعم؟</p>

        <div className="flex justify-center gap-2 mb-5">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setSelected(star)}
              className="transition-transform hover:scale-110 active:scale-95"
            >
              <Star
                className={`h-10 w-10 transition-colors ${
                  star <= (hovered || selected)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-gray-200 text-gray-200'
                }`}
              />
            </button>
          ))}
        </div>

        {selected > 0 && (
          <p className="text-center text-sm font-bold text-primary mb-4">
            {selected === 1 ? 'سيئ جداً' : selected === 2 ? 'سيئ' : selected === 3 ? 'مقبول' : selected === 4 ? 'جيد' : 'ممتاز'}
          </p>
        )}

        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="أضف تعليقاً (اختياري)..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none h-20 focus:outline-none focus:border-primary mb-4"
          dir="rtl"
        />

        <button
          onClick={() => {
            if (!selected) {
              toast({ title: 'تنبيه', description: 'اختر عدد النجوم أولاً', variant: 'destructive' });
              return;
            }
            mutation.mutate();
          }}
          disabled={mutation.isPending}
          className="w-full bg-primary text-white font-black py-3.5 rounded-2xl shadow-sm active:scale-95 transition disabled:opacity-60"
        >
          {mutation.isPending ? 'جاري الإرسال...' : 'إرسال التقييم'}
        </button>
      </div>
    </div>
  );
}

export default function RestaurantPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [mealFavs, setMealFavs] = useState<Set<string>>(loadMealFavorites);
  const [restFavs, setRestFavs] = useState<Set<string>>(loadRestFavorites);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [showStoreClosed, setShowStoreClosed] = useState(false);
  const [storeClosedMsg, setStoreClosedMsg] = useState('');

  const { addItem, removeItem, getItemQuantity } = useCart();
  const { toast } = useToast();
  const { getSetting } = useUiSettings();

  const appStatus = useMemo(() => {
    const openingTime = getSetting('opening_time') || '08:00';
    const closingTime = getSetting('closing_time') || '23:00';
    const storeStatus = getSetting('store_status') || 'open';
    return getAppStatus(openingTime, closingTime, storeStatus);
  }, [getSetting]);

  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant>({
    queryKey: ['/api/restaurants', id],
  });

  const { data: menuData } = useQuery<{ allItems: MenuItem[] }>({
    queryKey: ['/api/restaurants', id, 'menu'],
    enabled: !!id,
  });
  const menuItems = menuData?.allItems ?? [];

  const { data: sections = [] } = useQuery<RestaurantSection[]>({
    queryKey: ['/api/restaurants', id, 'sections'],
    enabled: !!id,
  });

  // عروض المجموعة الخاصة بهذا المتجر (bundle offers)
  const { data: bundleOffers = [] } = useQuery<any[]>({
    queryKey: ['/api/special-offers/restaurant', id],
    queryFn: async () => {
      const res = await fetch(`/api/special-offers?restaurantId=${id}&offerType=bundle`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.filter((o: any) => o.offerType === 'bundle' && o.isActive);
    },
    enabled: !!id,
  });

  const menuCategories = Array.from(new Set(menuItems.map(i => i.category).filter(Boolean)));
  const hasSections = sections.length > 0;

  const displaySections: { id: string; name: string }[] = hasSections
    ? sections.map(s => ({ id: s.id, name: s.name }))
    : (menuCategories as string[]).map(c => ({ id: c, name: c }));

  const filteredItems = menuItems.filter(item => {
    if (selectedSection === 'all') return true;
    if (hasSections) return item.category === displaySections.find(s => s.id === selectedSection)?.name;
    return item.category === selectedSection;
  });

  const toggleRestFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) return;
    setRestFavs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveRestFavorites(next);
      return next;
    });
  };

  const toggleMealFav = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    setMealFavs(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      saveMealFavorites(next);
      return next;
    });
  };

  if (restaurantLoading) {
    return (
      <div className="min-h-screen bg-gray-50 animate-pulse" dir="rtl">
        <div className="w-full h-44 bg-primary/20" />
        <div className="p-4 space-y-3">
          <div className="h-20 bg-white rounded-2xl shadow-sm" />
          <div className="h-10 bg-gray-200 rounded-full" />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-white rounded-2xl shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-3" dir="rtl">
        <UtensilsCrossed className="h-12 w-12 text-gray-300" />
        <p className="text-gray-500 font-bold">المطعم غير موجود</p>
        <button onClick={() => setLocation('/')} className="text-primary text-sm font-bold">
          العودة للرئيسية
        </button>
      </div>
    );
  }

  const status = getRestaurantStatus(restaurant, appStatus.isOpen);
  const orderStatus = canOrderFromRestaurant(restaurant, appStatus.isOpen);
  const isRestFav = id ? restFavs.has(id) : false;

  const handleAddItem = (item: MenuItem) => {
    if (!orderStatus.canOrder) {
      setStoreClosedMsg(orderStatus.message || 'عذراً، المتجر مغلق حالياً');
      setShowStoreClosed(true);
      return;
    }
    addItem(item, item.restaurantId, restaurant.name);
  };

  const rating = Number(restaurant.rating) || 4;

  return (
    <div className="min-h-screen bg-gray-50 pb-28" dir="rtl">

      {/* ── Sticky Header - back button + name only ── */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <button
            onClick={() => setLocation('/')}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 transition flex-shrink-0"
          >
            <ArrowRight className="h-4 w-4 text-gray-600" />
          </button>
          <h1 className="flex-1 text-gray-900 text-base font-black truncate">
            {restaurant.name}
          </h1>
        </div>

        {/* Restaurant hero image */}
        {restaurant.image ? (
          <div className="w-full h-40 overflow-hidden">
            <img
              src={restaurant.image}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-28 bg-gradient-to-b from-primary/10 to-primary/5 flex items-center justify-center">
            <UtensilsCrossed className="h-12 w-12 text-primary/30" />
          </div>
        )}
      </div>

      {/* ── Info Card ── */}
      <div className="mx-3 -mt-1 bg-white rounded-2xl shadow-md p-3 z-10 relative">
        {/* Rating row - clickable */}
        <div className="flex items-center justify-between mb-2.5">
          <button
            onClick={() => setRatingOpen(true)}
            className="flex items-center gap-0.5 group"
            title="انقر لإضافة تقييمك"
          >
            {[1, 2, 3, 4, 5].map(i => (
              <Star
                key={i}
                className={`h-4 w-4 transition-transform group-hover:scale-110 ${
                  i <= Math.round(rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-gray-200 text-gray-200'
                }`}
              />
            ))}
            <span className="text-[10px] text-gray-400 mr-1">({rating.toFixed(1)})</span>
          </button>
          <span className="text-[11px] text-gray-400">الأسعار مطابقة للمطعم</span>
          <div className="text-right">
            <div className="text-[10px] text-gray-400 leading-none">قيّم</div>
            <div className="text-[10px] text-gray-400">المطعم</div>
          </div>
        </div>

        {/* Status + timing + favorite */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-gray-50 rounded-full px-3 py-1.5 border border-gray-100">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-gray-700">
              الطلب يستغرق {restaurant.deliveryTime || '40 - 60'} دقيقة
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              status.isOpen
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-primary'
            }`}>
              {status.isOpen ? 'مفتوح' : 'مغلق'}
            </span>
            <button
              onClick={toggleRestFav}
              className={`w-8 h-8 flex items-center justify-center rounded-full border-2 transition active:scale-95 ${
                isRestFav ? 'bg-red-50 border-primary' : 'bg-white border-gray-200'
              }`}
            >
              <Heart className={`h-4 w-4 ${isRestFav ? 'fill-primary text-primary' : 'text-gray-400'}`} />
            </button>
          </div>
        </div>

        {restaurant.description && (
          <p className="text-[11px] text-gray-500 mt-2 leading-relaxed line-clamp-2">
            {restaurant.description}
          </p>
        )}
      </div>

      {/* ── Closed alert ── */}
      {!orderStatus.canOrder && (
        <div className="mx-3 mt-2 flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl p-2.5">
          <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
          <p className="text-orange-700 text-xs font-semibold">{orderStatus.message}</p>
        </div>
      )}

      {/* ── Section Tabs ── */}
      {displaySections.length > 0 && (
        <div className="mt-3 bg-white border-b border-gray-100 sticky top-[52px] z-30">
          <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setSelectedSection('all')}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap border ${
                selectedSection === 'all'
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-gray-50 text-gray-600 border-gray-200'
              }`}
            >
              الكل
            </button>
            {displaySections.map(sec => (
              <button
                key={sec.id}
                onClick={() => setSelectedSection(sec.id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap border ${
                  selectedSection === sec.id
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}
              >
                {sec.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Bundle Offers Section ── (تظهر فقط عند اختيار "الكل" أو قسم "العروض") */}
      {bundleOffers.length > 0 && (selectedSection === 'all' || displaySections.find(s => s.id === selectedSection)?.name === 'العروض') && (
        <div className="px-3 pt-4">
          <h2 className="text-sm font-black text-gray-800 mb-2 flex items-center gap-1">
            🎁 <span>عروض خاصة</span>
          </h2>
          <div className="space-y-3">
            {bundleOffers.map(offer => {
              const bundleItemId = `bundle_${offer.id}`;
              const qty = getItemQuantity(bundleItemId);
              return (
                <div key={offer.id} className="bg-gradient-to-l from-primary/5 to-orange-50 rounded-2xl border border-primary/20 shadow-sm overflow-hidden flex">
                  {/* صورة العرض */}
                  <div className="flex-shrink-0 w-28 h-28 relative">
                    {offer.image ? (
                      <img src={offer.image} alt={offer.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                        <span className="text-3xl">🎁</span>
                      </div>
                    )}
                    <span className="absolute top-1 right-1 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">عرض خاص</span>
                  </div>

                  {/* محتوى العرض */}
                  <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-1">{offer.title}</h3>
                      {offer.description && (
                        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{offer.description}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-primary font-black text-sm">{parseFloat(offer.bundlePrice).toFixed(0)} ر.ي</span>
                      {qty > 0 ? (
                        <div className="flex items-center gap-1.5 bg-primary/10 rounded-full px-2 py-1">
                          <button
                            onClick={() => removeItem(bundleItemId)}
                            className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white active:scale-95 transition"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-primary font-black text-sm w-4 text-center">{qty}</span>
                          <button
                            onClick={() => {
                              const virtualItem: any = {
                                id: bundleItemId,
                                name: offer.title,
                                description: offer.description,
                                price: String(offer.bundlePrice),
                                image: offer.image || '',
                                category: 'العروض',
                                restaurantId: id || '',
                                isAvailable: true,
                                isSpecialOffer: true,
                              };
                              addItem(virtualItem, id || '', restaurant.name);
                            }}
                            className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white active:scale-95 transition"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (!orderStatus.canOrder) {
                              setStoreClosedMsg(orderStatus.message || 'عذراً، المتجر مغلق حالياً');
                              setShowStoreClosed(true);
                              return;
                            }
                            const virtualItem: any = {
                              id: bundleItemId,
                              name: offer.title,
                              description: offer.description,
                              price: String(offer.bundlePrice),
                              image: offer.image || '',
                              category: 'العروض',
                              restaurantId: id || '',
                              isAvailable: true,
                              isSpecialOffer: true,
                            };
                            addItem(virtualItem, id || '', restaurant.name);
                          }}
                          className="flex items-center gap-1 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm active:scale-95 transition"
                        >
                          <Plus className="h-3 w-3" />
                          أضف للسلة
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Menu Items ── */}
      <div className="px-3 pt-3 space-y-3">
        {filteredItems.length === 0 && bundleOffers.length === 0 ? (
          <div className="text-center py-16">
            <UtensilsCrossed className="h-14 w-14 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-bold text-sm">لا توجد عناصر في هذا القسم</p>
            {displaySections.length === 0 && menuItems.length === 0 && (
              <p className="text-gray-300 text-xs mt-1">لم يتم إضافة أصناف بعد</p>
            )}
          </div>
        ) : filteredItems.length === 0 ? null : (
          filteredItems.map(item => {
            const qty = getItemQuantity(item.id);
            const isMealFav = mealFavs.has(item.id);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex ${
                  item.isAvailable === false ? 'opacity-60' : ''
                }`}
              >
                {/* Image */}
                <div className="relative flex-shrink-0 w-28 h-28">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                      <UtensilsCrossed className="h-9 w-9 text-gray-200" />
                    </div>
                  )}
                  {/* Favorite heart on image */}
                  <button
                    onClick={e => toggleMealFav(e, item.id)}
                    className={`absolute top-1.5 left-1.5 w-7 h-7 flex items-center justify-center rounded-full shadow-sm border transition active:scale-95 ${
                      isMealFav ? 'bg-primary border-primary' : 'bg-white border-gray-200'
                    }`}
                  >
                    <Heart className={`h-3.5 w-3.5 ${isMealFav ? 'fill-white text-white' : 'text-gray-400'}`} />
                  </button>
                  {item.isAvailable === false && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-[10px] font-black bg-gray-700 rounded px-1">غير متوفر</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      {item.discountPrice ? (
                        <>
                          <span className="text-primary font-black text-sm">{item.discountPrice} ر.ي</span>
                          <span className="text-gray-400 text-[11px] line-through">{item.price} ر.ي</span>
                        </>
                      ) : (
                        <span className="text-primary font-black text-sm">{item.price} ر.ي</span>
                      )}
                    </div>

                    {item.isAvailable !== false && (
                      qty > 0 ? (
                        <div className="flex items-center gap-1.5 bg-primary/10 rounded-full px-2 py-1">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white active:scale-95 transition"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-primary font-black text-sm w-4 text-center">{qty}</span>
                          <button
                            onClick={() => addItem(item, item.restaurantId, restaurant.name)}
                            className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white active:scale-95 transition"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addItem(item, item.restaurantId, restaurant.name)}
                          className="flex items-center gap-1 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm active:scale-95 transition"
                        >
                          <Plus className="h-3 w-3" />
                          أضف للسلة
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Rating Modal ── */}
      {ratingOpen && id && restaurant && (
        <RatingModal
          restaurantId={id}
          restaurantName={restaurant.name}
          onClose={() => setRatingOpen(false)}
        />
      )}

      <StoreClosedDialog
        open={showStoreClosed}
        message={storeClosedMsg}
        onClose={() => setShowStoreClosed(false)}
      />
    </div>
  );
}
