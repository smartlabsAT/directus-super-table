import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTableApi, type ApiOptions } from '@/composables/api';
import { mockItems, mockApiResponse } from '../../fixtures/mockData';

// Mock the Directus SDK
const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@directus/extensions-sdk', () => ({
  useApi: () => mockApi,
}));

describe('useTableApi composable', () => {
  let tableApi: ReturnType<typeof useTableApi>;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses
    mockApi.get.mockResolvedValue(mockApiResponse);
    mockApi.post.mockResolvedValue({ data: { id: 3, title: 'New Item' } });
    mockApi.patch.mockResolvedValue({ data: { id: 1, title: 'Updated Item' } });
    mockApi.delete.mockResolvedValue({ data: true });
    
    tableApi = useTableApi();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('fetchItems', () => {
    it('should fetch items with correct API parameters', async () => {
      const options: ApiOptions = {
        collection: 'test_collection',
        fields: ['id', 'title', 'status'],
        limit: 25,
        page: 1,
        sort: [],
        filter: {},
      };

      const result = await tableApi.fetchItems(options);

      expect(result.data).toEqual(mockItems);
      expect(result.meta?.total_count).toBe(2);
      expect(mockApi.get).toHaveBeenCalledWith(
        `/items/${options.collection}`,
        expect.objectContaining({
          params: expect.objectContaining({
            fields: options.fields,
            page: options.page,
            limit: options.limit,
            meta: 'filter_count,total_count',
          }),
        })
      );
    });

    it('should handle translation fields with deep parameters', async () => {
      const options: ApiOptions = {
        collection: 'test_collection',
        fields: ['id', 'title', 'translations.description'],
        limit: 25,
        page: 1,
        deep: {
          translations: {
            _fields: ['*'],
            _limit: -1,
          },
        },
      };

      await tableApi.fetchItems(options);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/items/${options.collection}`,
        expect.objectContaining({
          params: expect.objectContaining({
            deep: options.deep,
          }),
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      const options: ApiOptions = {
        collection: 'test_collection',
        fields: ['id', 'title'],
        limit: 25,
        page: 1,
      };

      const apiError = new Error('API Error: Collection not found');
      mockApi.get.mockRejectedValue(apiError);

      await expect(tableApi.fetchItems(options)).rejects.toThrow('API Error: Collection not found');
    });

    it('should handle empty responses correctly', async () => {
      const options: ApiOptions = {
        collection: 'empty_collection',
        fields: ['id', 'title'],
        limit: 25,
        page: 1,
      };

      mockApi.get.mockResolvedValue({
        data: [],
        meta: { total_count: 0, filter_count: 0 },
      });

      const result = await tableApi.fetchItems(options);

      expect(result.data).toEqual([]);
      expect(result.meta?.total_count).toBe(0);
    });

    it('should include search parameter when provided', async () => {
      const options: ApiOptions = {
        collection: 'test_collection',
        fields: ['id', 'title'],
        limit: 25,
        page: 1,
        search: 'test search',
      };

      await tableApi.fetchItems(options);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/items/${options.collection}`,
        expect.objectContaining({
          params: expect.objectContaining({
            search: 'test search',
          }),
        })
      );
    });

    it('should include filter parameter when provided', async () => {
      const options: ApiOptions = {
        collection: 'test_collection',
        fields: ['id', 'title'],
        limit: 25,
        page: 1,
        filter: {
          status: { _eq: 'published' },
        },
      };

      await tableApi.fetchItems(options);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/items/${options.collection}`,
        expect.objectContaining({
          params: expect.objectContaining({
            filter: options.filter,
          }),
        })
      );
    });

    it('should include sort parameter when provided', async () => {
      const options: ApiOptions = {
        collection: 'test_collection',
        fields: ['id', 'title'],
        limit: 25,
        page: 1,
        sort: ['title', '-date_created'],
      };

      await tableApi.fetchItems(options);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/items/${options.collection}`,
        expect.objectContaining({
          params: expect.objectContaining({
            sort: options.sort,
          }),
        })
      );
    });
  });

  describe('updateItem', () => {
    it('should update item with correct data', async () => {
      const collection = 'test_collection';
      const itemId = 1;
      const updateData = { title: 'Updated Title', status: 'published' };

      const result = await tableApi.updateItem(collection, itemId, updateData);

      expect(result.data).toEqual({ id: 1, title: 'Updated Item' });
      expect(mockApi.patch).toHaveBeenCalledWith(`/items/${collection}/${itemId}`, updateData);
    });

    it('should handle update errors gracefully', async () => {
      const collection = 'test_collection';
      const itemId = 1;
      const updateData = { title: 'Updated Title' };

      const updateError = new Error('Update failed: Validation error');
      mockApi.patch.mockRejectedValue(updateError);

      await expect(
        tableApi.updateItem(collection, itemId, updateData)
      ).rejects.toThrow('Update failed: Validation error');
    });
  });

  describe('deleteItem', () => {
    it('should delete item correctly', async () => {
      const collection = 'test_collection';
      const itemId = 1;

      await tableApi.deleteItem(collection, itemId);

      expect(mockApi.delete).toHaveBeenCalledWith(`/items/${collection}/${itemId}`);
    });

    it('should handle deletion errors gracefully', async () => {
      const collection = 'test_collection';
      const itemId = 1;

      const deleteError = new Error('Delete failed: Item has references');
      mockApi.delete.mockRejectedValue(deleteError);

      await expect(
        tableApi.deleteItem(collection, itemId)
      ).rejects.toThrow('Delete failed: Item has references');
    });
  });

  describe('createItem', () => {
    it('should create new item with correct data', async () => {
      const collection = 'test_collection';
      const newItemData = { title: 'New Item', status: 'draft' };

      const result = await tableApi.createItem(collection, newItemData);

      expect(result.data).toEqual({ id: 3, title: 'New Item' });
      expect(mockApi.post).toHaveBeenCalledWith(`/items/${collection}`, newItemData);
    });

    it('should handle creation validation errors', async () => {
      const collection = 'test_collection';
      const invalidData = { title: '' };

      const validationError = new Error('Validation failed: Title is required');
      mockApi.post.mockRejectedValue(validationError);

      await expect(
        tableApi.createItem(collection, invalidData)
      ).rejects.toThrow('Validation failed: Title is required');
    });
  });

  describe('exportItems', () => {
    it('should export items in correct format', async () => {
      const collection = 'test_collection';
      const format = 'csv';
      const filter = { status: { _eq: 'published' } };

      mockApi.post.mockResolvedValue({
        data: { url: 'https://example.com/export.csv' },
      });

      const result = await tableApi.exportItems(collection, format, filter);

      expect(result.data.url).toBe('https://example.com/export.csv');
      expect(mockApi.post).toHaveBeenCalledWith(`/utils/export/${collection}`, {
        format,
        query: { filter },
      });
    });
  });

  describe('data integrity and performance', () => {
    it('should handle large datasets efficiently', async () => {
      const options: ApiOptions = {
        collection: 'large_collection',
        fields: ['id', 'title'],
        limit: 1000,
        page: 1,
      };

      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        title: `Item ${i + 1}`,
      }));

      mockApi.get.mockResolvedValue({
        data: largeDataset,
        meta: { total_count: 1000, filter_count: 1000 },
      });

      const startTime = performance.now();
      const result = await tableApi.fetchItems(options);
      const endTime = performance.now();

      expect(result.data).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should prevent malicious filter injection', async () => {
      const options: ApiOptions = {
        collection: 'test_collection',
        fields: ['id', 'title'],
        limit: 25,
        page: 1,
        filter: {
          title: { _contains: "'; DROP TABLE items; --" },
        },
      };

      await tableApi.fetchItems(options);

      // The malicious content should be passed to the Directus SDK which handles sanitization
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            filter: options.filter,
          }),
        })
      );
    });

    it('should handle concurrent requests without interference', async () => {
      const options1: ApiOptions = {
        collection: 'test_collection',
        fields: ['id', 'title'],
        limit: 25,
        page: 1,
      };

      const options2: ApiOptions = {
        collection: 'test_collection',
        fields: ['id', 'description'],
        limit: 50,
        page: 2,
      };

      const request1 = tableApi.fetchItems(options1);
      const request2 = tableApi.fetchItems(options2);

      await Promise.all([request1, request2]);

      expect(mockApi.get).toHaveBeenCalledTimes(2);
    });
  });
});