import { computed, Ref } from 'vue';
import type { LayoutQuery } from '../types/table.types';

export function useTablePagination(layoutQuery: Ref<LayoutQuery>) {
  const page = computed({
    get() {
      return layoutQuery.value?.page || 1;
    },
    set(newPage: number) {
      layoutQuery.value = {
        ...layoutQuery.value,
        page: newPage,
      };
    },
  });

  const limit = computed({
    get() {
      return layoutQuery.value?.limit || 100;
    },
    set(newLimit: number) {
      layoutQuery.value = {
        ...layoutQuery.value,
        limit: newLimit,
        page: 1, // Reset to first page when changing limit
      };
    },
  });

  // Available page size options
  const pageSizeOptions = [
    { text: '10', value: 10 },
    { text: '25', value: 25 },
    { text: '50', value: 50 },
    { text: '100', value: 100 },
    { text: '250', value: 250 },
    { text: '500', value: 500 },
  ];

  return {
    page,
    limit,
    pageSizeOptions,
  };
}
