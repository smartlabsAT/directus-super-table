<!-- ./extensions/layouts/super-layout-table/components/CellRenderers/ImageCell.vue -->
<template>
  <div class="image-cell">
    <div v-if="imageSrc" class="image-wrapper">
      <img :src="imageSrc" :alt="alt || 'Preview'" class="preview-image" @error="onImageError" />
    </div>
    <span v-else class="image-empty">—</span>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';

interface ImageValue {
  id: string;
  filename_download: string;
  title?: string;
}

const props = defineProps<{
  value?: string | ImageValue | null;
  item?: any;
  field?: string;
}>();

const imageError = ref(false);

const imageSrc = computed(() => {
  if (!props.value || imageError.value) return null;

  // If value is a string (file ID)
  if (typeof props.value === 'string') {
    return `/assets/${props.value}?key=system-medium-contain`;
  }

  // If value is a file object
  if (typeof props.value === 'object' && props.value.id) {
    return `/assets/${props.value.id}?key=system-medium-contain`;
  }

  return null;
});

const alt = computed(() => {
  if (typeof props.value === 'object' && props.value?.title) {
    return props.value.title;
  }
  return props.field || 'Image';
});

function onImageError() {
  imageError.value = true;
}
</script>

<style scoped>
.image-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 2px;
  /* Contained height */
  height: fit-content;
}

.image-wrapper {
  position: relative;
  border-radius: 4px;
  overflow: hidden;
  background: var(--background-subdued);
  border: 1px solid var(--border-color);
  /* Start small, grow with column width */
  width: min(100%, max(60px, 80%));
  /* Maintain aspect ratio */
  aspect-ratio: 16/10;
  /* Start with reasonable height */
  height: auto;
  min-height: 32px;
  max-height: 150px;
}

.preview-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.image-wrapper:hover .preview-image {
  transform: scale(1.05);
  cursor: pointer;
}

.image-empty {
  color: var(--foreground-subdued);
  font-style: italic;
}
</style>
