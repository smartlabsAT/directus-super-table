<template>
  <!-- Use InlineEditPopover for all non-relational fields (including tags) -->
  <InlineEditPopover
    v-if="!isRelational"
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
      />
      <!-- Use custom RelationalCell for relational fields -->
      <RelationalCell
        v-else-if="isRelationalInterface && !getInterfaceType()?.includes('select')"
        :value="value"
        :field="actualFieldKey"
        :item="item"
      />
      <!-- Use custom StatusCell for status field -->
      <StatusCell
        v-else-if="actualFieldKey === 'status' && getInterfaceType() === 'select-dropdown'"
        :value="value"
        :options="interfaceOptions"
        :field="actualFieldKey"
        :edit-mode="props.editMode"
        :align="props.align"
      />
      <!-- Use custom SelectCell for other select-dropdown interfaces -->
      <SelectCell
        v-else-if="getInterfaceType() === 'select-dropdown'"
        :value="value"
        :options="interfaceOptions"
        :field="actualFieldKey"
      />
      <!-- Use render-display for other types -->
      <render-display
        v-else
        :value="value"
        :display="field?.display"
        :options="field?.displayOptions"
        :interface="field?.interface"
        :interface-options="field?.interfaceOptions"
        :type="field?.type"
        :collection="field?.collection"
        :field="field?.field"
      />
    </template>
  </InlineEditPopover>

  <!-- Display only for relational fields -->
  <div v-else class="editable-cell relational" :style="{ textAlign: props.align || 'left' }">
    <render-display
      :value="displayValue"
      :display="field?.display"
      :options="field?.displayOptions"
      :interface="field?.interface"
      :interface-options="field?.interfaceOptions"
      :type="field?.type"
      :collection="field?.collection"
      :field="field?.field"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import type { Field, Item } from '@directus/types';
import InlineEditPopover from './InlineEditPopover.vue';
import SelectCell from './CellRenderers/SelectCell.vue';
import StatusCell from './CellRenderers/StatusCell.vue';
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
}>();

const emit = defineEmits<{
  update: [itemId: string | number, field: string, value: any];
  save: [];
  'navigate-next': [];
  'navigate-prev': [];
}>();

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

function handleSave(value: any) {
  handleUpdate(value);
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
