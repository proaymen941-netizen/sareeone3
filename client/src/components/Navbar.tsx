import React from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import type { Category } from '@shared/schema';

export const Navbar: React.FC = () => {
  const [location, setLocation] = useLocation();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const displayCategories = categories.filter(c => c.isActive !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  if (location === '/') {
    return null;
  }

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b overflow-x-auto whitespace-nowrap no-scrollbar sticky top-[64px] md:top-[88px] z-30 transition-all">
      <div className="container mx-auto px-4">
        <ul className="flex items-center justify-center gap-4 md:gap-8 py-2 md:py-3">
          <li>
            <button
              onClick={() => setLocation('/')}
              className={`text-[11px] md:text-[13px] font-black uppercase tracking-tighter transition-all px-4 py-1.5 rounded-full ${
                location === '/' 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              الرئيسية
            </button>
          </li>
          <li>
            <button
              onClick={() => setLocation('/orders')}
              className={`text-[11px] md:text-[13px] font-black uppercase tracking-tighter transition-all px-4 py-1.5 rounded-full ${
                location === '/orders' 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              طلباتي
            </button>
          </li>
          {displayCategories.map((cat) => (
            <li key={cat.id}>
              <button
                onClick={() => setLocation(`/category/${cat.name}`)}
                className={`text-[11px] md:text-[13px] font-black uppercase tracking-tighter transition-all px-4 py-1.5 rounded-full ${
                  location === `/category/${cat.name}` 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
