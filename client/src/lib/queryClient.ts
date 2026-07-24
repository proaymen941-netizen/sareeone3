import { QueryClient, QueryFunction } from "@tanstack/react-query";

// اعتراض fetch عام لإضافة توكن المدير تلقائياً لجميع طلبات /api/admin/* و /api/restaurant-accounts/*
// يضمن عمل جميع الاستدعاءات المباشرة (بدون apiRequest) بعد تفعيل المصادقة في الخادم.
if (typeof window !== 'undefined' && !(window as any).__adminFetchPatched) {
  const originalFetch = window.fetch.bind(window);
  (window as any).__adminFetchPatched = true;
  const patchedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url = typeof input === 'string'
        ? input
        : input instanceof URL ? input.toString() : (input as Request).url;
      const needsAdminAuth = url.includes('/api/admin/')
        || url.includes('/api/restaurant-accounts/')
        || url.includes('/api/flutter/');
      if (needsAdminAuth) {
        const token = localStorage.getItem('admin_token');
        if (token) {
          const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : {}));
          if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          init = { ...(init || {}), headers };
        }
      }
    } catch {}
    return originalFetch(input as any, init);
  };

  try {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'fetch') || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), 'fetch');
    if (descriptor && !descriptor.writable && !descriptor.set && !descriptor.configurable) {
      console.warn("window.fetch is read-only and non-configurable, cannot patch globally.");
    } else {
      Object.defineProperty(window, 'fetch', {
        value: patchedFetch,
        writable: true,
        configurable: true,
        enumerable: true
      });
    }
  } catch (e) {
    try {
      window.fetch = patchedFetch;
    } catch (err) {
      console.error("Failed to patch window.fetch:", err);
    }
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add Authorization header for admin API calls
  if (url.startsWith('/api/admin/')) {
    const token = localStorage.getItem('admin_token');
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const headers: Record<string, string> = {};
    
    // Add Authorization header for admin API calls
    if (url.startsWith('/api/admin/')) {
      const token = localStorage.getItem('admin_token');
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,         // Disable auto-refetch by default (use WebSockets instead)
      refetchOnWindowFocus: false,    // Disable refetch on window focus to reduce requests
      // عرض الكاش فوراً عند العودة للصفحة (لا وميض). إذا كانت البيانات قديمة سيُجدّدها react-query بصمت في الخلفية.
      refetchOnMount: 'always',
      staleTime: 2 * 60 * 1000,       // 2 minutes — most data is read-heavy and updated via WebSockets
      gcTime: 60 * 60 * 1000,         // Keep in cache for 1 hour to prevent data disappearing on navigation between pages
      placeholderData: (prev: any) => prev, // أبقِ البيانات السابقة معروضة حتى تكتمل عملية التحديث الجديدة
      retry: (failureCount, error: any) => {
        if (error?.message?.includes('401') || error?.message?.includes('403') || error?.message?.includes('500')) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
