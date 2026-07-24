import { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  ChevronRight, 
  Star, 
  Heart, 
  Share2, 
  ShoppingBag, 
  Truck, 
  ShieldCheck, 
  RotateCcw,
  Minus,
  Plus,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCart } from '../context/CartContext';
import { useToast } from '@/hooks/use-toast';
import type { MenuItem } from '@shared/schema';
import MenuItemCard from '@/components/MenuItemCard';

export default function ProductDetails() {
  const [, params] = useRoute('/product/:id');
  const [, setLocation] = useLocation();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');

  const { data: product, isLoading } = useQuery<MenuItem>({
    queryKey: [`/api/products/${params?.id}`],
  });

  // Get related products from the same category
  const { data: relatedProducts } = useQuery<MenuItem[]>({
    queryKey: [`/api/restaurants/${product?.restaurantId}/menu`],
    enabled: !!product?.restaurantId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 py-12 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="aspect-[3/4] bg-gray-100 rounded-lg" />
            <div className="space-y-6">
              <div className="h-8 bg-gray-100 rounded w-3/4" />
              <div className="h-4 bg-gray-100 rounded w-1/4" />
              <div className="h-12 bg-gray-100 rounded w-1/2" />
              <div className="h-40 bg-gray-100 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold mb-4">المنتج غير موجود</h2>
        <Button onClick={() => setLocation('/')}>العودة للرئيسية</Button>
      </div>
    );
  }

  const discountPercent = product.originalPrice 
    ? Math.round((1 - parseFloat(String(product.price)) / parseFloat(String(product.originalPrice))) * 100)
    : 0;

  const handleAddToCart = () => {
    // Add to cart with quantity
    for (let i = 0; i < quantity; i++) {
      addItem(product, product.restaurantId || 'unknown', 'متجر');
    }

    toast({
      title: "تمت الإضافة للسلة",
      description: `تم إضافة ${quantity} من ${product.name} للسلة`,
    });
  };

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-12">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8 overflow-x-auto whitespace-nowrap pb-2">
          <button onClick={() => setLocation('/')} className="hover:text-black">الرئيسية</button>
          <ChevronLeft className="h-4 w-4" />
          <button onClick={() => setLocation(`/category/${product.category}`)} className="hover:text-black">{product.category}</button>
          <ChevronLeft className="h-4 w-4" />
          <span className="text-black font-medium">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Product Images Section */}
          <div className="space-y-4">
            <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden group">
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
              />
              {discountPercent > 0 && (
                <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 font-black text-lg">
                  -{discountPercent}%
                </div>
              )}
              <button className="absolute top-4 left-4 p-2 bg-white/80 hover:bg-white rounded-full shadow-sm transition-all">
                <Heart className="h-6 w-6 text-gray-800" />
              </button>
            </div>
            
            {/* Thumbnail Gallery (Placeholder for multi-image support) */}
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`aspect-[3/4] bg-gray-100 border-2 ${i === 1 ? 'border-black' : 'border-transparent'} cursor-pointer hover:border-black transition-all overflow-hidden`}>
                  <img src={product.image} alt="" className="w-full h-full object-cover opacity-50" />
                </div>
              ))}
            </div>
          </div>

          {/* Product Info Section */}
          <div className="flex flex-col">
            <div className="mb-2">
              <Badge variant="outline" className="text-xs font-bold uppercase tracking-widest rounded-none border-gray-300">
                {product.brand || 'SHEIN'}
              </Badge>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-black text-black mb-4 leading-tight">
              {product.name}
            </h1>

            <div className="flex items-center gap-6 mb-6">
              <div className="flex items-center gap-1">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < Math.floor(parseFloat(product.rating || '4.5')) ? 'fill-current' : ''}`} />
                  ))}
                </div>
                <span className="text-sm font-bold">{product.rating || '4.8'}</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-sm text-gray-500 font-medium">تم بيع {product.salesCount || '1.2k'}+ قطعة</span>
            </div>

            <div className="flex items-baseline gap-4 mb-8">
              <span className="text-4xl font-black text-black">{product.price} ريال</span>
              {product.originalPrice && (
                <span className="text-xl text-gray-400 line-through font-medium">{product.originalPrice} ريال</span>
              )}
            </div>

            <Separator className="mb-8" />

            {/* Quantity */}
            <div className="mb-8">
              <span className="font-bold text-sm block mb-3">الكمية:</span>
              <div className="flex items-center w-32 border border-gray-200">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:bg-gray-50 transition-colors border-l"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input 
                  type="number" 
                  value={quantity} 
                  readOnly 
                  className="w-full text-center font-bold text-sm outline-none"
                />
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 hover:bg-gray-50 transition-colors border-r"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Action Button */}
            <div className="mb-10">
              <Button 
                className="w-full h-14 rounded-none bg-black text-white hover:bg-gray-900 font-black text-lg gap-3"
                onClick={handleAddToCart}
                disabled={!product.isAvailable}
              >
                <ShoppingBag className="h-6 w-6" />
                {product.isAvailable ? 'إضافة إلى الحقيبة' : 'غير متوفر حالياً'}
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-4 py-6 border-y border-gray-100 mb-8">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-gray-400" />
                <div className="text-[10px] leading-tight">
                  <p className="font-bold text-gray-900">شحن سريع</p>
                  <p className="text-gray-500">توصيل سريع وموثوق</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-gray-400" />
                <div className="text-[10px] leading-tight">
                  <p className="font-bold text-gray-900">دفع آمن</p>
                  <p className="text-gray-500">100% حماية لمدفوعاتك</p>
                </div>
              </div>
            </div>

            {/* Description / Info Accordion (Simple version) */}
            <div className="space-y-6">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider mb-3">وصف المنتج</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {product.description || 'لا يوجد وصف متاح لهذا المنتج حالياً. يتميز هذا المنتج بجودة عالية وتصميم عصري يناسب احتياجاتكم.'}
                </p>
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider mb-3">المواصفات</h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="font-medium">العلامة التجارية:</span>
                    <span className="text-black font-bold">{product.brand || 'SHEIN'}</span>
                  </li>
                  <li className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="font-medium">الفئة:</span>
                    <span className="text-black font-bold">{product.category}</span>
                  </li>
                  <li className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="font-medium">الحالة:</span>
                    <span className="text-black font-bold">{product.isAvailable ? 'متوفر' : 'غير متوفر'}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts && relatedProducts.length > 1 && (
          <div className="mt-20">
            <h2 className="text-2xl font-black text-black mb-8 border-r-4 border-black pr-4">قد يعجبك أيضاً</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {relatedProducts
                .filter(p => p.id !== product.id)
                .slice(0, 5)
                .map((item) => (
                  <MenuItemCard 
                    key={item.id} 
                    item={item} 
                    restaurantId={product.restaurantId || ''} 
                    restaurantName="متجر"
                  />
                ))}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Sticky Add to Cart (Optional) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 flex gap-4 md:hidden z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <Button 
          className="flex-1 h-12 rounded-none bg-black text-white hover:bg-gray-900 font-black text-sm"
          onClick={handleAddToCart}
          disabled={!product.isAvailable}
        >
          {product.isAvailable ? 'إضافة إلى الحقيبة' : 'غير متوفر'}
        </Button>
      </div>
    </div>
  );
}