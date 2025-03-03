<!-- ./extensions/layouts/super-layout-table/components/CellRenderers/RelationalCell.vue -->
<template>
  <div class="relational-cell">
    <!-- Many-to-Many or One-to-Many (Array) -->
    <div v-if="isMultiple" class="relation-list">
      <span 
        v-for="(item, index) in displayItems" 
        :key="getItemKey(item, index)"
        class="relation-item"
      >
        {{ formatItem(item) }}
      </span>
      <span v-if="hasMore" class="relation-more">
        +{{ remainingCount }} more
      </span>
    </div>
    
    <!-- Many-to-One or Single item -->
    <div v-else-if="singleItem" class="relation-single">
      <span class="relation-item">
        {{ formatItem(singleItem) }}
      </span>
    </div>
    
    <!-- Empty state -->
    <span v-else class="relation-empty">—</span>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps<{ 
  value: any; 
  field?: string;
  item?: any;
  options?: Record<string, any>;
}>();

const isMultiple = computed(() => Array.isArray(props.value));

const displayItems = computed(() => {
  if (!isMultiple.value) return [];
  
  // Show maximum 3 items in the cell
  return props.value.slice(0, 3);
});

const hasMore = computed(() => {
  return isMultiple.value && props.value.length > 3;
});

const remainingCount = computed(() => {
  return isMultiple.value ? props.value.length - 3 : 0;
});

const singleItem = computed(() => {
  return !isMultiple.value ? props.value : null;
});

function formatItem(item: any): string {
  if (!item) return '';
  
  // If it's a string or number, return as is
  if (typeof item === 'string' || typeof item === 'number') {
    return String(item);
  }
  
  // If it's an object, try to find a display field
  if (typeof item === 'object') {
    // Common display fields in order of preference
    const displayFields = ['name', 'title', 'label', 'first_name', 'email', 'id'];
    
    for (const field of displayFields) {
      if (item[field] != null) {
        return String(item[field]);
      }
    }
    
    // If it has first_name and last_name, combine them
    if (item.first_name && item.last_name) {
      return `${item.first_name} ${item.last_name}`;
    }
    
    // Fallback to id if available
    return item.id ? String(item.id) : 'Unknown';
  }
  
  return String(item);
}

function getItemKey(item: any, index: number): string {
  if (typeof item === 'object' && item?.id) {
    return String(item.id);
  }
  return `item-${index}`;
}
</script>

<style scoped>
.relational-cell {
  display: flex;
  align-items: center;
}

.relation-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.relation-single {
  display: flex;
  align-items: center;
}

.relation-item {
  padding: 2px 6px;
  background: var(--primary-25);
  border: 1px solid var(--primary-50);
  border-radius: 12px;
  font-size: 11px;
  color: var(--primary);
  font-weight: 500;
  white-space: nowrap;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.relation-more {
  padding: 2px 6px;
  background: var(--background-subdued);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  font-size: 11px;
  color: var(--foreground-subdued);
  font-weight: 500;
  white-space: nowrap;
}

.relation-empty {
  color: var(--foreground-subdued);
  font-style: italic;
}

/* Hover effect */
.relation-item:hover {
  background: var(--primary-50);
  cursor: pointer;
}
</style>
