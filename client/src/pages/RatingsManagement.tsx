import React, { useState, useEffect } from 'react';
import { Star, Check, X, Eye } from 'lucide-react';

interface Rating {
  id: string;
  orderId?: string;
  restaurantId?: string;
  customerName: string;
  customerPhone?: string;
  rating: number;
  comment?: string;
  isApproved: boolean;
  createdAt: string;
}

export default function RatingsManagement() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');

  useEffect(() => {
    fetchRatings();
  }, [filter]);

  const fetchRatings = async () => {
    setIsLoading(true);
    try {
      let url = '/api/ratings';
      if (filter === 'approved') {
        url += '?approved=true';
      } else if (filter === 'pending') {
        url += '?approved=false';
      }
      
      const response = await fetch(url);
      const data = await response.json();
      setRatings(data);
    } catch (error) {
      console.error('خطأ في جلب التقييمات:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string, approved: boolean) => {
    try {
      const response = await fetch(`/api/ratings/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved })
      });
      
      if (response.ok) {
        fetchRatings();
      }
    } catch (error) {
      console.error('خطأ في تحديث التقييم:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التقييم؟')) return;
    
    try {
      const response = await fetch(`/api/ratings/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchRatings();
      }
    } catch (error) {
      console.error('خطأ في حذف التقييم:', error);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={`${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">إدارة التقييمات والمراجعات</h1>
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            المعتمد
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'pending' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            في الانتظار
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العميل</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التقييم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التعليق</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">جاري التحميل...</td>
                </tr>
              ) : ratings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    لا توجد تقييمات
                  </td>
                </tr>
              ) : (
                ratings.map((rating) => (
                  <tr key={rating.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{rating.customerName}</div>
                        {rating.customerPhone && (
                          <div className="text-sm text-gray-500">{rating.customerPhone}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {renderStars(rating.rating)}
                        <span className="text-sm text-gray-600">({rating.rating}/5)</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={rating.comment}>
                        {rating.comment || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          rating.isApproved
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {rating.isApproved ? 'معتمد' : 'في الانتظار'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(rating.createdAt).toLocaleDateString('ar')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {!rating.isApproved && (
                          <button
                            onClick={() => handleApprove(rating.id, true)}
                            className="text-green-600 hover:text-green-900"
                            title="اعتماد"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        {rating.isApproved && (
                          <button
                            onClick={() => handleApprove(rating.id, false)}
                            className="text-orange-600 hover:text-orange-900"
                            title="إلغاء الاعتماد"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(rating.id)}
                          className="text-red-600 hover:text-red-900"
                          title="حذف"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">إجمالي التقييمات</h3>
          <p className="text-3xl font-bold text-blue-600">{ratings.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">التقييمات المعتمدة</h3>
          <p className="text-3xl font-bold text-green-600">
            {ratings.filter(r => r.isApproved).length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">في انتظار الاعتماد</h3>
          <p className="text-3xl font-bold text-orange-600">
            {ratings.filter(r => !r.isApproved).length}
          </p>
        </div>
      </div>
    </div>
  );
}