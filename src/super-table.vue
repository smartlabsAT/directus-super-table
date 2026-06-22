<!-- super-layout-table with full relational field support and filter presets -->
<template>
  <div class="super-layout-table" @click.capture="openRowInNewTabOnModifier">
    <!-- Top Bar with Search and Filters -->
    <div class="table-toolbar" v-if="showToolbar">
      <div class="toolbar-content">
        <div class="search-input">
          <v-input v-model="searchQuery" type="search" :placeholder="t('search_items')">
            <template #prepend>
              <v-icon name="search" />
            </template>
            <template #append v-if="searchQuery">
              <v-icon name="close" clickable @click="searchQuery = ''" />
            </template>
          </v-input>
        </div>

        <!-- Quick Filter Buttons -->
        <QuickFilters
          v-if="showFilters"
          :collection="collection"
          :presets="filterPresets"
          :active-preset-ids="activePresetIds"
          :current-filter="presetMergedFilters || undefined"
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
      <div v-if="(selection?.value?.length || 0) > 0" class="selection-count">
        {{ selection?.value?.length || 0 }}
        {{ (selection?.value?.length || 0) === 1 ? 'item' : 'items' }} selected
      </div>
    </div>
    <!-- Main Table -->
    <v-table
      v-if="loading || hasRenderableData"
      ref="tableRef"
      v-model="selectionWritable"
      v-model:headers="tableHeadersWritable"
      :class="['table', { 'has-image-fields': hasImageFields, 'edit-mode': editMode }]"
      :show-select="showSelect"
      show-resize
      must-sort
      :sort="tableSort"
      :items="items"
      :loading="loading"
      :item-key="getPrimaryKeyFieldName()"
      :show-manual-sort="sortAllowed"
      :manual-sort-key="sortFieldName"
      allow-header-reorder
      selection-use-keys
      :row-height="tableRowHeight"
      :clickable="!editMode"
      @update:sort="onSortChange"
      @manual-sort="handleManualSort"
      @toggle-select-all="onToggleSelectAll"
      @click:row="handleTableRowClick"
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

          <v-list-item clickable @click="renameField(header.value)">
            <v-list-item-icon>
              <v-icon name="edit" />
            </v-list-item-icon>
            <v-list-item-content> Rename </v-list-item-content>
          </v-list-item>

          <v-list-item clickable @click="removeField(header.value)">
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
        <editable-cell-relational
          :item="item"
          :field-key="header.value"
          :field="header.field"
          :edits="edits[item[getPrimaryKeyFieldName()]]?.[header.value]"
          :get-display-value="getFromAliasedItem"
          :saving="savingCells[`${item[getPrimaryKeyFieldName()]}_${header.value}`]"
          :edit-mode="editMode"
          :align="header.align"
          :direct-boolean-toggle="(layoutOptions as any)?.directBooleanToggle"
          :primary-key-field-name="getPrimaryKeyFieldName()"
          :language-code-field="translationConfig.languageCodeField"
          :column-displays="(layoutOptions as any)?.columnDisplays"
          @update="updateFieldValue"
          @save="autoSaveEdits"
        />
      </template>
    </v-table>

    <!-- Error State when the items request failed -->
    <div v-else-if="!loading && error" class="no-data">
      <div class="padding-box">
        <v-icon name="error_outline" large />
        <p>{{ t('unexpected_error') }}</p>
      </div>
    </div>

    <!-- Empty State when no items and not loading -->
    <div v-else-if="!loading && !error" class="no-data">
      <div class="padding-box">
        <v-icon name="search" large />
        <p v-if="hasActiveFilters || searchQuery || search">{{ t('no_results') }}</p>
        <p v-else>{{ t('no_items') }}</p>
        <v-button v-if="hasActiveFilters || searchQuery || search" @click="clearAllFilters">
          {{ t('clear_filters') }}
        </v-button>
      </div>
    </div>

    <!-- Pagination Footer -->
    <div class="footer" v-if="hasRenderableData">
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
        <v-select v-model="limit" :items="perPageOptions" inline />
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
      :existing-languages="existingLanguagesForDialog"
      :mode="languageDialogMode"
      @confirm="confirmLanguageSelection"
      @cancel="cancelLanguageSelection"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, toRefs, watch, unref, onMounted, onUnmounted, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { debounce } from 'lodash';
import { useStores, useCollection, useSync, useApi } from '@directus/extensions-sdk';
import { formatTitle } from '@directus/format-title';
import { getDefaultDisplayForType } from './utils/getDefaultDisplayForType';
import { filterValidFields, filterValidColumnDisplays } from './utils/fieldValidity';
import { splitLanguageSuffix, stripLanguageSuffix } from './utils/displayHeuristics';
import { useTableApi } from './composables/api';
import { useAliasFields } from './composables/useAliasFields';
import { useLanguageSelector } from './composables/useLanguageSelector';
import { useTableSort } from './composables/useTableSort';
import { useTableEdits } from './composables/useTableEdits';
import { useTablePagination } from './composables/useTablePagination';
import { useTableFields } from './composables/useTableFields';
import { useFilterPresets } from './composables/useFilterPresets';
import { usePermissions } from './composables/usePermissions';
import { useTranslationLanguages } from './composables/useTranslationLanguages';
import { getTranslationFieldMetadata } from './utils/resolveTranslationsCollection';
import { buildSearchFilter } from './utils/buildSearchFilter';
import { normalizeIncomingSearch, normalizeOutgoingSearch } from './utils/searchSync';
import {
  useTranslationConfig,
  getTranslationLanguageFieldPath,
} from './composables/useTranslationConfig';
import { sanitizeFilter } from './utils/sanitizeFilter';
import { buildDeep } from './utils/buildNestedM2ADeep';
import { buildQueryFingerprint } from './utils/buildQueryFingerprint';
import { createCoalescedRunner } from './utils/coalesce';
import { PER_PAGE_OPTIONS } from './constants/pagination';
import { DEFAULT_LANGUAGES } from './constants/languages';
import EditableCellRelational from './components/EditableCellRelational.vue';
import RenameFieldDialog from './components/RenameFieldDialog.vue';
import QuickFilters from './components/QuickFilters.vue';
import LanguageSelectionDialog from './components/LanguageSelectionDialog.vue';
import type { Field, Item } from '@directus/types';
import type { LayoutOptions, LayoutQuery } from './types/table.types';

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
  clearFilters?: () => void;
}>();

const emit = defineEmits<{
  'update:selection': [value: (string | number)[]];
  'update:layoutOptions': [value: LayoutOptions];
  'update:layoutQuery': [value: LayoutQuery];
  'update:search': [value: string | null];
  'update:filter': [value: any];
}>();

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
const { collection, filter, search, readonly } = toRefs(props);
// @ts-expect-error — Vue peer-dep skew between SDK and host: RefSymbol mismatch
const { primaryKeyField, fields: fieldsInCollection, sortField } = useCollection(collection);

// Helper to get primary key field name with proper typing
const getPrimaryKeyFieldName = () => {
  if (primaryKeyField?.value?.field) {
    return primaryKeyField.value.field;
  }
  if ((primaryKeyField as any)?.field) {
    return (primaryKeyField as any).field;
  }

  // Log warning if we couldn't determine the primary key from schema
  console.warn(
    `[Super Layout Table] Could not determine primary key field for collection "${collection.value}". Using fallback "id". This may cause issues if your collection uses a different primary key.`
  );
  return 'id';
};

// Watch for changes in layoutOptions to sync customFieldNames
watch(
  () => layoutOptions.value?.customFieldNames,
  (newNames) => {
    if (newNames) {
      customFieldNames.value = newNames;
    }
  }
);

// Language Selector - Only for fetching available languages
const { languages, fetchLanguages } = useLanguageSelector();

// Per page options for pagination
const perPageOptions = PER_PAGE_OPTIONS;

// Permissions composable + one-shot notification flag for sanitized filters.
// Declared here (before any computed that references it) to avoid TDZ hazards
// — Vue's reactive watchers track dependency reads eagerly during setup, and
// any future watcher that touches the language picker would otherwise hit the
// uninitialised binding.
const permissions = usePermissions();
const filterSanitizationNotified = ref(false);

// "Add column" picker uses the permission-store list (every language the user
// could ever see) rather than the probe-based `effectiveAccessibleLanguages`,
// so empty languages still appear as options. Header rendering keeps the
// stricter probe list.
const languageItems = computed(() => {
  const baseList =
    languages.value && languages.value.length > 0 ? languages.value : DEFAULT_LANGUAGES;
  const accessibleLanguages = permissions.getAccessibleLanguages(baseList as any);

  return baseList
    .filter((lang) => accessibleLanguages.length === 0 || accessibleLanguages.includes(lang.code))
    .map((lang) => ({
      text: lang.name,
      value: lang.code,
    }));
});

// Existing languages for the dialog (based on pending translation field)
const existingLanguagesForDialog = computed(() => {
  if (!pendingTranslationField.value || !detectExistingLanguagesForField) return [];

  const baseField = getBaseFieldKey
    ? getBaseFieldKey(pendingTranslationField.value.key)
    : pendingTranslationField.value.key;
  return detectExistingLanguagesForField(baseField);
});

// Check if collection has translation fields
const hasTranslationFields = computed(() => {
  return fields.value.some((field: string) => field.startsWith('translations.'));
});

// Translation configuration
const translationConfig = useTranslationConfig(layoutOptions);

// Layout Options
const showToolbar = computed(() => layoutOptions.value?.showToolbar !== false);
// Default to true for filters
const showFilters = ref(true);
const showSelect = computed(() => {
  // Return 'multiple' for checkbox selection, false for no selection
  return layoutOptions.value?.showSelect !== false ? 'multiple' : false;
});

// Get the sort field name from the collection's sortField
const sortFieldName = computed(() => {
  // sortField from useCollection returns the field name directly
  return sortField.value || null;
});

// Manual sort is allowed when there's a sort field and not readonly
// Note: We don't check loading state to prevent manual sort column from disappearing during operations
const sortAllowed = computed(() => {
  return !!sortFieldName.value && !readonly.value;
});

// Use pagination composable
const { page, limit } = useTablePagination(layoutQuery as any);

// Pass collection + fieldsStore so stale sort fields referencing deleted
// columns are silently dropped instead of triggering 400s on the next fetch.
const { sort, tableSort, onSortChange } = useTableSort(
  layoutQuery as any,
  collection as Ref<string | null>,
  fieldsStore
);

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
    const validFields = filterValidFields(layoutQuery.value?.fields, collection.value, fieldsStore);
    if (validFields.length > 0) return validFields;
    return unref(fieldsDefaultValue);
  },
  set(value) {
    layoutQuery.value = { ...layoutQuery.value, fields: value };
  },
});

// Create a computed that strips language suffixes for aliasing
const fieldsForAliasing = computed(() => {
  return fields.value.map((field: string) => stripLanguageSuffix(field));
});

// Use alias fields for proper relational data handling.
// Issue #48: forward the columnDisplays override map so the API query expands
// override template paths (e.g. `{{ user.first_name }}`) into deep field
// requests via `adjustFieldsForDisplays`. Drop entries that point at fields
// the user has since deleted from the collection (mirrors filterValidFields).
type ColumnDisplayShape = { template: string; display?: string };
const columnDisplaysRef = computed(() =>
  filterValidColumnDisplays<ColumnDisplayShape>(
    (layoutOptions.value as any)?.columnDisplays,
    collection.value,
    fieldsStore
  )
);

const { aliasedFields, aliasQuery, getFromAliasedItem } = useAliasFields(
  fieldsForAliasing,
  collection,
  columnDisplaysRef
);

// Must be declared after `fields` / `hasTranslationFields` so the watcher
// inside `useTranslationLanguages` doesn't touch them before initialisation
// (Vue tracks reactive dependencies eagerly during setup → TDZ otherwise).
const translationsCollectionRef = computed<string | null>(() => {
  if (!hasTranslationFields.value) return null;
  return (
    relationsStore.getRelationsForField(collection.value, 'translations')?.[0]?.collection ?? null
  );
});

// Probe wins over the static permission-store lookup because Directus does
// not expose row-level filters (e.g. `languages_code._in: [de-DE, en-GB]`)
// via /permissions/me — the aggregate query is the only way to discover them.
const { probedLanguages } = useTranslationLanguages(
  translationsCollectionRef,
  computed(() => translationConfig.value.languageCodeField)
);

const effectiveAccessibleLanguages = computed<string[]>(() => {
  if (probedLanguages.value && probedLanguages.value.length > 0) {
    return probedLanguages.value;
  }
  return permissions.getAccessibleLanguages(languages.value);
});

// Create fields for API query using the aliased fields (following original Directus pattern)
const fieldsWithRelational = computed(() => {
  if (!props.collection) return [];

  // Extract all fields from aliasedFields (this includes display-adjusted fields)
  const allDisplayFields = Object.values(aliasedFields.value).flatMap((aliasInfo) => {
    return aliasInfo.fields || [aliasInfo.key];
  });

  const adjustedFields = [...new Set(allDisplayFields)];

  // PK + language-code path are added BEFORE the permission gate so sanitize
  // can drop them when the user lacks read access — matches native Directus,
  // where `useCollection.primaryKeyField` is permission-filtered and a denied
  // PK simply degrades interaction (no item-key, no inline edit) rather than
  // 403'ing the entire fetch.
  const pkField = getPrimaryKeyFieldName();
  if (!adjustedFields.includes(pkField)) adjustedFields.unshift(pkField);

  if (hasTranslationFields.value) {
    const languageFieldPath = getTranslationLanguageFieldPath(translationConfig.value);
    if (!adjustedFields.includes(languageFieldPath)) adjustedFields.push(languageFieldPath);
  }

  const translationsCollection = relationsStore.getRelationsForField(
    props.collection,
    'translations'
  )?.[0]?.collection;
  return permissions.sanitizeFields(props.collection, adjustedFields, {
    translationsCollection,
    accessibleLanguages: effectiveAccessibleLanguages.value,
  });
});

// Table headers with relational field support

const tableHeaders = computed(() => {
  const accessibleLanguages = effectiveAccessibleLanguages.value;
  const translationsCollection = translationsCollectionRef.value;

  const activeFields = fields.value
    .filter((rawKey: string) => {
      // Permission gate: drop language-suffixed translation fields the user can't read
      const { path, language: lang } = splitLanguageSuffix(rawKey);
      if (lang !== null && path.startsWith('translations.')) {
        if (accessibleLanguages.length > 0 && !accessibleLanguages.includes(lang)) return false;
        const subField = path.split('.').slice(1).join('.');
        if (translationsCollection && !permissions.canRead(translationsCollection, subField))
          return false;
      }
      // Permission gate: drop main-collection fields the user can't read
      const rootField = stripLanguageSuffix(rawKey).split('.')[0];
      if (!permissions.canRead(collection.value, rootField)) return false;
      return true;
    })
    .map((key: string) => {
      // Check if field has language suffix (e.g., "translations.description:de-DE")
      const split = splitLanguageSuffix(key);
      let actualFieldKey = split.path;
      let languageCode = split.language;

      let fieldData = fieldsStore.getField(collection.value, actualFieldKey);

      // Special handling for translation fields
      if (actualFieldKey.startsWith('translations.') && !fieldData) {
        const translationField = getTranslationFieldMetadata(
          collection.value,
          actualFieldKey,
          fieldsStore,
          relationsStore
        );
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
      const language = languages.value.find((l) => l.code === field.languageCode);
      const langName = language?.name || field.languageCode;
      headerText = `${headerText} (${langName})`;
    }

    // Handle nested field paths like "translations.title"
    const actualKey = stripLanguageSuffix(field.key);
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

    // Default to sortable unless it's a known non-sortable type
    const nonSortableTypes = ['json', 'alias', 'presentation', 'translations'];
    const isSortable = isTranslationField
      ? true
      : !field.type || !nonSortableTypes.includes(field.type);

    const headerResult = {
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

    return headerResult;
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
  },
});

// Check if we have image fields
const hasImageFields = computed(() => {
  return (
    fields.value?.some((field: string) => {
      const fieldObj = fieldsInCollection.value?.find((f) => f.field === field);
      return (
        fieldObj?.meta?.interface === 'file-image' ||
        fieldObj?.meta?.interface === 'file' ||
        fieldObj?.meta?.interface === 'image' ||
        field.includes('image') ||
        field.includes('photo')
      );
    }) || false
  );
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
  },
});

// Search — single internal source of truth, mirrored from the native
// header search (props.search, persisted per preset by Directus core).
//
// Native → internal: fully supported. collection.vue binds `:search` on
// the layout wrapper and updates it per keystroke (no core debounce).
//
// Internal → native: NOT supported by the platform. The layout wrapper
// (createLayoutWrapper, @directus/composables) only forwards
// update:selection/layoutOptions/layoutQuery and silently swallows
// `onUpdate:search`. The debounced emit below is a no-op today and kept
// only for forward-compatibility; the equality guards make it loop-safe
// should Directus ever whitelist `search` as a writable layout prop.
const searchQuery = ref('');
// Debounced mirror that actually drives the request filter, so fast typing
// fires one fetch after the user pauses instead of one per keystroke. Seeded
// synchronously on preset hydration / native change (below) so a
// preset-restored search already filters the FIRST load.
const debouncedSearchQuery = ref('');
const applyDebouncedSearch = debounce((val: string) => {
  debouncedSearchQuery.value = val;
}, 300);

// Only the FIRST hydration must reflect into the request filter synchronously
// (a preset-restored search has to filter the initial load — no unfiltered
// flash). Every change after that — including typing in the native header —
// flows through watch(searchQuery) and the 300ms debounce, so the native
// search no longer fetches once per keystroke.
let searchSeeded = false;
watch(
  search,
  (val) => {
    // Native clear emits null; usePreset normalizes '' to null as well.
    const incoming = normalizeIncomingSearch(val);
    if (incoming !== searchQuery.value) {
      searchQuery.value = incoming;
      if (!searchSeeded) {
        // First hydration: watch(searchQuery) isn't registered yet, so seed the
        // debounced query directly and cancel any pending typing-debounce.
        applyDebouncedSearch.cancel();
        debouncedSearchQuery.value = incoming;
      }
      // Later changes: watch(searchQuery) schedules the debounced update.
    }
    searchSeeded = true;
  },
  { immediate: true }
);

const onSearchInput = debounce((val: string) => {
  // Mirror native semantics: empty input is represented as null.
  const outgoing = normalizeOutgoingSearch(val);
  if ((search?.value ?? null) !== outgoing) {
    emit('update:search', outgoing);
  }
}, 300);

// Computed search filter — reads the DEBOUNCED query so the request lags
// typing by one debounce window instead of recomputing per keystroke.
const searchFilter = computed(() =>
  buildSearchFilter({
    query: debouncedSearchQuery.value,
    visibleFields: fields.value,
    fieldsInCollection: fieldsInCollection.value,
    collection: collection.value,
    fieldsStore,
    relationsStore,
  })
);

// Build the `deep` parameter from a single schema-driven classifier. Two field
// lists: `fields` drives the first-level entries, `fieldsWithRelational` carries
// the display-expanded M2A item paths for the nested entries.
const deep = computed(() =>
  buildDeep(fields.value, fieldsWithRelational.value, collection.value, fieldsStore, relationsStore)
);

// Initialize filter presets composable with layoutOptions
const {
  allPresets: filterPresets,
  activePresetIds,
  mergedFilters: presetMergedFilters,
  loadPresets,
  savePreset: saveFilterPreset,
  deletePreset: deleteFilterPreset,
  togglePreset: toggleFilterPreset,
  movePreset: moveFilterPreset,
  updatePreset: updateFilterPreset,
  updateManualFilters,
} = useFilterPresets(collection, layoutOptions as any, (event: string, ...args: any[]) =>
  (emit as any)(event, ...args)
);

// Handle quick filter saved event
async function handleQuickFilterSaved(event: any) {
  const { filterId, activateFilter, clearNativeFilter } = event.detail || {};

  // Reload presets to get the new filter
  await loadPresets();

  if (activateFilter && filterId) {
    // Find the new preset
    const newPreset = filterPresets.value.find((p) => p.id === filterId);
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
      text: `"${filterPresets.value.find((p) => p.id === filterId)?.name}" is now active. You can manually clear the native filter if needed.`,
      type: 'success',
    });
  }
}

// Initial load + the quick-filter-saved listener are registered in the single
// consolidated onMounted/onUnmounted at the end of the script.

// Update manual filters when props.filter changes (from native filter interface)
watch(
  () => props.filter,
  (newFilter) => {
    updateManualFilters(newFilter);
  },
  { immediate: true, deep: true }
);

// Combine all filters: presets + manual + search, then sanitize against
// the user's read permissions. Computed stays pure; the user-facing
// notification is emitted from a watcher to keep side-effects out of
// reactivity-sensitive computations.
const sanitizedFilterResult = computed(() => {
  const presetFilter = presetMergedFilters.value;
  const searchFilterValue = searchFilter.value;

  const filters: any[] = [];
  if (presetFilter) filters.push(presetFilter);
  if (searchFilterValue) filters.push(searchFilterValue);

  const merged =
    filters.length === 0 ? undefined : filters.length === 1 ? filters[0] : { _and: filters };
  if (!merged) return { sanitized: undefined, removed: [] as string[] };

  // `nestedScopes` makes the walker check sub-fields under `_some`/`_none`/
  // `_every` against the junction collection rather than the parent —
  // without it, `{ translations: { _some: { description: ... } } }` would
  // slip past the parent's `canRead('translations')` check and reach the
  // server with a sub-field the user cannot read.
  const nestedScopes: Record<string, string | undefined> = {
    translations: translationsCollectionRef.value ?? undefined,
  };
  return sanitizeFilter(
    merged,
    (field, scope) => permissions.canRead(scope ?? collection.value, field),
    { nestedScopes }
  );
});

const combinedFilter = computed(() => (sanitizedFilterResult.value.sanitized ?? undefined) as any);

watch(
  () => sanitizedFilterResult.value.removed,
  (removed) => {
    if (removed.length > 0 && !filterSanitizationNotified.value) {
      notificationsStore.add({
        type: 'info',
        title: 'Filter partially applied',
        text: `Some filter conditions were removed because you don't have access: ${removed.join(', ')}`,
      });
      filterSanitizationNotified.value = true;
    }
  },
  { immediate: true }
);

// Items & Loading with proper fields and alias handling
// Data fetching with new API
const tableApi = useTableApi();
const loading = tableApi.loading;
const error = tableApi.error;
// Use our own items ref for local state management (like Directus does)
const items = ref<Item[]>([]);
const itemCount = tableApi.filterCount;

// Calculate totalPages
const totalPages = computed(() => {
  if (!itemCount.value || !limit.value) return 1;
  return Math.ceil(itemCount.value / limit.value);
});

// A failed items fetch leaves the count populated (separate request), so gate
// table + footer on this to avoid a blank body under a live pagination bar.
const hasRenderableData = computed(
  () => (itemCount.value > 0 || items.value.length > 0) && !error.value
);

// Items + count are fetched as two separate requests so users without read
// permission on the PK still see a populated table — `meta=filter_count`
// resolves via `countDistinct(pk)` server-side and would 403, while
// `aggregate[count]=*` (used by `fetchItemCount`) does not.
async function getItems() {
  try {
    const [itemsResult] = await Promise.all([
      tableApi.fetchItems({
        collection: collection.value,
        fields: fieldsWithRelational.value,
        filter: combinedFilter.value,
        sort: sort.value,
        page: page.value,
        limit: limit.value,
        deep: deep.value,
        alias: aliasQuery.value || undefined,
      }),
      tableApi
        .fetchItemCount(collection.value, combinedFilter.value, undefined, getPrimaryKeyFieldName())
        .catch(() => undefined),
    ]);
    items.value = itemsResult?.data || [];
  } catch {
    // Items error already in tableApi.error; count is best-effort
  }
}

// Every refetch funnels through ONE runner: same-tick watcher storms collapse
// into one execution, and overlapping executions are serialized with a single
// trailing re-run (prevents an older response overwriting newer rows).
// Force-refresh paths (events, auto-save, manual-sort recovery) call this
// directly and therefore bypass the fingerprint dedupe on purpose: same
// params, but server data changed.
const scheduleGetItems = createCoalescedRunner(getItems);

// Create a wrapper function for getItems
async function refreshItems() {
  await scheduleGetItems();
}

// Refetch when the EFFECTIVE query changes. A string fingerprint makes Vue
// dedupe by content: the upstream computeds rebuild arrays/objects with fresh
// identity on every recompute (columnDisplaysRef -> aliasedFields ->
// fieldsWithRelational), which used to re-fire this watcher with identical
// parameters (e.g. three identical request pairs on bookmark load, and a
// refetch on every layoutOptions write). Every fetch parameter getItems
// reads is part of the fingerprint, so the watcher fires exactly when the
// effective request changes. (searchQuery needs no own key: it only reaches
// the request through combinedFilter.)
const queryFingerprint = computed(() =>
  buildQueryFingerprint({
    collection: collection.value,
    fields: fieldsWithRelational.value,
    filter: combinedFilter.value,
    sort: sort.value,
    page: page.value,
    limit: limit.value,
    deep: deep.value,
    alias: aliasQuery.value,
  })
);

watch(queryFingerprint, () => {
  // Don't refetch during manual sorting (same guard as before)
  if (!isManualSorting) {
    scheduleGetItems();
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
      selection.value = items.value.map((item) => item[getPrimaryKeyFieldName()]);
    }
  }
}

// Edits tracking
const { edits, savingCells, updateFieldValue, autoSaveEdits } = useTableEdits(
  collection,
  computed(() => primaryKeyField?.value || (primaryKeyField as any) || undefined),
  items,
  scheduleGetItems,
  translationConfig.value.languageCodeField
);

// Field management
const {
  customFieldNames,
  showRenameDialog,
  renameFieldValue,
  originalFieldName,
  showLanguageDialog,
  pendingTranslationField,
  selectedLanguagesForField,
  languageDialogMode,
  renameField,
  resetToOriginal,
  confirmRename,
  cancelRename,
  cancelLanguageSelection,
  confirmLanguageSelection,
  removeField,
  // Language detection functions
  detectExistingLanguagesForField,
  getBaseFieldKey,
} = useTableFields(
  fields as Ref<string[]>,
  ref(fieldsInCollection.value),
  collection,
  fieldsStore,
  relationsStore,
  layoutOptions as any,
  languages
);

// Fetch languages when we have translation fields
watch(
  hasTranslationFields,
  (hasTranslations) => {
    if (hasTranslations) {
      fetchLanguages();
    }
  },
  { immediate: true }
);

// Selection
const selectionWritable = computed({
  get: () => selection.value || [],
  set: (val) => {
    selection.value = val;
  },
});

// Check if we have active filters or search
const hasActiveFilters = computed(() => {
  return (
    activePresetIds.value.length > 0 ||
    (filter.value && Object.keys(filter.value).length > 0) ||
    (search.value && search.value.length > 0)
  );
});

// Clear all filters and search (like in original Directus)
function clearAllFilters() {
  // Use the parent's clearFilters function if available (as senior colleague recommended)
  if (props.clearFilters) {
    props.clearFilters();
  }

  // Clear our local search query
  searchQuery.value = '';

  // Clear active quick filter presets
  if (activePresetIds.value.length > 0) {
    activePresetIds.value = [];
  }
}

// Methods

function onAlignChange(field: string, align: 'left' | 'center' | 'right') {
  layoutOptions.value = {
    ...layoutOptions.value,
    align: {
      ...(layoutOptions.value?.align || {}),
      [field]: align,
    },
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
      name: field?.name || fieldKey.split('.').pop(),
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

function getItemRoute(item: Item): string | null {
  // Get the primary key field name directly (no .value needed as per Directus pattern)
  const pkField = getPrimaryKeyFieldName();
  const primaryKey = item[pkField];
  if (!primaryKey) return null;
  return `/content/${collection.value}/${encodeURIComponent(String(primaryKey))}`;
}

// Resolve the detail route, or surface a warning when the primary key is missing
function getItemRouteOrWarn(item: Item): string | null {
  const route = getItemRoute(item);
  if (!route) {
    notificationsStore.add({
      type: 'warning',
      title: 'Navigation Error',
      text: `Could not find primary key in item`,
    });
  }
  return route;
}

function editItem(item: Item) {
  const route = getItemRouteOrWarn(item);
  if (route) router.push(route);
}

// Helper function to move item in array (exact Directus implementation)
function moveInArray<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return array;

  const item = array[fromIndex];
  const newArray = [...array];

  // Remove item from old position
  newArray.splice(fromIndex, 1);

  // Insert at new position
  // When moving down, we need to adjust because we removed an item
  const adjustedTo = fromIndex < toIndex ? toIndex - 1 : toIndex;
  newArray.splice(adjustedTo, 0, item);

  return newArray;
}

// Flag to prevent refetch after manual sort
let isManualSorting = false;

async function handleManualSort({ item, to }: { item: any; to: any }) {
  const pk = getPrimaryKeyFieldName();
  if (!pk) return;

  // Find the indices of the items
  const fromIndex = items.value.findIndex((existing: any) => existing[pk] === item);
  const toIndex = items.value.findIndex((existing: any) => existing[pk] === to);

  if (fromIndex === -1 || toIndex === -1) {
    return;
  }

  // Set flag to prevent watch from refetching
  isManualSorting = true;

  // Move in local array immediately for instant feedback (exactly like Directus)
  items.value = moveInArray(items.value, fromIndex, toIndex);

  try {
    // Use the Directus sort utility endpoint
    const endpoint = `/utils/sort/${collection.value}`;
    await api.post(endpoint, { item, to });

    notificationsStore.add({
      title: 'Item moved',
      type: 'success',
    });
  } catch (error: any) {
    // Refresh items to restore correct order on error
    await scheduleGetItems();

    notificationsStore.add({
      title: t('error_moving_item'),
      text: error.message || 'Failed to update sort order',
      type: 'error',
    });
  } finally {
    // Reset flag after a short delay
    setTimeout(() => {
      isManualSorting = false;
    }, 100);
  }
}

function handleTableRowClick({ item, event }: { item: Item; event: MouseEvent }) {
  // Don't navigate if edit mode is enabled
  if (editMode.value) {
    return;
  }

  const target = event?.target as HTMLElement;

  // Only block navigation for actual interactive elements when not in edit mode
  // Allow clicks on regular cells to navigate
  if (
    target?.closest('button') ||
    target?.closest('.v-checkbox') ||
    target?.closest('input') ||
    target?.closest('textarea') ||
    target?.closest('.v-select') ||
    window.getSelection()?.toString()
  ) {
    return;
  }

  // Navigate to detail page
  editItem(item);
}

// v-table suppresses click:row in edit mode; intercept modifier-clicks in the capture phase to open a new tab in both modes
function openRowInNewTabOnModifier(event: MouseEvent) {
  if (!event.ctrlKey && !event.metaKey) return;
  const target = event.target as HTMLElement | null;
  if (
    !target ||
    target.closest('button') ||
    target.closest('.v-checkbox') ||
    target.closest('input') ||
    target.closest('textarea') ||
    target.closest('.v-select')
  ) {
    return;
  }
  const row = target.closest('tbody tr');
  const tbody = row?.parentElement;
  if (!row || !tbody) return;
  const item = items.value[Array.from(tbody.children).indexOf(row)];
  if (!item) return;
  const route = getItemRouteOrWarn(item);
  if (!route) return;
  window.open(router.resolve(route).href, '_blank', 'noopener,noreferrer');
  event.preventDefault();
  event.stopPropagation();
}

// Watch for search changes
watch(searchQuery, (val) => {
  applyDebouncedSearch(val);
  onSearchInput(val);
});

// Handle refresh event from actions component (for duplicate)
function handleItemsDuplicated() {
  // Refresh the items list
  scheduleGetItems();
  // Clear selection after successful duplication
  selection.value = [];
}

// Setup event listeners for cross-component communication.
// Named handlers so onUnmounted removes the SAME references it registered
// (the previous inline arrows made the removals silent no-ops).
function handleItemsDeletedEvent() {
  refreshItems();
}

function handleRefreshCollectionEvent(event: any) {
  if (event.detail?.collection === collection.value) {
    refreshItems();
  }
}

onMounted(() => {
  // Initial load: presets first, then items.
  loadPresets();
  scheduleGetItems();

  // All window listeners in one place; named handlers so onUnmounted removes the
  // SAME references (inline arrows would make the removals silent no-ops).
  window.addEventListener('quick-filter-saved', handleQuickFilterSaved);
  window.addEventListener('directus-items-duplicated', handleItemsDuplicated);
  window.addEventListener('items-deleted', handleItemsDeletedEvent);
  window.addEventListener('refresh-collection', handleRefreshCollectionEvent);
});

onUnmounted(() => {
  window.removeEventListener('quick-filter-saved', handleQuickFilterSaved);
  window.removeEventListener('directus-items-duplicated', handleItemsDuplicated);
  window.removeEventListener('items-deleted', handleItemsDeletedEvent);
  window.removeEventListener('refresh-collection', handleRefreshCollectionEvent);
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

/* Clickable rows when not in edit mode - pointer cursor */
.table:not(.edit-mode) :deep(tbody tr) {
  cursor: pointer !important;
}

.table:not(.edit-mode) :deep(tbody tr td) {
  cursor: pointer !important;
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
  height: var(--input-height-tall);
  min-height: 400px;
  color: var(--foreground-subdued);
}

.padding-box {
  text-align: center;
  padding: 32px;
}

.padding-box .v-icon {
  --v-icon-color: var(--foreground-subdued);
  margin-bottom: 16px;
}

.padding-box p {
  color: var(--foreground-subdued);
  font-size: 16px;
  margin-bottom: 24px;
}

.padding-box .v-button {
  margin: 0 auto;
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

/* Prevent opacity changes during column resizing */
.table :deep(.resizing),
.table :deep(.resizing *),
.table :deep(th.resizing),
.table :deep(td.resizing) {
  opacity: 1 !important;
}

/* Ensure content stays fully visible during interactions */
.table :deep(tbody td),
.table :deep(tbody td .cell),
.table :deep(tbody td .cell > *) {
  opacity: 1 !important;
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
