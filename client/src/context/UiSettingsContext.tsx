import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const SETTINGS_CACHE_KEY = 'ui_settings_cache';
const SETTINGS_CACHE_TTL = 30 * 1000; // 30 seconds cache for fast sync

interface UiSetting {
  id: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UiSettingsContextType {
  settings: Record<string, string>;
  loading: boolean;
  updateSetting: (key: string, value: string) => Promise<void>;
  getSetting: (key: string, defaultValue?: string) => string;
  isFeatureEnabled: (key: string) => boolean;
  refreshSettings: () => Promise<void>;
}

const UiSettingsContext = createContext<UiSettingsContextType | undefined>(undefined);

function loadCachedSettings(): Record<string, string> | null {
  try {
    const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < SETTINGS_CACHE_TTL) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

function saveCachedSettings(settings: Record<string, string>) {
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify({
      data: settings,
      timestamp: Date.now(),
    }));
  } catch {
    // ignore storage errors
  }
}

export function UiSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>(() => {
    return loadCachedSettings() || {};
  });
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSettings = useCallback(async (isInitial = false) => {
    try {
      const response = await fetch('/api/ui-settings');
      if (response.ok) {
        const settingsData: UiSetting[] = await response.json();
        const settingsMap = settingsData.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {} as Record<string, string>);
        setSettings(settingsMap);
        saveCachedSettings(settingsMap);
      }
    } catch (error) {
      // On network failure, keep cached settings - do nothing
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          // Refresh settings when admin changes them
          if (
            message.type === 'settings_updated' ||
            message.type === 'ui_settings_changed' ||
            message.type === 'admin_update' ||
            message.type === 'settings_changed'
          ) {
            loadSettings(false);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        // Reconnect after 10 seconds
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(connectWebSocket, 10000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WebSocket not available, fall back to polling
    }
  }, [loadSettings]);

  const updateSetting = useCallback(async (key: string, value: string) => {
    try {
      const adminToken = localStorage.getItem('admin_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }
      const response = await fetch(`/api/admin/ui-settings/${key}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ value }),
      });

      if (response.ok) {
        setSettings(prev => {
          const newSettings = { ...prev, [key]: value };
          saveCachedSettings(newSettings);
          return newSettings;
        });
      }
    } catch (error) {
      console.error('خطأ في تحديث الإعداد:', error);
    }
  }, []);

  const getSetting = useCallback((key: string, defaultValue: string = '') => {
    return settings[key] !== undefined ? settings[key] : defaultValue;
  }, [settings]);

  const isFeatureEnabled = useCallback((key: string) => {
    const value = settings[key] !== undefined ? settings[key] : '';
    if (value === '') return true;
    return value !== 'false';
  }, [settings]);

  const refreshSettings = useCallback(async () => {
    setLoading(true);
    await loadSettings(true);
  }, [loadSettings]);

  useEffect(() => {
    // Load settings on mount (cached data shown immediately, then fetch fresh)
    loadSettings(true);

    // Connect WebSocket for real-time updates
    connectWebSocket();

    // Periodic refresh every 10 seconds as fallback for real-time accuracy
    const interval = setInterval(() => loadSettings(false), 10000);

    return () => {
      clearInterval(interval);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [loadSettings, connectWebSocket]);

  return (
    <UiSettingsContext.Provider value={{
      settings,
      loading,
      updateSetting,
      getSetting,
      isFeatureEnabled,
      refreshSettings
    }}>
      {children}
    </UiSettingsContext.Provider>
  );
}

export function useUiSettings() {
  const context = useContext(UiSettingsContext);
  if (context === undefined) {
    throw new Error('useUiSettings must be used within a UiSettingsProvider');
  }
  return context;
}
