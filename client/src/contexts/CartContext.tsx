import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { MenuItem } from '../../../shared/schema.js';
import { useToast } from '@/hooks/use-toast';

export interface CartItem extends MenuItem {
  quantity: number;
  notes?: string;
}

interface CartState {
  items: CartItem[];
  restaurantId?: string;
  restaurantName?: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; item: MenuItem; restaurantId: string; restaurantName: string }
  | { type: 'REMOVE_ITEM'; itemId: string }
  | { type: 'UPDATE_QUANTITY'; itemId: string; quantity: number }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_DELIVERY_FEE'; fee: number }
  | { type: 'ADD_NOTES'; itemId: string; notes: string }
  | { type: 'RESTORE_CART'; cartState: CartState };

const initialState: CartState = {
  items: [],
  total: 0,
  subtotal: 0,
  deliveryFee: 0,
};

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      // إذا كان المطعم مختلفاً، امسح السلة
      if (state.restaurantId && state.restaurantId !== action.restaurantId) {
        if (!confirm('إضافة عناصر من مطعم آخر سيمسح السلة الحالية. هل تريد المتابعة؟')) {
          return state;
        }
        state = { ...initialState };
      }

      const existingItem = state.items.find(item => item.id === action.item.id);
      let newItems;

      if (existingItem) {
        newItems = state.items.map(item =>
          item.id === action.item.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        newItems = [...state.items, { ...action.item, quantity: 1 }];
      }

      const subtotal = newItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
      const total = subtotal + state.deliveryFee;

      return {
        ...state,
        items: newItems,
        restaurantId: action.restaurantId,
        restaurantName: action.restaurantName,
        subtotal,
        total,
      };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.id !== action.itemId);
      const subtotal = newItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
      const total = subtotal + state.deliveryFee;
      
      return {
        ...state,
        items: newItems,
        subtotal,
        total,
        restaurantId: newItems.length === 0 ? undefined : state.restaurantId,
        restaurantName: newItems.length === 0 ? undefined : state.restaurantName,
      };
    }

    case 'UPDATE_QUANTITY': {
      if (action.quantity <= 0) {
        return cartReducer(state, { type: 'REMOVE_ITEM', itemId: action.itemId });
      }

      const newItems = state.items.map(item =>
        item.id === action.itemId
          ? { ...item, quantity: action.quantity }
          : item
      );

      const subtotal = newItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
      const total = subtotal + state.deliveryFee;

      return {
        ...state,
        items: newItems,
        subtotal,
        total,
      };
    }

    case 'ADD_NOTES': {
      const newItems = state.items.map(item =>
        item.id === action.itemId
          ? { ...item, notes: action.notes }
          : item
      );

      return {
        ...state,
        items: newItems,
      };
    }

    case 'SET_DELIVERY_FEE': {
      const total = state.subtotal + action.fee;
      return {
        ...state,
        deliveryFee: action.fee,
        total,
      };
    }

    case 'CLEAR_CART':
      return initialState;

    case 'RESTORE_CART': {
      // Restore the complete cart state from localStorage
      return {
        ...action.cartState,
        // Recalculate totals to ensure consistency
        subtotal: action.cartState.items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0),
        total: action.cartState.items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0) + action.cartState.deliveryFee,
      };
    }

    default:
      return state;
  }
}

interface CartContextType {
  state: CartState;
  addItem: (item: MenuItem, restaurantId: string, restaurantName: string) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  addNotes: (itemId: string, notes: string) => void;
  setDeliveryFee: (fee: number) => void;
  clearCart: () => void;
  getItemQuantity: (itemId: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { toast } = useToast();

  // حفظ السلة في localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(state));
  }, [state]);

  // تحميل السلة من localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const cartData = JSON.parse(savedCart);
        if (cartData.items?.length > 0) {
          // استخدام RESTORE_CART لحفظ الحالة بالكامل
          dispatch({
            type: 'RESTORE_CART',
            cartState: cartData
          });
        }
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        localStorage.removeItem('cart'); // إزالة البيانات المعطوبة
      }
    }
  }, []);

  const addItem = (item: MenuItem, restaurantId: string, restaurantName: string) => {
    // التحقق من وجود العنصر في السلة لتحديد نوع الإشعار
    const existingItem = state.items.find(cartItem => cartItem.id === item.id);
    
    dispatch({ type: 'ADD_ITEM', item, restaurantId, restaurantName });
    
    // إظهار إشعار بنجح إضافة العنصر
    if (existingItem) {
      toast({
        title: "تم زيادة الكمية",
        description: `تم زيادة كمية "${item.name}" في السلة من ${restaurantName}`,
        duration: 3000,
      });
    } else {
      toast({
        title: "تمت الإضافة للسلة",
        description: `تم إضافة "${item.name}" من ${restaurantName} إلى السلة`,
        duration: 3000,
      });
    }
  };

  const removeItem = (itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', itemId });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', itemId, quantity });
  };

  const addNotes = (itemId: string, notes: string) => {
    dispatch({ type: 'ADD_NOTES', itemId, notes });
  };

  const setDeliveryFee = (fee: number) => {
    dispatch({ type: 'SET_DELIVERY_FEE', fee });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const getItemQuantity = (itemId: string): number => {
    const item = state.items.find(item => item.id === itemId);
    return item ? item.quantity : 0;
  };

  return (
    <CartContext.Provider
      value={{
        state,
        addItem,
        removeItem,
        updateQuantity,
        addNotes,
        setDeliveryFee,
        clearCart,
        getItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}