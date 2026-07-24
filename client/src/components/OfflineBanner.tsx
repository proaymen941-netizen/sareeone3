import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function OfflineBanner() {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gray-900 text-white flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold shadow-lg">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>أنت غير متصل بالإنترنت - بعض الميزات قد لا تعمل</span>
    </div>
  );
}
