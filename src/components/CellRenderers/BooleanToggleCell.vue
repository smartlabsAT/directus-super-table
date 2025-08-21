<template>
  <div
    class="boolean-toggle-cell"
    :class="{
      'is-saving': isSaving,
      'has-error': hasError,
    }"
    @click.stop="toggleBoolean"
  >
    <v-progress-circular v-if="isSaving" indeterminate :size="16" :width="2" />
    <v-checkbox
      v-else
      :model-value="modelValue"
      :disabled="disabled || readonly"
      @click.stop
      @update:model-value="toggleBoolean"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { useApi, useStores } from '@directus/extensions-sdk';

interface Props {
  modelValue: boolean | null;
  collection: string;
  primaryKey: string | number;
  field: string;
  disabled?: boolean;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  readonly: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:success': [];
  'update:error': [error: Error];
}>();

const api = useApi();
const { useNotificationsStore } = useStores();
const notificationsStore = useNotificationsStore();
const isSaving = ref(false);
const hasError = ref(false);

const effectiveValue = computed(() => {
  return props.modelValue === true;
});

async function toggleBoolean() {
  if (props.disabled || props.readonly || isSaving.value) {
    return;
  }

  const newValue = !effectiveValue.value;
  isSaving.value = true;
  hasError.value = false;

  try {
    // Update the item via API
    await api.patch(`/items/${props.collection}/${props.primaryKey}`, {
      [props.field]: newValue,
    });

    // Emit the new value
    emit('update:modelValue', newValue);
    emit('update:success');
  } catch (error: any) {
    hasError.value = true;
    emit('update:error', error);

    // Show error notification
    notificationsStore.add({
      title: 'Failed to update',
      text: error.message || 'An error occurred while updating the field',
      type: 'error',
    });
  } finally {
    isSaving.value = false;

    // Clear error state after 3 seconds
    if (hasError.value) {
      setTimeout(() => {
        hasError.value = false;
      }, 3000);
    }
  }
}
</script>

<style scoped>
.boolean-toggle-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  cursor: pointer;
  transition: background-color 0.2s ease;
  padding: 4px;
}

.boolean-toggle-cell:not(.is-saving):not(:has(.v-checkbox[disabled])):hover {
  background-color: var(--background-normal);
  border-radius: var(--border-radius);
}

.boolean-toggle-cell.is-saving {
  cursor: wait;
  opacity: 0.6;
}

.boolean-toggle-cell.has-error {
  background-color: var(--danger-10);
}

.boolean-toggle-cell :deep(.v-checkbox) {
  pointer-events: none; /* Prevent double-click, parent handles the click */
}
</style>
