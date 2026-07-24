import { useState } from 'react';
import { Clock, Calendar, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ScheduledOrderDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (scheduledDate: string, scheduledTimeSlot: string) => void;
  driverStartTime: string;
}

function formatArabicTime(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h < 12 ? 'صباحاً' : 'مساءً';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

function getTomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function formatDateArabic(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.getTime() === tomorrow.getTime()) return 'الغد';
  return d.toLocaleDateString('ar-SA', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function ScheduledOrderDialog({
  open,
  onClose,
  onConfirm,
  driverStartTime,
}: ScheduledOrderDialogProps) {
  const tomorrow = getTomorrowDate();
  const [selectedDate, setSelectedDate] = useState(tomorrow);
  const [selectedTime, setSelectedTime] = useState(driverStartTime);
  const [showCustom, setShowCustom] = useState(false);

  const arabicDriverStart = formatArabicTime(driverStartTime);

  const quickOptions = [
    {
      label: `${formatDateArabic(tomorrow)} ${formatArabicTime(driverStartTime)}`,
      date: tomorrow,
      time: driverStartTime,
    },
    {
      label: `${formatDateArabic(tomorrow)} ${formatArabicTime(addHour(driverStartTime, 1))}`,
      date: tomorrow,
      time: addHour(driverStartTime, 1),
    },
  ];

  function addHour(time: string, hours: number): string {
    const [h, m] = time.split(':').map(Number);
    const newH = (h + hours) % 24;
    return `${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  const handleQuickSelect = (date: string, time: string) => {
    onConfirm(date, time);
  };

  const handleCustomConfirm = () => {
    if (!selectedDate || !selectedTime) return;
    onConfirm(selectedDate, selectedTime);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden" dir="rtl">
        <div className="bg-gradient-to-br from-orange-500 to-red-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 rounded-full p-2">
              <Clock className="h-6 w-6" />
            </div>
            <DialogTitle className="text-white text-lg font-bold">
              لا يوجد موصلون متاحون الآن
            </DialogTitle>
          </div>
          <p className="text-orange-100 text-sm leading-relaxed">
            ساعات دوام الموصلين حتى <span className="font-bold text-white">{arabicDriverStart}</span>. هل تريد جدولة طلبك لوقت لاحق؟
          </p>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-700">اختر وقت التوصيل:</p>

          <div className="space-y-2">
            {quickOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleQuickSelect(opt.date, opt.time)}
                className="w-full flex items-center justify-between p-3 border-2 border-gray-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all text-right group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 group-hover:bg-orange-200 rounded-full p-1.5 transition-colors">
                    <Calendar className="h-4 w-4 text-orange-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-800">{opt.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-orange-500" />
              </button>
            ))}

            <button
              onClick={() => setShowCustom(!showCustom)}
              className={`w-full flex items-center justify-between p-3 border-2 rounded-xl transition-all text-right group ${showCustom ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-400 hover:bg-orange-50'}`}
            >
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 group-hover:bg-orange-200 rounded-full p-1.5 transition-colors">
                  <Clock className="h-4 w-4 text-gray-600 group-hover:text-orange-600" />
                </div>
                <span className="text-sm font-medium text-gray-800">اختيار وقت آخر</span>
              </div>
              <ChevronRight className={`h-4 w-4 transition-transform ${showCustom ? 'rotate-90 text-orange-500' : 'text-gray-400 group-hover:text-orange-500'}`} />
            </button>

            {showCustom && (
              <div className="mt-3 p-4 bg-gray-50 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">تاريخ التوصيل</Label>
                  <Input
                    type="date"
                    min={tomorrow}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-sm"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">وقت التوصيل</Label>
                  <Input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="text-sm"
                    dir="ltr"
                  />
                </div>
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold"
                  onClick={handleCustomConfirm}
                  disabled={!selectedDate || !selectedTime}
                >
                  تأكيد الوقت المحدد
                </Button>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            className="w-full text-gray-500 text-sm hover:text-gray-700"
            onClick={onClose}
          >
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
