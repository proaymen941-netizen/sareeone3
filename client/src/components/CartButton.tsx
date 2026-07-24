import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '../context/CartContext';
import { useState, useEffect } from 'react';
import { Cart } from './Cart';

export default function CartButton() {
  const { state } = useCart();
  const [showCart, setShowCart] = useState(false);
  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);

  // Listen for openCart event from header
  useEffect(() => {
    const handleOpenCart = () => {
      setShowCart(true);
    };

    window.addEventListener('openCart', handleOpenCart);
    return () => {
      window.removeEventListener('openCart', handleOpenCart);
    };
  }, []);

  return (
    <>
      <div className="floating-cart">
        <Button
          className="relative bg-primary text-primary-foreground p-4 rounded-full shadow-lg hover:bg-primary/90"
          onClick={() => setShowCart(true)}
          data-testid="button-floating-cart"
        >
          <ShoppingCart className="h-6 w-6" />
          <span
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs rounded-full h-6 w-6 flex items-center justify-center"
            data-testid="text-cart-count"
          >
            {itemCount}
          </span>
        </Button>
      </div>
      
      <Cart isOpen={showCart} onClose={() => setShowCart(false)} />
    </>
  );
}
