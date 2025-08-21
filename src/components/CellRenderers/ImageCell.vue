<!-- ./extensions/layouts/super-layout-table/components/CellRenderers/ImageCell.vue -->
<template>
  <div class="image-cell" :class="`align-${alignment || 'center'}`">
    <div
      v-if="imageSrc"
      class="image-wrapper"
      @mouseenter="handleMouseEnter"
      @mouseleave="showPreview = false"
    >
      <img :src="imageSrc" :alt="alt || 'Preview'" class="preview-image" @error="onImageError" />
    </div>
    <span v-else class="image-empty">—</span>

    <!-- Hover preview außerhalb des Wrappers mit v-show -->
    <Teleport to="body" v-if="imageSrc">
      <div
        v-show="showPreview"
        class="image-hover-preview"
        :style="previewStyle"
        @mouseenter="showPreview = true"
        @mouseleave="showPreview = false"
      >
        <img :src="imageSrc" :alt="alt || 'Preview'" />
      </div>
    </Teleport>
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
  alignment?: 'left' | 'center' | 'right';
}>();

const imageError = ref(false);
const showPreview = ref(false);
const mouseX = ref(0);
const mouseY = ref(0);

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

// Dynamische Position basierend auf Mausposition mit Offset
const previewStyle = computed(() => {
  const offset = 20; // Offset von der Maus
  const previewWidth = 400;
  const previewHeight = 400;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  let left = mouseX.value + offset;
  let top = mouseY.value - previewHeight / 2; // Vertikal zentriert zur Maus

  // Wenn Preview rechts aus dem Fenster ragt, links von der Maus anzeigen
  if (left + previewWidth > windowWidth - 20) {
    left = mouseX.value - previewWidth - offset;
  }

  // Sicherstellen dass Preview nicht aus dem Fenster ragt
  if (left < 20) left = 20;
  if (top < 20) top = 20;
  if (top + previewHeight > windowHeight - 20) {
    top = windowHeight - previewHeight - 20;
  }

  return {
    left: `${left}px`,
    top: `${top}px`,
    transform: 'none', // Kein transform mehr nötig
  };
});

function handleMouseEnter(event: MouseEvent) {
  showPreview.value = true;
  mouseX.value = event.clientX;
  mouseY.value = event.clientY;
}

function onImageError() {
  imageError.value = true;
}
</script>

<style scoped>
.image-cell {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 2px;
  height: 100%;
}

/* Alignment variations */
.image-cell.align-left {
  justify-content: flex-start;
}

.image-cell.align-center {
  justify-content: center;
}

.image-cell.align-right {
  justify-content: flex-end;
}

.image-wrapper {
  position: relative;
  border-radius: 4px;
  background: var(--background-subdued);
  border: 1px solid var(--border-color);
  /* Kompakter Thumbnail der in normale Rows passt */
  width: 60px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible; /* Allow hover preview to overflow */
}

.preview-image {
  display: block;
  max-width: calc(100% - 4px);
  max-height: calc(100% - 4px);
  width: auto;
  height: auto;
  object-fit: contain; /* Zeigt das komplette Bild ohne Abschneiden */
  object-position: center;
}

/* Hover preview tooltip - Fixed positioning */
.image-hover-preview {
  position: fixed;
  width: 400px;
  height: 400px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 12px;
  pointer-events: auto; /* Wichtig für mouseenter/leave */
  transition: opacity 0.2s ease;
}

.image-hover-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
}

.image-wrapper:hover {
  cursor: zoom-in;
  border-color: var(--primary);
  transform: scale(1.05);
  transition: all 0.2s ease;
}

.image-empty {
  color: var(--foreground-subdued);
  font-style: italic;
}

/* Bessere Responsivität für schmale Spalten */
@media (max-width: 768px) {
  .image-wrapper {
    width: 80px;
    height: 60px;
  }

  .image-hover-preview {
    width: 300px;
    height: 300px;
  }
}
</style>
