import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Star, Heart, Plus } from 'lucide-react';
import type { MenuItem } from '@shared/schema';
import { useCart } from '../context/CartContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface MenuItemCardProps {
  item: any; // Using any to support both MenuItem and Mapped SpecialOffer
  disabled?: boolean;
  disabledMessage?: string;
  restaurantId?: string;
  restaurantName?: string;
}

export default function MenuItemCard({ 
  item, 
  disabled = false, 
  disabledMessage, 
  restaurantId = 'unknown', 
  restaurantName = 'متجر غير محدد' 
}: MenuItemCardProps) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { isOnline } = useNetworkStatus();

  // Check if item is in favorites
  const { data: favoriteStatus } = useQuery<{ isFavorite: boolean }>({
    queryKey: ['/api/favorites/check', user?.id, item.id],
    queryFn: async () => {
      if (!user?.id || item.isBannerOffer) return { isFavorite: false };
      const res = await fetch(`/api/favorites/check?userId=${user.id}&menuItemId=${item.id}`);
      if (!res.ok) return { isFavorite: false };
      return res.json();
    },
    enabled: !!user?.id && !item.isBannerOffer,
  });

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (item.isBannerOffer) return;
      if (!isAuthenticated) {
        throw new Error('not_authenticated');
      }
      if (!isOnline) {
        throw new Error('no_connection');
      }

      if (favoriteStatus?.isFavorite) {
        await apiRequest('DELETE', `/api/favorites?userId=${user?.id}&menuItemId=${item.id}`);
      } else {
        await apiRequest('POST', '/api/favorites', {
          userId: user?.id,
          menuItemId: item.id,
        });
      }
    },
    onSuccess: () => {
      if (item.isBannerOffer) return;
      queryClient.invalidateQueries({ queryKey: ['/api/favorites/check', user?.id, item.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/favorites/products', user?.id] });
      
      toast({
        title: favoriteStatus?.isFavorite ? "تمت الإزالة من المفضلة" : "تمت الإضافة للمفضلة",
        description: favoriteStatus?.isFavorite ? `تمت إزالة ${item.name} من قائمة مفضلاتك` : `تم إضافة ${item.name} إلى قائمة مفضلاتك`,
      });
    },
    onError: (error: any) => {
      if (error?.message === 'not_authenticated') {
        toast({
          title: "يجب تسجيل الدخول",
          description: "يرجى إنشاء حساب أو تسجيل الدخول لإضافة المنتجات إلى المفضلة",
          variant: "destructive",
        });
        return;
      }
      if (error?.message === 'no_connection') {
        toast({
          title: "لا يوجد اتصال بالإنترنت",
          description: "يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "خطأ في المفضلة",
        description: "حدث خطأ أثناء تحديث المفضلة، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    },
  });

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (item.isBannerOffer) {
      if (item.menuItemId) {
        setLocation(`/product/${item.menuItemId}`);
      }
      return;
    }

    if (!isOnline) {
      toast({
        title: "لا يوجد اتصال بالإنترنت",
        description: "يرجى التحقق من اتصالك بالإنترنت لإضافة المنتجات",
        variant: "destructive",
      });
      return;
    }

    if (disabled && disabledMessage) {
      toast({
        title: "لا يمكن الطلب",
        description: disabledMessage,
        variant: "destructive",
      });
      return;
    }
    
    addItem(item, restaurantId, restaurantName);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.isBannerOffer) {
      toggleFavorite.mutate();
    }
  };

  const handleClick = () => {
    if (item.isBannerOffer) {
      if (item.menuItemId) {
        setLocation(`/product/${item.menuItemId}`);
      }
    } else {
      setLocation(`/product/${item.id}`);
    }
  };

  const discountPercent = item.originalPrice 
    ? Math.round((1 - parseFloat(String(item.price)) / parseFloat(String(item.originalPrice))) * 100)
    : 0;

  const colors = item.colors ? item.colors.split(',') : [];

  return (
    <div 
      id={item.isBannerOffer ? `offer-${item.id}` : `product-${item.id}`}
      className="group relative bg-white cursor-pointer border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300" 
      onClick={handleClick}
    >
      {/* Product Image Container */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Badges */}
        <div className="absolute top-1.5 right-1.5 flex flex-col gap-1">
          {item.isBannerOffer && (
            <Badge className="bg-primary text-white border-none rounded-sm text-[8px] px-1.5 py-0 font-black">
              عرض خاص
            </Badge>
          )}
          {item.isFeatured && (
            <Badge className="bg-[#F05215]/90 text-white border-none rounded-sm text-[8px] px-1.5 py-0 font-black">
              M-S
            </Badge>
          )}
          {discountPercent > 0 && (
            <Badge className="bg-red-600 text-white border-none rounded-sm text-[8px] px-1.5 py-0 font-black">
              -{discountPercent}%
            </Badge>
          )}
        </div>

        {/* Quick Add Button - App Style */}
        <div className="absolute bottom-2 right-2 translate-y-12 group-hover:translate-y-0 transition-transform duration-300">
          <Button 
            size="icon"
            className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg"
            onClick={handleAddToCart}
            disabled={(!item.isAvailable && !item.isBannerOffer) || disabled}
          >
            {item.isBannerOffer ? <ShoppingBag className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        {/* Favorite Icon */}
        {!item.isBannerOffer && (
          <button 
            className="absolute top-1.5 left-1.5 p-1.5 bg-white/80 hover:bg-white rounded-full transition-colors z-10 shadow-sm"
            onClick={handleToggleFavorite}
            disabled={toggleFavorite.isPending}
          >
            <Heart className={`h-3.5 w-3.5 ${favoriteStatus?.isFavorite ? 'text-red-600 fill-current' : 'text-gray-400'}`} />
          </button>
        )}
      </div>

      {/* Product Info */}
      <div className="p-2">
        <h4 className="text-[11px] md:text-sm font-bold text-gray-800 line-clamp-1 mb-0.5 group-hover:text-primary transition-colors">
          {item.name}
        </h4>

        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs md:text-base font-black text-gray-900">{item.price} ريال</span>
          {item.originalPrice && (
            <span className="text-[9px] md:text-xs text-gray-400 line-through">{item.originalPrice} ريال</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5 text-yellow-400">
            <Star className="h-2.5 w-2.5 fill-current" />
            <span className="text-[9px] text-gray-500 font-bold">{item.rating || '4.8'}</span>
          </div>
          {(item.salesCount !== undefined || item.isBannerOffer) && (
            <span className="text-[8px] text-gray-400 font-bold">
              {item.isBannerOffer ? 'متوفر الآن' : `باع ${item.salesCount}+`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
