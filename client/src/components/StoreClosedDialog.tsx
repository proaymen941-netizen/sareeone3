interface StoreClosedDialogProps {
  open: boolean;
  message?: string;
  onClose: () => void;
}

export default function StoreClosedDialog({ open, message, onClose }: StoreClosedDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9990] bg-black/60 flex items-center justify-center p-4"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center px-6 pt-8 pb-6 text-center">
          <div className="w-20 h-20 rounded-full border-4 border-red-400 flex items-center justify-center mb-5">
            <svg
              viewBox="0 0 100 100"
              className="w-14 h-14 text-red-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="50" cy="50" r="45" />
              <circle cx="35" cy="40" r="4" fill="currentColor" stroke="none" />
              <circle cx="65" cy="40" r="4" fill="currentColor" stroke="none" />
              <path d="M 30 62 Q 50 75 70 62" />
            </svg>
          </div>

          <p className="text-gray-800 text-base font-semibold leading-relaxed mb-1">
            {message || 'عذراً، المتجر مغلق حالياً'}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            لا يمكنك إضافة المنتجات أو إتمام الطلب الآن
          </p>
        </div>

        <div className="flex border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-4 text-red-500 font-bold text-sm hover:bg-red-50 transition-colors"
          >
            حسناً
          </button>
        </div>
      </div>
    </div>
  );
}
