<template>
  <!-- Use BooleanToggleCell for boolean fields when directBooleanToggle is enabled -->
  <BooleanToggleCell
    v-if="!isRelational && shouldUseBooleanToggle"
    :model-value="displayValue"
    :collection="item?.collection || field?.collection"
    :primary-key="(item?.id || item?.[primaryKeyField]) ?? ''"
    :field="actualFieldKey"
    :disabled="!isFieldEditableComputed"
    :readonly="!props.editMode"
    @update:model-value="handleBooleanToggle"
    @update:success="handleSave"
  />
  <!-- Use InlineEditPopover for all other non-relational fields (including date fields) -->
  <InlineEditPopover
    v-else-if="!isRelational"
    :value="displayValue"
    :field-key="actualFieldKey"
    :field-label="field?.name || actualFieldKey"
    :field-type="field?.type"
    :interface-type="getInterfaceType() || undefined"
    :interface-options="interfaceOptions"
    :is-editable="isFieldEditableComputed"
    :is-relational="false"
    :auto-save="false"
    :saving="saving"
    :collection="item?.collection || field?.collection"
    :primary-key-value="(item?.id || item?.[primaryKeyField]) ?? undefined"
    :all-translations="item?.translations"
    :style="{ textAlign: props.align || 'left' }"
    :field-support-level="fieldSupportLevel"
    :edit-mode-active="props.editMode"
    :field-edit-warning="fieldEditWarning"
    @update:value="handleUpdate"
    @save="handleSave"
    @next-field="navigateToNextCell"
    @prev-field="navigateToPrevCell"
  >
    <template #display="{ value }">
      <!-- Use custom ColorCell for color fields -->
      <ColorCell
        v-if="
          field?.interface === 'select-color' ||
          field?.interface === 'color' ||
          actualFieldKey.includes('color')
        "
        :value="value"
        :item="item"
        :field="actualFieldKey"
        :edit-mode="props.editMode"
        :alignment="props.align"
      />
      <!-- Use custom ImageCell for image fields -->
      <ImageCell
        v-else-if="
          field?.interface === 'file-image' ||
          field?.interface === 'file' ||
          field?.interface === 'image' ||
          (field?.type === 'uuid' &&
            (actualFieldKey.includes('image') ||
              actualFieldKey.includes('photo') ||
              actualFieldKey.includes('picture')))
        "
        :value="value"
        :item="item"
        :field="actualFieldKey"
        :alignment="align"
      />
      <!-- ABSOLUTE PRIORITY: User-configured display templates (ALL field types) -->
      <render-display
        v-if="field?.display"
        :value="value"
        :display="field?.display"
        :options="field?.displayOptions"
        :interface="field?.interface"
        :interface-options="field?.interfaceOptions"
        :type="field?.type"
        :collection="field?.collection"
        :field="field?.field"
      />
      <!-- FALLBACK 1: Custom SelectCell for select-dropdown fields WITHOUT display template -->
      <SelectCell
        v-else-if="getInterfaceType() === 'select-dropdown'"
        :value="value"
        :options="interfaceOptions"
        :field="actualFieldKey"
      />
      <!-- FALLBACK 2: Custom RelationalCell for relational fields WITHOUT display template -->
      <RelationalCell
        v-else-if="isRelationalInterface"
        :value="value"
        :field="actualFieldKey"
        :item="item"
      />
      <!-- FINAL FALLBACK: Raw value display for fields without any special handling -->
      <span v-else class="raw-value">
        {{ value != null ? String(value) : '—' }}
      </span>
    </template>
  </InlineEditPopover>

  <!-- ABSOLUTE PRIORITY: Display templates for relational fields -->
  <div
    v-else-if="field?.display"
    class="editable-cell relational"
    :style="{ textAlign: props.align || 'left' }"
  >
    <!-- Direct Display Value (already rendered in computed) -->
    <span class="template-display">{{ displayValue }}</span>
  </div>

  <!-- FALLBACK: Display only for relational fields without display templates -->
  <div v-else class="editable-cell relational" :style="{ textAlign: props.align || 'left' }">
    <span class="raw-value">
      {{ displayValue != null ? String(displayValue) : '—' }}
    </span>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeMount, markRaw, ref, watch } from 'vue';
import type { Field, Item } from '@directus/types';
import InlineEditPopover from './InlineEditPopover.vue';
import BooleanToggleCell from './CellRenderers/BooleanToggleCell.vue';
import SelectCell from './CellRenderers/SelectCell.vue';
import ImageCell from './CellRenderers/ImageCell.vue';
import RelationalCell from './CellRenderers/RelationalCell.vue';
import ColorCell from './CellRenderers/ColorCell.vue';
import { isFieldEditable, getFieldEditWarning, getFieldSupportLevel } from '../utils/fieldSupport';

const props = defineProps<{
  item: Item;
  fieldKey: string;
  field: Field | null;
  edits?: any;
  getDisplayValue?: (_item: Item, _key: string) => any;
  selectedLanguage?: string;
  saving?: boolean;
  editMode?: boolean;
  align?: 'left' | 'center' | 'right';
  directBooleanToggle?: boolean;
}>();

const emit = defineEmits<{
  update: [itemId: string | number, field: string, value: any];
  save: [];
  'navigate-next': [];
  'navigate-prev': [];
}>();

// PHASE 1: Initial data cache to prevent corruption during re-renders
const stableDataCache = ref<Item | null>(null);

// SMART CACHE UPDATE: Only cache better data, never worse data
function updateStableCache() {
  if (!props.item) return;

  try {
    const newItem = JSON.parse(JSON.stringify(props.item));

    // If cache is empty, always update
    if (!stableDataCache.value) {
      stableDataCache.value = markRaw(newItem);
      return;
    }

    // SMART UPDATE: Only update cache if new data has MORE object data
    for (const key of Object.keys(newItem)) {
      const newValue = newItem[key];
      const cachedValue = stableDataCache.value[key];

      // If new value is an object and cached is primitive, update cache
      if (newValue && typeof newValue === 'object' && typeof cachedValue !== 'object') {
        stableDataCache.value = markRaw(newItem);
        return;
      }
    }

    // Cache stays the same - we have better data already
  } catch {
    // Silent cache update error handling
  }
}

onBeforeMount(() => {
  updateStableCache();
});

// Watch props.item for changes and update cache intelligently - but debounced to prevent excessive calls
watch(() => props.item, updateStableCache, { deep: true, immediate: true, flush: 'post' });

// Computed
const primaryKeyField = computed(() => {
  return Object.keys(props.item).find((key) => key === 'id' || key.endsWith('_id')) || 'id';
});

// Extract language code if present in field key
const fieldLanguage = computed(() => {
  if (props.fieldKey?.includes(':')) {
    return props.fieldKey.split(':')[1];
  }
  return props.selectedLanguage;
});

// Get actual field key without language suffix
const actualFieldKey = computed(() => {
  if (props.fieldKey?.includes(':')) {
    return props.fieldKey.split(':')[0];
  }
  return props.fieldKey;
});

const displayValue = computed(() => {
  // For edited values
  if (props.edits !== undefined) {
    return props.edits;
  }

  // Special handling for translations fields
  if (actualFieldKey.value.includes('translations.')) {
    const translationField = actualFieldKey.value.split('.').slice(1).join('.');

    // Check if translations exist and is an array
    if (Array.isArray(props.item.translations) && props.item.translations.length > 0) {
      // Use the language from field key (if specified) or the selected language
      const targetLanguage = fieldLanguage.value;

      if (targetLanguage) {
        const translation = props.item.translations.find(
          (t: any) => t.languages_code === targetLanguage
        );

        // Return the specific field value if translation exists
        if (translation) {
          return translation[translationField] || null;
        }
      }

      // No translation for this language
      return null;
    }

    // No translations available at all
    return null;
  }

  // 🚨 CRITICAL FIX: Display template logic MUST come BEFORE getDisplayValue!
  // SPECIAL HANDLING for relational fields with display templates

  const isRelatedValues = props.field?.display === 'related-values';
  const isImage = props.field?.display === 'image';
  const isFile = props.field?.display === 'file';
  const isUser = props.field?.display === 'user';

  // Check if this is a relational field with display template that needs special handling
  if (
    props.field?.display &&
    props.field.display !== null &&
    (isRelatedValues || isImage || isFile || isUser)
  ) {
    // For relational displays, we need to get the full object and render the template
    const relationalValue = props.item[props.fieldKey];

    // Check if field has a custom template
    const template =
      props.field?.displayOptions?.template || props.field?.meta?.display_options?.template;

    if (template && relationalValue) {
      // Silent recovery: Check for data corruption and fix it automatically
      if (typeof relationalValue !== 'object' || relationalValue === null) {
        // Try to get stable object from our cache
        const stableObject = buildStableRelationalObject(props.fieldKey);
        if (stableObject && typeof stableObject === 'object') {
          return renderTemplate(stableObject, template);
        }

        // Last resort: show fallback without noisy logs
        return '—';
      }

      return renderTemplate(relationalValue, template);
    }

    // Fallback: if no template but is relational display, return the object itself
    return relationalValue;
  }

  // For other relational fields, use the aliased getter if provided
  if (props.getDisplayValue) {
    return props.getDisplayValue(props.item, props.fieldKey);
  }

  // For normal fields with dot notation
  if (props.fieldKey.includes('.')) {
    const parts = props.fieldKey.split('.');
    let value = props.item;
    for (const part of parts) {
      value = value?.[part];
    }
    return value;
  }

  // Simple field access
  return props.item[props.fieldKey];
});

// Check if field is editable using the field support utility
const isFieldEditableComputed = computed(() => {
  if (!props.editMode) return false;

  // Special case: translation fields should be editable if the base type is supported
  if (actualFieldKey.value.startsWith('translations.')) {
    // For now, allow editing of translation fields if edit mode is on
    // The actual field support check will be done in the InlineEditPopover
    return true;
  }

  // Use the field support utility which already handles tags and other partial support fields
  const editable = isFieldEditable(props.field, actualFieldKey.value);
  return editable;
});

// Get field edit warning message
const fieldEditWarning = computed(() => {
  if (!props.editMode) return '';
  if (isFieldEditableComputed.value) return '';

  // Use the unified warning system for all fields
  return getFieldEditWarning(props.field, actualFieldKey.value);
});

// Get field support level for UI display
const fieldSupportLevel = computed(() => {
  return getFieldSupportLevel(props.field, actualFieldKey.value);
});

// Check if we should use BooleanToggleCell
const shouldUseBooleanToggle = computed(() => {
  return (
    props.directBooleanToggle === true &&
    props.editMode === true &&
    (props.field?.type === 'boolean' ||
      props.field?.interface === 'boolean' ||
      props.field?.interface === 'toggle')
  );
});

// Check if field is relational
const isRelational = computed(() => {
  if (!props.field) return false;

  // Translation fields should be editable even though they use dot notation
  if (actualFieldKey.value.startsWith('translations.')) {
    return false; // Allow editing of translation fields
  }

  // Check for relational special flags
  const special = props.field.meta?.special;
  if (Array.isArray(special)) {
    return special.some((s) => ['m2o', 'o2m', 'm2m', 'm2a'].includes(s));
  }

  // Check if field key contains dot notation (nested field)
  return actualFieldKey.value.includes('.');
});

// Check if field has a relational interface
const isRelationalInterface = computed(() => {
  if (!props.field) return false;

  const relationalInterfaces = [
    'many-to-one',
    'one-to-many',
    'many-to-many',
    'many-to-any',
    'list-m2m',
    'list-o2m',
    'list-m2a',
    'files',
  ];

  return relationalInterfaces.includes(props.field.interface || '');
});

// Get interface options
const interfaceOptions = computed(() => {
  const options = props.field?.interfaceOptions || props.field?.meta?.options || {};

  // Add field-specific props
  if (
    props.field?.interface === 'select-dropdown' ||
    props.field?.meta?.interface === 'select-dropdown'
  ) {
    return {
      ...options,
      items: options.choices || [],
      itemText: 'text',
      itemValue: 'value',
    };
  }

  if (props.field?.type === 'integer' || props.field?.type === 'float') {
    return {
      ...options,
      type: 'number',
    };
  }

  return options;
});

// Methods
function getInterfaceType() {
  return props.field?.interface || props.field?.meta?.interface;
}

// Manual Template Rendering - Production Fix for render-display issue
function renderTemplate(value: any, template: string): string {
  if (!template || template === null || template === undefined) {
    // No template - return formatted value
    return value != null ? String(value) : '—';
  }

  if (!value) {
    return '—';
  }

  // Handle object values for related fields
  if (typeof value === 'object' && value !== null) {
    let result = template;

    // Replace template variables with actual values
    Object.keys(value).forEach((key) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      const fieldValue = value[key];
      result = result.replace(regex, fieldValue != null ? String(fieldValue) : '');
    });

    return result;
  }

  // Handle simple values - replace all template vars with the same value
  return template.replace(/\{\{.*?\}\}/g, String(value));
}

// FINAL FIX: Direct access to relational data without relying on dot-notation
function buildStableRelationalObject(fieldKey: string): any {
  try {
    // STEP 1: Get the direct field value first
    const directValue = props.item[fieldKey];

    // STEP 2: If we have a valid object, use it directly (this is our data!)
    if (directValue && typeof directValue === 'object' && directValue !== null) {
      return directValue;
    }

    // STEP 3: Try cached data as fallback
    if (stableDataCache.value && stableDataCache.value[fieldKey]) {
      const cachedValue = stableDataCache.value[fieldKey];

      if (cachedValue && typeof cachedValue === 'object' && cachedValue !== null) {
        return cachedValue;
      }
    }

    // STEP 4: Legacy dot-notation fallback (for compatibility)
    const rawItem = JSON.parse(JSON.stringify(props.item));
    const relatedObject: any = {};

    Object.keys(rawItem).forEach((key) => {
      if (key.startsWith(`${fieldKey}.`)) {
        const subField = key.substring(fieldKey.length + 1);
        relatedObject[subField] = rawItem[key];
      }
    });

    if (Object.keys(relatedObject).length > 0) {
      return relatedObject;
    }

    return null;
  } catch {
    // Silent error handling
    return null;
  }
}

function handleUpdate(value: any) {
  const primaryKey = Object.keys(props.item).find((key) => key === 'id' || key.endsWith('_id'));

  if (primaryKey) {
    // Check if this is a full translations update
    if (typeof value === 'object' && value?.isFullTranslations) {
      // Handle full translations update from interface-translations
      emit('update', props.item[primaryKey], 'translations', {
        isFullTranslations: true,
        translations: value.translations,
      });
    }
    // Special handling for single translation field
    else if (actualFieldKey.value.startsWith('translations.')) {
      const translationField = actualFieldKey.value.split('.').slice(1).join('.');
      const translationUpdate = {
        fieldKey: props.fieldKey, // Use original field key with language
        translationField,
        value,
        language: fieldLanguage.value, // Use language from field key or selected
        isTranslation: true,
      };
      emit('update', props.item[primaryKey], props.fieldKey, translationUpdate);
    } else {
      emit('update', props.item[primaryKey], props.fieldKey, value);
    }
  }
}

function handleBooleanToggle(value: boolean) {
  const primaryKey = Object.keys(props.item).find((key) => key === 'id' || key.endsWith('_id'));
  if (primaryKey) {
    emit('update', props.item[primaryKey], props.fieldKey, value);
  }
}

function handleSave(value?: any) {
  if (value !== undefined) {
    handleUpdate(value);
  }
  emit('save');
}

function navigateToNextCell() {
  const cells = document.querySelectorAll('.inline-edit-wrapper .edit-cell');
  const currentCell = document.activeElement?.closest('.inline-edit-wrapper');

  if (currentCell) {
    const currentIndex = Array.from(cells).findIndex(
      (cell) => cell.closest('.inline-edit-wrapper') === currentCell
    );
    const nextCell = cells[currentIndex + 1] as HTMLElement;

    if (nextCell) {
      nextCell.click();
    }
  }

  emit('navigate-next');
}

function navigateToPrevCell() {
  const cells = document.querySelectorAll('.inline-edit-wrapper .edit-cell');
  const currentCell = document.activeElement?.closest('.inline-edit-wrapper');

  if (currentCell) {
    const currentIndex = Array.from(cells).findIndex(
      (cell) => cell.closest('.inline-edit-wrapper') === currentCell
    );
    const prevCell = cells[currentIndex - 1] as HTMLElement;

    if (prevCell) {
      prevCell.click();
    }
  }

  emit('navigate-prev');
}
</script>

<style scoped>
.editable-cell.relational,
.editable-cell.non-editable {
  position: relative;
  min-height: 42px;
  padding: 8px 12px;
  cursor: default;
  display: flex;
  align-items: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editable-cell.non-editable {
  opacity: 0.7;
  cursor: not-allowed !important;
}

.lock-icon {
  margin-right: 8px;
  color: var(--foreground-subdued);
  opacity: 0.6;
}

/* Ensure full height for inline edit wrapper */
:deep(.inline-edit-wrapper) {
  height: 100%;
}

/* Ensure proper cell display */
:deep(.edit-cell) {
  min-height: 36px;
  height: 100%;
}

/* Match table cell styling */
:deep(.cell-display) {
  display: flex;
  align-items: center;
  min-height: 26px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}
</style>
