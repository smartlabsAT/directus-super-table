<!-- super-layout-table with full relational field support and filter presets -->
<template>
  <div class="super-layout-table">
    <!-- Top Bar with Search and Filters -->
    <div class="table-toolbar" v-if="showToolbar">
      <div class="toolbar-content">
        <div class="search-input">
          <v-input
            v-model="searchQuery"
            type="search"
            :placeholder="t('search_items')"
            @input="onSearchInput"
          >
            <template #prepend>
              <v-icon name="search" />
            </template>
            <template #append v-if="searchQuery">
              <v-icon
                name="close"
                clickable
                @click="searchQuery = ''"
              />
            </template>
          </v-input>
        </div>
        
        <!-- Quick Filter Buttons -->
        <QuickFilters
          v-if="showFilters"
          :collection="collection"
          :presets="filterPresets"
          :active-preset-ids="activePresetIds"
          :current-filter="mergedFilters"
          :native-filter="filter"
          :can-save-filters="true"
          @toggle-preset="toggleFilterPreset"
          @save-preset="saveFilterPreset"
          @delete-preset="deleteFilterPreset"
          @move-preset="moveFilterPreset"
          @update-preset="updateFilterPreset"
        />
      </div>
      
      <!-- Selection count -->
      <div v-if="selection.length > 0" class="selection-count">
        {{ selection.length }} {{ selection.length === 1 ? 'item' : 'items' }} selected
      </div>
    </div>
    
    <!-- Active Filter Chips Display (DEBUG) -->
    <!-- <ActiveFilterChips
      v-if="showFilters && (quickFilterChips.length > 0 || manualFilterChips.length > 0)"
      :quick-filters="quickFilterChips"
      :manual-filters="manualFilterChips"
      :filter-logic="filterLogic"
      :show-logic-toggle="false"
      :show-helper-text="false"
      @remove-filter="removeFilter"
      @clear-all="clearAllFilters"
      @update:logic="filterLogic = $event"
      @dismiss-helper="() => {}"
    /> -->
    

    <!-- Main Table -->
    <v-table
      v-if="loading || (itemCount && itemCount > 0 && !error)"
      ref="tableRef"
      v-model="selectionWritable"
      v-model:headers="tableHeadersWritable"
      :class="['table', { 'has-image-fields': hasImageFields }]"
      :show-select="showSelect"
      show-resize
      must-sort
      :sort="tableSort"
      :items="items"
      :loading="loading"
      :item-key="primaryKeyField?.field"
      :show-manual-sort="sortAllowed"
      :manual-sort-key="sortField?.value || null"
      allow-header-reorder
      selection-use-keys
      :row-height="tableRowHeight"
      @update:sort="onSortChange"
      @manual-sort="changeManualSort"
      @toggle-select-all="onToggleSelectAll"
    >
      <!-- Header Context Menu -->
      <template #header-context-menu="{ header }">
        <v-list>
          <v-list-item
            :disabled="!header.sortable"
            :active="tableSort?.by === header.value && tableSort?.desc === false"
            clickable
            @click="onSortChange({ by: header.value, desc: false })"
          >
            <v-list-item-icon>
              <v-icon name="sort" class="flip" />
            </v-list-item-icon>
            <v-list-item-content>
              {{ t('sort_asc') }}
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            :active="tableSort?.by === header.value && tableSort?.desc === true"
            :disabled="!header.sortable"
            clickable
            @click="onSortChange({ by: header.value, desc: true })"
          >
            <v-list-item-icon>
              <v-icon name="sort" />
            </v-list-item-icon>
            <v-list-item-content>
              {{ t('sort_desc') }}
            </v-list-item-content>
          </v-list-item>

          <v-divider />

          <v-list-item
            :active="header.align === 'left'"
            clickable
            @click="onAlignChange(header.value, 'left')"
          >
            <v-list-item-icon>
              <v-icon name="format_align_left" />
            </v-list-item-icon>
            <v-list-item-content>
              {{ t('left_align') }}
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            :active="header.align === 'center'"
            clickable
            @click="onAlignChange(header.value, 'center')"
          >
            <v-list-item-icon>
              <v-icon name="format_align_center" />
            </v-list-item-icon>
            <v-list-item-content>
              {{ t('center_align') }}
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            :active="header.align === 'right'"
            clickable
            @click="onAlignChange(header.value, 'right')"
          >
            <v-list-item-icon>
              <v-icon name="format_align_right" />
            </v-list-item-icon>
            <v-list-item-content>
              {{ t('right_align') }}
            </v-list-item-content>
          </v-list-item>

          <v-divider />

          <v-list-item
            clickable
            @click="renameField(header.value)"
          >
            <v-list-item-icon>
              <v-icon name="edit" />
            </v-list-item-icon>
            <v-list-item-content>
              Rename
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            clickable
            @click="removeField(header.value)"
          >
            <v-list-item-icon>
              <v-icon name="visibility_off" />
            </v-list-item-icon>
            <v-list-item-content>
              {{ t('hide_field') }}
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </template>

      <!-- Add Field Button in Header -->
      <template #header-append>
        <!-- Edit Mode Toggle -->
        <v-icon
          v-tooltip="editMode ? 'Disable Edit Mode' : 'Enable Edit Mode'"
          :name="editMode ? 'edit_off' : 'edit'"
          class="edit-toggle"
          :class="{ active: editMode }"
          clickable
          @click="editMode = !editMode"
        />
        
        <v-menu placement="bottom-end" show-arrow :close-on-content-click="false">
          <template #activator="{ toggle, active }">
            <v-icon
              v-tooltip="t('add_field')"
              class="add-field"
              name="add"
              :class="{ active }"
              clickable
              @click="toggle"
            />
          </template>


          <v-field-list
              :collection="collection"
              :disabled-fields="fields"
              :allow-select-all="false"
              @add="handleAddField($event[0])"
          />
        </v-menu>
      </template>

      <!-- Cell Slots with Inline Editing and Relational Support -->
      <template
        v-for="header in tableHeaders"
        :key="header.value"
        #[`item.${header.value}`]="{ item }"
      >
        <div
          @click="handleRowClick($event, item)"
          :style="{
            cursor: 'pointer',
            height: '100%'
          }"
        >
          <editable-cell-relational
            :item="item"
            :field-key="header.value"
            :field="header.field"
            :edits="edits[item[primaryKeyField?.field]]?.[header.value]"
            :get-display-value="getFromAliasedItem"
            :saving="savingCells[`${item[primaryKeyField?.field]}_${header.value}`]"
            :edit-mode="editMode"
            :align="header.align"
            @update="updateFieldValue"
            @save="autoSaveEdits"
          />
        </div>
      </template>


      <!-- Empty State -->
      <template #no-data>
        <div class="no-data">
          <div class="padding-box">
            <v-icon name="search" large />
            <p>{{ t('no_items_found') }}</p>
          </div>
        </div>
      </template>
    </v-table>

    <!-- Pagination Footer -->
    <div class="footer" v-if="itemCount && itemCount > 0">
      <div class="pagination">
        <v-pagination
          v-if="totalPages > 1"
          v-model="page"
          :length="totalPages"
          :total-visible="7"
          show-first-last
          @update:model-value="toPage"
        />
      </div>

      <div class="per-page">
        <span>{{ t('per_page') }}:</span>
        <v-select
          v-model="limit"
          :items="[
            { text: '25', value: 25 },
            { text: '50', value: 50 },
            { text: '100', value: 100 },
            { text: '250', value: 250 },
            { text: '500', value: 500 },
            { text: '1000', value: 1000 }
          ]"
          inline
        />
      </div>
    </div>
    <!-- Rename Field Dialog -->
    <RenameFieldDialog
      v-model="showRenameDialog"
      v-model:field-name="renameFieldValue"
      :original-name="originalFieldName"
      @confirm="confirmRename"
      @cancel="cancelRename"
      @reset="resetToOriginal"
    />
    
    <!-- Language Selection Dialog for Translation Fields -->
    <LanguageSelectionDialog
      v-model="showLanguageDialog"
      v-model:selected-languages="selectedLanguagesForField"
      :field-name="pendingTranslationField?.name || ''"
      :languages="languageItems"
      @confirm="confirmLanguageSelection"
      @cancel="cancelLanguageSelection"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, toRefs, watch, unref, onMounted, onUnmounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { debounce } from 'lodash';
import {
  useStores,
  useItems,
  useCollection,
  useSync,
  useApi,
} from '@directus/extensions-sdk';
import { formatTitle } from '@directus/format-title';
import { getDefaultDisplayForType } from './core-clones/utils/get-default-display-for-type';
import { adjustFieldsForDisplays } from './core-clones/utils/adjust-fields-for-displays';
import { useAliasFields } from './core-clones/composables/use-alias-fields';
import { useLanguageSelector } from './composables/useLanguageSelector';
import { useTableSort } from './composables/useTableSort';
import { useTableEdits } from './composables/useTableEdits';
import { useTablePagination } from './composables/useTablePagination';
import { useTableFields } from './composables/useTableFields';
import { useFilterPresets } from './composables/useFilterPresets';
import EditableCellRelational from './components/EditableCellRelational.vue';
import RenameFieldDialog from './components/RenameFieldDialog.vue';
import QuickFilters from './components/QuickFilters.vue';
import ActiveFilterChips from './components/ActiveFilterChips.vue';
import LanguageSelectionDialog from './components/LanguageSelectionDialog.vue';
import type { Field, Item, Sort } from '@directus/types';
import type { LayoutOptions, LayoutQuery, Language, TranslationUpdate, TableHeader, Edits } from './types/table.types';

// Props & Emits
const props = defineProps<{
  collection: string;
  selection?: (string | number)[];
  layoutOptions?: LayoutOptions;
  layoutQuery?: LayoutQuery;
  filter?: any;
  search?: string;
  readonly?: boolean;
  resetPreset?: () => void;
  resetPresetAndRefresh?: () => void;
  refresh?: () => void;
}>();

const emit = defineEmits([
  'update:selection',
  'update:layoutOptions',
  'update:layoutQuery'
  // Note: 'update:filter' does NOT exist in Directus 11 for layout extensions!
]);

// Composables
const { t } = useI18n();
const router = useRouter();
const api = useApi();
const { useFieldsStore, useRelationsStore, useNotificationsStore } = useStores();
const fieldsStore = useFieldsStore();
const relationsStore = useRelationsStore();
const notificationsStore = useNotificationsStore();

// Synced refs
const selection = useSync(props, 'selection', emit);
const layoutOptions = useSync(props, 'layoutOptions', emit);
const layoutQuery = useSync(props, 'layoutQuery', emit);

// Collection info
const { collection, filter, search } = toRefs(props);
const {
  info,
  primaryKeyField,
  fields: fieldsInCollection,
  sortField,
} = useCollection(collection);


// Watch for changes in layoutOptions to sync customFieldNames
watch(() => layoutOptions.value?.customFieldNames, (newNames) => {
  if (newNames) {
    customFieldNames.value = newNames;
  }
});

// Language Selector - Only for fetching available languages
const { 
  languages, 
  loadingLanguages, 
  fetchLanguages, 
} = useLanguageSelector();

// Language items for v-select
const languageItems = computed(() => {
  // If no languages loaded yet, use fallback
  if (!languages.value || languages.value.length === 0) {
    const fallbackLangs = [
      { code: 'de-DE', name: 'Deutsch' },
      { code: 'en-US', name: 'English' },
      { code: 'fr-FR', name: 'Français' },
      { code: 'es-ES', name: 'Español' },
      { code: 'it-IT', name: 'Italiano' }
    ];
    return fallbackLangs.map(lang => ({
      text: lang.name,
      value: lang.code
    }));
  }
  
  return languages.value.map(lang => ({
    text: lang.name,
    value: lang.code
  }));
});

// Check if collection has translation fields
const hasTranslationFields = computed(() => {
  return fields.value.some((field: string) => field.startsWith('translations.'));
});

// Layout Options
const showToolbar = computed(() => layoutOptions.value?.showToolbar !== false);
// Default to true for filters
const showFilters = ref(true);
const showSelect = computed(() => {
  // Return 'multiple' for checkbox selection, false for no selection
  return layoutOptions.value?.showSelect !== false ? 'multiple' : false;
});
const sortAllowed = computed(() => !!sortField?.value);

// Use pagination composable
const { page, limit, pageSizeOptions } = useTablePagination(layoutQuery);

// Use sort composable
const { sort, tableSort, onSortChange } = useTableSort(layoutQuery);

// Fields with default value computation
const fieldsDefaultValue = computed(() => {
  return fieldsInCollection.value
    .filter((field: Field) => !field.meta?.hidden && !field.meta?.special?.includes('no-data'))
    .slice(0, 5)
    .map(({ field }: Field) => field)
    .sort();
});

const fields = computed({
  get() {
    if (layoutQuery.value?.fields) {
      return layoutQuery.value.fields;
    }
    return unref(fieldsDefaultValue);
  },
  set(value) {
    layoutQuery.value = { ...layoutQuery.value, fields: value };
  }
});

// Create a computed that strips language suffixes for aliasing
const fieldsForAliasing = computed(() => {
  return fields.value.map((field: string) => {
    // Remove language suffix for alias fields
    if (field.includes(':')) {
      return field.split(':')[0];
    }
    return field;
  });
});

// Use alias fields for proper relational data handling
const { aliasedFields, aliasQuery, aliasedKeys, getFromAliasedItem } = useAliasFields(
  fieldsForAliasing,
  collection
);

// Adjust fields for displays
const fieldsWithRelational = computed(() => {
  if (!props.collection) return [];
  
  // Get unique fields without language suffixes for API query
  // We fetch all translation data and filter client-side by language
  const uniqueFields = [...new Set(fields.value.map((field: string) => {
    return field.includes(':') ? field.split(':')[0] : field;
  }))];
  
  const adjustedFields = adjustFieldsForDisplays(uniqueFields, props.collection);
  
  // Ensure languages_code is included for translations
  if (hasTranslationFields.value && !adjustedFields.includes('translations.languages_code')) {
    adjustedFields.push('translations.languages_code');
  }
  
  
  return adjustedFields;
});

// Get all fields including aliased ones
const fieldsInQuery = computed(() => {
  // Include both regular fields and aliased fields
  const allFields = [...fields.value];
  
  // Add aliased field keys
  Object.values(aliasedFields.value).forEach((alias: any) => {
    if (alias.fields && Array.isArray(alias.fields)) {
      allFields.push(...alias.fields);
    }
  });
  
  return [...new Set(allFields)]; // Remove duplicates
});


// Table headers with relational field support
// Helper function to get translation field metadata
function getTranslationFieldMetadata(fieldKey: string) {
  if (fieldKey.startsWith('translations.')) {
    const subFieldName = fieldKey.split('.')[1];
    
    
    // Find the translations relation
    const relationsForField = relationsStore.getRelationsForField(collection.value, 'translations');
    
    if (relationsForField && relationsForField.length > 0) {
      const relation = relationsForField[0];
      // For O2M translations, the related collection contains the field definitions
      const translationsCollection = relation.related_collection || relation.collection;
      
      if (translationsCollection) {
        // Get field metadata from the translations collection
        const translationField = fieldsStore.getField(translationsCollection, subFieldName);
        if (translationField) {
          return translationField;
        }
      }
    }
    
    // Fallback: Common translation field types
    const commonTranslationFields: Record<string, any> = {
      'description': { type: 'text', meta: { interface: 'input-rich-text-html' } },
      'content': { type: 'text', meta: { interface: 'input-rich-text-html' } },
      'title': { type: 'string', meta: { interface: 'input' } },
      'name': { type: 'string', meta: { interface: 'input' } },
      'subtitle': { type: 'string', meta: { interface: 'input' } },
    };
    
    return commonTranslationFields[subFieldName] || null;
  }
  return null;
}

const tableHeaders = computed(() => {
  const activeFields = fields.value
    .map((key: string) => {
      // Check if field has language suffix (e.g., "translations.description:de-DE")
      let actualFieldKey = key;
      let languageCode = null;
      
      if (key.includes(':')) {
        [actualFieldKey, languageCode] = key.split(':');
      }
      
      let fieldData = fieldsStore.getField(collection.value, actualFieldKey);
      
      // Special handling for translation fields
      if (actualFieldKey.startsWith('translations.') && !fieldData) {
        const translationField = getTranslationFieldMetadata(actualFieldKey);
        if (translationField) {
          fieldData = {
            ...translationField,
            key: actualFieldKey,
            field: actualFieldKey,
          };
        }
      }
      
      // Add language code to field data if present
      if (fieldData && languageCode) {
        fieldData = {
          ...fieldData,
          key, // Keep the full key with language suffix
          languageCode,
        };
      }
      
      return fieldData ? { ...fieldData, key } : null;
    })
    .filter(Boolean);

  return activeFields.map((field: any) => {
    let description: string | null = null;
    let headerText = customFieldNames.value[field.key] || field.name || formatTitle(field.field);
    
    // Add language to header if present
    if (field.languageCode) {
      const language = languages.value.find(l => l.code === field.languageCode);
      const langName = language?.name || field.languageCode;
      headerText = `${headerText} (${langName})`;
    }

    // Handle nested field paths like "translations.title"
    const actualKey = field.key.includes(':') ? field.key.split(':')[0] : field.key;
    const fieldParts = actualKey.split('.');
    if (fieldParts.length > 1) {
      const fieldNames = fieldParts.map((fieldKey: string, index: number) => {
        const pathPrefix = fieldParts.slice(0, index);
        const fieldInfo = fieldsStore.getField(
          collection.value,
          [...pathPrefix, fieldKey].join('.')
        );
        return fieldInfo?.name ?? fieldKey;
      });
      description = fieldNames.join(' → ');
    }

    // Determine if field is sortable
    // Translation fields are sortable (they're text fields in the related table)
    const isTranslationField = actualKey.startsWith('translations.');
    const isSortable = isTranslationField ? true : !['json', 'alias', 'presentation', 'translations'].includes(field.type);
    
    return {
      text: headerText,
      value: field.key,
      description,
      width: layoutOptions.value?.widths?.[field.key] || null,
      align: layoutOptions.value?.align?.[field.key] || 'left',
      field: {
        ...field,
        display: field.meta?.display || getDefaultDisplayForType(field.type),
        displayOptions: field.meta?.display_options,
        interface: field.meta?.interface,
        interfaceOptions: field.meta?.options,
        type: field.type,
        field: field.field,
        collection: field.collection,
      },
      sortable: isSortable,
    };
  });
});

const tableHeadersWritable = computed({
  get: () => tableHeaders.value,
  set: (val) => {
    const widths: Record<string, number> = {};
    const newFields: string[] = [];
    
    val.forEach((header: any) => {
      if (header.width) {
        widths[header.value] = header.width;
      }
      newFields.push(header.value);
    });
    
    layoutOptions.value = {
      ...layoutOptions.value,
      widths,
    };
    
    fields.value = newFields;
  }
});

// Check if we have image fields
const hasImageFields = computed(() => {
  return fields.value?.some(field => {
    const fieldObj = fieldsInCollection.value?.find(f => f.field === field);
    return fieldObj?.meta?.interface === 'file-image' || 
           fieldObj?.meta?.interface === 'file' ||
           fieldObj?.meta?.interface === 'image' ||
           field.includes('image') ||
           field.includes('photo');
  }) || false;
});

// Row height - dynamic for image fields, fixed for others
const tableRowHeight = computed(() => {
  // If we have image fields, let rows adjust to content
  return hasImageFields.value ? null : 48;
});

// Edit Mode - use from layoutOptions for persistence
const editMode = computed({
  get: () => layoutOptions.value?.editMode === true,
  set: (val) => {
    layoutOptions.value = {
      ...layoutOptions.value,
      editMode: val,
    };
  }
});

// Search
const searchQuery = ref(search?.value || '');
const onSearchInput = debounce((val: string) => {
  emit('update:search', val);
}, 300);

// Build search filter for all fields including translations
function buildSearchFilter(query: string) {
  if (!query || query.trim() === '') return null;
  
  const searchValue = query.trim();
  const conditions: any[] = [];
  const processedFields = new Set<string>(); // Track processed fields to avoid duplicates
  
  // Process each visible field
  fields.value.forEach((fieldKey: string) => {
    // Remove language suffix if present (e.g., "translations.description:de-DE" -> "translations.description")
    const actualFieldKey = fieldKey.includes(':') ? fieldKey.split(':')[0] : fieldKey;
    
    // Skip if we've already processed this field (prevents duplicates from multi-language fields)
    if (processedFields.has(actualFieldKey)) {
      return;
    }
    processedFields.add(actualFieldKey);
    
    if (actualFieldKey.includes('.')) {
      // Handle relational fields
      const parts = actualFieldKey.split('.');
      const rootField = parts[0];
      const nestedField = parts.slice(1).join('.');
      
      if (rootField === 'translations') {
        // For translations, always search in ALL languages
        // This ensures users can find content regardless of the displayed language
        conditions.push({
          translations: {
            _some: {
              [nestedField]: {
                _icontains: searchValue
              }
            }
          }
        });
      } else {
        // Other relational fields
        conditions.push({
          [actualFieldKey]: {
            _icontains: searchValue
          }
        });
      }
    } else {
      // Direct fields - check if it's a searchable type
      const field = fieldsStore.getField(collection.value, actualFieldKey);
      const searchableTypes = ['string', 'text', 'uuid'];
      
      if (field && searchableTypes.includes(field.type)) {
        conditions.push({
          [actualFieldKey]: {
            _icontains: searchValue
          }
        });
      }
    }
  });
  
  // If no searchable fields, fallback to all string fields
  if (conditions.length === 0) {
    fieldsInCollection.value.forEach((field: Field) => {
      const searchableTypes = ['string', 'text', 'uuid'];
      if (searchableTypes.includes(field.type) && !field.meta?.hidden) {
        conditions.push({
          [field.field]: {
            _icontains: searchValue
          }
        });
      }
    });
  }
  
  return conditions.length > 0 ? { _or: conditions } : null;
}

// Computed search filter
const searchFilter = computed(() => {
  return buildSearchFilter(searchQuery.value);
});

// Build deep parameter for relational fields
const deep = computed(() => {
  const deepFields: Record<string, any> = {};
  
  fields.value.forEach((field: string) => {
    // Remove language suffix if present
    const actualField = field.includes(':') ? field.split(':')[0] : field;
    
    if (actualField.includes('.')) {
      const parts = actualField.split('.');
      const rootField = parts[0];
      
      // For translations, we fetch all and filter client-side
      if (rootField === 'translations') {
        if (!deepFields[rootField]) {
          deepFields[rootField] = {
            _fields: ['*'], // Get all fields including languages_code
            _limit: -1      // Get all translations for client-side filtering
          };
        }
      } else {
        // For other relations
        if (!deepFields[rootField]) {
          deepFields[rootField] = {
            _fields: ['*']
          };
        }
      }
    }
  });
  
  
  return Object.keys(deepFields).length > 0 ? deepFields : undefined;
});

// Initialize filter presets composable with layoutOptions
const {
  allPresets: filterPresets,
  activePresetIds,
  quickFilters,
  manualFilters,
  mergedFilters: presetMergedFilters,
  filterLogic,
  quickFilterChips,
  manualFilterChips,
  loadPresets,
  savePreset: saveFilterPreset,
  deletePreset: deleteFilterPreset,
  togglePreset: toggleFilterPreset,
  movePreset: moveFilterPreset,
  updatePreset: updateFilterPreset,
  removeQuickFilter,
  removeManualFilter,
  clearAllFilters: clearAllPresetFilters,
  updateManualFilters
} = useFilterPresets(collection, layoutOptions, emit);

// Handle quick filter saved event
async function handleQuickFilterSaved(event: any) {
  const { filterId, filter, activateFilter, clearNativeFilter } = event.detail || {};
  
  // Reload presets to get the new filter
  await loadPresets();
  
  if (activateFilter && filterId) {
    // Find the new preset
    const newPreset = filterPresets.value.find(p => p.id === filterId);
    if (newPreset) {
      // Activate the new filter
      toggleFilterPreset(newPreset);
    }
  }
  
  // Note: We CANNOT clear the native filter panel due to Directus 11 architecture limitations
  // The native filter will remain visible, but our Quick Filter will still work correctly
  if (clearNativeFilter) {
    // Simply show a success message - the Quick Filter is active even if native filter remains visible
    notificationsStore.add({
      title: 'Quick Filter Saved & Activated',
      text: `"${filterPresets.value.find(p => p.id === filterId)?.name}" is now active. You can manually clear the native filter if needed.`,
      type: 'success',
    });
  }
}

// Setup event listeners on mount
onMounted(() => {
  // Load presets from layoutOptions (no localStorage needed)
  loadPresets();
  
  // Listen for save events from actions
  window.addEventListener('quick-filter-saved', handleQuickFilterSaved);
});

onUnmounted(() => {
  window.removeEventListener('quick-filter-saved', handleQuickFilterSaved);
});

// Update manual filters when props.filter changes (from native filter interface)
watch(() => props.filter, (newFilter) => {
  updateManualFilters(newFilter);
}, { immediate: true, deep: true });

// Combine all filters: presets + manual + search
const combinedFilter = computed(() => {
  const presetFilter = presetMergedFilters.value;
  const searchFilterValue = searchFilter.value;
  
  const filters = [];
  
  if (presetFilter) filters.push(presetFilter);
  if (searchFilterValue) filters.push(searchFilterValue);
  
  if (filters.length === 0) return null;
  if (filters.length === 1) return filters[0];
  
  // Combine all filters with AND logic
  return {
    _and: filters
  };
});

// Items & Loading with proper fields and alias handling
const {
  items,
  loading,
  error,
  totalPages,
  itemCount,
  totalCount,
  changeManualSort: originalChangeManualSort,
  getItems,
} = useItems(collection, {
  sort,
  limit,
  page,
  fields: fieldsWithRelational,
  alias: aliasQuery,
  filter: combinedFilter, // Use combined filter instead of separate filter and search
  deep: deep,
});

// Use the original changeManualSort directly
const changeManualSort = originalChangeManualSort;

// Create a wrapper function for getItems
async function refreshItems() {
  await getItems();
}

// Watch for refresh prop calls
watch(() => props.refresh, (newVal) => {
  if (newVal) {
    refreshItems();
  }
});

watch(() => props.resetPresetAndRefresh, (newVal) => {
  if (newVal) {
    refreshItems();
  }
});

// Handle select all toggle
function onToggleSelectAll() {
  if (items.value && items.value.length > 0) {
    const allSelected = selection.value?.length === items.value.length;
    
    if (allSelected) {
      // Deselect all
      selection.value = [];
    } else {
      // Select all - use keys since we have selection-use-keys
      selection.value = items.value.map(item => item[primaryKeyField.value?.field || 'id']);
    }
  }
}

// Edits tracking
const { 
  edits, 
  hasEdits, 
  savingCells, 
  updateFieldValue, 
  autoSaveEdits, 
  resetEdits 
} = useTableEdits(collection, primaryKeyField, items, getItems);


// Field management
const {
  customFieldNames,
  showRenameDialog,
  renameFieldKey,
  renameFieldValue,
  originalFieldName,
  showLanguageDialog,
  pendingTranslationField,
  selectedLanguagesForField,
  getFieldName,
  renameField,
  resetToOriginal,
  confirmRename,
  cancelRename,
  showLanguageSelectionForField,
  cancelLanguageSelection,
  confirmLanguageSelection,
  toggleField,
  removeField
} = useTableFields(fields, fieldsInCollection, collection, fieldsStore, relationsStore, layoutOptions);

// Fetch languages when we have translation fields
watch(hasTranslationFields, (hasTranslations) => {
  if (hasTranslations) {
    fetchLanguages();
  }
}, { immediate: true });

// Initialize before using in useItems
const saving = ref(false);

// Filter removal handlers
function removeFilter(filter: any) {
  if (filter.source === 'quick') {
    removeQuickFilter(filter);
  } else {
    removeManualFilter(filter);
  }
}

// Clear all filters including native filter interface
async function clearAllFilters() {
  // Clear our preset filters
  clearAllPresetFilters();
  
  // Clear search
  searchQuery.value = '';
  
  // Clear native filter interface by updating URL
  await clearNativeFilter();
}

// Helper function to clear native Directus filter interface
async function clearNativeFilter() {
  const currentQuery = { ...router.currentRoute.value.query };
  
  // Remove filter-related query parameters
  delete currentQuery.filter;
  delete currentQuery.search;
  
  // Emit updates for consistency
  emit('update:filter', null);
  emit('update:layoutQuery', {
    ...layoutQuery.value,
    filter: null
  });
  
  // Update manual filters in our preset system
  updateManualFilters({});
  
  // Update the URL - this will trigger the native interface to clear
  await router.replace({
    path: router.currentRoute.value.path,
    query: currentQuery
  });
  
  // Wait for next tick to ensure the update is processed
  await nextTick();
  
  // Force refresh the items to show the unfiltered results
  await refreshItems();
  
  // Show success notification
  notificationsStore.add({
    title: 'Filter cleared',
    text: 'Native filter interface has been reset',
    type: 'success',
    persist: false,
    closeable: true,
  });
}


// Selection
const selectionWritable = computed({
  get: () => selection.value || [],
  set: (val) => {
    selection.value = val;
  }
});

// Methods

function onAlignChange(field: string, align: 'left' | 'center' | 'right') {
  layoutOptions.value = {
    ...layoutOptions.value,
    align: {
      ...(layoutOptions.value?.align || {}),
      [field]: align,
    }
  };
}

async function handleAddField(fieldKey: string) {
  // Check if it's a translation field
  if (fieldKey.startsWith('translations.')) {
    // Ensure languages are loaded
    await fetchLanguages();
    
    // Get field metadata
    const field = fieldsStore.getField(collection.value, fieldKey);
    pendingTranslationField.value = {
      key: fieldKey,
      name: field?.name || fieldKey.split('.').pop()
    };
    
    // Reset selection
    selectedLanguagesForField.value = [];
    
    // Show language selection dialog
    showLanguageDialog.value = true;
  } else {
    // Regular field - add directly
    addField(fieldKey);
  }
}

function addField(fieldKey: string) {
  if (!fields.value.includes(fieldKey)) {
    fields.value = [...fields.value, fieldKey];
  }
}








// Pagination navigation
function toPage(newPage: number) {
  page.value = newPage;
}

function editItem(item: Item) {
  const primaryKey = item[primaryKeyField.value!.field];
  router.push(`/content/${collection.value}/${primaryKey}`);
}

function handleRowClick(event: MouseEvent, item: Item) {
  const target = event.target as HTMLElement;
  
  // Don't navigate if:
  // - A button/icon was clicked
  // - An input/editor is active
  // - Text is being selected
  // - Click is on an editable cell that's currently being edited
  if (
    target.closest('button') ||
    target.closest('.v-icon') ||
    target.closest('.v-menu') ||
    target.closest('input') ||
    target.closest('textarea') ||
    target.closest('.edit-popover') ||
    target.closest('.is-editing') ||
    window.getSelection()?.toString()
  ) {
    return;
  }
  
  // Navigate to detail page
  editItem(item);
}


// Watch for search changes
watch(searchQuery, (val) => {
  onSearchInput(val);
});

// Handle refresh event from actions component (for duplicate)
function handleItemsDuplicated() {
  // Refresh the items list
  getItems();
  // Clear selection after successful duplication
  selection.value = [];
}

// Handle items deleted event
async function handleItemsDeleted(deletedIds?: any[]) {
  // Clear selection
  selection.value = [];
  
  // Refresh from server
  await getItems();
}

// Setup event listeners for cross-component communication
onMounted(() => {
  window.addEventListener('directus-items-duplicated', handleItemsDuplicated);
  
  // Listen for Directus core delete events
  window.addEventListener('items-deleted', () => refreshItems());
  
  // Listen for collection refresh events
  window.addEventListener('refresh-collection', (event: any) => {
    if (event.detail?.collection === collection.value) {
      refreshItems();
    }
  });
});

onUnmounted(() => {
  window.removeEventListener('directus-items-duplicated', handleItemsDuplicated);
  window.removeEventListener('items-deleted', refreshItems);
  window.removeEventListener('refresh-collection', refreshItems);
});
</script>

<style scoped>
.super-layout-table {
  display: contents;
  margin: var(--content-padding);
  margin-bottom: var(--content-padding-bottom);
}

.table-toolbar {
  margin: 0 var(--content-padding);
  padding: 12px 0;
  border-bottom: var(--border-width) solid var(--border-normal);
}

.toolbar-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.search-input {
  flex: 0 0 auto;
  min-width: 200px;
  max-width: 400px;
}

.search-input :deep(.v-input) {
  height: 36px !important;
  min-height: 36px !important;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.table {
  --v-table-sticky-offset-top: var(--layout-offset-top);
  display: contents;
}

/* Table layout matching original Directus */
.table :deep(table) {
  min-width: calc(100% - var(--content-padding)) !important;
  margin-left: var(--content-padding);
  table-layout: auto; /* Let columns size based on content */
}

.table :deep(tr) {
  margin-right: var(--content-padding);
}

/* Row height - controlled by content */
.table :deep(tbody tr) {
  /* Standard height, but can grow if needed */
  min-height: 48px;
  /* Remove any forced height */
}

.table :deep(tbody td) {
  /* Moderate padding for clean appearance */
  padding-top: 4px;
  padding-bottom: 4px;
  vertical-align: middle !important;
}

/* Allow edit cells to fill their container */
.table :deep(.edit-cell) {
  height: 100%;
  min-height: 36px;
}

/* Force ALL cell content to be vertically centered */
.table :deep(tbody td .cell) {
  display: flex !important;
  align-items: center !important;
  justify-content: inherit !important;
  min-height: 32px;
  height: 100%;
}

/* Make sure our custom wrapper uses full height and centers content */
.table :deep(tbody td .cell > div) {
  display: flex !important;
  align-items: center !important;
  width: 100%;
  height: 100%;
}

/* Remove focus outlines - simplified */
.table :deep(tbody tr),
.table :deep(tbody tr td),
.table :deep(.edit-cell),
.table :deep(.edit-cell:focus),
.table :deep(.edit-cell.is-editable),
.table :deep(.edit-cell.is-editable:focus) {
  outline: none !important;
}

/* Text truncation for cell content - only data cells, not header/checkbox/drag */
.table :deep(tbody .cell:not(.select):not(.drag)) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Ensure content cell children are truncated - tbody only */
.table :deep(tbody .cell:not(.select):not(.drag) > *) {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

/* Override v-table's .cell.select for proper checkbox alignment */
.table :deep(.table-row .cell.select) {
  width: 48px !important;
  min-width: 48px !important;
  max-width: 48px !important;
  padding: 0 8px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  overflow: visible !important;
}

/* Ensure header checkbox is also properly aligned */
.table :deep(thead .cell.select) {
  width: 48px !important;
  padding: 0 8px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* Special handling for render-display wrapper */
.table :deep(.render-display) {
  display: block !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  max-width: 100% !important;
  line-height: 1.4 !important;
}

/* Force inline display for nested HTML elements */
.table :deep(.render-display *) {
  display: inline !important;
  white-space: nowrap !important;
}

/* Override styles for p tags and divs inside render-display */
.table :deep(.render-display p),
.table :deep(.render-display div),
.table :deep(.render-display span) {
  display: inline !important;
  margin: 0 !important;
  padding: 0 !important;
}

.add-field {
  color: var(--foreground-subdued);
  transition: color var(--fast) var(--transition);
}

.add-field:hover,
.add-field.active {
  color: var(--foreground-normal);
}

v-icon.edit-toggle {
  color: var(--foreground-subdued);
  transition: color var(--fast) var(--transition);
  margin-right: 8px;
  font-size: 16px !important;
}

v-icon.edit-toggle:hover {
  color: var(--foreground-normal);
}

v-icon.edit-toggle.active {
  color: var(--primary);
}


.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--foreground-subdued);
}

.padding-box {
  text-align: center;
  padding: 32px;
}

.footer {
  position: sticky;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 32px var(--content-padding);
  border-top: var(--border-width) solid var(--border-normal);
}

.pagination {
  display: inline-block;
}

.per-page {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--foreground-subdued);
}

.flip {
  transform: scaleY(-1);
}

/* Cell alignment styles - required for v-table alignment to work */
.table :deep(td.align-left),
.table :deep(th.align-left) {
  text-align: start;
  justify-content: start;
}

.table :deep(td.align-center),
.table :deep(th.align-center) {
  text-align: center;
  justify-content: center;
}

.table :deep(td.align-right),
.table :deep(th.align-right) {
  text-align: end;
  justify-content: end;
}

/* Ensure alignment works with cell content */
.table :deep(td.align-center .cell),
.table :deep(th.align-center .cell) {
  justify-content: center;
}

.table :deep(td.align-right .cell),
.table :deep(th.align-right .cell) {
  justify-content: flex-end;
}

/* Force display-formatted and render-display to use full width for alignment */
.table :deep(.display-formatted) {
  width: 100% !important;
  display: block !important;
}

.table :deep(.render-display) {
  width: 100% !important;
  display: block !important;
}

/* Ensure all cell content respects alignment */
.table :deep(td .cell > div) {
  width: 100% !important;
}

/* Specific fixes for inline-edit-popover and editable cells */
.table :deep(.inline-edit-popover) {
  width: 100% !important;
}

.table :deep(.editable-cell) {
  width: 100% !important;
  display: block !important;
}

/* Boolean fields (icons) alignment - override default styles */
.table :deep(.display-boolean),
.table :deep(.boolean) {
  width: 100% !important;
  display: block !important;
  align-items: unset !important; /* Remove default center alignment */
  justify-content: unset !important;
}

/* Ensure v-icon respects parent alignment */
.table :deep(.display-boolean .v-icon),
.table :deep(.boolean .v-icon) {
  display: inline-block !important;
}

/* Apply text-align to boolean display wrappers based on column alignment */
.table :deep(td.align-center .display-boolean),
.table :deep(td.align-center .boolean) {
  text-align: center !important;
}

.table :deep(td.align-right .display-boolean),
.table :deep(td.align-right .boolean) {
  text-align: right !important;
}

.table :deep(td.align-left .display-boolean),
.table :deep(td.align-left .boolean) {
  text-align: left !important;
}

/* Force all display elements with icons to respect alignment */
.table :deep(.display-formatted:has(.v-icon)) {
  width: 100% !important;
  display: block !important;
  text-align: inherit !important;
}

/* Select fields alignment - override default styles */
.table :deep(.display-labels),
.table :deep(.display-color),
.table :deep(.display-select),
.table :deep(.select-cell) {
  width: 100% !important;
  display: block !important;
  align-items: unset !important;
  justify-content: unset !important;
}

/* StatusCell needs flex display for alignment */
.table :deep(.status-cell) {
  width: 100% !important;
}

/* Select field chips/badges alignment */
.table :deep(.display-labels .v-chip),
.table :deep(.display-select .v-chip),
.table :deep(.status-cell .v-chip) {
  display: inline-block !important;
}

/* Apply text-align to select display wrappers based on column alignment */
.table :deep(td.align-center .display-labels),
.table :deep(td.align-center .display-color),
.table :deep(td.align-center .display-select),
.table :deep(td.align-center .select-cell) {
  text-align: center !important;
}

.table :deep(td.align-right .display-labels),
.table :deep(td.align-right .display-color),
.table :deep(td.align-right .display-select),
.table :deep(td.align-right .select-cell) {
  text-align: right !important;
}

.table :deep(td.align-left .display-labels),
.table :deep(td.align-left .display-color),
.table :deep(td.align-left .display-select),
.table :deep(td.align-left .select-cell) {
  text-align: left !important;
}

/* Ensure color dots in select fields also align correctly */
.table :deep(.display-color .color-dot) {
  display: inline-block !important;
  vertical-align: middle !important;
}
</style>