import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Heart, ShoppingBag, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MenuItemCard from '../components/MenuItemCard';
import type { MenuItem, Restaurant } from '@shared/schema';
import { useLocation } from 'wouter';

export default function Favorites() {
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();

  const { data: stores } = useQuery<Restaurant[]>({
    queryKey: ['/api/restaurants'],
  });

  const { data: favoriteProducts, isLoading } = useQuery<MenuItem[]>({
    queryKey: ['/api/favorites/products', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/favorites/products/${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch favorite products');
      return res.json();
    },
    enabled: !!user?.id,
  });

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
          <Heart className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-black mb-2">{language === 'ar' ? 'سجل دخولك لعرض المفضلة' : 'Login to view favorites'}</h2>
        <p className="text-muted-foreground mb-8 max-w-xs">
          {language === 'ar' ? 'قم بحفظ منتجاتك المفضلة للوصول إليها بسرعة في أي وقت' : 'Save your favorite products to access them quickly anytime'}
        </p>
        <Button onClick={() => setLocation('/auth')} className="w-full max-w-xs font-bold rounded-xl h-12">
          {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black uppercase tracking-tighter italic border-r-8 border-primary pr-4">
            {language === 'ar' ? 'قائمة المفضلات' : 'My Favorites'}
          </h1>
          <span className="text-sm font-bold text-gray-400 uppercase">{favoriteProducts?.length || 0} {language === 'ar' ? 'منتج' : 'items'}</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array(10).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse space-y-4">
                <div className="aspect-[3/4] bg-gray-100 rounded-none" />
                <div className="h-4 bg-gray-100 w-1/2" />
                <div className="h-4 bg-gray-100 w-3/4" />
              </div>
            ))}
          </div>
        ) : favoriteProducts && favoriteProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
            {favoriteProducts.map((item) => {
              const store = stores?.find(s => s.id === item.restaurantId);
              return (
                <MenuItemCard 
                  key={item.id} 
                  item={item} 
                  restaurantId={item.restaurantId || ''}
                  restaurantName={store?.name || 'متجر'}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
              <Heart className="h-12 w-12 text-gray-200" />
            </div>
            <h3 className="text-xl font-black mb-2 uppercase tracking-widest">{language === 'ar' ? 'لا توجد مفضلات' : 'No favorites yet'}</h3>
            <p className="text-gray-400 font-bold mb-8 max-w-xs">
              {language === 'ar' ? 'ابدأ بإضافة بعض المنتجات التي تعجبك إلى قائمة مفضلاتك' : 'Start adding some products you like to your favorites list'}
            </p>
            <Button 
              onClick={() => setLocation('/')} 
              variant="outline" 
              className="flex items-center gap-2 font-bold rounded-xl h-12 px-8 border-2"
            >
              {language === 'ar' ? 'تصفح المنتجات' : 'Browse Products'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
