<template>
  <div v-if="hasActiveFilters" class="active-filters-container">
    <!-- Section Header -->
    <div class="active-filters-header">
      <span class="filter-label">
        Applied Filters ({{ totalFilterCount }}):
      </span>
      
      <!-- AND/OR Toggle for Power Users (optional, hidden by default) -->
      <div v-if="showLogicToggle" class="logic-toggle">
        <v-radio-group
          v-model="filterLogic"
          inline
          small
          @update:model-value="$emit('update:logic', $event)"
        >
          <v-radio value="and" :label="t('Match ALL')" />
          <v-radio value="or" :label="t('Match ANY')" />
        </v-radio-group>
      </div>
    </div>
    
    <!-- Filter Chips -->
    <div class="filter-chips">
      <!-- Quick Filter Chips -->
      <v-chip
        v-for="filter in quickFilterChips"
        :key="`quick-${filter.id}`"
        class="filter-chip quick-filter-chip"
        close
        @close="removeFilter(filter)"
      >
        <v-icon name="bolt" class="chip-icon" small />
        <span class="chip-label">{{ filter.label }}</span>
      </v-chip>
      
      <!-- Manual Filter Chips -->
      <v-chip
        v-for="filter in manualFilterChips"
        :key="`manual-${filter.id}`"
        class="filter-chip manual-filter-chip"
        close
        @close="removeFilter(filter)"
      >
        <v-icon name="tune" class="chip-icon" small />
        <span class="chip-label">{{ filter.label }}</span>
      </v-chip>
      
      <!-- Clear All Button -->
      <v-button
        v-if="totalFilterCount > 1"
        x-small
        secondary
        class="clear-all-button"
        @click="clearAllFilters"
      >
        <v-icon name="clear" small />
        {{ t('Clear all') }}
      </v-button>
    </div>
    
    <!-- Helper Text (shown on first use) -->
    <div v-if="showHelperText" class="helper-text">
      <v-icon name="info" small />
      <span>{{ t('Quick filters and manual filters work together to refine your results') }}</span>
      <v-icon
        name="close"
        small
        clickable
        class="dismiss-helper"
        @click="dismissHelper"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Filter } from '@directus/types';

export interface FilterChip {
  id: string;
  label: string;
  field?: string;
  operator?: string;
  value?: any;
  source: 'quick' | 'manual';
  filter?: Filter;
}

interface Props {
  quickFilters: FilterChip[];
  manualFilters: FilterChip[];
  filterLogic?: 'and' | 'or';
  showLogicToggle?: boolean;
  showHelperText?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  filterLogic: 'and',
  showLogicToggle: false,
  showHelperText: false
});

const emit = defineEmits<{
  'remove-filter': [filter: FilterChip];
  'clear-all': [];
  'update:logic': [logic: 'and' | 'or'];
  'dismiss-helper': [];
}>();

const { t } = useI18n();

// State
const helperDismissed = ref(false);

// Computed
const hasActiveFilters = computed(() => {
  return props.quickFilters.length > 0 || props.manualFilters.length > 0;
});

const totalFilterCount = computed(() => {
  return props.quickFilters.length + props.manualFilters.length;
});

const quickFilterChips = computed(() => {
  return props.quickFilters.map(filter => ({
    ...filter,
    source: 'quick' as const
  }));
});

const manualFilterChips = computed(() => {
  return props.manualFilters.map(filter => ({
    ...filter,
    source: 'manual' as const
  }));
});

// Methods
function removeFilter(filter: FilterChip) {
  emit('remove-filter', filter);
}

function clearAllFilters() {
  emit('clear-all');
}

function dismissHelper() {
  helperDismissed.value = true;
  emit('dismiss-helper');
  
  // Save to localStorage so it doesn't show again
  localStorage.setItem('filterHelperDismissed', 'true');
}

// Format filter label for display
function formatFilterLabel(filter: FilterChip): string {
  if (filter.label) return filter.label;
  
  // Build label from field, operator, and value
  const field = filter.field || 'Unknown';
  const operator = formatOperator(filter.operator);
  const value = formatValue(filter.value);
  
  return `${field} ${operator} ${value}`;
}

function formatOperator(operator?: string): string {
  const operatorMap: Record<string, string> = {
    '_eq': 'equals',
    '_neq': 'not equals',
    '_contains': 'contains',
    '_ncontains': 'not contains',
    '_starts_with': 'starts with',
    '_ends_with': 'ends with',
    '_gt': '>',
    '_gte': '>=',
    '_lt': '<',
    '_lte': '<=',
    '_empty': 'is empty',
    '_nempty': 'is not empty',
    '_null': 'is null',
    '_nnull': 'is not null'
  };
  
  return operatorMap[operator || ''] || operator || '';
}

function formatValue(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  
  // Handle special dynamic values
  if (typeof value === 'string') {
    if (value.startsWith('$NOW')) return 'Now' + value.substring(4);
    if (value === '$CURRENT_USER') return 'Current User';
  }
  
  return String(value);
}
</script>

<style scoped>
.active-filters-container {
  padding: 12px 0;
  border-bottom: 1px solid var(--border-subdued);
  background-color: var(--background-subdued);
  margin: -12px -12px 12px -12px;
  padding-left: 12px;
  padding-right: 12px;
}

.active-filters-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.filter-label {
  font-weight: 600;
  color: var(--foreground-normal);
  font-size: 13px;
}

.logic-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-chips {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background-color: var(--background-normal);
  border: 1px solid var(--border-normal);
  border-radius: 16px;
  font-size: 13px;
  transition: all 0.2s ease;
}

.filter-chip:hover {
  background-color: var(--background-normal-alt);
  border-color: var(--border-normal-alt);
}

.chip-icon {
  color: var(--foreground-subdued);
  width: 14px;
  height: 14px;
}

.quick-filter-chip .chip-icon {
  color: var(--primary);
}

.manual-filter-chip .chip-icon {
  color: var(--secondary);
}

.chip-label {
  color: var(--foreground-normal);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clear-all-button {
  margin-left: 4px;
  --v-button-background-color: var(--danger-10);
  --v-button-background-color-hover: var(--danger-25);
  --v-button-color: var(--danger);
  --v-button-color-hover: var(--danger);
}

.helper-text {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 12px;
  background-color: var(--primary-10);
  border-radius: 4px;
  font-size: 12px;
  color: var(--primary);
}

.helper-text .dismiss-helper {
  margin-left: auto;
  cursor: pointer;
  opacity: 0.7;
}

.helper-text .dismiss-helper:hover {
  opacity: 1;
}

/* Animation for chip removal */
.filter-chip {
  animation: slideIn 0.2s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .active-filters-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .filter-chips {
    width: 100%;
  }
}
</style>