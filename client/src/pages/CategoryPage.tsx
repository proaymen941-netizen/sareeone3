import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  LayoutGrid,
  Menu as ListMenu,
  ShoppingBag
} from 'lucide-react';
import MenuItemCard from '../components/MenuItemCard';
import type { MenuItem, Restaurant } from '@shared/schema';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const [sortBy, setSortBy] = useState('recommend');

  const { data: stores } = useQuery<Restaurant[]>({
    queryKey: ['/api/restaurants'],
  });

  const { data: allProducts, isLoading } = useQuery<any[]>({
    queryKey: ['/api/products', slug],
    queryFn: async () => {
      const targetCategory = decodeURIComponent(slug || '').trim().toLowerCase();
      const isOfferCategory = ['عروض', 'العروض', 'offers', 'offer', 'تخفيضات'].includes(targetCategory);

      // Fetch products
      const productsRes = await fetch('/api/products');
      if (!productsRes.ok) throw new Error('Failed to fetch products');
      const products: MenuItem[] = await productsRes.json();

      let results: any[] = [];

      const categoryMap: Record<string, string[]> = {
        'fruits': ['فواكه', 'fruits', 'fruit'],
        'vegetables': ['خضروات', 'vegetables', 'veg', 'خضار'],
        'dates': ['تمور', 'dates', 'تمر'],
        'juices': ['عصائر', 'juices', 'juice'],
        'offers': ['عروض', 'العروض', 'offers', 'offer', 'تخفيضات']
      };

      const filteredProducts = products.filter((item: MenuItem) => {
        if (isOfferCategory && (item.isSpecialOffer || item.category?.toLowerCase().includes('عرض'))) return true;

        if (!item.category) return false;
        const itemCat = item.category.trim().toLowerCase();
        
        if (itemCat === targetCategory || itemCat.includes(targetCategory) || targetCategory.includes(itemCat)) {
          return true;
        }

        for (const [key, variants] of Object.entries(categoryMap)) {
          const isTargetVariant = key === targetCategory || variants.includes(targetCategory);
          if (isTargetVariant && (variants.includes(itemCat) || itemCat === key)) {
            return true;
          }
        }

        return false;
      });

      results = [...filteredProducts];

      // If it's offers category, also fetch special offers banners
      if (isOfferCategory) {
        try {
          const offersRes = await fetch('/api/special-offers');
          if (offersRes.ok) {
            const specialOffers = await offersRes.json();
            const activeSpecialOffers = specialOffers.filter((o: any) => o.isActive);
            
            // Map special offers to a format similar to MenuItem for display
            const mappedOffers = activeSpecialOffers.map((offer: any) => ({
              id: offer.id,
              name: offer.title,
              description: offer.description,
              price: offer.discountAmount || "0",
              image: offer.image,
              category: "العروض",
              isAvailable: true,
              isSpecialOffer: true,
              restaurantId: offer.restaurantId,
              isBannerOffer: true, // Flag to identify this is a banner offer
              menuItemId: offer.menuItemId
            }));
            
            results = [...results, ...mappedOffers];
          }
        } catch (e) {
          console.error("Failed to fetch special offers", e);
        }
      }

      return results;
    }
  });

  const sortedItems = [...(allProducts || [])].sort((a, b) => {
    if (sortBy === 'price-asc') return parseFloat(String(a.price)) - parseFloat(String(b.price));
    if (sortBy === 'price-desc') return parseFloat(String(b.price)) - parseFloat(String(a.price));
    return 0;
  });

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && !isLoading && sortedItems.length > 0) {
      const element = document.querySelector(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-primary', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-primary', 'ring-offset-2');
          }, 3000);
        }, 500);
      }
    }
  }, [isLoading, sortedItems.length]);

  const getCategoryTitle = () => {
    return decodeURIComponent(slug || '');
  };

  return (
    <div className="bg-white min-h-screen pb-20">
      <div className="container mx-auto px-4 py-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
        <button onClick={() => setLocation('/')} className="hover:text-[#F05215] transition-colors">HOME</button>
        <span>/</span>
        <span className="text-black">{decodeURIComponent(slug || '')}</span>
      </div>

      <div className="container mx-auto px-4">
        <div>
          <h1 className="text-5xl font-black mb-12 uppercase tracking-tighter italic border-r-8 border-primary pr-6">{getCategoryTitle()}</h1>

          <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 border-b pb-6">
            <div className="flex items-center gap-8 w-full md:w-auto overflow-x-auto whitespace-nowrap scrollbar-hide">
              {['recommend', 'newest', 'price-asc', 'price-desc'].map((sort) => (
                <button 
                  key={sort}
                  onClick={() => setSortBy(sort)}
                  className={`text-sm font-black pb-2 border-b-2 transition-all uppercase tracking-tighter ${sortBy === sort ? 'border-[#F05215] text-[#F05215]' : 'border-transparent text-gray-400'}`}
                >
                  {sort === 'recommend' ? 'التوصية' : 
                   sort === 'newest' ? 'الأحدث' : 
                   sort === 'price-asc' ? 'السعر: تصاعدي' : 'السعر: تنازلي'}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-6 shrink-0">
              <span className="text-sm font-bold text-gray-400 uppercase">{sortedItems.length} منتج</span>
              <div className="flex border-2 border-gray-100 rounded-none overflow-hidden">
                <button className="p-2.5 bg-gray-50"><LayoutGrid className="h-4 w-4" /></button>
                <button className="p-2.5 hover:bg-gray-50"><ListMenu className="h-4 w-4" /></button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
            {isLoading ? (
              Array(12).fill(0).map((_, i) => (
                <div key={i} className="animate-pulse space-y-4">
                  <div className="aspect-[3/4] bg-gray-100 rounded-none" />
                  <div className="h-4 bg-gray-100 w-1/2" />
                  <div className="h-4 bg-gray-100 w-3/4" />
                </div>
              ))
            ) : sortedItems.length > 0 ? (
              sortedItems.map((item) => {
                const store = stores?.find(s => s.id === item.restaurantId);
                return (
                  <MenuItemCard 
                    key={item.id} 
                    item={item} 
                    restaurantId={item.restaurantId || ''}
                    restaurantName={store?.name || 'متجر'}
                  />
                );
              })
            ) : (
              <div className="col-span-full py-32 text-center">
                <ShoppingBag className="h-16 w-16 mx-auto text-gray-200 mb-4" />
                <p className="text-gray-400 font-bold text-xl uppercase tracking-widest">لا توجد منتجات في هذا القسم</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
