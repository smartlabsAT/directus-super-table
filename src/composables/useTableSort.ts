import { computed, Ref } from 'vue';
import type { LayoutQuery } from '../types/table.types';

// Define Sort interface locally since it's not exported from @directus/types
interface Sort {
  by: string;
  desc: boolean;
}

export function useTableSort(layoutQuery: Ref<LayoutQuery>) {
  // Clean up language suffixes from sort fields
  const sort = computed({
    get() {
      const rawSort = layoutQuery.value?.sort || [];
      // Clean up any language suffixes from sort fields
      return rawSort.map((sortItem: string) => {
        if (sortItem.includes(':')) {
          // Remove language suffix but keep the desc prefix if present
          if (sortItem.startsWith('-')) {
            const field = sortItem.substring(1).split(':')[0];
            return `-${field}`;
          } else {
            return sortItem.split(':')[0];
          }
        }
        return sortItem;
      });
    },
    set(newSort: string[]) {
      // Clean sort values before saving
      const cleanedSort = newSort.map((sortItem: string) => {
        if (sortItem.includes(':')) {
          // Remove language suffix but keep the desc prefix if present
          if (sortItem.startsWith('-')) {
            const field = sortItem.substring(1).split(':')[0];
            return `-${field}`;
          } else {
            return sortItem.split(':')[0];
          }
        }
        return sortItem;
      });

      layoutQuery.value = {
        ...layoutQuery.value,
        sort: cleanedSort,
      };
    },
  });

  // Table sort for v-table
  const tableSort = computed(() => {
    if (!sort.value?.[0]) return null;

    let sortField = sort.value[0];
    let desc = false;

    // Check for descending sort
    if (sortField.startsWith('-')) {
      desc = true;
      sortField = sortField.substring(1);
    }

    // Keep the original field with suffix for display
    // The actual sorting will be handled by the sort computed property
    return { by: sortField, desc };
  });

  function onSortChange(newSort: Sort | null) {
    if (!newSort?.by) {
      // Clear sort
      layoutQuery.value = {
        ...layoutQuery.value,
        sort: [],
      };
      return;
    }

    // Remove language suffix from sort field if present
    // e.g., "translations.description:de-DE" -> "translations.description"
    let sortField = newSort.by;
    if (sortField.includes(':')) {
      sortField = sortField.split(':')[0];
    }

    const sortString = newSort.desc ? `-${sortField}` : sortField;

    // Update layoutQuery directly to ensure reactivity
    layoutQuery.value = {
      ...layoutQuery.value,
      sort: [sortString],
    };
  }

  return {
    sort,
    tableSort,
    onSortChange,
  };
}
