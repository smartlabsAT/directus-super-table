import { ref, Ref, computed } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import type { Item, Filter } from '@directus/types';

export interface ApiOptions {
  collection: string;
  fields: string[];
  filter?: Filter;
  search?: string;
  sort?: string[];
  page?: number;
  limit?: number;
  deep?: Record<string, any>;
}

export interface ApiResponse {
  data: Item[];
  meta?: {
    filter_count?: number;
    total_count?: number;
  };
}

export function useTableApi() {
  const api = useApi();
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const items = ref<Item[]>([]);
  const totalCount = ref(0);
  const filterCount = ref(0);

  /**
   * Fetch items from the API
   */
  async function fetchItems(options: ApiOptions): Promise<ApiResponse> {
    loading.value = true;
    error.value = null;

    try {
      // Build query parameters
      const params: any = {
        fields: options.fields,
        page: options.page || 1,
        limit: options.limit || 100,
        meta: 'filter_count,total_count'
      };

      // Add filter if provided
      if (options.filter) {
        params.filter = options.filter;
      }

      // Add search if provided
      if (options.search) {
        params.search = options.search;
      }

      // Add sort if provided
      if (options.sort && options.sort.length > 0) {
        params.sort = options.sort;
      }

      // Add deep parameters for relations
      if (options.deep) {
        params.deep = options.deep;
      }

      // Make API request
      const response = await api.get(`/items/${options.collection}`, { params });

      if (response.data) {
        items.value = response.data.data || [];
        totalCount.value = response.data.meta?.total_count || 0;
        filterCount.value = response.data.meta?.filter_count || 0;

        return {
          data: items.value,
          meta: response.data.meta
        };
      }

      return { data: [] };
    } catch (err) {
      error.value = err as Error;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update a single item
   */
  async function updateItem(
    collection: string,
    primaryKey: string | number,
    field: string,
    value: any
  ): Promise<void> {
    try {
      // Handle translation updates specially
      if (typeof value === 'object' && value?.isTranslation) {
        await updateTranslation(collection, primaryKey, value);
      } else if (typeof value === 'object' && value?.isFullTranslations) {
        // Handle full translations update from interface-translations
        await api.patch(`/items/${collection}/${primaryKey}`, {
          translations: value.translations
        });
      } else {
        // Regular field update
        const cleanField = field.includes(':') ? field.split(':')[0] : field;
        await api.patch(`/items/${collection}/${primaryKey}`, {
          [cleanField]: value
        });
      }
    } catch (err) {
      error.value = err as Error;
      throw err;
    }
  }

  /**
   * Update a translation field
   */
  async function updateTranslation(
    collection: string,
    primaryKey: string | number,
    translationData: any
  ): Promise<void> {
    // Get current item with translations
    const currentItem = await api.get(`/items/${collection}/${primaryKey}`, {
      params: {
        fields: ['translations.*']
      }
    });

    const existingTranslations = currentItem.data?.data?.translations || [];
    
    // Find or create translation for the language
    const translationIndex = existingTranslations.findIndex(
      (t: any) => t.languages_code === translationData.language
    );

    if (translationIndex >= 0) {
      // Update existing translation
      existingTranslations[translationIndex][translationData.translationField] = translationData.value;
    } else {
      // Create new translation
      existingTranslations.push({
        languages_code: translationData.language,
        [translationData.translationField]: translationData.value
      });
    }

    // Update the item with modified translations
    await api.patch(`/items/${collection}/${primaryKey}`, {
      translations: existingTranslations
    });
  }

  /**
   * Delete items
   */
  async function deleteItems(
    collection: string,
    primaryKeys: (string | number)[]
  ): Promise<void> {
    try {
      if (primaryKeys.length === 1) {
        await api.delete(`/items/${collection}/${primaryKeys[0]}`);
      } else {
        await api.delete(`/items/${collection}`, {
          data: primaryKeys
        });
      }
    } catch (err) {
      error.value = err as Error;
      throw err;
    }
  }

  /**
   * Duplicate an item
   */
  async function duplicateItem(
    collection: string,
    primaryKey: string | number,
    primaryKeyField: string = 'id'
  ): Promise<Item> {
    try {
      // Get the original item
      const response = await api.get(`/items/${collection}/${primaryKey}`);
      const originalItem = response.data?.data;

      if (!originalItem) {
        throw new Error('Item not found');
      }

      // Remove primary key and system fields
      const newItem = { ...originalItem };
      delete newItem[primaryKeyField];
      delete newItem.date_created;
      delete newItem.date_updated;
      delete newItem.user_created;
      delete newItem.user_updated;

      // Create the duplicate
      const createResponse = await api.post(`/items/${collection}`, newItem);
      return createResponse.data?.data;
    } catch (err) {
      error.value = err as Error;
      throw err;
    }
  }

  /**
   * Export items
   */
  async function exportItems(
    collection: string,
    format: 'csv' | 'json' | 'xml' | 'yaml',
    options?: ApiOptions
  ): Promise<Blob> {
    try {
      const params: any = {
        export: format,
        ...options
      };

      const response = await api.get(`/items/${collection}`, {
        params,
        responseType: 'blob'
      });

      return response.data;
    } catch (err) {
      error.value = err as Error;
      throw err;
    }
  }

  return {
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    items: computed(() => items.value),
    totalCount: computed(() => totalCount.value),
    filterCount: computed(() => filterCount.value),
    fetchItems,
    updateItem,
    deleteItems,
    duplicateItem,
    exportItems
  };
}