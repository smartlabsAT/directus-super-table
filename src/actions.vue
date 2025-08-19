<template>
  <div class="action-buttons">
    <!-- Duplicate Button nur anzeigen wenn Items ausgewählt sind -->
    <v-button
      v-if="hasSelection"
      v-tooltip.bottom="duplicateTooltip"
      :disabled="!canDuplicate"
      icon
      rounded
      secondary
      class="duplicate-action-button"
      @click="handleDuplicate"
    >
      <v-icon name="content_copy" />
    </v-button>
    
    <!-- Save as Quick Filter Button - nur wenn native Filter gesetzt ist -->
    <v-button
      v-if="hasNativeFilter"
      v-tooltip.bottom="'Save current filter as Quick Filter'"
      icon
      rounded
      class="save-filter-button"
      @click="openSaveFilterDialog"
    >
      <v-icon name="bookmark_add" />
    </v-button>
    
    <!-- Save Filter Dialog -->
    <v-dialog
      v-if="saveDialogActive"
      :model-value="saveDialogActive"
      @update:model-value="saveDialogActive = $event"
      @esc="saveDialogActive = false"
      persistent
    >
      <v-card>
        <v-card-title>Save as Quick Filter</v-card-title>
        <v-card-text>
          <v-notice type="info">
            After saving, please manually clear the native filter to avoid duplicate filtering.
          </v-notice>
          
          <div class="form-grid" @click.stop>
            <!-- Filter Name Input -->
            <div class="full-width">
              <v-input
                v-model="filterName"
                placeholder="Quick Filter name (e.g. Active Items, This Month)"
                autofocus
                @keydown.enter="saveFilter"
                @click.stop
              />
            </div>
            
            <!-- Icon Selector -->
            <div class="full-width" @click.stop>
              <label class="field-label">Icon (optional)</label>
              <interface-select-icon
                :value="filterIcon"
                @input="filterIcon = $event"
                @click.stop="fixIconMenuScroll"
              />
            </div>
            
            <!-- Color Selector -->
            <div class="full-width" @click.stop>
              <label class="field-label">Color Theme</label>
              <div class="color-selector" @click.stop>
                <div
                  v-for="option in colorOptions"
                  :key="option.value"
                  :class="['color-circle', { active: filterColor === option.value }]"
                  :style="{ backgroundColor: getColorValue(option.value) }"
                  :title="option.text"
                  @click.stop="filterColor = option.value"
                >
                  <v-icon 
                    v-if="filterColor === option.value" 
                    name="check" 
                    small 
                    class="check-icon"
                  />
                </div>
              </div>
              <div class="color-label">{{ getColorLabel(filterColor) }}</div>
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-button secondary @click="saveDialogActive = false">
            Cancel
          </v-button>
          <v-button :disabled="!filterName" @click="saveFilter">
            Save
          </v-button>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useStores } from '@directus/extensions-sdk';
import { useI18n } from 'vue-i18n';
import { useTableApi } from './composables/api';

// Props from layout state
const props = defineProps<{
  collection: string;
  selection?: (string | number)[];
  primaryKeyField?: string;
  filter?: any;
  search?: string;
  layoutOptions?: any;
  layoutQuery?: any;
}>();

// Emits
const emit = defineEmits(['update:layoutOptions']);

// Composables
const { t } = useI18n();
const tableApi = useTableApi();
const { useNotificationsStore } = useStores();
const notificationsStore = useNotificationsStore();

// State for Save Filter Dialog
const saveDialogActive = ref(false);
const filterName = ref('');
const filterIcon = ref('filter_list');
const filterColor = ref('primary');

// Color options for filter buttons
const colorOptions = [
  { text: 'Primary (Blue)', value: 'primary' },
  { text: 'Gray', value: 'gray' },
  { text: 'Success (Green)', value: 'success' },
  { text: 'Warning (Orange)', value: 'warning' },
  { text: 'Danger (Red)', value: 'danger' },
  { text: 'Info (Light Blue)', value: 'info' }
];

const hasSelection = computed(() => props.selection && props.selection.length > 0);
const hasNativeFilter = computed(() => {
  // Check if filter exists and has actual filter conditions
  if (!props.filter || typeof props.filter !== 'object') {
    return false;
  }
  
  // Check if filter is empty object
  const filterKeys = Object.keys(props.filter);
  if (filterKeys.length === 0) {
    return false;
  }
  
  // IGNORE DEFAULT FILTERS that are always present
  // "Status is not archived" is a common default filter
  if (filterKeys.length === 1) {
    // Check for status != archived filter (default in many collections)
    if (props.filter.status && 
        props.filter.status._neq === 'archived') {
      return false; // This is just the default filter
    }
    
    // Check for _and with only status filter
    if (props.filter._and && 
        Array.isArray(props.filter._and) && 
        props.filter._and.length === 1) {
      const andFilter = props.filter._and[0];
      if (andFilter.status && andFilter.status._neq === 'archived') {
        return false; // Default filter wrapped in _and
      }
    }
    
    // Empty _and or _or
    if (props.filter._and && Array.isArray(props.filter._and) && props.filter._and.length === 0) {
      return false;
    }
    if (props.filter._or && Array.isArray(props.filter._or) && props.filter._or.length === 0) {
      return false;
    }
  }
  
  // Check if it's ONLY the archived filter in a more complex structure
  if (props.filter._and && Array.isArray(props.filter._and)) {
    const nonArchivedFilters = props.filter._and.filter(f => {
      // Filter out status != archived
      if (f.status && f.status._neq === 'archived') return false;
      return true;
    });
    
    // If after removing archived filter, nothing is left, no real filter
    if (nonArchivedFilters.length === 0) {
      return false;
    }
  }
  
  // Has real filter conditions beyond the default
  return true;
});

// Als Admin haben wir immer Create-Rechte, außer es wird explizit verboten
// In Layout Extensions ist der Permissions-Check anders als in anderen Extensions
const canDuplicate = computed(() => {
  // Einfacher Check - wenn wir hier sind, haben wir vermutlich Rechte
  return true;
});

const duplicateTooltip = computed(() => {
  const count = props.selection?.length || 0;
  return count === 1 
    ? 'Duplicate item'
    : `Duplicate ${count} items`;
});

// Helper functions for color selector
function getColorValue(colorName: string): string {
  const colorMap: Record<string, string> = {
    'primary': 'var(--primary)',
    'gray': '#6c757d',  // Bootstrap gray - works in both light and dark themes
    'success': 'var(--success)',
    'warning': 'var(--warning)',
    'danger': 'var(--danger)',
    'info': 'var(--info)'
  };
  return colorMap[colorName] || 'var(--primary)';
}

function getColorLabel(colorName: string): string {
  const option = colorOptions.find(opt => opt.value === colorName);
  return option ? option.text : 'Primary (Blue)';
}

// Function to fix icon menu scrolling
function fixIconMenuScroll() {
  // Use multiple timeouts to catch the menu at different stages of rendering
  const delays = [0, 50, 100, 200, 300];
  
  delays.forEach(delay => {
    setTimeout(() => {
      // Find all v-menu-content elements
      const menus = document.querySelectorAll('.v-menu-content');
      
      menus.forEach(menu => {
        // Check if this menu has icons (is an icon selector)
        if (menu.querySelector('.icons')) {
          const menuEl = menu as HTMLElement;
          
          // Force the styles with inline style
          menuEl.style.cssText = `
            max-height: 400px !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
          `;
        }
      });
    }, delay);
  });
}

// Methods
function openSaveFilterDialog() {
  filterName.value = '';
  filterIcon.value = 'filter_list';
  filterColor.value = 'primary';
  saveDialogActive.value = true;
}

async function saveFilter() {
  if (!filterName.value || !props.filter) return;
  
  try {
    // Generate a unique ID for the new filter
    const newFilterId = `filter-${Date.now()}`;
    
    // Create the filter preset object
    const newPreset = {
      id: newFilterId,
      name: filterName.value,
      filter: props.filter,
      icon: filterIcon.value,
      color: filterColor.value,
      isPinned: true
    };
    
    // Update layoutOptions with the new filter
    const currentFilters = props.layoutOptions?.quickFilters || [];
    const updatedOptions = {
      ...props.layoutOptions,
      quickFilters: [...currentFilters, newPreset],
      activeQuickFilterId: newFilterId // Activate immediately
    };
    
    // Emit the update to save in layoutOptions
    emit('update:layoutOptions', updatedOptions);
    
    // Also try to save to Directus presets API for backward compatibility
    try {
      await tableApi.savePreset({
        bookmark: filterName.value,
        collection: props.collection,
        layout: 'super-layout-table',
        layout_query: {
          filter: props.filter
        }
      });
    } catch (apiError) {
      console.warn('Failed to save to presets API (saved in layout):', apiError);
    }
    
    notificationsStore.add({
      title: 'Quick Filter Saved',
      text: `"${filterName.value}" has been saved and activated. Note: Native filter panel must be cleared manually.`,
      type: 'success',
    });
    
    saveDialogActive.value = false;
    
    // Emit event to notify the layout
    window.dispatchEvent(new CustomEvent('quick-filter-saved', {
      detail: { 
        collection: props.collection,
        name: filterName.value,
        filterId: newFilterId,
        filter: props.filter,
        activateFilter: true,
        clearNativeFilter: false  // Cannot clear native filter - Directus limitation
      }
    }));
  } catch (error: any) {
    notificationsStore.add({
      title: t('error'),
      text: error.message || 'Failed to save filter',
      type: 'error',
    });
  }
}

async function handleDuplicate() {
  if (!canDuplicate.value || !hasSelection.value) return;

  try {
    // Duplicate selected items
    await duplicateSelectedItems();
  } catch (error: any) {
    notificationsStore.add({
      title: 'Error',
      text: error.message || 'Failed to duplicate items',
      type: 'error',
    });
  }
}

async function duplicateSelectedItems() {
  if (!props.selection || props.selection.length === 0) {
    return;
  }

  // Default to 'id' if primaryKeyField is not provided
  const primaryKey = props.primaryKeyField || 'id';
  
  try {
    for (const itemId of props.selection) {
      // Use tableApi to duplicate with translations
      await tableApi.duplicateItemWithTranslations(
        props.collection,
        itemId,
        primaryKey,
        true // include translations
      );
    }
    
    notificationsStore.add({
      title: 'Items duplicated',
      text: `Successfully duplicated ${props.selection.length} item(s) with translations`,
      type: 'success',
    });

    // Emit event to refresh the table without page reload
    window.dispatchEvent(new CustomEvent('directus-items-duplicated', {
      detail: { 
        collection: props.collection,
        count: props.selection.length 
      }
    }));
  } catch (error: any) {
    console.error('Error duplicating items:', error);
    throw error;
  }
}

</script>

<style scoped>
.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Save Filter Button mit Verbindung zum Filter */
.save-filter-button {
  position: relative;
  margin-right: 12px !important;
  /* Primary colored button */
  --v-button-background-color: var(--primary-25);
  --v-button-background-color-hover: var(--primary-50);
  --v-button-color: var(--primary);
  --v-button-color-hover: var(--primary-125);
  border: 1px solid var(--primary-50);
}

.save-filter-button:hover {
  border-color: var(--primary-75);
}

/* Verbindungslinie vom Button zum Filter */
.save-filter-button::after {
  content: '';
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 2px;
  background: linear-gradient(
    to right,
    var(--primary-75),
    var(--primary-50),
    var(--primary-25)
  );
  pointer-events: none;
}

/* Optionaler Verbindungspunkt am Button */
.save-filter-button::before {
  content: '';
  position: absolute;
  right: -3px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary-75);
  border: 1px solid var(--primary-25);
  pointer-events: none;
}

/* Duplicate Button Styling */
.duplicate-action-button {
  margin-right: 4px;
}

/* Falls der Button in einem Container ist */
:deep(.header-bar-actions) {
  display: flex;
  gap: 4px;
}

/* Form Grid for Dialog */
.form-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 20px;
}

.full-width {
  width: 100%;
}

.field-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--foreground-normal);
}

/* Color Selector Styles */
.color-selector {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.color-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.color-circle:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.color-circle.active {
  border-color: var(--foreground-normal);
  box-shadow: 0 0 0 3px var(--background-normal), 0 0 0 5px var(--border-normal);
}

.color-circle .check-icon {
  color: white;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.color-label {
  margin-top: 8px;
  font-size: 13px;
  color: var(--foreground-subdued);
  text-align: center;
}

</style>