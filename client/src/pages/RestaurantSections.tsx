import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

interface RestaurantSection {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

interface Restaurant {
  id: string;
  name: string;
}

export default function RestaurantSections() {
  const [sections, setSections] = useState<RestaurantSection[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sortOrder: 0
  });

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchSections();
    }
  }, [selectedRestaurant]);

  const fetchRestaurants = async () => {
    try {
      const response = await fetch('/api/restaurants');
      const data = await response.json();
      setRestaurants(data);
      
      // Auto-select Tamtom store
      if (data.length > 0) {
        const tamtomStore = data.find((r: any) => r.name.includes('السريع ون')) || data[0];
        setSelectedRestaurant(tamtomStore.id);
      }
    } catch (error) {
      console.error('خطأ في جلب المتاجر:', error);
    }
  };

  const fetchSections = async () => {
    if (!selectedRestaurant) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/restaurants/${selectedRestaurant}/sections`);
      const data = await response.json();
      setSections(data);
    } catch (error) {
      console.error('خطأ في جلب الأقسام:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedRestaurant) return;
    
    try {
      const response = await fetch(`/api/restaurants/${selectedRestaurant}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        setFormData({ name: '', description: '', sortOrder: 0 });
        setShowAddForm(false);
        fetchSections();
      }
    } catch (error) {
      console.error('خطأ في إضافة القسم:', error);
    }
  };

  const handleUpdate = async (id: string, data: Partial<RestaurantSection>) => {
    try {
      const response = await fetch(`/api/restaurant-sections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        setEditingId(null);
        fetchSections();
      }
    } catch (error) {
      console.error('خطأ في تحديث القسم:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
    
    try {
      const response = await fetch(`/api/restaurant-sections/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchSections();
      }
    } catch (error) {
      console.error('خطأ في حذف القسم:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">إدارة أقسام المطاعم</h1>
        <button
          onClick={() => setShowAddForm(true)}
          disabled={!selectedRestaurant}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={20} />
          إضافة قسم
        </button>
      </div>

      {/* Restaurant Selection */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
        <label className="block text-sm font-bold mb-2">
          المتجر الحالي
        </label>
        <select
          value={selectedRestaurant}
          onChange={(e) => setSelectedRestaurant(e.target.value)}
          className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary ${restaurants.length <= 1 ? 'bg-gray-50 cursor-not-allowed' : ''}`}
          disabled={restaurants.length <= 1}
        >
          {restaurants.map(restaurant => (
            <option key={restaurant.id} value={restaurant.id}>
              {restaurant.name}
            </option>
          ))}
        </select>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold mb-4">إضافة قسم جديد</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="اسم القسم"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="p-3 border border-gray-300 rounded-lg"
            />
            <input
              type="text"
              placeholder="الوصف (اختياري)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="p-3 border border-gray-300 rounded-lg"
            />
            <input
              type="number"
              placeholder="ترتيب العرض"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
              className="p-3 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAdd}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
            >
              <Save size={20} />
              حفظ
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700"
            >
              <X size={20} />
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Sections List */}
      {selectedRestaurant && (
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الوصف</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الترتيب</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center">جاري التحميل...</td>
                  </tr>
                ) : sections.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      لا توجد أقسام لهذا المطعم
                    </td>
                  </tr>
                ) : (
                  sections.map((section) => (
                    <tr key={section.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingId === section.id ? (
                          <input
                            type="text"
                            defaultValue={section.name}
                            className="w-full p-2 border border-gray-300 rounded"
                            onBlur={(e) => handleUpdate(section.id, { name: e.target.value })}
                          />
                        ) : (
                          <div className="text-sm font-medium text-gray-900">{section.name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingId === section.id ? (
                          <input
                            type="text"
                            defaultValue={section.description || ''}
                            className="w-full p-2 border border-gray-300 rounded"
                            onBlur={(e) => handleUpdate(section.id, { description: e.target.value })}
                          />
                        ) : (
                          <div className="text-sm text-gray-500">{section.description || '-'}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingId === section.id ? (
                          <input
                            type="number"
                            defaultValue={section.sortOrder}
                            className="w-20 p-2 border border-gray-300 rounded"
                            onBlur={(e) => handleUpdate(section.id, { sortOrder: parseInt(e.target.value) })}
                          />
                        ) : (
                          <span className="text-sm text-gray-900">{section.sortOrder}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleUpdate(section.id, { isActive: !section.isActive })}
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            section.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {section.isActive ? 'نشط' : 'غير نشط'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingId(editingId === section.id ? null : section.id)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(section.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 size={16} />
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
      )}
    </div>
  );
}