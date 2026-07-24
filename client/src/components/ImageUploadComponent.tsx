import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, Image as ImageIcon, Loader as Loader2, X, Eye, Download, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ImageUploadComponentProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  category?: 'restaurants' | 'menuItems' | 'offers' | 'categories' | 'general';
  placeholder?: string;
  required?: boolean;
  'data-testid'?: string;
  showPreview?: boolean;
  allowMultiple?: boolean;
  maxFiles?: number;
}

interface UploadedImage {
  url: string;
  thumbnailUrl?: string;
  filename: string;
  originalName: string;
  size: number;
  category: string;
}

export default function ImageUploadComponent({
  label,
  value,
  onChange,
  category = 'general',
  placeholder = 'https://example.com/image.jpg أو ارفع صورة من جهازك',
  required = false,
  'data-testid': testId,
  showPreview = true,
  allowMultiple = false,
  maxFiles = 5
}: ImageUploadComponentProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // التحقق من صحة الملف
  const validateFile = (file: File): string | null => {
    // التحقق من نوع الملف
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return 'نوع الملف غير مدعوم. يرجى اختيار صورة بصيغة JPG, PNG, أو WebP';
    }

    // التحقق من حجم الملف (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return 'حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت';
    }

    // التحقق من أبعاد الصورة (اختياري)
    return null;
  };

  // رفع ملف واحد
  const uploadSingleFile = async (file: File): Promise<UploadedImage> => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('category', category);
    formData.append('optimize', 'true');

    const response = await fetch('/api/images/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'فشل في رفع الصورة');
    }

    const result = await response.json();
    return result.data;
  };

  // رفع ملفات متعددة
  const uploadMultipleFiles = async (files: FileList): Promise<UploadedImage[]> => {
    const formData = new FormData();
    
    Array.from(files).forEach(file => {
      formData.append('images', file);
    });
    
    formData.append('category', category);
    formData.append('optimize', 'true');

    const response = await fetch('/api/images/upload-multiple', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'فشل في رفع الصور');
    }

    const result = await response.json();
    return result.data;
  };

  // معالجة رفع الملفات
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // التحقق من توفر خدمة رفع الصور
    try {
      const testResponse = await fetch('/api/images/upload', {
        method: 'HEAD'
      });
      
      if (!testResponse.ok) {
        toast({
          title: "خدمة رفع الصور غير متوفرة",
          description: "يرجى إدخال رابط الصورة يدوياً",
          variant: "destructive",
        });
        return;
      }
    } catch (error) {
      toast({
        title: "خدمة رفع الصور غير متوفرة",
        description: "يرجى إدخال رابط الصورة يدوياً",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // التحقق من صحة الملفات
      for (let i = 0; i < files.length; i++) {
        const error = validateFile(files[i]);
        if (error) {
          toast({
            title: "خطأ في الملف",
            description: `${files[i].name}: ${error}`,
            variant: "destructive",
          });
          return;
        }
      }

      // التحقق من عدد الملفات
      if (allowMultiple && files.length > maxFiles) {
        toast({
          title: "عدد ملفات كثير",
          description: `يمكن رفع ${maxFiles} ملفات كحد أقصى`,
          variant: "destructive",
        });
        return;
      }

      let uploadedFiles: UploadedImage[];

      if (allowMultiple && files.length > 1) {
        // رفع ملفات متعددة عبر API
        const formData = new FormData();
        Array.from(files).forEach(file => {
          formData.append('images', file);
        });
        formData.append('category', category);
        formData.append('optimize', 'true');
        
        const response = await fetch('/api/images/upload-multiple', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'فشل في رفع الصور');
        }
        
        const result = await response.json();
        
        if (!result.success || !result.data) {
          throw new Error(result.message || 'فشل في رفع الصور');
        }
        
        uploadedFiles = result.data;
        setUploadedImages(prev => [...prev, ...uploadedFiles]);
        
        // تحديث القيمة بأول صورة أو دمج الروابط
        if (uploadedFiles.length > 0) {
          onChange(uploadedFiles[0].url);
        }
      } else {
        // رفع ملف واحد عبر API
        const formData = new FormData();
        formData.append('image', files[0]);
        formData.append('category', category);
        formData.append('optimize', 'true');
        
        const response = await fetch('/api/images/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'فشل في رفع الصورة');
        }
        
        const result = await response.json();
        
        if (!result.success || !result.data) {
          throw new Error(result.message || 'فشل في رفع الصورة');
        }
        
        const uploadedFile = result.data;
        uploadedFiles = [uploadedFile];
        setUploadedImages([uploadedFile]);
        onChange(uploadedFile.url);
      }

      setUploadProgress(100);
      
      toast({
        title: "تم رفع الصورة بنجاح",
        description: `تم رفع ${uploadedFiles.length} صورة بنجاح (${(files[0].size / 1024 / 1024).toFixed(2)} MB)`,
      });

    } catch (error) {
      console.error('خطأ في رفع الصورة:', error);
      toast({
        title: "فشل في رفع الصورة",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // مسح اختيار الملف
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // حذف صورة
  const handleDeleteImage = async (imageUrl: string) => {
    try {
      const response = await fetch('/api/images/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: imageUrl,
          category
        }),
      });

      if (response.ok) {
        // إزالة من القائمة المحلية
        setUploadedImages(prev => prev.filter(img => img.url !== imageUrl));
        
        // مسح القيمة إذا كانت هي الصورة المحذوفة
        if (value === imageUrl) {
          onChange('');
        }
        
        toast({
          title: "تم حذف الصورة",
          description: "تم حذف الصورة بنجاح",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ في حذف الصورة",
        description: "حدث خطأ أثناء حذف الصورة",
        variant: "destructive",
      });
    }
  };

  // معاينة الصورة
  const handlePreviewImage = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    setShowPreviewDialog(true);
  };

  // مسح الصورة المختارة
  const clearImage = () => {
    onChange('');
    setUploadedImages([]);
    setPreviewImage(null);
  };

  return (
    <div className="space-y-4">
      <Label htmlFor={testId} className="text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      
      {/* إدخال الرابط يدوياً */}
      <div className="flex gap-2">
        <Input
          id={testId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          data-testid={testId}
          className="flex-1"
        />
        
        {/* أزرار الإجراءات */}
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          data-testid={`${testId}-upload-button`}
          className="shrink-0"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {isUploading ? 'جاري الرفع...' : 'رفع صورة'}
        </Button>
        
        {value && (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handlePreviewImage(value)}
              data-testid={`${testId}-preview-button`}
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={clearImage}
              data-testid={`${testId}-clear-button`}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* شريط التقدم */}
      {isUploading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* معاينة الصورة الحالية */}
      {showPreview && value && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <img
                src={value}
                alt="معاينة الصورة"
                className="w-20 h-20 object-cover rounded-md border"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.src = 'https://via.placeholder.com/80x80?text=خطأ+في+الصورة';
                }}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">الصورة الحالية</p>
                <p className="text-xs text-gray-500 break-all">{value}</p>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreviewImage(value)}
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(value, '_blank')}
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* الصور المرفوعة (للرفع المتعدد) */}
      {allowMultiple && uploadedImages.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-medium mb-3">الصور المرفوعة ({uploadedImages.length})</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {uploadedImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image.thumbnailUrl || image.url}
                    alt={image.originalName}
                    className="w-full h-20 object-cover rounded-md border cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handlePreviewImage(image.url)}
                  />
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteImage(image.url);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="absolute bottom-1 left-1 right-1 bg-black/50 text-white text-xs p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {image.originalName}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* إدخال الملف المخفي */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={allowMultiple}
        onChange={handleFileUpload}
        className="hidden"
        data-testid={`${testId}-file-input`}
      />

      {/* نافذة معاينة الصورة */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>معاينة الصورة</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {previewImage && (
              <img
                src={previewImage}
                alt="معاينة"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.src = 'https://via.placeholder.com/400x300?text=خطأ+في+تحميل+الصورة';
                }}
              />
            )}
          </div>
          <div className="flex justify-center gap-2 p-4">
            <Button
              variant="outline"
              onClick={() => previewImage && window.open(previewImage, '_blank')}
            >
              <Download className="h-4 w-4 mr-2" />
              تحميل الصورة
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPreviewDialog(false)}
            >
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* نصائح الاستخدام */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• الصيغ المدعومة: JPG, PNG, WebP</p>
        <p>• الحد الأقصى للحجم: 5 ميجابايت</p>
        <p>• سيتم تحسين الصورة تلقائياً للحصول على أفضل أداء</p>
        {allowMultiple && <p>• يمكن رفع حتى {maxFiles} صور</p>}
      </div>
    </div>
  );
}