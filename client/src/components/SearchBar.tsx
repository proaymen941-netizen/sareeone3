import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { searchService } from '../services/searchService';
import { formatCurrency } from '@/lib/utils';
import type { Restaurant, Category, MenuItem } from '../../../shared/schema.js';

interface SearchBarProps {
  onResultSelect?: (type: 'restaurant' | 'category' | 'menuItem', item: any) => void;
  placeholder?: string;
}

export function SearchBar({ onResultSelect, placeholder = "ابحث عن مطاعم، أطباق أو فئات..." }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    restaurants: Restaurant[];
    categories: Category[];
    menuItems: MenuItem[];
  }>({ restaurants: [], categories: [], menuItems: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults({ restaurants: [], categories: [], menuItems: [] });
      setShowResults(false);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const searchResults = await searchService.searchAll(query);
        setResults(searchResults);
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const clearSearch = () => {
    setQuery('');
    setResults({ restaurants: [], categories: [], menuItems: [] });
    setShowResults(false);
  };

  const handleResultClick = (type: 'restaurant' | 'category' | 'menuItem', item: any) => {
    onResultSelect?.(type, item);
    setShowResults(false);
    setQuery('');
  };

  const totalResults = results.restaurants.length + results.categories.length + results.menuItems.length;

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Search Results */}
      {showResults && (
        <div className="absolute top-full right-0 left-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">جاري البحث...</p>
            </div>
          ) : totalResults === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>لم يتم العثور على نتائج</p>
              <p className="text-xs">جرب مصطلحات بحث أخرى</p>
            </div>
          ) : (
            <div className="p-2">
              {/* Categories */}
              {results.categories.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 px-2 mb-2">التصنيفات</h3>
                  {results.categories.map((category) => (
                    <div
                      key={category.id}
                      onClick={() => handleResultClick('category', category)}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 text-xs">{category.icon}</span>
                      </div>
                      <span className="text-sm">{category.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Restaurants */}
              {results.restaurants.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 px-2 mb-2">المطاعم</h3>
                  {results.restaurants.map((restaurant) => (
                    <div
                      key={restaurant.id}
                      onClick={() => handleResultClick('restaurant', restaurant)}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                    >
                      <img
                        src={restaurant.image}
                        alt={restaurant.name}
                        className="w-10 h-10 rounded-lg object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=64&h=64&fit=crop&crop=center';
                        }}
                      />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">{restaurant.name}</h4>
                        <p className="text-xs text-gray-500">{restaurant.deliveryTime}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-yellow-500">⭐</span>
                        <span className="text-xs">{restaurant.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Menu Items */}
              {results.menuItems.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 px-2 mb-2">الأطباق</h3>
                  {results.menuItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleResultClick('menuItem', item)}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-10 h-10 rounded-lg object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=64&h=64&fit=crop&crop=center';
                        }}
                      />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">{item.name}</h4>
                        <p className="text-xs text-gray-500">{item.category}</p>
                      </div>
                      <span className="text-sm font-semibold text-red-500">{formatCurrency(item.price)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}