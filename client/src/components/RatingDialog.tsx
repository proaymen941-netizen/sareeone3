import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Truck, Utensils } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/context/AuthContext';

interface RatingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  restaurantName: string;
  driverName?: string;
  customerId?: string;
}

export default function RatingDialog({ isOpen, onClose, orderId, restaurantName, driverName, customerId }: RatingDialogProps) {
  const [restaurantRating, setRestaurantRating] = useState(0);
  const [restaurantComment, setRestaurantComment] = useState('');
  const [driverRating, setDriverRating] = useState(0);
  const [driverComment, setDriverComment] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/customer/orders/${orderId}/review`, {
        customerId: customerId || user?.id,
        rating: restaurantRating,
        comment: restaurantComment,
        driverRating: driverRating > 0 ? driverRating : undefined,
        driverComment: driverComment || undefined,
        // we use the info from the order on the server side
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "شكراً لتقييمك!",
        description: "تم استلام تقييمك بنجاح.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في إرسال التقييم",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const renderStars = (rating: number, setRating: (r: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star
              className={`h-8 w-8 ${
                star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const handleSubmit = () => {
    if (restaurantRating === 0) {
      toast({
        title: "تنبيه",
        description: "يرجى اختيار تقييم للمطعم أولاً",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">تقييم الطلب</DialogTitle>
          <DialogDescription className="text-center">
            يسعدنا معرفة رأيك في الخدمة المقدمة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Restaurant Rating */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-semibold">
              <Utensils className="h-5 w-5 text-orange-500" />
              <span>تقييم المطعم ({restaurantName})</span>
            </div>
            <div className="flex justify-center">
              {renderStars(restaurantRating, setRestaurantRating)}
            </div>
            <Textarea
              placeholder="اكتب تعليقك على جودة الطعام والخدمة..."
              value={restaurantComment}
              onChange={(e) => setRestaurantComment(e.target.value)}
              className="resize-none"
            />
          </div>

          {/* Driver Rating - Only if driver exists */}
          {driverName && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2 font-semibold">
                <Truck className="h-5 w-5 text-blue-500" />
                <span>تقييم السائق ({driverName})</span>
              </div>
              <div className="flex justify-center">
                {renderStars(driverRating, setDriverRating)}
              </div>
              <Textarea
                placeholder="اكتب تعليقك على سرعة التوصيل وأسلوب السائق..."
                value={driverComment}
                onChange={(e) => setDriverComment(e.target.value)}
                className="resize-none"
              />
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-center">
          <Button
            type="button"
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold"
            onClick={handleSubmit}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "جاري الإرسال..." : "إرسال التقييم"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
