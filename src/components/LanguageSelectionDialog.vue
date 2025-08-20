<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @esc="$emit('cancel')"
  >
    <v-card>
      <v-card-title>{{ t('Select Languages') }}</v-card-title>
      <v-card-text>
        <p style="margin-bottom: 16px">
          {{ t('Select which languages to display for') }} "{{ fieldName }}"
        </p>
        <v-checkbox
          v-for="lang in languages"
          :key="lang.value"
          :model-value="selectedLanguages.includes(lang.value)"
          @update:model-value="toggleLanguage(lang.value, $event)"
          :label="lang.text"
          style="margin-bottom: 8px"
        />
        <v-divider style="margin: 16px 0" />
        <v-checkbox
          :model-value="selectAll"
          label="Select All Languages"
          @update:model-value="toggleAll"
        />
      </v-card-text>
      <v-card-actions>
        <v-button secondary @click="$emit('cancel')">
          {{ t('cancel') }}
        </v-button>
        <v-button @click="$emit('confirm')" :disabled="selectedLanguages.length === 0">
          {{ t('Add Field(s)') }}
        </v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  modelValue: boolean;
  fieldName: string;
  languages: Array<{ text: string; value: string }>;
  selectedLanguages: string[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:selectedLanguages': [value: string[]];
  confirm: [];
  cancel: [];
}>();

const { t } = useI18n();

const selectAll = computed(() => {
  return props.selectedLanguages.length === props.languages.length;
});

function toggleLanguage(langCode: string, selected: boolean) {
  const current = [...props.selectedLanguages];
  if (selected && !current.includes(langCode)) {
    current.push(langCode);
  } else if (!selected) {
    const index = current.indexOf(langCode);
    if (index > -1) current.splice(index, 1);
  }
  emit('update:selectedLanguages', current);
}

function toggleAll(value: boolean) {
  if (value) {
    emit(
      'update:selectedLanguages',
      props.languages.map((l) => l.value)
    );
  } else {
    emit('update:selectedLanguages', []);
  }
}
</script>
