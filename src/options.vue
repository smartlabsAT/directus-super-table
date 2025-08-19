<template>
  <div class="layout-options">
    <div class="field">
      <div class="label">{{ t('layout_options') }}</div>
    </div>

    <div class="field">
      <div class="label">{{ t('show_header') }}</div>
      <v-checkbox v-model="showToolbar" />
    </div>

    <div class="field">
      <div class="label">{{ t('show_selection') }}</div>
      <v-checkbox v-model="showSelect" />
    </div>

    <div class="field">
      <div class="label">{{ t('auto_save') }}</div>
      <v-checkbox v-model="autoSave" />
    </div>

    <div class="field">
      <div class="label">{{ t('spacing') }}</div>
      <v-select
        v-model="spacing"
        :items="[
          { text: t('compact'), value: 'compact' },
          { text: t('cozy'), value: 'cozy' },
          { text: t('comfortable'), value: 'comfortable' },
        ]"
      />
    </div>

    <div class="field">
      <div class="label">{{ t('edit_mode') }}</div>
      <v-checkbox v-model="defaultEditMode" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSync } from '@directus/extensions-sdk';

const props = defineProps<{
  layoutOptions: any;
}>();

const emit = defineEmits(['update:layoutOptions']);

const { t } = useI18n();

const layoutOptions = useSync(props, 'layoutOptions', emit);

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

const autoSave = computed({
  get: () => layoutOptions.value?.autoSave !== false,
  set: (val) => {
    layoutOptions.value = {
      ...layoutOptions.value,
      autoSave: val,
    };
  },
});

const spacing = computed({
  get: () => layoutOptions.value?.spacing || 'cozy',
  set: (val) => {
    layoutOptions.value = {
      ...layoutOptions.value,
      spacing: val,
    };
  },
});

const defaultEditMode = computed({
  get: () => layoutOptions.value?.editMode === true,
  set: (val) => {
    layoutOptions.value = {
      ...layoutOptions.value,
      editMode: val,
    };
  },
});
</script>

<style scoped>
.layout-options {
  padding: 12px;
}

.field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.label {
  flex: 1;
  font-weight: 600;
}
</style>