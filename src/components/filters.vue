<template>
  <div class="filters-container">
    <!-- Search Input -->
    <div class="search-input">
      <v-input
        v-model="searchQuery"
        type="search"
        :placeholder="t('search_items')"
        @update:model-value="handleSearch"
      >
        <template #prepend>
          <v-icon name="search" />
        </template>
        <template #append v-if="searchQuery">
          <v-icon
            name="close"
            clickable
            @click="clearSearch"
          />
        </template>
      </v-input>
    </div>

    <!-- Advanced Filters Button -->
    <v-button
      v-if="showAdvancedFilters"
      v-tooltip="t('advanced_filters')"
      icon
      secondary
      :active="hasActiveFilters"
      @click="openFilterDialog"
    >
      <v-icon name="filter_list" />
      <v-badge v-if="activeFilterCount > 0" :value="activeFilterCount" />
    </v-button>

    <!-- Quick Filters -->
    <div v-if="quickFilters.length > 0" class="quick-filters">
      <v-chip
        v-for="filter in quickFilters"
        :key="filter.key"
        :active="isFilterActive(filter)"
        clickable
        @click="toggleQuickFilter(filter)"
      >
        {{ filter.label }}
      </v-chip>
    </div>

    <!-- Active Filters Display -->
    <div v-if="hasActiveFilters" class="active-filters">
      <span class="label">{{ t('filters') }}:</span>
      <v-chip
        v-for="(filter, index) in activeFilters"
        :key="index"
        close
        @close="removeFilter(index)"
      >
        {{ filter.label }}: {{ filter.value }}
      </v-chip>
      <v-button
        x-small
        secondary
        @click="clearAllFilters"
      >
        {{ t('clear_filters') }}
      </v-button>
    </div>

    <!-- Filter Dialog -->
    <v-dialog
      v-model="filterDialogActive"
      :title="t('advanced_filters')"
      @esc="filterDialogActive = false"
    >
      <template #activator>
        <!-- Activator is the button above -->
      </template>

      <div class="filter-dialog-content">
        <!-- Filter Builder Component would go here -->
        <!-- For now, simplified version -->
        <div
          v-for="(filter, index) in dialogFilters"
          :key="index"
          class="filter-row"
        >
          <v-select
            v-model="filter.field"
            :items="availableFields"
            :placeholder="t('select_field')"
          />
          <v-select
            v-model="filter.operator"
            :items="operators"
            :placeholder="t('select_operator')"
          />
          <v-input
            v-model="filter.value"
            :placeholder="t('enter_value')"
          />
          <v-button
            icon
            secondary
            @click="removeDialogFilter(index)"
          >
            <v-icon name="close" />
          </v-button>
        </div>

        <v-button
          secondary
          @click="addDialogFilter"
        >
          <v-icon name="add" />
          {{ t('add_filter') }}
        </v-button>
      </div>

      <template #actions>
        <v-button secondary @click="filterDialogActive = false">
          {{ t('cancel') }}
        </v-button>
        <v-button @click="applyFilters">
          {{ t('apply_filters') }}
        </v-button>
      </template>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Filter } from '@directus/types';
import { debounce } from 'lodash';

interface QuickFilter {
  key: string;
  label: string;
  filter: Filter;
}

interface DialogFilter {
  field: string;
  operator: string;
  value: any;
}

const props = defineProps<{
  collection: string;
  fields: any[];
  modelValue?: Filter;
}>();

const emit = defineEmits<{
  'update:modelValue': [filter: Filter | null];
  'search': [query: string];
}>();

const { t } = useI18n();

// State
const searchQuery = ref('');
const filterDialogActive = ref(false);
const activeFilters = ref<any[]>([]);
const dialogFilters = ref<DialogFilter[]>([]);
const showAdvancedFilters = ref(true);

// Quick filters configuration
const quickFilters = ref<QuickFilter[]>([
  {
    key: 'status_published',
    label: t('published'),
    filter: { status: { _eq: 'published' } }
  },
  {
    key: 'status_draft',
    label: t('draft'),
    filter: { status: { _eq: 'draft' } }
  },
  {
    key: 'recent',
    label: t('recent'),
    filter: {
      date_updated: {
        _gte: '$NOW(-7 days)'
      }
    }
  }
]);

// Available fields for filter dialog
const availableFields = computed(() => {
  return props.fields
    .filter(field => !field.meta?.special?.includes('alias'))
    .map(field => ({
      text: field.name || field.field,
      value: field.field
    }));
});

// Filter operators
const operators = [
  { text: t('operators.eq'), value: '_eq' },
  { text: t('operators.neq'), value: '_neq' },
  { text: t('operators.contains'), value: '_contains' },
  { text: t('operators.ncontains'), value: '_ncontains' },
  { text: t('operators.starts_with'), value: '_starts_with' },
  { text: t('operators.ends_with'), value: '_ends_with' },
  { text: t('operators.gt'), value: '_gt' },
  { text: t('operators.gte'), value: '_gte' },
  { text: t('operators.lt'), value: '_lt' },
  { text: t('operators.lte'), value: '_lte' },
  { text: t('operators.empty'), value: '_empty' },
  { text: t('operators.nempty'), value: '_nempty' },
  { text: t('operators.null'), value: '_null' },
  { text: t('operators.nnull'), value: '_nnull' }
];

// Computed
const hasActiveFilters = computed(() => {
  return activeFilters.value.length > 0 || !!props.modelValue;
});

const activeFilterCount = computed(() => {
  return activeFilters.value.length;
});

// Methods
const handleSearch = debounce((value: string) => {
  emit('search', value);
}, 300);

function clearSearch() {
  searchQuery.value = '';
  emit('search', '');
}

function openFilterDialog() {
  filterDialogActive.value = true;
  // Initialize dialog filters from current filters
  if (props.modelValue) {
    // Parse existing filters into dialog format
    dialogFilters.value = parseFiltersToDialog(props.modelValue);
  }
}

function parseFiltersToDialog(filter: Filter): DialogFilter[] {
  // Convert Filter object to DialogFilter array
  // This is a simplified version - real implementation would handle nested filters
  const result: DialogFilter[] = [];
  
  for (const [field, conditions] of Object.entries(filter)) {
    if (typeof conditions === 'object' && conditions !== null) {
      for (const [operator, value] of Object.entries(conditions)) {
        result.push({
          field,
          operator,
          value
        });
      }
    }
  }
  
  return result;
}

function addDialogFilter() {
  dialogFilters.value.push({
    field: '',
    operator: '_eq',
    value: ''
  });
}

function removeDialogFilter(index: number) {
  dialogFilters.value.splice(index, 1);
}

function applyFilters() {
  // Convert dialog filters to Filter object
  const filter: Filter = {};
  
  for (const dialogFilter of dialogFilters.value) {
    if (dialogFilter.field && dialogFilter.value !== '') {
      if (!filter[dialogFilter.field]) {
        filter[dialogFilter.field] = {};
      }
      filter[dialogFilter.field][dialogFilter.operator] = dialogFilter.value;
    }
  }
  
  emit('update:modelValue', Object.keys(filter).length > 0 ? filter : null);
  filterDialogActive.value = false;
  
  // Update active filters display
  activeFilters.value = dialogFilters.value
    .filter(f => f.field && f.value !== '')
    .map(f => ({
      label: f.field,
      value: f.value
    }));
}

function removeFilter(index: number) {
  activeFilters.value.splice(index, 1);
  // Rebuild filter from remaining active filters
  applyFiltersFromActive();
}

function clearAllFilters() {
  activeFilters.value = [];
  dialogFilters.value = [];
  emit('update:modelValue', null);
}

function applyFiltersFromActive() {
  // Rebuild filter from active filters
  // This is simplified - real implementation would be more complex
  if (activeFilters.value.length === 0) {
    emit('update:modelValue', null);
  } else {
    // Convert back to Filter format
    const filter: Filter = {};
    // Implementation would go here
    emit('update:modelValue', filter);
  }
}

function isFilterActive(quickFilter: QuickFilter): boolean {
  // Check if this quick filter is currently active
  if (!props.modelValue) return false;
  
  // Simplified check - real implementation would deep compare
  return JSON.stringify(props.modelValue).includes(JSON.stringify(quickFilter.filter));
}

function toggleQuickFilter(quickFilter: QuickFilter) {
  if (isFilterActive(quickFilter)) {
    // Remove filter
    emit('update:modelValue', null);
  } else {
    // Apply filter
    emit('update:modelValue', quickFilter.filter);
  }
}
</script>

<style scoped>
.filters-container {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200px;
  max-width: 400px;
}

.quick-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.active-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 0;
}

.active-filters .label {
  font-weight: 600;
  color: var(--foreground-subdued);
}

.filter-dialog-content {
  padding: 20px;
  min-width: 500px;
}

.filter-row {
  display: grid;
  grid-template-columns: 1fr 150px 1fr auto;
  gap: 12px;
  margin-bottom: 12px;
  align-items: center;
}
</style>