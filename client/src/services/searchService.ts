export const searchService = {
  async searchAll(query: string) {
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return await response.json();
    } catch (error) {
      console.error('خطأ في البحث:', error);
      return { restaurants: [], categories: [], menuItems: [] };
    }
  }
};