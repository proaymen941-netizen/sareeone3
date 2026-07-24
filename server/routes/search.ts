import express from "express";
import { dbStorage } from "../db.js";
import * as schema from "../../shared/schema.js";
import { eq, like, and, or, sql } from "drizzle-orm";

const router = express.Router();

// البحث العام
router.get("/", async (req, res) => {
  try {
    const { q: query, category } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    const searchTerm = `%${query}%`;
    
    // البحث في المطاعم
    const restaurants = await dbStorage.searchRestaurants(searchTerm, category as string);
    
    // البحث في التصنيفات
    const categories = await dbStorage.searchCategories(searchTerm);
    
    // البحث في عناصر القوائم
    const menuItems = await dbStorage.searchMenuItems(searchTerm);

    res.json({
      restaurants,
      categories,
      menuItems,
      total: restaurants.length + categories.length + menuItems.length
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// الحصول على المطاعم
router.get("/restaurants", async (req, res) => {
  try {
    const { categoryId, area, isOpen } = req.query;
    const restaurants = await dbStorage.getRestaurants({
      categoryId: categoryId as string,
      area: area as string,
      isOpen: isOpen === 'true'
    });
    res.json(restaurants);
  } catch (error) {
    console.error("Get restaurants error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// الحصول على التصنيفات
router.get("/categories", async (req, res) => {
  try {
    const categories = await dbStorage.getCategories();
    res.json(categories);
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// الحصول على قائمة مطعم
router.get("/restaurants/:restaurantId/menu", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const menuItems = await dbStorage.getMenuItems(restaurantId);
    res.json(menuItems);
  } catch (error) {
    console.error("Get menu items error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// الحصول على مطاعم تصنيف معين
router.get("/categories/:categoryId/restaurants", async (req, res) => {
  try {
    const { categoryId } = req.params;
    const restaurants = await dbStorage.getRestaurantsByCategory(categoryId);
    res.json(restaurants);
  } catch (error) {
    console.error("Get restaurants by category error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;