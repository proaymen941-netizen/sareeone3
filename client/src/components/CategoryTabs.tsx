import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import type { Category } from '@shared/schema';

interface CategoryTabsProps {
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
}

export default function CategoryTabs({ selectedCategory, onCategoryChange }: CategoryTabsProps) {
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar px-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-muted rounded-full h-10 w-24 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <section className="px-4 mb-6">
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        <Button
          variant={selectedCategory === null ? "default" : "secondary"}
          className="whitespace-nowrap font-medium"
          onClick={() => onCategoryChange(null)}
          data-testid="category-tab-all"
        >
          <i className="fas fa-th-large ml-2"></i>
          الكل
        </Button>
        {categories?.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "secondary"}
            className="whitespace-nowrap font-medium"
            onClick={() => onCategoryChange(category.id)}
            data-testid={`category-tab-${category.id}`}
          >
            <i className={`${category.icon} ml-2`}></i>
            {category.name}
          </Button>
        ))}
      </div>
    </section>
  );
}
