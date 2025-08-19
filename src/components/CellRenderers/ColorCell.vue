<!-- ./extensions/layouts/super-layout-table/components/CellRenderers/ColorCell.vue -->
<template>
  <div class="color-cell">
    <div v-if="colorValue" class="color-display" @mouseenter="showCopyIcon = true" @mouseleave="showCopyIcon = false">
      <div 
        class="color-preview" 
        :style="{ backgroundColor: colorValue }"
        :title="colorValue"
      />
      <span class="color-value">{{ colorValue }}</span>
      <transition name="fade">
        <button 
          v-if="showCopyIcon && !isEditMode"
          class="copy-button"
          @click.stop="copyToClipboard"
          :title="`Copy ${colorValue}`"
        >
          <v-icon :name="copied ? 'check' : 'content_copy'" x-small />
        </button>
      </transition>
    </div>
    <span v-else class="color-empty">—</span>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useStores } from '@directus/extensions-sdk';

const props = defineProps<{ 
  value?: string | null; 
  item?: any;
  field?: string;
  editMode?: boolean;
}>();

const { useNotificationsStore } = useStores();
const notificationsStore = useNotificationsStore();

const showCopyIcon = ref(false);
const copied = ref(false);

// Check if we're in edit mode (passed from parent)
const isEditMode = computed(() => props.editMode);

const colorValue = computed(() => {
  if (!props.value) return null;
  
  // Handle color object format (some interfaces return {color: '#hex'})
  if (typeof props.value === 'object' && props.value && 'color' in props.value) {
    return (props.value as any).color;
  }
  
  // Handle direct color string
  if (typeof props.value === 'string') {
    return props.value;
  }
  
  return null;
});

async function copyToClipboard() {
  if (!colorValue.value) return;
  
  try {
    await navigator.clipboard.writeText(colorValue.value);
    copied.value = true;
    
    notificationsStore.add({
      title: 'Color copied!',
      text: `${colorValue.value} copied to clipboard`,
      type: 'success',
      persist: false,
      closeable: true,
    });
    
    // Reset copied state after 2 seconds
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    notificationsStore.add({
      title: 'Failed to copy',
      text: 'Could not copy color to clipboard',
      type: 'error',
      persist: false,
      closeable: true,
    });
  }
}
</script>

<style scoped>
.color-cell {
  display: flex;
  align-items: center;
  min-height: 32px;
}

.color-display {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.color-preview {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

/* Checkered background for transparent colors */
.color-preview::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(45deg, #e0e0e0 25%, transparent 25%),
    linear-gradient(-45deg, #e0e0e0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e0e0e0 75%),
    linear-gradient(-45deg, transparent 75%, #e0e0e0 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
  z-index: -1;
}

.color-value {
  font-family: var(--family-monospace);
  font-size: 12px;
  color: var(--foreground);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.color-empty {
  color: var(--foreground-subdued);
  font-style: italic;
}

/* Copy button */
.copy-button {
  position: absolute;
  right: -24px;
  top: 50%;
  transform: translateY(-50%);
  background: var(--background-page);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.copy-button:hover {
  background: var(--background-accent);
  border-color: var(--primary);
}

.copy-button:active {
  transform: translateY(-50%) scale(0.95);
}

/* Fade transition for copy button */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Hover effect */
.color-display:hover .color-preview {
  transform: scale(1.1);
  transition: transform 0.2s ease;
}

/* Dark mode adjustments */
body.dark .color-preview {
  box-shadow: 
    inset 0 0 0 1px rgba(255, 255, 255, 0.2),
    0 2px 4px rgba(0, 0, 0, 0.3);
}

body.dark .color-preview::before {
  background-image: 
    linear-gradient(45deg, #333 25%, transparent 25%),
    linear-gradient(-45deg, #333 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #333 75%),
    linear-gradient(-45deg, transparent 75%, #333 75%);
}
</style>