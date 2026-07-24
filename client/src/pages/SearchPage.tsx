import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import RestaurantCard from '../components/RestaurantCard';
import MenuItemCard from '../components/MenuItemCard';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import type { Restaurant, Category, MenuItem } from '../../../shared/schema.js';

export default function SearchPage() {
  const [location] = useLocation();
  const [selectedTab, setSelectedTab] = useState<'all' | 'categories' | 'menuItems'>('all');
  const [searchResults, setSearchResults] = useState<{
    categories: Category[];
    menuItems: MenuItem[];
  }>({ categories: [], menuItems: [] });
  const [hasSearched, setHasSearched] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Extract query from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    if (query) {
      setInputValue(query);
      handleSearch(query);
    }
  }, [window.location.search]);

  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults({ categories: [], menuItems: [] });
      setHasSearched(false);
      return;
    }

    setHasSearched(true);
    
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults({
        categories: data.categories || [],
        menuItems: data.menuItems || []
      });
    } catch (error) {
      console.error('خطأ في البحث:', error);
    }
  };

  const totalResults = searchResults.categories.length + searchResults.menuItems.length;

  const tabs = [
    { id: 'all', label: 'الكل', count: totalResults },
    { id: 'categories', label: 'التصنيفات', count: searchResults.categories.length },
    { id: 'menuItems', label: 'المنتجات', count: searchResults.menuItems.length },
  ];

  const filteredCategories = selectedTab === 'all' || selectedTab === 'categories' ? searchResults.categories : [];
  const filteredMenuItems = selectedTab === 'all' || selectedTab === 'menuItems' ? searchResults.menuItems : [];

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      {/* Content */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 flex flex-col items-center">
          <h1 className="text-4xl font-black mb-2 uppercase tracking-tighter">نتائج البحث</h1>
          <p className="text-gray-500 font-bold italic">عن: "{inputValue}"</p>
          <div className="h-1.5 w-24 bg-primary rounded-full mt-4" />
        </div>

        {hasSearched && (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={selectedTab === tab.id ? "default" : "outline"}
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => setSelectedTab(tab.id as any)}
                >
                  {tab.label} ({tab.count})
                </Button>
              ))}
            </div>

            {/* Results */}
            {totalResults === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-medium mb-2">لا توجد نتائج</h3>
                <p className="text-muted-foreground">جرب البحث بكلمات مختلفة</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Categories */}
                {filteredCategories.length > 0 && (
                  <div>
                    {selectedTab === 'all' && <h2 className="text-md font-semibold mb-3">التصنيفات</h2>}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {filteredCategories.map((category) => (
                        <div
                          key={category.id}
                          className="flex flex-col items-center p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-all"
                          onClick={() => window.location.href = `/?category=${category.id}`}
                        >
                          <div className="w-16 h-16 rounded-full overflow-hidden mb-2">
                            {category.image ? (
                              <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                                <span className="text-2xl">{category.icon}</span>
                              </div>
                            )}
                          </div>
                          <span className="font-bold text-sm text-center">{category.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Menu Items */}
                {filteredMenuItems.length > 0 && (
                  <div>
                    {selectedTab === 'all' && <h2 className="text-md font-semibold mb-3 mt-8">المنتجات</h2>}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filteredMenuItems.map((item) => (
                        <MenuItemCard 
                          key={item.id} 
                          item={item} 
                          restaurantId={item.restaurantId || ''} 
                          restaurantName="متجر السريع ون"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!hasSearched && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium mb-2">ابحث عما تريد</h3>
            <p className="text-muted-foreground">اكتب في الصندوق أعلاه للبدء في البحث</p>
          </div>
        )}
      </div>
    </div>
  );
}