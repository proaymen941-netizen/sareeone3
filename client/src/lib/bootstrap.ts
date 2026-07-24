import { queryClient } from './queryClient';

const SETTINGS_CACHE_KEY = 'ui_settings_cache';

interface BootstrapResponse {
  uiSettings: any[];
  categories: any[];
  restaurants: any[];
  specialOffers: any[];
  paymentMethods: any[];
  customer: {
    addresses: any[];
    orders: any[];
    notifications: any[];
    unreadCount: number;
  } | null;
  serverTime: number;
}

let bootstrapPromise: Promise<BootstrapResponse | null> | null = null;
let bootstrapDone = false;

function seedUiSettingsCache(uiSettings: any[]) {
  try {
    const settingsMap: Record<string, string> = {};
    for (const s of uiSettings || []) {
      if (s && typeof s.key === 'string') settingsMap[s.key] = s.value;
    }
    localStorage.setItem(
      SETTINGS_CACHE_KEY,
      JSON.stringify({ data: settingsMap, timestamp: Date.now() })
    );
  } catch {
    // تجاهل أخطاء التخزين
  }
}

/**
 * يجلب كل بيانات التطبيق الأولية في طلب واحد ويُحمّلها في كاش React Query.
 * يضمن جاهزية الصفحة الرئيسية والقوائم فور دخول المستخدم.
 */
export function prefetchBootstrap(
  opts: { phone?: string; customerId?: string; force?: boolean } = {}
): Promise<BootstrapResponse | null> {
  const force = opts.force === true;
  if (!force && bootstrapPromise) return bootstrapPromise;
  if (!force && bootstrapDone) return Promise.resolve(null);

  const phone = (opts.phone ?? localStorage.getItem('customer_phone') ?? '') || '';
  const customerId = opts.customerId ?? '';
  const params = new URLSearchParams();
  if (phone) params.set('phone', phone);
  if (customerId) params.set('customerId', customerId);
  const url = `/api/bootstrap${params.toString() ? `?${params.toString()}` : ''}`;

  bootstrapPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal, credentials: 'include' });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`bootstrap http ${res.status}`);
      const data: BootstrapResponse = await res.json();

      // حقن البيانات في الكاش بنفس مفاتيح الاستعلام التي تستخدمها الصفحات
      queryClient.setQueryData(['/api/ui-settings'], data.uiSettings);
      queryClient.setQueryData(['/api/admin/ui-settings'], data.uiSettings);
      queryClient.setQueryData(['/api/categories'], data.categories);
      queryClient.setQueryData(['/api/restaurants'], data.restaurants);
      queryClient.setQueryData(['/api/special-offers'], data.specialOffers);
      queryClient.setQueryData(['/api/payment-methods'], data.paymentMethods);

      // كاش UI settings المحلي يُستخدم في UiSettingsContext قبل التحميل
      seedUiSettingsCache(data.uiSettings);

      // بيانات خاصة بالعميل
      if (data.customer) {
        if (customerId) {
          queryClient.setQueryData(['/api/users', customerId, 'addresses'], data.customer.addresses);
        }
        if (phone) {
          queryClient.setQueryData(['orders', phone], data.customer.orders);
        }
        queryClient.setQueryData(
          ['/api/notifications/customer', phone, customerId],
          data.customer.notifications
        );
      }

      bootstrapDone = true;
      return data;
    } catch (err) {
      console.warn('Bootstrap prefetch failed (will fall back to per-page fetches):', err);
      return null;
    } finally {
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
}

export function resetBootstrap() {
  bootstrapDone = false;
  bootstrapPromise = null;
}
