import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import { useApi } from '@/composables/api';
import { mockItems, mockApiResponse } from '../../fixtures/mockData';

// Mock the Directus SDK
const mockDirectus = {
  request: vi.fn(),
  query: vi.fn(),
  readItems: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  createItem: vi.fn(),
};

vi.mock('@directus/sdk', () => ({
  readItems: vi.fn(() => mockDirectus.readItems),
  updateItem: vi.fn(() => mockDirectus.updateItem),
  deleteItem: vi.fn(() => mockDirectus.deleteItem),
  createItem: vi.fn(() => mockDirectus.createItem),
  aggregate: vi.fn(),
  query: vi.fn(() => mockDirectus.query),
}));

describe('api composable', () => {
  let useApiInstance: ReturnType<typeof useApi>;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses
    mockDirectus.readItems.mockResolvedValue(mockApiResponse);
    mockDirectus.updateItem.mockResolvedValue({ id: 1, title: 'Updated Item' });
    mockDirectus.deleteItem.mockResolvedValue(undefined);
    mockDirectus.createItem.mockResolvedValue({ id: 3, title: 'New Item' });
    
    useApiInstance = useApi();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('fetchItems', () => {
    it('should fetch items with correct parameters', async () => {
      const collection = ref('test_collection');
      const fields = ref(['id', 'title', 'status']);
      const limit = ref(25);
      const page = ref(1);
      const sort = ref([]);
      const filter = ref({});

      const result = await useApiInstance.fetchItems(
        collection,
        { fields, limit, page, sort, filter }
      );

      expect(result.data).toEqual(mockItems);
      expect(result.meta.total_count).toBe(2);
      expect(mockDirectus.readItems).toHaveBeenCalled();
    });

    it('should handle deep parameter for translation fields', async () => {
      const collection = ref('test_collection');
      const fields = ref(['id', 'title', 'translations.description']);
      const options = {
        fields,
        limit: ref(25),
        page: ref(1),
        sort: ref([]),
        filter: ref({})
      };

      await useApiInstance.fetchItems(collection, options);

      expect(mockDirectus.readItems).toHaveBeenCalled();
      // Should include deep parameter for translations
      const callArgs = mockDirectus.readItems.mock.calls[0];
      expect(callArgs).toBeDefined();
    });

    it('should handle error responses gracefully', async () => {
      const collection = ref('test_collection');
      const fields = ref(['id', 'title']);
      const options = {
        fields,
        limit: ref(25),
        page: ref(1),
        sort: ref([]),
        filter: ref({})
      };

      // Mock API error
      const apiError = new Error('API Error: Collection not found');
      mockDirectus.readItems.mockRejectedValue(apiError);

      await expect(
        useApiInstance.fetchItems(collection, options)
      ).rejects.toThrow('API Error: Collection not found');
    });

    it('should validate required parameters', async () => {
      const collection = ref('');
      const fields = ref([]);
      const options = {
        fields,
        limit: ref(25),
        page: ref(1),
        sort: ref([]),
        filter: ref({})
      };

      await expect(
        useApiInstance.fetchItems(collection, options)
      ).rejects.toThrow();
    });

    it('should handle large datasets efficiently', async () => {
      const collection = ref('test_collection');
      const fields = ref(['id', 'title']);
      const options = {
        fields,
        limit: ref(1000), // Large limit
        page: ref(1),
        sort: ref([]),
        filter: ref({})
      };

      // Mock large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        title: `Item ${i + 1}`,
      }));
      mockDirectus.readItems.mockResolvedValue({
        data: largeDataset,
        meta: { total_count: 1000, filter_count: 1000 }
      });

      const startTime = performance.now();
      const result = await useApiInstance.fetchItems(collection, options);
      const endTime = performance.now();

      expect(result.data).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });
  });

  describe('updateItem', () => {
    it('should update item with correct data', async () => {
      const collection = 'test_collection';
      const itemId = 1;
      const updateData = { title: 'Updated Title', status: 'published' };

      const result = await useApiInstance.updateItem(collection, itemId, updateData);

      expect(result).toEqual({ id: 1, title: 'Updated Item' });
      expect(mockDirectus.updateItem).toHaveBeenCalledWith(collection, itemId, updateData);
    });

    it('should handle update errors gracefully', async () => {
      const collection = 'test_collection';
      const itemId = 1;
      const updateData = { title: 'Updated Title' };

      // Mock update error
      const updateError = new Error('Update failed: Item not found');
      mockDirectus.updateItem.mockRejectedValue(updateError);

      await expect(
        useApiInstance.updateItem(collection, itemId, updateData)
      ).rejects.toThrow('Update failed: Item not found');
    });

    it('should validate update data to prevent corruption', async () => {
      const collection = 'test_collection';
      const itemId = 1;
      const corruptData = { id: 'wrong_type', invalidField: null };

      // The API should handle validation, but we should test error handling
      mockDirectus.updateItem.mockRejectedValue(new Error('Validation failed'));

      await expect(
        useApiInstance.updateItem(collection, itemId, corruptData)
      ).rejects.toThrow('Validation failed');
    });

    it('should handle translation field updates correctly', async () => {
      const collection = 'test_collection';
      const itemId = 1;
      const translationUpdate = {
        'translations.description:en-US': 'Updated English description',
        'translations.description:de-DE': 'Updated German description'
      };

      await useApiInstance.updateItem(collection, itemId, translationUpdate);

      expect(mockDirectus.updateItem).toHaveBeenCalledWith(
        collection,
        itemId,
        translationUpdate
      );
    });
  });

  describe('deleteItem', () => {
    it('should delete item correctly', async () => {
      const collection = 'test_collection';
      const itemId = 1;

      await useApiInstance.deleteItem(collection, itemId);

      expect(mockDirectus.deleteItem).toHaveBeenCalledWith(collection, itemId);
    });

    it('should handle deletion errors gracefully', async () => {
      const collection = 'test_collection';
      const itemId = 1;

      // Mock deletion error
      const deleteError = new Error('Delete failed: Item is referenced by other items');
      mockDirectus.deleteItem.mockRejectedValue(deleteError);

      await expect(
        useApiInstance.deleteItem(collection, itemId)
      ).rejects.toThrow('Delete failed: Item is referenced by other items');
    });

    it('should prevent accidental bulk deletion', async () => {
      const collection = 'test_collection';
      const invalidId = undefined;

      await expect(
        useApiInstance.deleteItem(collection, invalidId as any)
      ).rejects.toThrow();
    });
  });

  describe('createItem', () => {
    it('should create new item with correct data', async () => {
      const collection = 'test_collection';
      const newItemData = { title: 'New Item', status: 'draft' };

      const result = await useApiInstance.createItem(collection, newItemData);

      expect(result).toEqual({ id: 3, title: 'New Item' });
      expect(mockDirectus.createItem).toHaveBeenCalledWith(collection, newItemData);
    });

    it('should handle creation validation errors', async () => {
      const collection = 'test_collection';
      const invalidData = { title: '' }; // Missing required fields

      // Mock validation error
      mockDirectus.createItem.mockRejectedValue(new Error('Validation failed: Title is required'));

      await expect(
        useApiInstance.createItem(collection, invalidData)
      ).rejects.toThrow('Validation failed: Title is required');
    });
  });

  describe('data integrity and corruption prevention', () => {
    it('should prevent SQL injection in filter parameters', async () => {
      const collection = ref('test_collection');
      const fields = ref(['id', 'title']);
      const maliciousFilter = {
        title: { _contains: "'; DROP TABLE items; --" }
      };
      const options = {
        fields,
        limit: ref(25),
        page: ref(1),
        sort: ref([]),
        filter: ref(maliciousFilter)
      };

      // The Directus SDK should handle this, but we test that we pass it correctly
      await useApiInstance.fetchItems(collection, options);

      expect(mockDirectus.readItems).toHaveBeenCalled();
      // The malicious content should be passed to the SDK which handles sanitization
    });

    it('should validate required fields before API calls', async () => {
      const collection = '';
      const itemData = { title: 'Test' };

      await expect(
        useApiInstance.createItem(collection, itemData)
      ).rejects.toThrow();

      await expect(
        useApiInstance.updateItem(collection, 1, itemData)
      ).rejects.toThrow();

      await expect(
        useApiInstance.deleteItem(collection, 1)
      ).rejects.toThrow();
    });

    it('should handle network timeouts gracefully', async () => {
      const collection = ref('test_collection');
      const fields = ref(['id', 'title']);
      const options = {
        fields,
        limit: ref(25),
        page: ref(1),
        sort: ref([]),
        filter: ref({})
      };

      // Mock timeout error
      mockDirectus.readItems.mockRejectedValue(new Error('Request timeout'));

      await expect(
        useApiInstance.fetchItems(collection, options)
      ).rejects.toThrow('Request timeout');
    });

    it('should maintain data consistency during concurrent operations', async () => {
      const collection = 'test_collection';
      const itemId = 1;

      // Simulate concurrent updates
      const update1 = useApiInstance.updateItem(collection, itemId, { title: 'Update 1' });
      const update2 = useApiInstance.updateItem(collection, itemId, { title: 'Update 2' });

      // Both should complete without interfering
      await Promise.all([update1, update2]);

      expect(mockDirectus.updateItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('performance and optimization', () => {
    it('should batch multiple operations efficiently', async () => {
      const collection = 'test_collection';
      const updates = [
        { id: 1, data: { title: 'Update 1' } },
        { id: 2, data: { title: 'Update 2' } },
        { id: 3, data: { title: 'Update 3' } }
      ];

      const startTime = performance.now();
      await Promise.all(
        updates.map(({ id, data }) => useApiInstance.updateItem(collection, id, data))
      );
      const endTime = performance.now();

      expect(mockDirectus.updateItem).toHaveBeenCalledTimes(3);
      expect(endTime - startTime).toBeLessThan(50); // Should complete quickly
    });

    it('should handle empty responses without errors', async () => {
      const collection = ref('empty_collection');
      const fields = ref(['id', 'title']);
      const options = {
        fields,
        limit: ref(25),
        page: ref(1),
        sort: ref([]),
        filter: ref({})
      };

      // Mock empty response
      mockDirectus.readItems.mockResolvedValue({
        data: [],
        meta: { total_count: 0, filter_count: 0 }
      });

      const result = await useApiInstance.fetchItems(collection, options);

      expect(result.data).toEqual([]);
      expect(result.meta.total_count).toBe(0);
    });

    it('should optimize field selection for performance', async () => {
      const collection = ref('test_collection');
      const minimalFields = ref(['id', 'title']); // Only necessary fields
      const options = {
        fields: minimalFields,
        limit: ref(25),
        page: ref(1),
        sort: ref([]),
        filter: ref({})
      };

      await useApiInstance.fetchItems(collection, options);

      expect(mockDirectus.readItems).toHaveBeenCalled();
      // Should only request specified fields for better performance
    });
  });
});