import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Image as ImageIcon, Loader2, X } from 'lucide-react';

interface ImageUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  placeholder?: string;
  required?: boolean;
  'data-testid'?: string;
}

export default function ImageUpload({
  label,
  value,
  onChange,
  bucket = 'images',
  placeholder = 'https://example.com/image.jpg',
  required = false,
  'data-testid': testId
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "خطأ في نوع الملف",
        description: "يرجى اختيار ملف صورة صالح",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "حجم الملف كبير جداً",
        description: "يرجى اختيار صورة أصغر من 5 ميجابايت",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // تحويل الصورة إلى Base64 للحفظ في قاعدة البيانات مباشرة إذا فشل Supabase
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const base64 = await base64Promise;
      onChange(base64);
      
      toast({
        title: "تم تجهيز الصورة",
        description: "تم تحويل الصورة وسيتم حفظها مع البيانات",
      });
    } catch (error) {
      console.error('خطأ في معالجة الصورة:', error);
      toast({
        title: "فشل في معالجة الصورة",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const clearImage = () => {
    onChange('');
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={testId}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={testId}
          value={value?.startsWith('data:image') ? 'صورة مرفوعة' : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          data-testid={testId}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          data-testid={`${testId}-upload-button`}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {isUploading ? 'جاري الرفع...' : 'رفع صورة'}
        </Button>
        {value && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={clearImage}
            data-testid={`${testId}-clear-button`}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Preview */}
      {value && (
        <div className="mt-2">
          <img
            src={value}
            alt="معاينة الصورة"
            className="w-20 h-20 object-cover rounded-md border"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.src = 'https://via.placeholder.com/80x80?text=خطأ+في+الصورة';
            }}
          />
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
        data-testid={`${testId}-file-input`}
      />
    </div>
  );
}