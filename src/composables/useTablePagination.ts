import { computed, Ref } from 'vue';
import type { LayoutQuery } from '../types/table.types';
import { PER_PAGE_OPTIONS, DEFAULT_PAGE_SIZE } from '../constants/pagination';

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
      return layoutQuery.value?.limit || DEFAULT_PAGE_SIZE;
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
  const pageSizeOptions = PER_PAGE_OPTIONS;

  return {
    page,
    limit,
    pageSizeOptions,
  };
}
