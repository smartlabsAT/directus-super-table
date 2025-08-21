<template>
  <div class="field">
    <label class="type-label">Show Toolbar</label>
    <v-checkbox v-model="showToolbar" label="Display toolbar with actions" />
  </div>

  <div class="field">
    <label class="type-label">Edit Mode</label>
    <v-checkbox v-model="editMode" label="Enable inline editing" />
  </div>

  <div class="field" v-if="editMode">
    <label class="type-label">Direct Boolean Toggle</label>
    <v-checkbox
      v-model="directBooleanToggle"
      label="Enable direct boolean field editing (single-click toggle without popover)"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useSync } from '@directus/extensions-sdk';

interface LayoutOptions {
  showToolbar?: boolean;
  showSelect?: boolean;
  editMode?: boolean;
  directBooleanToggle?: boolean;
  spacing?: 'compact' | 'cozy' | 'comfortable';
  quickFilters?: any[];
  customFieldNames?: Record<string, string>;
  widths?: Record<string, number>;
  align?: Record<string, 'left' | 'center' | 'right'>;
}

const props = defineProps<{
  layoutOptions: LayoutOptions;
}>();

const emit = defineEmits(['update:layoutOptions']);

const layoutOptions = useSync(props, 'layoutOptions', emit);

// General Settings
const showToolbar = computed({
  get: () => layoutOptions.value?.showToolbar !== false,
  set: (val) => {
    layoutOptions.value = {
      ...layoutOptions.value,
      showToolbar: val,
    };
  },
});

const editMode = computed({
  get: () => layoutOptions.value?.editMode === true,
  set: (val) => {
    layoutOptions.value = {
      ...layoutOptions.value,
      editMode: val,
    };
  },
});

const directBooleanToggle = computed({
  get: () => layoutOptions.value?.directBooleanToggle === true,
  set: (val) => {
    layoutOptions.value = {
      ...layoutOptions.value,
      directBooleanToggle: val,
    };
  },
});
</script>

<style scoped>
.field {
  margin-bottom: var(--form-vertical-gap);
}

.type-label {
  display: block;
  margin-bottom: 8px;
  color: var(--foreground-normal);
  font-weight: 600;
  font-size: 14px;
}

.v-notice {
  margin-top: var(--form-vertical-gap);
}
</style>
