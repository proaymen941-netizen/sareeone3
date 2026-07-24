import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { 
  UtensilsCrossed, 
  Star, 
  Heart,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Restaurant, Category, SpecialOffer } from '@shared/schema';
import CategoryTabs from '@/components/CategoryTabs';

export default function Home() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0);

  // Fetch data from database
  const { data: restaurants, isLoading: restaurantsLoading } = useQuery<Restaurant[]>({
    queryKey: ['/api/restaurants'],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: offers, isLoading: offersLoading } = useQuery<SpecialOffer[]>({
    queryKey: ['/api/special-offers'],
  });

  // Filter restaurants based on selected category
  const filteredRestaurants = restaurants?.filter(restaurant => {
    if (!selectedCategory) return true;
    return restaurant.categoryId === selectedCategory;
  }) || [];

  const handleRestaurantClick = (restaurantId: string) => {
    setLocation(`/restaurant/${restaurantId}`);
  };

  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
  };

  // Filter active offers
  const activeOffers = offers?.filter(offer => offer.isActive) || [];

  const nextOffer = () => {
    if (activeOffers.length > 1) {
      setCurrentOfferIndex((prev) => (prev + 1) % activeOffers.length);
    }
  };

  const prevOffer = () => {
    if (activeOffers.length > 1) {
      setCurrentOfferIndex((prev) => (prev - 1 + activeOffers.length) % activeOffers.length);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Main Content */}
      <main className="p-4">
        {/* Category Tabs */}
        <CategoryTabs 
          selectedCategory={selectedCategory} 
          onCategoryChange={handleCategoryChange}
        />

        {/* Special Offers Section */}
        {activeOffers.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-bold mb-4 text-right">العروض الخاصة</h2>
            <div className="relative">
              <div className="overflow-hidden rounded-2xl">
                <div 
                  className="flex transition-transform duration-300 ease-in-out"
                  style={{ transform: `translateX(-${currentOfferIndex * 100}%)` }}
                >
                  {activeOffers.map((offer, index) => (
                    <div key={offer.id} className="w-full flex-shrink-0">
                      <div className="relative h-40 overflow-hidden rounded-2xl cursor-pointer hover:shadow-lg transition-shadow">
                        {offer.image ? (
                          <img 
                            src={offer.image} 
                            alt={offer.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full orange-gradient" />
                        )}
                        <div className="absolute inset-0 bg-black/30 p-4 text-white flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <Badge className="bg-white/20 text-white hover:bg-white/30">
                              عرض خاص
                            </Badge>
                            {offer.discountPercent && (
                              <Badge className="bg-red-500 text-white">
                                خصم {offer.discountPercent}%
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <h3 className="text-lg font-bold mb-1">{offer.title}</h3>
                            <p className="text-sm opacity-90 mb-2">{offer.description}</p>
                            {offer.minimumOrder && parseFloat(offer.minimumOrder) > 0 && (
                              <p className="text-xs bg-white/20 inline-block px-2 py-1 rounded">
                                الحد الأدنى: {offer.minimumOrder} ريال
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Navigation arrows */}
              {activeOffers.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-white/80 hover:bg-white z-10"
                    onClick={prevOffer}
                    data-testid="button-prev-offer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-white/80 hover:bg-white z-10"
                    onClick={nextOffer}
                    data-testid="button-next-offer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </>
              )}

              {/* Dots indicator */}
              {activeOffers.length > 1 && (
                <div className="flex justify-center mt-3 gap-2">
                  {activeOffers.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentOfferIndex ? 'bg-primary' : 'bg-gray-300'
                      }`}
                      onClick={() => setCurrentOfferIndex(index)}
                      data-testid={`indicator-offer-${index}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Restaurants Section */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-right">المطاعم</h2>
          
          {/* Loading state */}
          {restaurantsLoading && (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="flex p-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-xl animate-pulse mr-4" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Restaurant Cards */}
          <div className="space-y-4">
            {filteredRestaurants.map((restaurant) => (
              <div 
                key={restaurant.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleRestaurantClick(restaurant.id)}
                data-testid={`card-restaurant-${restaurant.id}`}
              >
                <div className="flex p-4">
                  {/* Restaurant Logo/Image */}
                  <div className="w-16 h-16 bg-gray-100 rounded-xl flex-shrink-0 flex items-center justify-center mr-4">
                    {restaurant.image ? (
                      <img 
                        src={restaurant.image} 
                        alt={restaurant.name} 
                        className="w-full h-full object-cover rounded-xl" 
                      />
                    ) : (
                      <UtensilsCrossed className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  
                  {/* Restaurant Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 
                          className="font-semibold text-gray-900 text-sm mb-1"
                          data-testid={`text-restaurant-name-${restaurant.id}`}
                        >
                          {restaurant.name}
                        </h4>
                        <p 
                          className="text-xs text-gray-600 mb-2"
                          data-testid={`text-restaurant-description-${restaurant.id}`}
                        >
                          {restaurant.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span data-testid={`text-delivery-time-${restaurant.id}`}>
                            {restaurant.deliveryTime}
                          </span>
                          {restaurant.deliveryFee && parseFloat(restaurant.deliveryFee) > 0 && (
                            <>
                              <span>•</span>
                              <span data-testid={`text-delivery-fee-${restaurant.id}`}>
                                رسوم التوصيل: {restaurant.deliveryFee} ريال
                              </span>
                            </>
                          )}
                          {(!restaurant.deliveryFee || parseFloat(restaurant.deliveryFee) === 0) && (
                            <>
                              <span>•</span>
                              <span data-testid={`text-free-delivery-${restaurant.id}`}>
                                توصيل مجاني
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Rating and Actions */}
                      <div className="text-left flex flex-col items-end">
                        <div className="flex items-center gap-1 mb-2">
                          <span 
                            className="text-xs font-medium"
                            data-testid={`text-rating-${restaurant.id}`}
                          >
                            {restaurant.rating}
                          </span>
                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                        </div>
                        <Badge 
                          className={restaurant.isOpen && !restaurant.isTemporarilyClosed 
                            ? 'bg-green-600 text-white hover:bg-green-700' 
                            : 'bg-red-600 text-white hover:bg-red-700'
                          }
                          data-testid={`status-restaurant-${restaurant.id}`}
                        >
                          {restaurant.isOpen && !restaurant.isTemporarilyClosed ? 'مفتوح' : 'مغلق'}
                        </Badge>
                        <Heart 
                          className="h-4 w-4 text-gray-400 cursor-pointer hover:text-red-500 mt-2" 
                          data-testid={`button-favorite-${restaurant.id}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Empty state */}
          {!restaurantsLoading && (!filteredRestaurants || filteredRestaurants.length === 0) && (
            <div className="text-center py-8" data-testid="empty-state-restaurants">
              <UtensilsCrossed className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">لا توجد مطاعم</h3>
              <p className="text-gray-500">
                {selectedCategory 
                  ? 'لا توجد مطاعم متاحة في هذا التصنيف حالياً' 
                  : 'لا توجد مطاعم متاحة حالياً'
                }
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}