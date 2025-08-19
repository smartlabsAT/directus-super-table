<template>
  <div class="quick-filters-container">
    <!-- Filter Buttons -->
    <div class="quick-filter-buttons">
      <v-menu
        v-for="preset in visiblePresets"
        :key="preset.id"
        placement="bottom-start"
        show-arrow
        :triggers="['contextmenu']"
      >
        <template #activator="{ toggle }">
          <v-button
            :class="[
              'quick-filter-button',
              `color-${preset.color || 'primary'}`,
              { active: isPresetActive(preset.id) },
            ]"
            secondary
            small
            @click="togglePreset(preset)"
            @contextmenu.prevent="toggle"
          >
            <v-icon v-if="preset.icon" :name="preset.icon" small />
            {{ preset.name }}
            <span v-if="showResultCount && preset.resultCount" class="result-count">
              ({{ preset.resultCount }})
            </span>
          </v-button>
        </template>

        <v-list>
          <!-- Edit Fields Container - Not clickable -->
          <div class="context-edit-container" @click.stop>
            <!-- Edit Name -->
            <div class="context-edit-field">
              <label class="context-label">Name</label>
              <v-input
                :model-value="preset.name"
                @update:model-value="updatePresetName(preset, $event)"
                placeholder="Filter name"
                dense
                @click.stop
              />
            </div>

            <!-- Icon Selector -->
            <div class="context-edit-field">
              <label class="context-label">Icon</label>
              <interface-select-icon
                :value="preset.icon || 'filter_list'"
                @input="updatePresetIcon(preset, $event)"
                @click.stop="fixIconMenuScroll"
              />
            </div>

            <!-- Color Selector -->
            <div class="context-edit-field">
              <label class="context-label">Color</label>
              <div class="context-color-selector">
                <div
                  v-for="color in colorOptions"
                  :key="color"
                  :class="[
                    'context-color-circle',
                    { active: (preset.color || 'primary') === color },
                  ]"
                  :style="{ backgroundColor: getColorValue(color) }"
                  :title="getColorLabel(color)"
                  @click.stop="updatePresetColor(preset, color)"
                >
                  <v-icon
                    v-if="(preset.color || 'primary') === color"
                    name="check"
                    x-small
                    class="color-check"
                  />
                </div>
              </div>
            </div>
          </div>

          <v-divider />

          <!-- Move Actions -->
          <v-list-item v-if="canMoveLeft(preset)" clickable @click="movePreset(preset, -1)">
            <v-list-item-icon>
              <v-icon name="arrow_back" />
            </v-list-item-icon>
            <v-list-item-content> Move Left </v-list-item-content>
          </v-list-item>

          <v-list-item v-if="canMoveRight(preset)" clickable @click="movePreset(preset, 1)">
            <v-list-item-icon>
              <v-icon name="arrow_forward" />
            </v-list-item-icon>
            <v-list-item-content> Move Right </v-list-item-content>
          </v-list-item>

          <v-divider v-if="canMoveLeft(preset) || canMoveRight(preset)" />

          <!-- Delete -->
          <v-list-item clickable class="danger" @click="deletePreset(preset)">
            <v-list-item-icon>
              <v-icon name="delete" />
            </v-list-item-icon>
            <v-list-item-content>
              {{ t('Delete Filter') }}
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-menu>

      <!-- More Filters Dropdown -->
      <v-menu v-if="hasMorePresets" placement="bottom-end" show-arrow>
        <template #activator="{ toggle }">
          <v-button secondary small class="more-filters-button" @click="toggle">
            <v-icon name="expand_more" small />
            More filters...
          </v-button>
        </template>

        <v-list>
          <v-list-item
            v-for="preset in hiddenPresets"
            :key="preset.id"
            clickable
            :active="isPresetActive(preset.id)"
            @click="togglePreset(preset)"
          >
            <v-list-item-icon v-if="preset.icon">
              <v-icon :name="preset.icon" />
            </v-list-item-icon>
            <v-list-item-content>
              {{ preset.name }}
              <span v-if="preset.description" class="preset-description">
                {{ preset.description }}
              </span>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>

    <!-- Save Preset Dialog -->
    <v-dialog
      v-model="saveDialogActive"
      :title="t('Save as Quick Filter')"
      persistent
      @esc="saveDialogActive = false"
    >
      <div class="save-preset-conten">
        <v-notice v-if="hasNativeFilters" type="info">
          Saving filter from native interface - it will appear as a Quick Filter button
        </v-notice>

        <v-input
          v-model="newPresetName"
          :placeholder="t('Quick Filter name (e.g. Active Items, This Month)')"
          autofocus
          @keydown.enter="savePreset"
        />

        <v-input v-model="newPresetDescription" :placeholder="t('Description (optional)')" />

        <div class="preset-options">
          <v-checkbox v-model="newPresetPinned" :label="t('Pin to quick filters')" />

          <v-checkbox
            v-model="newPresetShared"
            :label="t('Share with team')"
            :disabled="!canSharePresets"
          />
        </div>
      </div>

      <template #actions>
        <v-button secondary @click="saveDialogActive = false">
          {{ t('Cancel') }}
        </v-button>
        <v-button :disabled="!newPresetName" @click="savePreset">
          {{ t('Save') }}
        </v-button>
      </template>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog
      v-if="deleteDialogActive"
      :model-value="deleteDialogActive"
      @update:model-value="deleteDialogActive = $event"
      @esc="cancelDelete"
    >
      <v-card>
        <v-card-title>Delete Quick Filter</v-card-title>
        <v-card-text>
          <v-notice type="danger"> Are you sure you want to delete this filter? </v-notice>
          <div v-if="presetToDelete" class="filter-name">
            <strong>{{ presetToDelete.name }}</strong>
          </div>
          <div v-if="presetToDelete && isPresetActive(presetToDelete.id)" class="active-warning">
            <v-icon name="warning" />
            <span>This filter is currently active and will be deactivated.</span>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-button secondary @click="cancelDelete"> Cancel </v-button>
          <v-button kind="danger" @click="confirmDelete">
            <v-icon name="delete" />
            Delete Filter
          </v-button>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FilterPreset } from '../types/filter.types';
import { Filter } from '@directus/types';

interface Props {
  collection: string;
  presets: FilterPreset[];
  activePresetIds: string[];
  currentFilter?: Filter;
  nativeFilter?: Filter; // Filter from native interface
  maxVisible?: number;
  showResultCount?: boolean;
  canSaveFilters?: boolean;
  canSharePresets?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  maxVisible: 5,
  showResultCount: false,
  canSaveFilters: true,
  canSharePresets: false,
});

const emit = defineEmits<{
  'toggle-preset': [preset: FilterPreset];
  'save-preset': [preset: Omit<FilterPreset, 'id'>];
  'delete-preset': [preset: FilterPreset];
  'move-preset': [preset: FilterPreset, direction: number];
  'update-preset': [preset: FilterPreset, updates: Partial<FilterPreset>];
}>();

const { t } = useI18n();

// Color options for the selector
const colorOptions = ['primary', 'gray', 'success', 'warning', 'danger', 'info'];

// Function to fix icon menu scrolling
function fixIconMenuScroll() {
  // Use multiple timeouts to catch the menu at different stages of rendering
  const delays = [0, 50, 100, 200, 300];

  delays.forEach((delay) => {
    setTimeout(() => {
      // Find all v-menu-content elements
      const menus = document.querySelectorAll('.v-menu-content');

      menus.forEach((menu) => {
        // Check if this menu has icons (is an icon selector)
        if (menu.querySelector('.icons')) {
          const menuEl = menu as HTMLElement;

          // Force the styles with inline style
          menuEl.style.cssText = `
            max-height: 400px !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
          `;

          // Also try setting via setAttribute for extra measure
          menuEl.setAttribute('style', menuEl.style.cssText);
        }
      });

      // Also try with the popper element
      const poppers = document.querySelectorAll('.v-menu-popper');
      poppers.forEach((popper) => {
        const content = popper.querySelector('.v-menu-content');
        if (content && content.querySelector('.icons')) {
          const contentEl = content as HTMLElement;
          contentEl.style.cssText = `
            max-height: 400px !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
          `;
        }
      });
    }, delay);
  });
}

// State
const saveDialogActive = ref(false);
const deleteDialogActive = ref(false);
const presetToDelete = ref<FilterPreset | null>(null);
const newPresetName = ref('');
const newPresetDescription = ref('');
const newPresetPinned = ref(true);
const newPresetShared = ref(false);

// Computed
const sortedPresets = computed(() => {
  return [...props.presets].sort((a, b) => {
    // Sort by order field (or by array index if no order)
    const orderA = a.order !== undefined ? a.order : props.presets.indexOf(a);
    const orderB = b.order !== undefined ? b.order : props.presets.indexOf(b);
    return orderA - orderB;
  });
});

const visiblePresets = computed(() => {
  return sortedPresets.value.filter((p) => p.isPinned !== false).slice(0, props.maxVisible);
});

const hiddenPresets = computed(() => {
  return sortedPresets.value.filter((p) => p.isPinned !== false).slice(props.maxVisible);
});

const hasMorePresets = computed(() => {
  return hiddenPresets.value.length > 0;
});

// Has active filters - currently unused
// const hasActiveFilters = computed(() => {
//   return props.currentFilter && Object.keys(props.currentFilter).length > 0;
// });

const hasNativeFilters = computed(() => {
  return props.nativeFilter && Object.keys(props.nativeFilter).length > 0;
});

// Methods
function isPresetActive(presetId: string): boolean {
  return props.activePresetIds.includes(presetId);
}

function togglePreset(preset: FilterPreset) {
  emit('toggle-preset', preset);
}

// Open save dialog - currently unused
// function openSaveDialog() {
//   saveDialogActive.value = true;
//   newPresetName.value = '';
//   newPresetDescription.value = '';
//   newPresetPinned.value = true;
//   newPresetShared.value = false;
// }

function savePreset() {
  if (!newPresetName.value) return;

  // Prioritize native filter if available, otherwise use current merged filter
  const filterToSave = props.nativeFilter || props.currentFilter;

  if (!filterToSave) return;

  emit('save-preset', {
    name: newPresetName.value,
    description: newPresetDescription.value,
    collection: props.collection,
    filter: filterToSave,
    isPinned: newPresetPinned.value,
    isShared: newPresetShared.value,
    order: props.presets.length,
  });

  saveDialogActive.value = false;
}

function deletePreset(preset: FilterPreset) {
  presetToDelete.value = preset;
  deleteDialogActive.value = true;
}

function confirmDelete() {
  if (presetToDelete.value) {
    emit('delete-preset', presetToDelete.value);
    deleteDialogActive.value = false;
    presetToDelete.value = null;
  }
}

function cancelDelete() {
  deleteDialogActive.value = false;
  presetToDelete.value = null;
}

// Movement functions
function canMoveLeft(preset: FilterPreset): boolean {
  // Find index in ALL presets (not just visible)
  const allFilters = props.presets || [];
  const index = allFilters.findIndex((p) => p.id === preset.id);
  return index > 0;
}

function canMoveRight(preset: FilterPreset): boolean {
  // Find index in ALL presets (not just visible)
  const allFilters = props.presets || [];
  const index = allFilters.findIndex((p) => p.id === preset.id);
  return index >= 0 && index < allFilters.length - 1;
}

function movePreset(preset: FilterPreset, direction: number) {
  emit('move-preset', preset, direction);
}

// Update functions for context menu editing
function updatePresetName(preset: FilterPreset, name: string) {
  if (name && name !== preset.name) {
    emit('update-preset', preset, { name });
  }
}

function updatePresetIcon(preset: FilterPreset, icon: string) {
  if (icon !== preset.icon) {
    emit('update-preset', preset, { icon });
  }
}

function updatePresetColor(preset: FilterPreset, color: string) {
  if (color !== preset.color) {
    emit('update-preset', preset, { color });
  }
}

// Helper functions for colors
function getColorValue(colorName: string): string {
  const colorMap: Record<string, string> = {
    primary: 'var(--primary)',
    gray: '#6c757d',
    success: 'var(--success)',
    warning: 'var(--warning)',
    danger: 'var(--danger)',
    info: 'var(--info)',
  };
  return colorMap[colorName] || 'var(--primary)';
}

function getColorLabel(colorName: string): string {
  const labelMap: Record<string, string> = {
    primary: 'Primary',
    gray: 'Gray',
    success: 'Success',
    warning: 'Warning',
    danger: 'Danger',
    info: 'Info',
  };
  return labelMap[colorName] || 'Primary';
}
</script>

<style scoped>
.quick-filters-container {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 0 auto;
  flex-wrap: nowrap;
  min-width: 0;
}

.quick-filters-label {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--foreground-subdued);
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
}

.quick-filter-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  flex-wrap: nowrap;
  overflow-x: visible;
  overflow-y: visible;
  scrollbar-width: thin;
  scrollbar-color: var(--border-normal) transparent;
  max-width: 100%;
  padding-bottom: 4px;
}

/* Custom scrollbar for webkit browsers */
.quick-filter-buttons::-webkit-scrollbar {
  height: 4px;
}

.quick-filter-buttons::-webkit-scrollbar-track {
  background: transparent;
}

.quick-filter-buttons::-webkit-scrollbar-thumb {
  background-color: var(--border-normal);
  border-radius: 2px;
}

.quick-filter-buttons::-webkit-scrollbar-thumb:hover {
  background-color: var(--border-normal-alt);
}

.quick-filter-button {
  height: 36px !important;
  min-height: 36px !important;
  transition: all 0.2s ease;
  flex-shrink: 0;
  white-space: nowrap;
  position: relative;
  margin: 0 4px;
}

.quick-filter-button :deep(.v-icon) {
  margin-right: 6px;
}

/* Color Themes for Buttons */
.quick-filter-button.color-primary:not(.active) {
  --v-button-background-color: var(--primary-10);
  --v-button-background-color-hover: var(--primary-25);
  --v-button-color: var(--primary);
  --v-button-color-hover: var(--primary-125);
}

.quick-filter-button.color-primary.active {
  --v-button-background-color: var(--primary);
  --v-button-background-color-hover: var(--primary-125);
  --v-button-color: var(--foreground-inverted);
  --v-button-color-hover: var(--foreground-inverted);
}

.quick-filter-button.color-gray:not(.active) {
  --v-button-background-color: var(--background-normal);
  --v-button-background-color-hover: var(--background-normal-alt);
  --v-button-color: var(--foreground);
  --v-button-color-hover: var(--foreground);
}

.quick-filter-button.color-gray.active {
  --v-button-background-color: #6c757d;
  --v-button-background-color-hover: #5a6268;
  --v-button-color: white;
  --v-button-color-hover: white;
}

.quick-filter-button.color-success:not(.active) {
  --v-button-background-color: var(--success-10);
  --v-button-background-color-hover: var(--success-25);
  --v-button-color: var(--success);
  --v-button-color-hover: var(--success-125);
}

.quick-filter-button.color-success.active {
  --v-button-background-color: var(--success);
  --v-button-background-color-hover: var(--success-125);
  --v-button-color: var(--foreground-inverted);
  --v-button-color-hover: var(--foreground-inverted);
}

.quick-filter-button.color-warning:not(.active) {
  --v-button-background-color: var(--warning-10);
  --v-button-background-color-hover: var(--warning-25);
  --v-button-color: var(--warning);
  --v-button-color-hover: var(--warning-125);
}

.quick-filter-button.color-warning.active {
  --v-button-background-color: var(--warning);
  --v-button-background-color-hover: var(--warning-125);
  --v-button-color: var(--foreground-inverted);
  --v-button-color-hover: var(--foreground-inverted);
}

.quick-filter-button.color-danger:not(.active) {
  --v-button-background-color: var(--danger-10);
  --v-button-background-color-hover: var(--danger-25);
  --v-button-color: var(--danger);
  --v-button-color-hover: var(--danger-125);
}

.quick-filter-button.color-danger.active {
  --v-button-background-color: var(--danger);
  --v-button-background-color-hover: var(--danger-125);
  --v-button-color: var(--foreground-inverted);
  --v-button-color-hover: var(--foreground-inverted);
}

.quick-filter-button.color-info:not(.active) {
  --v-button-background-color: var(--info-10);
  --v-button-background-color-hover: var(--info-25);
  --v-button-color: var(--info);
  --v-button-color-hover: var(--info-125);
}

.quick-filter-button.color-info.active {
  --v-button-background-color: var(--info);
  --v-button-background-color-hover: var(--info-125);
  --v-button-color: var(--foreground-inverted);
  --v-button-color-hover: var(--foreground-inverted);
}

.result-count {
  margin-left: 4px;
  opacity: 0.7;
  font-size: 11px;
}

.more-filters-button {
  height: 36px !important;
  min-height: 36px !important;
  flex-shrink: 0;
  white-space: nowrap;
}

.preset-description {
  display: block;
  color: var(--foreground-subdued);
  font-size: 12px;
  margin-top: 2px;
}

.save-preset-content {
  padding: 20px;
  min-width: 400px;
  background-color: var(--background-page);
}

.save-preset-content > * + * {
  margin-top: 20px;
}

.preset-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Hover effect for inactive buttons */
.quick-filter-button:not(.active):hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Active state styling */
.quick-filter-button.active {
  animation: pulse 0.3s ease;
  position: relative;
  transform: translateY(-1px);
  box-shadow:
    0 4px 8px rgba(0, 0, 0, 0.1),
    0 0 0 2px var(--background-page),
    0 0 0 3px currentColor;
}

/* Active indicator dot */
.quick-filter-button.active::before {
  content: '';
  position: absolute;
  top: -4px;
  right: -4px;
  width: 8px;
  height: 8px;
  background: #3399ff;
  border: 2px solid #3399ff;
  border-radius: 50%;
  z-index: 1;
  animation: pulse-dot 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1) translateY(-1px);
  }
  50% {
    transform: scale(1.01) translateY(-1px);
  }
  100% {
    transform: scale(1) translateY(-1px);
  }
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.1);
  }
}

/* Danger list item styling */
.danger {
  --v-list-item-color: var(--danger);
  --v-list-item-color-hover: var(--danger);
  --v-list-item-icon-color: var(--danger);
}

/* Delete dialog styling */
.filter-name {
  margin-top: 12px;
  margin-bottom: 12px;
  font-size: 16px;
  text-align: center;
}

.active-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px;
  background-color: var(--warning-10);
  color: var(--warning);
  border-radius: var(--border-radius);
  font-size: 14px;
}

.active-warning v-icon {
  --v-icon-color: var(--warning);
}

/* Context Menu Edit Styles */
.context-edit-container {
  padding: 8px 12px;
}

.context-edit-field {
  padding: 4px 0;
}

.context-edit-field :deep(.v-input) {
  height: 28px !important;
  min-height: 28px !important;
  font-size: 13px;
}

.context-edit-field :deep(.v-input input) {
  font-size: 13px;
  padding: 4px 8px;
}

.context-edit-field :deep(.interface-select-icon) {
  height: 28px !important;
}

.context-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--foreground-subdued);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.context-color-selector {
  display: flex;
  gap: 6px;
  padding: 2px 0;
}

.context-color-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.context-color-circle:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.context-color-circle.active {
  border-color: var(--foreground-normal);
  box-shadow: 0 0 0 2px var(--background-normal);
}

.context-color-circle .color-check {
  color: white;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}
</style>

<style>
/* Global styles for icon selector scrolling - unscoped to affect teleported elements */

/* Make the menu container scrollable, not the individual icon sections */
.v-menu-content:has(.interface-select-icon) {
  max-height: 400px !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
}

/* Alternative selector for browsers without :has() support */
.interface-select-icon ~ .v-menu-popper .v-menu-content,
.interface-select-icon ~ div .v-menu-content {
  max-height: 400px !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
}

/* Ensure individual icon sections don't have their own scrollbars */
.v-menu-content .icons {
  max-height: none !important;
  overflow: visible !important;
}

/* Target the content div inside menu if it exists */
.v-menu-content > .content:has(.icons) {
  max-height: 100% !important;
  overflow: visible !important;
}
</style>
