<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @esc="$emit('cancel')"
  >
    <v-card>
      <v-card-title>Rename Field</v-card-title>
      <v-card-text>
        <div style="display: flex; align-items: center; gap: 8px">
          <v-input
            :model-value="fieldName"
            @update:model-value="$emit('update:fieldName', $event)"
            :placeholder="t('field_name')"
            autofocus
            @keyup.enter="$emit('confirm')"
            style="flex: 1"
          />
          <v-button
            v-tooltip="'Reset to original: ' + originalName"
            icon
            x-small
            secondary
            @click="$emit('reset')"
          >
            <v-icon name="settings_backup_restore" />
          </v-button>
        </div>
        <div style="margin-top: 8px; font-size: 12px; color: var(--foreground-subdued)">
          Original: {{ originalName }}
        </div>
      </v-card-text>
      <v-card-actions>
        <v-button secondary @click="$emit('cancel')">
          {{ t('cancel') }}
        </v-button>
        <v-button @click="$emit('confirm')" :disabled="!fieldName">
          {{ t('save') }}
        </v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
  modelValue: boolean;
  fieldName: string;
  originalName: string;
}>();

defineEmits<{
  'update:modelValue': [value: boolean];
  'update:fieldName': [value: string];
  confirm: [];
  cancel: [];
  reset: [];
}>();

const { t } = useI18n();
</script>
