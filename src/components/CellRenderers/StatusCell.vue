<!-- ./extensions/layouts/super-layout-table/components/CellRenderers/StatusCell.vue -->
<template>
  <div
    class="status-cell"
    :class="{ 'in-edit-mode': editMode }"
    :style="{ justifyContent: cellAlignment }"
  >
    <div
      v-tooltip="statusText"
      class="status-dot"
      :class="`status-dot--${value}`"
      :style="dotStyle"
    >
      <span class="status-inner-dot"></span>
    </div>
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
  editMode?: boolean;
  align?: string;
}>();

const currentChoice = computed<Choice | null>(() => {
  if (props.value == null || !props.options?.choices) return null;

  return props.options.choices.find((c: Choice) => c.value === props.value) || null;
});

const statusText = computed(() => {
  if (props.value == null) return '—';

  // Get text from choices if available
  if (currentChoice.value) {
    return currentChoice.value.text || currentChoice.value.label || String(props.value);
  }

  // Fallback to value with first letter capitalized
  const text = String(props.value);
  return text.charAt(0).toUpperCase() + text.slice(1);
});

const dotStyle = computed(() => {
  if (!currentChoice.value?.color) return {};

  const color = currentChoice.value.color;
  const isVariable = color.startsWith('var(') || color.startsWith('--');

  if (isVariable) {
    return {
      backgroundColor: color,
    };
  }

  const hexColor = color.startsWith('#') ? color : `#${color}`;
  return {
    backgroundColor: hexColor,
  };
});

const cellAlignment = computed(() => {
  // Always respect the align prop if provided
  if (props.align === 'center') return 'center';
  if (props.align === 'right') return 'flex-end';
  if (props.align === 'left') return 'flex-start';

  // Default: left alignment
  return 'flex-start';
});
</script>

<style scoped>
.status-cell {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 0 12px;
}

.status-dot {
  position: relative;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--foreground-subdued);
  transition: all var(--fast) var(--transition);
  cursor: help;
}

.status-dot:hover {
  transform: scale(1.2);
  box-shadow: 0 0 0 4px var(--background-highlight);
}

.status-inner-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--background-page);
  opacity: 0.3;
}

/* Default status colors */
.status-dot--published {
  background: var(--success);
}

.status-dot--draft {
  background: var(--warning);
}

.status-dot--archived {
  background: var(--secondary);
}

.status-dot--active {
  background: var(--success);
}

.status-dot--inactive {
  background: var(--danger);
}

.status-dot--pending {
  background: var(--warning);
}

.status-dot--approved {
  background: var(--success);
}

.status-dot--rejected {
  background: var(--danger);
}

/* Animation for active status */
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 currentColor;
  }
  70% {
    box-shadow: 0 0 0 4px transparent;
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

.status-dot--active,
.status-dot--published {
  animation: pulse 2s infinite;
}
</style>
