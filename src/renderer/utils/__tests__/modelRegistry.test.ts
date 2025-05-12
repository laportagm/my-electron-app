import { describe, it, expect, vi } from 'vitest';
import { 
  brainModels, 
  getModelById, 
  getCategories, 
  getDifficultyLevels,
  getModelsByCategory 
} from '../modelRegistry';

// Mock the validateAssets function from assetManager
vi.mock('../assetManager', () => ({
  validateAssets: vi.fn().mockResolvedValue({ valid: true, missing: [] }),
}));

describe('modelRegistry', () => {
  describe('brainModels', () => {
    it('should contain a list of brain models', () => {
      expect(brainModels).toBeDefined();
      expect(Array.isArray(brainModels)).toBe(true);
      expect(brainModels.length).toBeGreaterThan(0);
    });

    it('should have the required properties for each model', () => {
      brainModels.forEach(model => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('description');
        // Optional properties
        if ('category' in model) {
          expect(typeof model.category).toBe('string');
        }
        if ('difficulty' in model) {
          expect(['beginner', 'intermediate', 'advanced']).toContain(model.difficulty);
        }
      });
    });
  });

  describe('getModelById', () => {
    it('should return a model by id', () => {
      const firstModel = brainModels[0];
      if (!firstModel) {
        expect(brainModels.length).toBeGreaterThan(0);
        return;
      }
      const result = getModelById(firstModel.id);
      expect(result).toEqual(firstModel);
    });

    it('should return undefined for non-existent model', () => {
      const result = getModelById('non-existent-id');
      expect(result).toBeUndefined();
    });
  });

  describe('getCategories', () => {
    it('should return unique categories from all models', () => {
      const categories = getCategories();
      expect(Array.isArray(categories)).toBe(true);
      
      // Get unique categories manually to compare
      const uniqueCategories = new Set();
      brainModels.forEach(model => {
        if (model.category) {
          uniqueCategories.add(model.category);
        }
      });
      
      expect(categories.length).toBe(uniqueCategories.size);
      categories.forEach(category => {
        expect(uniqueCategories.has(category)).toBe(true);
      });
    });
  });

  describe('getDifficultyLevels', () => {
    it('should return the three difficulty levels', () => {
      const levels = getDifficultyLevels();
      expect(levels).toEqual(['beginner', 'intermediate', 'advanced']);
    });
  });

  describe('getModelsByCategory', () => {
    it('should return models filtered by category', () => {
      // Get a category that exists in the models
      const category = brainModels.find(m => m.category)?.category;
      if (!category) {
        // Skip test if no models have categories
        return;
      }
      
      const result = getModelsByCategory(category);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // All returned models should have the specified category
      result.forEach(model => {
        expect(model.category).toBe(category);
      });
    });

    it('should return empty array for non-existent category', () => {
      const result = getModelsByCategory('non-existent-category');
      expect(result).toEqual([]);
    });
  });
});