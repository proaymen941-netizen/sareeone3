import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
}

const translations = {
  ar: {
    'home': 'الرئيسية',
    'search_placeholder': 'ما الذي تبحث عنه اليوم؟',
    'search_results': 'نتائج البحث',
    'account': 'حسابي',
    'favorites': 'المفضلة',
    'cart': 'الحقيبة',
    'categories': 'الأقسام',
    'browse_categories': 'تصفح حسب التصنيف',
    'new_arrivals': 'وصل حديثاً',
    'shop_now': 'تسوق الآن',
    'support': 'الدعم',
    'share': 'مشاركة',
    'language_country': 'اللغة والبلد',
    'yemen_arabic': 'اليمن / العربية',
    'uae_english': 'الإمارات / English',
    'settings': 'الإعدادات',
    'privacy_policy': 'سياسة الخصوصية',
    'contact_us': 'اتصل بنا',
    'about_tamtom': 'عن السريع ون',
    'orders': 'طلباتي',
    'logout': 'تسجيل الخروج',
    'login': 'دخول',
    'register': 'تسجيل',
    'add_to_cart': 'إضافة للسلة',
    'currency': 'ريال',
    'whatsapp': 'واتساب',
    'direct_call': 'اتصال مباشر',
    'how_can_we_help': 'كيف يمكننا مساعدتك؟',
    'we_are_here': 'نحن متواجدون لخدمتك في أي وقت',
    'total': 'الإجمالي',
    'checkout': 'إتمام الطلب',
    'empty_cart': 'سلتك فارغة',
    'empty_favorites': 'قائمة المفضلة فارغة',
    'start_shopping': 'ابدأ التسوق الآن',
    'delivery': 'التوصيل',
    'fresh_daily': 'طازج يومياً',
    'exclusive_offers': 'عروض حصرية',
    'best_selling': 'الأكثر مبيعاً',
    'new_product': 'منتج جديد',
    'available': 'متوفر',
    'out_of_stock': 'غير متوفر',
    'price': 'السعر',
    'quantity': 'الكمية',
    'rating': 'التقييم',
    'reviews': 'التقييمات',
    'seller': 'البائع',
    'special_offers': 'العروض الخاصة',
    'discount': 'خصم',
    'save': 'حفظ',
    'delete': 'حذف',
    'edit': 'تعديل',
    'cancel': 'إلغاء',
    'confirm': 'تأكيد',
    'loading': 'جاري التحميل...',
    'error': 'خطأ',
    'success': 'نجاح',
    'warning': 'تحذير',
    'info': 'معلومات',
    'yes': 'نعم',
    'no': 'لا',
    'name': 'الاسم',
    'email': 'البريد الإلكتروني',
    'phone': 'رقم الهاتف',
    'address': 'العنوان',
    'password': 'كلمة المرور',
    'confirm_password': 'تأكيد كلمة المرور',
    'remember_me': 'تذكرني',
    'forgot_password': 'هل نسيت كلمة المرور؟',
    'create_account': 'إنشاء حساب جديد',
    'sign_in': 'تسجيل الدخول',
    'profile': 'الملف الشخصي',
    'my_orders': 'طلباتي',
    'order_history': 'سجل الطلبات',
    'delivery_address': 'عنوان التوصيل',
    'payment_method': 'طريقة الدفع',
    'order_total': 'إجمالي الطلب',
    'estimated_delivery': 'الوقت المتوقع للتوصيل',
    'order_status': 'حالة الطلب',
    'pending': 'قيد الانتظار',
    'processing': 'جاري المعالجة',
    'shipped': 'تم الشحن',
    'delivered': 'تم التسليم',
    'cancelled': 'تم الإلغاء',
  },
  en: {
    'home': 'Home',
    'search_placeholder': 'What are you looking for today?',
    'search_results': 'Search Results',
    'account': 'Account',
    'favorites': 'Favorites',
    'cart': 'Cart',
    'categories': 'Categories',
    'browse_categories': 'Browse by Category',
    'new_arrivals': 'New Arrivals',
    'shop_now': 'Shop Now',
    'support': 'Support',
    'share': 'Share',
    'language_country': 'Language & Country',
    'yemen_arabic': 'Yemen / Arabic',
    'uae_english': 'UAE / English',
    'settings': 'Settings',
    'privacy_policy': 'Privacy Policy',
    'contact_us': 'Contact Us',
    'about_tamtom': 'About Tamtom',
    'orders': 'My Orders',
    'logout': 'Logout',
    'login': 'Login',
    'register': 'Register',
    'add_to_cart': 'Add to Cart',
    'currency': 'YER',
    'whatsapp': 'WhatsApp',
    'direct_call': 'Direct Call',
    'how_can_we_help': 'How can we help?',
    'we_are_here': 'We are here to help you anytime',
    'total': 'Total',
    'checkout': 'Checkout',
    'empty_cart': 'Your cart is empty',
    'empty_favorites': 'Your favorites list is empty',
    'start_shopping': 'Start Shopping Now',
    'delivery': 'Delivery',
    'fresh_daily': 'Fresh Daily',
    'exclusive_offers': 'Exclusive Offers',
    'best_selling': 'Best Selling',
    'new_product': 'New Product',
    'available': 'Available',
    'out_of_stock': 'Out of Stock',
    'price': 'Price',
    'quantity': 'Quantity',
    'rating': 'Rating',
    'reviews': 'Reviews',
    'seller': 'Seller',
    'special_offers': 'Special Offers',
    'discount': 'Discount',
    'save': 'Save',
    'delete': 'Delete',
    'edit': 'Edit',
    'cancel': 'Cancel',
    'confirm': 'Confirm',
    'loading': 'Loading...',
    'error': 'Error',
    'success': 'Success',
    'warning': 'Warning',
    'info': 'Information',
    'yes': 'Yes',
    'no': 'No',
    'name': 'Name',
    'email': 'Email',
    'phone': 'Phone Number',
    'address': 'Address',
    'password': 'Password',
    'confirm_password': 'Confirm Password',
    'remember_me': 'Remember Me',
    'forgot_password': 'Forgot Password?',
    'create_account': 'Create New Account',
    'sign_in': 'Sign In',
    'profile': 'Profile',
    'my_orders': 'My Orders',
    'order_history': 'Order History',
    'delivery_address': 'Delivery Address',
    'payment_method': 'Payment Method',
    'order_total': 'Order Total',
    'estimated_delivery': 'Estimated Delivery Time',
    'order_status': 'Order Status',
    'pending': 'Pending',
    'processing': 'Processing',
    'shipped': 'Shipped',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<Language>(() => {
    return (localStorage.getItem('language') as Language) || 'ar';
  });

  const setLanguage = (lang: Language) => {
    setLangState(lang);
    localStorage.setItem('language', lang);
  };

  useEffect(() => {
    const direction = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string) => {
    return translations[language][key as keyof typeof translations['ar']] || key;
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
