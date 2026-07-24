import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, MapPin } from 'lucide-react';
import type { Restaurant } from '@shared/schema';
import { getRestaurantStatus } from '../utils/restaurantHours';
import { useUiSettings } from '@/context/UiSettingsContext';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onClick: () => void;
}

export default function RestaurantCard({ restaurant, onClick }: RestaurantCardProps) {
  const status = getRestaurantStatus(restaurant);
  const { isFeatureEnabled } = useUiSettings();
  
  return (
    <Card 
      className={`group relative overflow-hidden rounded-xl border-0 bg-white dark:bg-gray-900 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 ${!status.isOpen ? 'opacity-80' : ''}`}
      onClick={onClick}
      data-testid={`restaurant-card-${restaurant.id}`}
    >
      {/* Image Container with Overlay */}
      <div className="relative h-52 overflow-hidden">
        <img
          src={restaurant.image}
          alt={restaurant.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        
        {/* Status Badge - Positioned on Image */}
        <div className="absolute top-3 left-3">
          <Badge 
            className={`px-3 py-1 text-xs font-medium rounded-full backdrop-blur-sm border-0 ${
              status.statusColor === 'green' 
                ? 'bg-emerald-500/90 text-white shadow-lg' 
                : status.statusColor === 'yellow'
                ? 'bg-amber-500/90 text-white shadow-lg'
                : 'bg-red-500/90 text-white shadow-lg'
            }`}
            data-testid={`restaurant-status-${restaurant.id}`}
          >
            {status.isOpen ? '🟢 مفتوح' : '🔴 مغلق'}
          </Badge>
        </div>

        {/* Featured Badge */}
        {restaurant.isFeatured && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-orange-500/90 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm border-0 shadow-lg">
              ⭐ مميز
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="space-y-2">
          <h4 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-1 group-hover:text-orange-600 transition-colors" data-testid={`restaurant-name-${restaurant.id}`}>
            {restaurant.name}
          </h4>
          
          {/* Restaurant description */}
          {isFeatureEnabled('show_restaurant_description') && restaurant.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
              {restaurant.description}
            </p>
          )}
        </div>

        {/* Status Message */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            status.statusColor === 'green' ? 'bg-emerald-400' : 
            status.statusColor === 'yellow' ? 'bg-amber-400' : 'bg-red-400'
          }`} />
          <p className={`text-sm font-medium ${
            status.statusColor === 'green' ? 'text-emerald-600 dark:text-emerald-400' : 
            status.statusColor === 'yellow' ? 'text-amber-600 dark:text-amber-400' : 
            'text-red-600 dark:text-red-400'
          }`}>
            {status.message}
          </p>
        </div>
        
        {/* Metrics Row */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            {isFeatureEnabled('show_ratings') && (
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                <span className="font-medium text-gray-900 dark:text-white" data-testid={`restaurant-rating-${restaurant.id}`}>
                  {restaurant.rating}
                </span>
                <span className="text-xs">({restaurant.reviewCount})</span>
              </div>
            )}
            
            {isFeatureEnabled('show_delivery_time') && (
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                <Clock className="h-4 w-4" />
                <span data-testid={`restaurant-delivery-time-${restaurant.id}`}>
                  {restaurant.deliveryTime}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer Info */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="space-y-1">
            {isFeatureEnabled('show_minimum_order') && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span>الحد الأدنى: <span className="font-medium text-gray-700 dark:text-gray-300">{restaurant.minimumOrder} ريال</span></span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
              {restaurant.deliveryFee} ريال
            </span>
          </div>
        </div>

        {/* New Badge for new restaurants */}
        {restaurant.isNew && (
          <div className="absolute top-16 right-3">
            <Badge className="bg-blue-500/90 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm border-0 shadow-lg">
              جديد
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
