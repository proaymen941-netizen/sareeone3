import { useState } from 'react';
import { Clock, Calendar, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AppClosedOverlayProps {
  openingTime: string;
  closingTime?: string;
  message: string;
  onScheduleOrder?: (scheduledDate: string, scheduledTimeSlot: string) => void;
  onClose?: () => void;
  scheduledOrdersEnabled?: boolean;
}

export default function AppClosedOverlay({
  openingTime,
  message,
  onScheduleOrder,
  onClose,
  scheduledOrdersEnabled = false,
}: AppClosedOverlayProps) {
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState(openingTime || '08:00');

  const today = new Date().toISOString().split('T')[0];

  const handleScheduleSubmit = () => {
    if (!scheduledDate || !scheduledTime) return;
    if (onScheduleOrder) {
      onScheduleOrder(scheduledDate, scheduledTime);
    }
  };

  return (
    <div className="fixed inset-0 z-[9990] bg-black/60 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        {!showScheduleForm ? (
          <>
            {/* Body */}
            <div className="flex flex-col items-center px-6 pt-8 pb-6 text-center">
              {/* Smiley icon */}
              <div className="w-20 h-20 rounded-full border-4 border-red-400 flex items-center justify-center mb-5">
                <svg viewBox="0 0 100 100" className="w-14 h-14 text-red-400" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="50" cy="50" r="45" />
                  <circle cx="35" cy="40" r="4" fill="currentColor" stroke="none" />
                  <circle cx="65" cy="40" r="4" fill="currentColor" stroke="none" />
                  <path d="M 30 62 Q 50 75 70 62" />
                </svg>
              </div>

              {/* Message */}
              <p className="text-gray-800 text-base font-semibold leading-relaxed mb-1">
                {message || 'عذراً، لا يمكنك الطلب حالياً؛ المتجر مغلق.'}
              </p>
              {scheduledOrdersEnabled && onScheduleOrder && (
                <p className="text-gray-600 text-sm mt-1">
                  يمكنك جدولة طلبك.
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex border-t border-gray-100">
              {scheduledOrdersEnabled && onScheduleOrder ? (
                <button
                  onClick={() => setShowScheduleForm(true)}
                  className="flex-1 py-4 text-red-500 font-bold text-sm border-l border-gray-100 hover:bg-red-50 transition-colors"
                >
                  موافق
                </button>
              ) : null}
              <button
                onClick={onClose}
                className="flex-1 py-4 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                اغلاق
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Schedule form header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-base">جدولة الطلب</h3>
              <button
                onClick={() => setShowScheduleForm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500 text-center">
                سيُرسل طلبك إلى لوحة التحكم قبل 15 دقيقة من موعدك
              </p>

              {/* Opening time note */}
              <div className="flex items-center gap-2 bg-orange-50 rounded-xl px-3 py-2">
                <Clock className="h-4 w-4 text-orange-500 shrink-0" />
                <span className="text-orange-700 text-sm font-medium">
                  يفتح التطبيق الساعة <span className="font-bold">{openingTime}</span>
                </span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">التاريخ</Label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    min={today}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="h-11 text-center font-bold text-gray-800 border-2 border-gray-200 focus:border-primary rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">الوقت المطلوب</Label>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="h-11 text-center font-bold text-gray-800 border-2 border-gray-200 focus:border-primary rounded-xl"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => setShowScheduleForm(false)}
                  className="flex-1 h-11 rounded-xl border-2"
                >
                  رجوع
                </Button>
                <Button
                  onClick={handleScheduleSubmit}
                  className="flex-1 h-11 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:opacity-90"
                >
                  <Send className="h-4 w-4 ml-1" />
                  إرسال الطلب
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
