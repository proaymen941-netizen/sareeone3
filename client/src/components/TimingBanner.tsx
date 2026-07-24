import { useUiSettings } from '@/context/UiSettingsContext';
import { getAppStatus } from '@/utils/restaurantHours';
import { Clock, AlertTriangle } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';

export default function TimingBanner() {
  const [, setCurrentTime] = useState(new Date());
  const { getSetting } = useUiSettings();

  const openingTime = getSetting('opening_time', '08:00');
  const closingTime = getSetting('closing_time', '23:00');
  const storeStatusSetting = getSetting('store_status', 'auto');
  const storeEmergencyClosed = getSetting('store_emergency_closed', 'false');
  const emergencyMessage = getSetting('store_emergency_message', '');
  const workingDays = getSetting('working_days', '0,1,2,3,4,5,6');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000); // Check every 15 seconds
    return () => clearInterval(timer);
  }, []);

  const appStatus = useMemo(() => {
    return getAppStatus(
      openingTime,
      closingTime,
      storeStatusSetting,
      storeEmergencyClosed,
      emergencyMessage,
      workingDays
    );
  }, [openingTime, closingTime, storeStatusSetting, storeEmergencyClosed, emergencyMessage, workingDays]);

  const isEmergency = storeEmergencyClosed === 'true' || storeStatusSetting === 'emergency';

  return (
    <div className={`border-b border-gray-100 shadow-sm transition-colors ${
      isEmergency ? 'bg-red-50 text-red-900 border-red-200' : 'bg-white'
    }`}>
      <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <div
          className={`shrink-0 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
            appStatus.isOpen
              ? 'bg-emerald-500 text-white shadow-sm'
              : isEmergency
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-red-500 text-white'
          }`}
        >
          {isEmergency ? (
            <>
              <AlertTriangle className="h-3 w-3" />
              <span>إغلاق طارئ</span>
            </>
          ) : appStatus.isOpen ? (
            'مفتوح الان'
          ) : (
            'مغلق الان'
          )}
        </div>
        <div className="flex-1 flex items-center justify-center gap-1.5 text-xs sm:text-sm text-gray-700 font-medium text-center">
          <Clock className="h-4 w-4 text-orange-500 shrink-0" />
          {isEmergency ? (
            <span className="text-red-700 font-semibold line-clamp-1">
              {emergencyMessage || 'المتجر مغلق حالياً بصفة طارئة'}
            </span>
          ) : (
            <span>
              أوقات الدوام: من <strong>{openingTime}</strong> حتى <strong>{closingTime}</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
