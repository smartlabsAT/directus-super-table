<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @esc="$emit('cancel')"
  >
    <v-card>
      <v-card-title>{{ dialogTitle }}</v-card-title>
      <v-card-text>
        <!-- Currently Active Languages Section -->
        <div v-if="existingLanguages && existingLanguages.length > 0" style="margin-bottom: 20px">
          <h4 style="margin-bottom: 12px; color: var(--foreground-subdued); font-size: 14px">
            📍 Currently Active Languages
          </h4>
          <div class="active-languages">
            <v-chip
              v-for="lang in existingLanguageObjects"
              :key="lang.value"
              small
              disabled
              style="margin-right: 8px; margin-bottom: 4px"
            >
              {{ lang.text }}
            </v-chip>
          </div>
          <v-divider style="margin: 16px 0" />
        </div>

        <!-- Available Languages Section -->
        <div v-if="availableLanguages.length > 0">
          <h4 style="margin-bottom: 12px; color: var(--foreground-subdued); font-size: 14px">
            🌐 {{ availableLanguagesTitle }}
          </h4>
          <v-checkbox
            v-for="lang in availableLanguages"
            :key="lang.value"
            :model-value="selectedLanguages.includes(lang.value)"
            @update:model-value="toggleLanguage(lang.value, $event)"
            :label="lang.text"
            style="margin-bottom: 8px"
          />
          <v-divider style="margin: 16px 0" />
          <v-checkbox
            :model-value="selectAll"
            :label="selectAllLabel"
            @update:model-value="toggleAll"
          />
        </div>

        <!-- No More Languages Available -->
        <div v-else-if="mode === 'add'" class="no-languages-available">
          <v-notice type="info"> All available languages have already been added. </v-notice>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-button secondary @click="$emit('cancel')">
          {{ t('cancel') }}
        </v-button>
        <v-button
          @click="$emit('confirm')"
          :disabled="selectedLanguages.length === 0 && mode === 'add'"
        >
          {{ confirmButtonText }}
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
  existingLanguages?: string[];
  mode?: 'add' | 'manage';
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:selectedLanguages': [value: string[]];
  confirm: [];
  cancel: [];
}>();

const { t } = useI18n();

// Filter out existing languages to show only available ones
const availableLanguages = computed(() => {
  if (!props.existingLanguages || props.mode !== 'add') {
    return props.languages;
  }
  return props.languages.filter((lang) => !props.existingLanguages!.includes(lang.value));
});

// Get existing language objects for display
const existingLanguageObjects = computed(() => {
  if (!props.existingLanguages) return [];
  return props.languages.filter((lang) => props.existingLanguages!.includes(lang.value));
});

// Dynamic dialog content based on mode
const dialogTitle = computed(() => {
  const mode = props.mode || 'add';
  if (mode === 'add') {
    return `Add Languages to "${props.fieldName}"`;
  }
  return `Manage Languages for "${props.fieldName}"`;
});

const availableLanguagesTitle = computed(() => {
  const mode = props.mode || 'add';
  return mode === 'add' ? 'Available Languages' : 'All Languages';
});

const selectAllLabel = computed(() => {
  const mode = props.mode || 'add';
  return mode === 'add' ? 'Select All Available Languages' : 'Select All Languages';
});

const confirmButtonText = computed(() => {
  const mode = props.mode || 'add';
  if (mode === 'add') {
    const count = props.selectedLanguages.length;
    return count === 1 ? 'Add Language' : `Add ${count} Languages`;
  }
  return 'Update Languages';
});

const selectAll = computed(() => {
  return props.selectedLanguages.length === availableLanguages.value.length;
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
      availableLanguages.value.map((l) => l.value)
    );
  } else {
    emit('update:selectedLanguages', []);
  }
}
</script>

<style scoped>
.active-languages {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.no-languages-available {
  text-align: center;
  padding: 20px 0;
}

.v-card-title {
  font-size: 18px;
  font-weight: 600;
}

h4 {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>
