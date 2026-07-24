import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { ShoppingBag, ChevronLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';

export default function FloatingCartNotification() {
  const { state } = useCart();
  const [isVisible, setIsVisible] = useState(false);
  const [lastItemCount, setLastItemCount] = useState(0);
  const [lastItemName, setLastItemName] = useState('');

  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (itemCount > lastItemCount) {
      // New item added
      const lastItem = state.items[state.items.length - 1];
      if (lastItem) {
        setLastItemName(lastItem.name);
        setIsVisible(true);
        
        // Auto hide after 4 seconds
        const timer = setTimeout(() => {
          setIsVisible(false);
        }, 4000);
        
        return () => clearTimeout(timer);
      }
    }
    setLastItemCount(itemCount);
  }, [itemCount, state.items]);

  const openCart = () => {
    window.dispatchEvent(new CustomEvent('openCart'));
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && itemCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-4 right-4 z-[60] md:max-w-md md:mx-auto"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex items-center p-3 gap-3">
            <div className="bg-primary/10 p-2 rounded-xl">
              <ShoppingBag className="h-6 w-6 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0" onClick={openCart}>
              <h4 className="text-sm font-black text-gray-900 truncate">تم إضافة {lastItemName}</h4>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                لديك {itemCount} عناصر في السلة • المجموع: {formatCurrency(state.subtotal)}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 rounded-full p-0"
                onClick={() => setIsVisible(false)}
              >
                <X className="h-4 w-4 text-gray-400" />
              </Button>
              <Button 
                size="sm" 
                className="bg-primary hover:bg-primary/90 text-white rounded-xl px-4 h-9 font-black text-xs flex items-center gap-1 shadow-lg shadow-primary/20"
                onClick={openCart}
              >
                عرض السلة
                <ChevronLeft className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
