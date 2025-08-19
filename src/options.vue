<template>
  <div class="layout-options">
    <!-- General Settings -->
    <div class="section">
      <div class="section-title">{{ t('layouts.super-layout-table.general') }}</div>
      
      <div class="field">
        <div class="label">{{ t('layouts.super-layout-table.show_toolbar') }}</div>
        <v-checkbox v-model="showToolbar" />
      </div>

      <div class="field">
        <div class="label">{{ t('layouts.super-layout-table.show_selection') }}</div>
        <v-checkbox v-model="showSelect" />
      </div>

      <div class="field">
        <div class="label">{{ t('layouts.super-layout-table.edit_mode') }}</div>
        <v-checkbox v-model="editMode" />
      </div>
    </div>

    <!-- Display Settings -->
    <div class="section">
      <div class="section-title">{{ t('layouts.super-layout-table.display') }}</div>
      
      <div class="field">
        <div class="label">{{ t('layouts.super-layout-table.row_height') }}</div>
        <v-select
          v-model="spacing"
          :items="[
            { text: t('layouts.super-layout-table.compact'), value: 'compact' },
            { text: t('layouts.super-layout-table.cozy'), value: 'cozy' },
            { text: t('layouts.super-layout-table.comfortable'), value: 'comfortable' },
          ]"
        />
      </div>

    </div>

    <!-- Quick Filters Info -->
    <div class="section" v-if="quickFilters && quickFilters.length > 0">
      <div class="section-title">{{ t('layouts.super-layout-table.quick_filters') }}</div>
      <div class="info-text">
        {{ t('layouts.super-layout-table.quick_filters_count', quickFilters.length) }}
      </div>
    </div>

    <!-- Custom Field Names Info -->
    <div class="section" v-if="customFieldNames && Object.keys(customFieldNames).length > 0">
      <div class="section-title">{{ t('layouts.super-layout-table.custom_headers') }}</div>
      <div class="info-text">
        {{ t('layouts.super-layout-table.custom_headers_count', Object.keys(customFieldNames).length) }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSync } from '@directus/extensions-sdk';

interface LayoutOptions {
  showToolbar?: boolean;
  showSelect?: boolean;
  editMode?: boolean;
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

const { t } = useI18n();

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

const showSelect = computed({
  get: () => layoutOptions.value?.showSelect !== false,
  set: (val) => {
    layoutOptions.value = {
      ...layoutOptions.value,
      showSelect: val,
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

// Display Settings
const spacing = computed({
  get: () => layoutOptions.value?.spacing || 'cozy',
  set: (val) => {
    layoutOptions.value = {
      ...layoutOptions.value,
      spacing: val,
    };
  },
});


// Read-only computed for display
const quickFilters = computed(() => layoutOptions.value?.quickFilters || []);
const customFieldNames = computed(() => layoutOptions.value?.customFieldNames || {});
</script>

<style scoped>
.layout-options {
  padding: var(--content-padding);
}

.section {
  margin-bottom: var(--form-vertical-gap);
}

.section-title {
  margin-bottom: 12px;
  color: var(--foreground-subdued);
  font-weight: 600;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 12px;
}

.label {
  flex: 1;
  color: var(--foreground-normal);
}

.info-text {
  color: var(--foreground-subdued);
  font-size: 14px;
  padding: 8px 0;
}

.field:last-child {
  margin-bottom: 0;
}

.section:last-child {
  margin-bottom: 0;
}
</style>