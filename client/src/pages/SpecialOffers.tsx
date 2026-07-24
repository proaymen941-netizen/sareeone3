import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Calendar, Percent, Tag } from 'lucide-react';

interface SpecialOffer {
  id: string;
  title: string;
  description: string;
  image: string;
  discountPercent?: number;
  discountAmount?: string;
  minimumOrder?: string;
  restaurantId?: string;
  validUntil?: string;
  showBadge?: boolean;
  badgeText1?: string;
  badgeText2?: string;
  menuItemId?: string;
  isActive: boolean;
  createdAt: string;
}

interface MenuItem {
  id: string;
  name: string;
  restaurantId: string;
}

interface Restaurant {
  id: string;
  name: string;
}

export default function SpecialOffers() {
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '',
    discountPercent: '',
    minimumOrder: '0',
    restaurantId: '',
    menuItemId: '',
    badgeText1: 'طازج يومياً',
    badgeText2: 'عروض حصرية',
    showBadge: true,
    validUntil: '',
    isActive: true
  });

  useEffect(() => {
    fetchOffers();
    fetchRestaurants();
    fetchMenuItems();
  }, []);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image: '',
      discountPercent: '',
      minimumOrder: '0',
      restaurantId: '',
      menuItemId: '',
      badgeText1: 'طازج يومياً',
      badgeText2: 'عروض حصرية',
      showBadge: true,
      validUntil: '',
      isActive: true
    });
    setEditingId(null);
    setIsEditing(false);
    setShowAddForm(false);
  };

  const handleEdit = (offer: SpecialOffer) => {
    setFormData({
      title: offer.title,
      description: offer.description,
      image: offer.image,
      discountPercent: offer.discountPercent?.toString() || '',
      minimumOrder: offer.minimumOrder || '0',
      restaurantId: offer.restaurantId || '',
      menuItemId: offer.menuItemId || '',
      badgeText1: offer.badgeText1 || 'طازج يومياً',
      badgeText2: offer.badgeText2 || 'عروض حصرية',
      showBadge: offer.showBadge !== false,
      validUntil: offer.validUntil ? new Date(offer.validUntil).toISOString().slice(0, 16) : '',
      isActive: offer.isActive
    });
    setEditingId(offer.id);
    setIsEditing(true);
    setShowAddForm(true);
  };

  const fetchOffers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/special-offers');
      const data = await response.json();
      setOffers(data);
    } catch (error) {
      console.error('خطأ في جلب العروض:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const response = await fetch('/api/restaurants');
      const data = await response.json();
      setRestaurants(data);
    } catch (error) {
      console.error('خطأ في جلب المطاعم:', error);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setMenuItems(data);
    } catch (error) {
      console.error('خطأ في جلب المنتجات:', error);
    }
  };

  const handleSave = async () => {
    try {
      const offerData = {
        ...formData,
        discountPercent: formData.discountPercent ? parseInt(formData.discountPercent) : null,
        minimumOrder: formData.minimumOrder || "0",
        restaurantId: formData.restaurantId || null,
        menuItemId: formData.menuItemId || null,
        validUntil: formData.validUntil || null,
      };

      const url = isEditing ? `/api/special-offers/${editingId}` : '/api/special-offers';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offerData)
      });
      
      if (response.ok) {
        resetForm();
        fetchOffers();
      }
    } catch (error) {
      console.error('خطأ في حفظ العرض:', error);
    }
  };

  const handleUpdate = async (id: string, data: Partial<SpecialOffer>) => {
    try {
      const response = await fetch(`/api/special-offers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        setEditingId(null);
        fetchOffers();
      }
    } catch (error) {
      console.error('خطأ في تحديث العرض:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العرض؟')) return;
    
    try {
      const response = await fetch(`/api/special-offers/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchOffers();
      }
    } catch (error) {
      console.error('خطأ في حذف العرض:', error);
    }
  };

  const getOfferStatus = (offer: SpecialOffer) => {
    const now = new Date();
    const startDate = new Date(offer.startDate);
    const endDate = new Date(offer.endDate);
    
    if (!offer.isActive) return { text: 'غير نشط', color: 'bg-gray-100 text-gray-800' };
    if (now < startDate) return { text: 'لم يبدأ', color: 'bg-yellow-100 text-yellow-800' };
    if (now > endDate) return { text: 'منتهي', color: 'bg-red-100 text-red-800' };
    return { text: 'نشط', color: 'bg-green-100 text-green-800' };
  };

  const getRestaurantName = (restaurantId: string) => {
    const restaurant = restaurants.find(r => r.id === restaurantId);
    return restaurant ? restaurant.name : 'غير معروف';
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">إدارة العروض الخاصة</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={20} />
          إضافة عرض
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold mb-4">{isEditing ? 'تعديل عرض خاص' : 'إضافة عرض خاص جديد'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* ... الحقول الحالية ... */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">عنوان العرض *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="مثال: خصم الجمعة الذهبية"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">صورة العرض (رابط) *</label>
              <input
                type="text"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نسبة الخصم (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.discountPercent}
                onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="20"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأدنى للطلب</label>
              <input
                type="number"
                min="0"
                value={formData.minimumOrder}
                onChange={(e) => setFormData({ ...formData, minimumOrder: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نص الباقة 1</label>
              <input
                type="text"
                value={formData.badgeText1}
                onChange={(e) => setFormData({ ...formData, badgeText1: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="طازج يومياً"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نص الباقة 2</label>
              <input
                type="text"
                value={formData.badgeText2}
                onChange={(e) => setFormData({ ...formData, badgeText2: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="عروض حصرية"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المنتج المستهدف (لزر تسوق الآن)</label>
              <select
                value={formData.menuItemId}
                onChange={(e) => setFormData({ ...formData, menuItemId: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value="">اختر منتجاً</option>
                {menuItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المتجر</label>
              <select
                value={formData.restaurantId}
                onChange={(e) => setFormData({ ...formData, restaurantId: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value="">اختر متجراً</option>
                {restaurants.map(restaurant => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">صالح حتى</label>
              <input
                type="datetime-local"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">تفعيل العرض</label>
            </div>
            
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">وصف العرض *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="وصف تفصيلي للعرض وشروطه..."
              />
            </div>
          </div>
          
          <div className="flex gap-2 mt-6">
            <button
              onClick={handleSave}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
            >
              <Save size={20} />
              {isEditing ? 'تحديث العرض' : 'حفظ العرض'}
            </button>
            <button
              onClick={resetForm}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700"
            >
              <X size={20} />
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Offers List */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الصورة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العرض</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الخصم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الملصقات</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">جاري التحميل...</td>
                </tr>
              ) : offers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    لا توجد عروض خاصة
                  </td>
                </tr>
              ) : (
                offers.map((offer) => {
                  return (
                    <tr key={offer.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <img src={offer.image} alt={offer.title} className="h-12 w-20 object-cover rounded shadow-sm" />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{offer.title}</div>
                          <div className="text-xs text-gray-500 truncate max-w-xs">{offer.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {offer.discountPercent ? (
                          <div className="flex items-center gap-1">
                            <Percent size={16} className="text-green-600" />
                            <span className="text-lg font-bold text-green-600">{offer.discountPercent}%</span>
                          </div>
                        ) : 'بدون خصم'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full w-fit">{offer.badgeText1}</span>
                          <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full w-fit">{offer.badgeText2}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${offer.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {offer.isActive ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleEdit(offer)}
                            className="text-blue-600 hover:text-blue-900"
                            title="تعديل العرض"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleUpdate(offer.id, { isActive: !offer.isActive })}
                            className={`${offer.isActive ? 'text-amber-600 hover:text-amber-900' : 'text-green-600 hover:text-green-900'}`}
                            title={offer.isActive ? 'إيقاف مؤقت' : 'تفعيل'}
                          >
                            {offer.isActive ? <X size={18} /> : <Save size={18} />}
                          </button>
                          <button
                            onClick={() => handleDelete(offer.id)}
                            className="text-red-600 hover:text-red-900"
                            title="حذف العرض"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <Tag className="text-blue-600" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">إجمالي العروض</h3>
              <p className="text-2xl font-bold text-blue-600">{offers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <Calendar className="text-green-600" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">عروض نشطة</h3>
              <p className="text-2xl font-bold text-green-600">
                {offers.filter(o => getOfferStatus(o).text === 'نشط').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <Percent className="text-orange-600" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">إجمالي الاستخدام</h3>
              <p className="text-2xl font-bold text-orange-600">
                {offers.reduce((sum, offer) => sum + offer.usageCount, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <X className="text-red-600" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">عروض منتهية</h3>
              <p className="text-2xl font-bold text-red-600">
                {offers.filter(o => getOfferStatus(o).text === 'منتهي').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}