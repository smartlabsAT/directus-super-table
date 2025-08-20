<!-- ./extensions/layouts/super-layout-table/components/CellRenderers/SelectCell.vue -->
<template>
  <div class="select-cell">
    <span
      v-if="displayValue"
      class="select-value"
      :class="[`select-value--${value}`, { 'has-icon': currentChoice?.icon }]"
      :style="badgeStyle"
    >
      <v-icon v-if="currentChoice?.icon" :name="currentChoice.icon" x-small class="select-icon" />
      {{ displayValue }}
    </span>
    <span v-else class="select-empty">—</span>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

interface Choice {
  value: string | number;
  text?: string;
  label?: string;
  icon?: string;
  color?: string;
}

const props = defineProps<{
  value: string | number | null;
  options?: Record<string, any>;
  field?: string;
}>();

const currentChoice = computed<Choice | null>(() => {
  if (props.value == null || !props.options?.choices) return null;

  return props.options.choices.find((c: Choice) => c.value === props.value) || null;
});

const displayValue = computed(() => {
  if (props.value == null) return null;

  // Check if there are field options with choices
  if (currentChoice.value) {
    return currentChoice.value.text || currentChoice.value.label || String(props.value);
  }

  return String(props.value);
});

const badgeStyle = computed(() => {
  if (!currentChoice.value?.color) return {};

  // Check if it's a CSS variable or hex color
  const color = currentChoice.value.color;
  const isVariable = color.startsWith('var(') || color.startsWith('--');

  return {
    backgroundColor: isVariable ? color : color.startsWith('#') ? color : `#${color}`,
    color: isVariable ? undefined : getContrastColor(color),
    borderColor: isVariable ? undefined : 'transparent',
  };
});

// Helper function to determine text color based on background
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#ffffff';
}
</script>

<style scoped>
.select-cell {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
}

.select-value {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: var(--background-subdued);
  border: 1px solid var(--border-color);
  transition: all var(--fast) var(--transition);
}

.select-value.has-icon {
  padding-left: 6px;
}

.select-icon {
  flex-shrink: 0;
  margin-right: 2px;
}

.select-empty {
  color: var(--foreground-subdued);
  font-style: italic;
}

/* Status-specific styling - these act as fallbacks */
.select-value--published {
  background: var(--success);
  color: var(--success-foreground);
  border-color: var(--success);
}

.select-value--draft {
  background: var(--warning);
  color: var(--warning-foreground);
  border-color: var(--warning);
}

.select-value--archived {
  background: var(--secondary);
  color: var(--secondary-foreground);
  border-color: var(--secondary);
}

/* Override status colors if custom color is provided */
.select-value[style*='background'] {
  border-color: transparent !important;
}
</style>
