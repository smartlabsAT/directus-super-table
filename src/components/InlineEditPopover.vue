<template>
  <div class="inline-edit-wrapper">
    <!-- Directus Native Popover Menu -->
    <v-menu
      v-if="!isRelational"
      v-model="menuActive"
      :disabled="!isEditable"
      placement="bottom-start"
      show-arrow
      :close-on-content-click="false"
      :close-on-click="false"
      :focus-trap="false"
    >
      <template #activator="{ toggle, active }">
        <!-- Cell Display with Edit Indicator -->
        <div
          ref="cellRef"
          v-tooltip.bottom="getFieldTooltip()"
          class="edit-cell"
          :class="{
            'is-editing': active,
            'is-editable': isEditable && !isRelational,
            'has-changes': hasUnsavedChanges,
            'non-editable': !isEditable,
            'field-unsupported': fieldSupportLevel === 'none',
            'field-readonly': fieldSupportLevel === 'readonly',
            'field-partial': fieldSupportLevel === 'partial',
          }"
          :tabindex="isEditable ? 0 : -1"
          @click="handleCellClick(toggle)"
        >
          <!-- Cell Content Display -->
          <div class="cell-display">
            <!-- Show spinner when saving -->
            <v-progress-circular v-if="saving" indeterminate small color="var(--primary)" />
            <!-- Show content when not saving -->
            <template v-else>
              <slot name="display" :value="displayValue">
                {{ formatDisplayValue(displayValue) }}
              </slot>
            </template>
          </div>

          <!-- Edit Indicator Icon - show lock or edit icon, but only in edit mode -->
          <v-icon
            v-if="!active && !saving && shouldShowIcon()"
            :name="getFieldIcon()"
            class="edit-icon"
            :class="{
              'lock-icon':
                fieldSupportLevel === 'none' ||
                fieldSupportLevel === 'readonly' ||
                fieldSupportLevel === 'partial',
            }"
            x-small
          />
        </div>
      </template>

      <!-- Popover Content -->
      <div class="edit-popover" :class="{ 'date-popover': isDateField }">
        <!-- Header with Field Name -->
        <div class="popover-header">
          <span class="field-name">{{ fieldLabel }}</span>
          <div class="header-actions">
            <!-- Save/Cancel buttons for all field types -->
            <v-button icon rounded small secondary @click="cancelEdit">
              <v-icon name="close" />
            </v-button>
            <v-button icon rounded small :disabled="!hasChanges" @click="saveAndClose">
              <v-icon name="check" />
            </v-button>
          </div>
        </div>

        <!-- Edit Interface -->
        <div class="popover-content">
          <!-- Boolean Toggle -->
          <v-checkbox
            v-if="interfaceType === 'boolean'"
            v-model="localValue"
            :label="fieldLabel"
            @update:model-value="handleBooleanChange"
          />

          <!-- Select Dropdown using interface-select-dropdown -->
          <interface-select-dropdown
            v-else-if="interfaceType === 'select-dropdown'"
            :value="localValue"
            :choices="interfaceOptions?.choices || []"
            :field="{
              field: fieldKey,
              name: fieldLabel,
              type: 'string',
              meta: {
                interface: 'select-dropdown',
                options: interfaceOptions,
              },
            }"
            :disabled="false"
            @input="handleSelectChange"
          />

          <!-- Date/Time Pickers -->
          <interface-datetime
            v-else-if="
              interfaceType === 'datetime' ||
              interfaceType === 'date' ||
              interfaceType === 'time' ||
              interfaceType === 'timestamp'
            "
            :value="localValue"
            :type="fieldType"
            :disabled="false"
            :include-seconds="interfaceType === 'timestamp'"
            :include-time="interfaceType === 'datetime' || interfaceType === 'timestamp'"
            :include-date="interfaceType !== 'time'"
            @input="handleDateTimeChange"
          />

          <!-- Color Picker -->
          <div v-else-if="interfaceType === 'select-color'">
            <component
              :is="`interface-${interfaceType}`"
              :value="localValue"
              :field="{
                field: fieldKey,
                name: fieldLabel,
                type: 'string',
                meta: {
                  interface: 'select-color',
                  options: interfaceOptions || {},
                },
              }"
              :width="'full'"
              :type="'string'"
              :disabled="false"
              @input="handleColorChange"
            />
          </div>

          <!-- WYSIWYG Editor - MUST come before textarea check -->
          <div v-else-if="interfaceType === 'input-rich-text-html' || interfaceType === 'wysiwyg'">
            <!-- Native Directus WYSIWYG Editor -->
            <interface-input-rich-text-html
              v-model="localValue"
              :value="localValue"
              :field="{
                field: fieldKey,
                name: fieldLabel,
                type: 'text',
                meta: {
                  interface: 'input-rich-text-html',
                  options: interfaceOptions || {},
                },
              }"
              :primary-key="'+'"
              :disabled="false"
              @input="
                (val: any) => {
                  localValue = val;
                  debouncedSave(val);
                }
              "
            />
          </div>

          <!-- File/Image Selector - Opens drawer immediately -->
          <div v-else-if="isFileField" class="file-selector-container">
            <!-- Just show loading while drawer opens -->
            <div class="file-loading-placeholder">
              <v-progress-circular indeterminate />
              <span>Opening file browser...</span>
            </div>
          </div>

          <!-- JSON/Code Editor for JSON fields -->
          <div v-else-if="isJsonField">
            <interface-input-code
              :value="jsonStringValue"
              language="json"
              :line-wrapping="true"
              :field="{
                field: fieldKey,
                name: fieldLabel,
                type: 'json',
                meta: {
                  interface: 'input-code',
                  options: {
                    language: 'json',
                    lineWrapping: true,
                    template: null,
                  },
                },
              }"
              @input="handleJsonInput"
            />
            <v-notice v-if="jsonError" type="warning" class="json-error">
              {{ jsonError }}
            </v-notice>
          </div>

          <!-- Textarea for long text -->
          <v-textarea
            v-else-if="interfaceType === 'textarea' || isLongText"
            v-model="localValue"
            :placeholder="placeholder"
            autofocus
            @keydown.esc.stop="cancelEdit"
            @keydown.ctrl.enter="saveAndClose"
            @keydown.meta.enter="saveAndClose"
          />

          <!-- Default Text Input -->
          <v-input
            v-else
            v-model="localValue"
            :type="inputType"
            :placeholder="placeholder"
            autofocus
            @keydown.enter.stop="saveAndClose"
            @keydown.esc.stop="cancelEdit"
            @keydown.tab="handleTab"
          />
        </div>

        <!-- Auto-save indicator (only show if autoSave is actually enabled) -->
        <div class="auto-save-status" v-if="autoSave && hasChanges">
          <v-icon name="fiber_manual_record" x-small class="pulse" />
          <span>Auto-saving...</span>
        </div>
      </div>
    </v-menu>

    <!-- File Browser Drawer -->
    <v-drawer
      v-if="isFileField"
      v-model="showFileBrowser"
      :title="`Select ${isImageField ? 'Image' : 'File'}`"
      persistent
      @cancel="closeFileBrowser"
    >
      <!-- Action buttons in drawer header (native Directus pattern) -->
      <template #actions>
        <v-button
          v-tooltip.bottom="'Clear selection'"
          icon
          rounded
          secondary
          @click="clearFileSelection"
        >
          <v-icon name="delete_outline" />
        </v-button>
        <v-button
          v-tooltip.bottom="'Select file'"
          icon
          rounded
          :disabled="!selectedFileId"
          @click="confirmFileSelection"
        >
          <v-icon name="check" />
        </v-button>
      </template>

      <!-- Optional subtitle with selection info -->
      <template #subtitle v-if="selectedFileId">
        <span>1 file selected</span>
      </template>

      <!-- Main drawer content -->
      <template #default>
        <div class="drawer-content">
          <!-- Inline file browser implementation -->
          <div class="file-browser-inline">
            <!-- Custom Breadcrumb (v-breadcrumb is router-coupled) -->
            <nav class="directus-breadcrumb" aria-label="Breadcrumb">
              <ol class="breadcrumb-list">
                <!-- Root/File Library -->
                <li class="breadcrumb-item">
                  <button type="button" class="breadcrumb-link" @click="navigateToFolder(null)">
                    <v-icon name="folder_special" x-small />
                    File Library
                  </button>
                </li>

                <!-- Folder Path -->
                <li
                  v-for="(folder, index) in folderPath"
                  :key="folder.id"
                  class="breadcrumb-item"
                  :class="{ active: index === folderPath.length - 1 }"
                >
                  <button
                    v-if="index < folderPath.length - 1"
                    type="button"
                    class="breadcrumb-link"
                    @click="navigateToFolder(folder.id)"
                  >
                    {{ folder.name }}
                  </button>
                  <span v-else class="breadcrumb-current">
                    {{ folder.name }}
                  </span>
                </li>
              </ol>
            </nav>

            <!-- Search -->
            <div class="browser-search">
              <v-input
                v-model="fileSearchQuery"
                placeholder="Search files..."
                prepend-icon="search"
                @input="searchFiles"
              />
            </div>

            <!-- Loading -->
            <v-progress-linear v-if="filesLoading" indeterminate />

            <!-- Files and Folders Grid -->
            <div v-else class="files-grid">
              <!-- No content message -->
              <div
                v-if="availableFiles.length === 0 && availableFolders.length === 0"
                class="no-files"
              >
                No files or folders found
              </div>

              <!-- Folders first -->
              <div
                v-for="folder in availableFolders"
                :key="`folder-${folder.id}`"
                class="file-item folder-item"
                @click="navigateToFolder(folder.id)"
              >
                <div class="folder-icon">
                  <v-icon name="folder" large color="var(--primary)" />
                </div>
                <div class="file-name">{{ folder.name }}</div>
              </div>

              <!-- Then files -->
              <div
                v-for="file in availableFiles"
                :key="file.id"
                class="file-item"
                :class="{ selected: file.id === selectedFileId }"
                @click="selectFile(file)"
              >
                <div v-if="file.type?.startsWith('image')" class="file-preview">
                  <img :src="getImageUrl(file.id)" :alt="file.title || file.filename_download" />
                </div>
                <div v-else class="file-icon">
                  <v-icon name="insert_drive_file" large />
                </div>
                <div class="file-name">{{ file.title || file.filename_download }}</div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </v-drawer>

    <!-- Non-editable or relational cell -->
    <div v-else class="edit-cell non-editable">
      <!-- Cell Content Display -->
      <div class="cell-display">
        <!-- Show spinner when saving -->
        <v-progress-circular v-if="saving" indeterminate small color="var(--primary)" />
        <!-- Show content when not saving -->
        <template v-else>
          <slot name="display" :value="displayValue">
            {{ formatDisplayValue(displayValue) }}
          </slot>
        </template>
      </div>
    </div>

    <!-- Clear Confirmation Dialog -->
    <v-dialog v-model="showClearConfirmDialog" @esc="showClearConfirmDialog = false">
      <v-card>
        <v-card-title>Remove Image</v-card-title>
        <v-card-text>
          Are you sure you want to remove this image? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-button secondary @click="showClearConfirmDialog = false"> Cancel </v-button>
          <v-button kind="danger" @click="confirmClearFile">
            <v-icon name="delete" />
            Remove
          </v-button>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useTableApi } from '../composables/api';
// Note: useDrawer might not be available in all versions, we'll use alternative approach

interface Props {
  value: any;
  fieldKey: string;
  fieldLabel?: string;
  fieldType?: string;
  interfaceType?: string;
  interfaceOptions?: Record<string, any>;
  isEditable?: boolean;
  isRelational?: boolean;
  autoSave?: boolean;
  placeholder?: string;
  saving?: boolean;
  collection?: string;
  primaryKeyValue?: string | number;
  allTranslations?: any[];
  fieldSupportLevel?: 'full' | 'partial' | 'none' | 'readonly';
  editModeActive?: boolean;
  fieldEditWarning?: string;
}

const props = withDefaults(defineProps<Props>(), {
  isEditable: true,
  isRelational: false,
  autoSave: false,
  placeholder: 'Enter value...',
  fieldLabel: 'Edit Field',
  saving: false,
});

const emit = defineEmits<{
  'update:value': [value: any];
  save: [value: any];
  cancel: [];
  'next-field': [];
  'prev-field': [];
}>();

// Global state for managing open popovers
const POPOVER_MANAGER_KEY = '__directus_inline_edit_active__';

// State
const menuActive = ref(false);
const localValue = ref<any>(null);
const originalValue = ref<any>(null);
const cellRef = ref<HTMLElement>();
const hasUnsavedChanges = ref(false);
const instanceId = ref(Math.random().toString(36).substr(2, 9));
const jsonError = ref<string | null>(null);
const imageLoadError = ref(false);
const showFileBrowser = ref(false);
const hasEscapeHandler = ref(false); // Track if escape handler is added
const popoverPlacement = ref<string>('bottom-start');

// File browser state
const filesLoading = ref(false);
const availableFiles = ref<any[]>([]);
const availableFolders = ref<any[]>([]);
const selectedFileId = ref<string | null>(null);
const fileSearchQuery = ref('');
const currentFolder = ref<string | null>(null);
const folderPath = ref<any[]>([]);

// Confirm dialog state
const showClearConfirmDialog = ref(false);

// Computed
const hasChanges = computed(() => {
  return localValue.value !== originalValue.value;
});

const displayValue = computed(() => {
  // Return raw value for render-display to handle correctly
  // Don't convert boolean to string here, let render-display handle it
  if (props.value === null || props.value === undefined) return null;
  return props.value;
});

const inputType = computed(() => {
  if (props.fieldType === 'integer' || props.fieldType === 'float') return 'number';
  if (props.fieldType === 'email') return 'email';
  if (props.fieldType === 'password') return 'password';
  return 'text';
});

const isLongText = computed(() => {
  return (
    props.fieldType === 'text' || (typeof props.value === 'string' && props.value.length > 100)
  );
});

const isJsonField = computed(() => {
  return (
    props.fieldType === 'json' ||
    props.fieldType === 'alias' ||
    (typeof props.value === 'object' && props.value !== null && !Array.isArray(props.value)) ||
    Array.isArray(props.value)
  );
});

const jsonStringValue = computed(() => {
  if (typeof localValue.value === 'string') {
    // Already a string, might be invalid JSON
    return localValue.value;
  }
  // Convert object/array to formatted JSON string
  return JSON.stringify(localValue.value, null, 2);
});

// File field detection
const isFileField = computed(() => {
  const iface = props.interfaceType;
  return iface === 'file' || iface === 'file-image' || iface === 'files' || iface === 'image';
});

const isImageField = computed(() => {
  const iface = props.interfaceType;
  return iface === 'file-image' || iface === 'image';
});

// Date field detection
const isDateField = computed(() => {
  const iface = props.interfaceType;
  return iface === 'date' || iface === 'datetime' || iface === 'time' || iface === 'timestamp';
});

// Global popover management
function closeOtherPopovers() {
  // Broadcast event to close other popovers
  const event = new CustomEvent('close-inline-edit-popovers', {
    detail: { excludeId: instanceId.value },
  });
  window.dispatchEvent(event);
}

function handleCloseRequest(event: CustomEvent) {
  if (event.detail.excludeId !== instanceId.value && menuActive.value) {
    // Save or discard changes before closing
    if (hasChanges.value && props.autoSave) {
      saveAndClose();
    } else {
      cancelEdit();
    }
  }
}

// Watch for menu opening
watch(menuActive, (active) => {
  if (active) {
    closeOtherPopovers(); // Close all other popovers first

    // Calculate optimal placement for date pickers
    if (
      cellRef.value &&
      (props.interfaceType === 'date' ||
        props.interfaceType === 'datetime' ||
        props.interfaceType === 'time' ||
        props.interfaceType === 'timestamp')
    ) {
      const rect = cellRef.value.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      // If less than 450px below and more space above, place on top
      if (spaceBelow < 450 && spaceAbove > 450) {
        popoverPlacement.value = 'top-start';
      } else {
        popoverPlacement.value = 'bottom-start';
      }
    }

    // For file fields, open drawer immediately instead of popover
    if (isFileField.value) {
      menuActive.value = false; // Close the popover
      // Initialize values before opening file browser
      originalValue.value = props.value;
      localValue.value = props.value;
      selectedFileId.value = props.value; // Set selected file immediately
      hasUnsavedChanges.value = false;

      nextTick(async () => {
        showFileBrowser.value = true; // Open the drawer
        await navigateToSelectedFile(); // Navigate to the folder containing the selected file
      });
      return;
    }

    openEditor();

    // Add escape handler but make sure it doesn't interfere with search
    document.addEventListener('keydown', handleGlobalEscape);
    hasEscapeHandler.value = true;

    // Set global flag
    (window as any)[POPOVER_MANAGER_KEY] = instanceId.value;
  } else {
    // Clean up when closing
    if (hasEscapeHandler.value) {
      document.removeEventListener('keydown', handleGlobalEscape);
      hasEscapeHandler.value = false;
    }

    // Clear global flag if this was the active one
    if ((window as any)[POPOVER_MANAGER_KEY] === instanceId.value) {
      delete (window as any)[POPOVER_MANAGER_KEY];
    }

    // Extra cleanup to ensure search field works
    nextTick(() => {
      // Make absolutely sure the search input is not blocked
      const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.removeAttribute('disabled');
        searchInput.removeAttribute('readonly');
        // Don't modify pointer-events or other styles, just ensure it's not disabled
      }
    });
  }
});

// Methods
function getFieldTooltip() {
  // Only show tooltip in edit mode for non-editable fields
  if (!props.editModeActive) {
    return undefined;
  }

  // Show warning for partially supported or unsupported fields
  if (
    props.fieldSupportLevel === 'partial' ||
    props.fieldSupportLevel === 'none' ||
    props.fieldSupportLevel === 'readonly'
  ) {
    return props.fieldEditWarning || 'This field has limited or no inline editing support';
  }

  return undefined;
}

function shouldShowIcon() {
  // Only show icons when edit mode is active globally
  if (!props.editModeActive) {
    return false;
  }

  // In edit mode, show appropriate icons
  return true;
}

function getFieldIcon() {
  if (
    props.fieldSupportLevel === 'partial' ||
    props.fieldSupportLevel === 'none' ||
    props.fieldSupportLevel === 'readonly'
  ) {
    return 'lock'; // Lock for all non-editable fields
  }
  if (props.isEditable && !props.isRelational) {
    return 'edit'; // Edit pencil for fully supported
  }
  return 'lock'; // Default to lock
}

function handleCellClick(toggle: Function) {
  // Only toggle if the field is editable
  if (props.isEditable && !props.isRelational) {
    toggle();
  } else if (props.fieldSupportLevel === 'none' || props.fieldSupportLevel === 'readonly') {
    // Show warning notification for unsupported fields
    // Note: We can't use Directus notifications here, but the tooltip will provide the info
    console.warn(
      `Field "${props.fieldKey}" is not editable: Support level is ${props.fieldSupportLevel}`
    );
  }
}

function formatDisplayValue(value: any): string {
  if (value === null || value === undefined) return '—';

  // Handle hash/password fields - show dots instead of actual value
  if (
    props.fieldType === 'hash' ||
    props.interfaceType === 'input-hash' ||
    props.interfaceType === 'password'
  ) {
    return '••••••••';
  }

  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  // Handle arrays - show count
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    // For translations array, show language codes
    if (value[0]?.languages_code) {
      const langs = value.map((t) => t.languages_code).join(', ');
      return `[${value.length}] ${langs}`;
    }
    return `[${value.length} items]`;
  }

  // Handle objects - show compact JSON
  if (typeof value === 'object') {
    const json = JSON.stringify(value);
    if (json.length > 50) {
      return json.substring(0, 47) + '...';
    }
    return json;
  }

  return String(value);
}

function openEditor() {
  originalValue.value = props.value;
  // Ensure localValue is never undefined for color fields
  if (props.interfaceType === 'select-color') {
    localValue.value = props.value || null;
  } else {
    localValue.value = props.value;
  }
  hasUnsavedChanges.value = false;
  jsonError.value = null;

  // Debug the state after setting
  nextTick(() => {
    // Focus input after menu opens (but not for WYSIWYG which handles its own focus)
    if (props.interfaceType !== 'input-rich-text-html' && props.interfaceType !== 'wysiwyg') {
      const input = document.querySelector('.edit-popover input, .edit-popover textarea');
      if (input instanceof HTMLElement) {
        input.focus();
        // Select text if it's an input
        if ('select' in input) {
          (input as HTMLInputElement).select();
        }
      }
    }
  });
}

function saveAndClose() {
  // Always save if we have a value change, not just based on hasChanges computed
  if (localValue.value !== originalValue.value || hasUnsavedChanges.value) {
    emit('update:value', localValue.value);
    emit('save', localValue.value);
    hasUnsavedChanges.value = false;
    originalValue.value = localValue.value;
  }
  menuActive.value = false;
}

function cancelEdit() {
  localValue.value = originalValue.value;
  hasUnsavedChanges.value = false;
  emit('cancel');
  menuActive.value = false;
}

function handleBooleanChange(value: boolean) {
  localValue.value = value;
  if (props.autoSave) {
    saveAndClose();
  }
}

function handleSelectChange(value: any) {
  localValue.value = value;
  if (props.autoSave) {
    debouncedSave(value);
  } else {
    hasUnsavedChanges.value = true;
  }
}

function handleColorChange(value: any) {
  localValue.value = value;
  if (props.autoSave) {
    debouncedSave(value);
  } else {
    hasUnsavedChanges.value = true;
  }
}

function handleDateTimeChange(value: any) {
  // Handle date/time value updates
  // Directus datetime interface returns ISO string or null
  localValue.value = value;

  // Mark as changed so save button enables
  hasUnsavedChanges.value = true;

  if (props.autoSave) {
    debouncedSave(value);
  }
}

function handleJsonInput(value: string) {
  try {
    // Try to parse the JSON string
    const parsed = JSON.parse(value);
    localValue.value = parsed;
    jsonError.value = null;

    if (props.autoSave) {
      debouncedSave(parsed);
    } else {
      hasUnsavedChanges.value = true;
    }
  } catch {
    // Invalid JSON, store as string temporarily
    localValue.value = value;
    jsonError.value = 'Invalid JSON';
    hasUnsavedChanges.value = true;
  }
}

// File handling methods
const tableApi = useTableApi();

function getImageUrl(fileId: string | null): string {
  if (!fileId) return '';
  // Use Directus asset endpoint with transformation
  return `/assets/${fileId}?key=system-medium-contain`;
}

async function navigateToSelectedFile() {
  // If there's a selected file, first find which folder it's in
  if (localValue.value && selectedFileId.value) {
    try {
      // Get the file details to find its folder
      const fileData = await tableApi.fetchFile(selectedFileId.value);

      if (fileData?.folder) {
        // Extract folder info
        let folderInfo;
        let folderId;

        if (typeof fileData.folder === 'object') {
          folderInfo = fileData.folder;
          // The folder object should now have an 'id' field
          folderId = folderInfo.id;
        } else if (typeof fileData.folder === 'string') {
          // If it's just an ID string
          folderId = fileData.folder;
          // Fetch the folder details for name and parent
          try {
            const folderData = await tableApi.fetchFolder(folderId);
            folderInfo = folderData?.folder || { id: folderId, name: 'Folder' };
          } catch {
            // Could not fetch folder details
            folderInfo = { id: folderId, name: 'Folder' };
          }
        }

        if (folderId) {
          currentFolder.value = folderId;

          // Build the full folder path for breadcrumb
          const path = [];

          // Add parent folders if they exist
          if (folderInfo && folderInfo.parent) {
            // If we have parent info, add it
            if (typeof folderInfo.parent === 'object' && folderInfo.parent.name) {
              path.push({
                id: folderInfo.parent.id || folderInfo.parent,
                name: folderInfo.parent.name,
              });
            } else if (typeof folderInfo.parent === 'string') {
              // We only have the parent ID, could fetch it but for now skip
              // Could enhance this to fetch parent folder details
            }
          }

          // Add current folder
          const folderName = folderInfo?.name || 'Folder';
          path.push({
            id: folderId,
            name: folderName,
          });

          folderPath.value = path;
        }
      } else {
        // File is in root folder
        currentFolder.value = null;
        folderPath.value = [];
      }
    } catch {
      // Error getting file folder
      // Fallback to root folder
      currentFolder.value = null;
      folderPath.value = [];
    }
  } else {
    // No file selected, start at root
    currentFolder.value = null;
    folderPath.value = [];
  }

  // Now load the files in the current folder
  await loadFiles();
}

async function loadFiles() {
  filesLoading.value = true;

  try {
    // Load files and folders using tableApi
    const result = await tableApi.fetchFiles({
      folder: currentFolder.value,
      search: fileSearchQuery.value,
      limit: 100,
    });

    // Filter files for images if needed
    if (isImageField.value && result.files) {
      availableFiles.value = result.files.filter(
        (file: any) => file.type && file.type.startsWith('image/')
      );
    } else {
      availableFiles.value = result.files || [];
    }

    availableFolders.value = result.folders || [];
  } catch {
    // Failed to load files
    availableFiles.value = [];
    availableFolders.value = [];
  } finally {
    filesLoading.value = false;
  }
}

async function navigateToFolder(folderId: string | null) {
  // Update current folder
  currentFolder.value = folderId;

  // Update breadcrumb path
  if (!folderId) {
    // Going to root
    folderPath.value = [];
  } else {
    // Load folder info to build path using tableApi
    try {
      const folderData = await tableApi.fetchFolder(folderId);
      folderPath.value = folderData.breadcrumb || [];
    } catch {
      // Failed to load folder path
      // Still navigate even if we can't build the path
      folderPath.value = [{ id: folderId, name: 'Current Folder' }];
    }
  }

  // Reload files for new folder
  await loadFiles();
}

function selectFile(file: any) {
  selectedFileId.value = file.id;
}

function confirmFileSelection() {
  if (selectedFileId.value) {
    handleFileSelection(selectedFileId.value);
  }
}

function clearFileSelection() {
  // Show confirmation dialog
  showClearConfirmDialog.value = true;
}

function confirmClearFile() {
  // Clear the file selection after confirmation
  localValue.value = null;
  selectedFileId.value = null;
  showFileBrowser.value = false;
  showClearConfirmDialog.value = false;

  // Save immediately to clear the relation
  emit('update:value', null);
  emit('save', null);
  originalValue.value = null;
  hasUnsavedChanges.value = false;
}

let searchTimeout: ReturnType<typeof setTimeout>;
function searchFiles() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadFiles();
  }, 300);
}

function closeFileBrowser() {
  showFileBrowser.value = false;
  // If value hasn't changed, cancel edit
  if (localValue.value === originalValue.value) {
    cancelEdit();
  }
}

function handleFileSelection(fileId: string) {
  localValue.value = fileId;
  showFileBrowser.value = false;

  // Save immediately for file selections
  emit('update:value', fileId);
  emit('save', fileId);
  originalValue.value = fileId;
  hasUnsavedChanges.value = false;
}

// Duplicate functions removed - see implementations above

// Reset image error when value changes
watch(
  () => localValue.value,
  () => {
    imageLoadError.value = false;
  }
);

// Menu close handled in main watch above

function handleTab(event: KeyboardEvent) {
  event.preventDefault();
  if (event.shiftKey) {
    emit('prev-field');
  } else {
    emit('next-field');
  }
  saveAndClose();
}

// Custom debounce implementation
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSave(value: any) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    if (props.autoSave && value !== originalValue.value) {
      emit('update:value', value);
      emit('save', value);
      originalValue.value = value;
      hasUnsavedChanges.value = false;
    } else {
      hasUnsavedChanges.value = true;
    }
  }, 500);
}

// Watch for changes
watch(localValue, (newValue) => {
  if (props.autoSave && menuActive.value) {
    hasUnsavedChanges.value = true;
    debouncedSave(newValue);
  } else {
    hasUnsavedChanges.value = newValue !== originalValue.value;
  }
});

// Close on escape key globally
function handleGlobalEscape(event: KeyboardEvent) {
  // NEVER interfere with the search input or any input outside the popover
  const target = event.target as HTMLElement;
  const isInsidePopover = target?.closest('.edit-popover');

  // Only handle escape if:
  // 1. The key is Escape
  // 2. The menu is active
  // 3. The target is inside the popover
  if (event.key === 'Escape' && menuActive.value && isInsidePopover) {
    cancelEdit();
  }
  // If escape is pressed outside the popover, ignore it completely
  // Let other components handle their own escape key
}

// Lifecycle hooks
onMounted(() => {
  // Listen for close requests from other instances
  window.addEventListener('close-inline-edit-popovers', handleCloseRequest as EventListener);
});

onUnmounted(() => {
  // Clean up event listener
  window.removeEventListener('close-inline-edit-popovers', handleCloseRequest as EventListener);

  // Clean up escape handler if still active
  if (hasEscapeHandler.value) {
    document.removeEventListener('keydown', handleGlobalEscape);
    hasEscapeHandler.value = false;
  }

  // Clean up global flag if this instance was active
  if ((window as any)[POPOVER_MANAGER_KEY] === instanceId.value) {
    delete (window as any)[POPOVER_MANAGER_KEY];
  }
});
</script>

<style scoped>
.inline-edit-wrapper {
  width: 100%;
  height: 100%;
}

.edit-cell {
  position: relative;
  min-height: 36px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: default;
  transition: all var(--fast) var(--transition);
  border-radius: var(--border-radius);
  width: 100%;
  overflow: hidden;
  outline: none !important;
}

.edit-cell.is-editable {
  cursor: pointer;
  outline: none !important;
}

.edit-cell:focus,
.edit-cell.is-editable:focus {
  outline: none !important;
}

.edit-cell.is-editable:hover {
  background-color: var(--background-highlight);
}

.edit-cell.is-editing {
  background-color: var(--primary-alt);
}

.edit-cell.has-changes {
  background-color: var(--warning-alt);
}

.cell-display {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.edit-icon {
  opacity: 0;
  transition: opacity var(--fast) var(--transition);
  margin-left: 8px;
  color: var(--foreground-subdued);
  flex-shrink: 0;
}

.edit-cell.is-editable:hover .edit-icon {
  opacity: 0.6;
}

.edit-cell.is-editable:focus .edit-icon {
  opacity: 1;
}

.edit-cell.non-editable {
  /* Removed opacity: 0.7 - content should be fully visible even when not editable */
  cursor: default;
}

/* Popover Styles */
.edit-popover {
  min-width: 300px;
  max-width: 400px;
  background: var(--background-page);
  border-radius: var(--border-radius);
  overflow: hidden;
}

/* Wider popover for date fields to accommodate calendar */
.edit-popover:has(.interface-datetime),
.edit-popover.date-popover {
  min-width: 380px;
  max-width: 450px;
}

.popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--background-subdued);
  border-bottom: var(--border-width) solid var(--border-subdued);
}

.field-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--foreground);
}

.header-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-direction: row;
  justify-content: flex-end;
}

/* Icon buttons in header are already properly styled by Directus */

.popover-content {
  padding: 16px;
}

.popover-content :deep(.v-input),
.popover-content :deep(.v-textarea),
.popover-content :deep(.v-select) {
  --input-height: 40px;
  --input-font-family: var(--family-monospace);
}

.popover-content :deep(.v-textarea) {
  min-height: 100px;
}

.auto-save-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--background-subdued);
  border-top: var(--border-width) solid var(--border-subdued);
  font-size: 12px;
  color: var(--foreground-subdued);
}

.auto-save-status .v-icon {
  color: var(--success);
}

/* Pulse animation for auto-save */
@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

.pulse {
  animation: pulse 1s ease-in-out infinite;
}

/* Select dropdown styles with icon and color support */
.select-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.option-icon {
  flex-shrink: 0;
  color: var(--option-color, var(--foreground-subdued));
}

.option-text {
  flex: 1;
}

.select-preview {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--choice-color, transparent);
}

.preview-icon {
  flex-shrink: 0;
}

.preview-text {
  font-size: 14px;
}

.select-placeholder {
  color: var(--foreground-subdued);
  font-style: italic;
}

/* Drawer icon with current image */
.drawer-icon-wrapper {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--background-normal);
  overflow: hidden;
}

.drawer-icon-current-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Simplified file selector styles */
.file-selector-container {
  width: 100%;
  min-width: 300px;
}

.file-loading-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  color: var(--foreground-subdued);
}

.file-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px;
  position: relative;
}

.image-preview-inline {
  width: 100%;
  border-radius: var(--border-radius);
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: var(--background-subdued);
  margin-bottom: 8px;
}

.inline-thumbnail {
  width: 100%;
  height: auto;
  max-height: 150px;
  object-fit: contain;
  display: block;
}

.file-helper-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--foreground-subdued);
  margin-top: 4px;
}

.file-input-wrapper .v-button {
  position: absolute;
  top: 8px;
  right: 8px;
}

/* File drawer styles */
.drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.drawer-current-image {
  padding: 12px 0;
}

.current-label {
  font-size: 12px;
  color: var(--foreground-subdued);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.current-image-preview {
  max-width: 200px;
  max-height: 150px;
  object-fit: contain;
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  background: var(--background-subdued);
}

/* Inline file browser styles */
.file-browser-inline {
  display: flex;
  flex-direction: column;
  height: auto; /* Dynamische Höhe */
}

/* Custom Directus-style Breadcrumb */
.directus-breadcrumb {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--background-subdued);
}

.breadcrumb-list {
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 4px;
  flex-wrap: wrap;
}

.breadcrumb-item:not(:last-child)::after {
  content: '/';
  margin: 0 8px;
  color: var(--foreground-subdued);
  opacity: 0.5;
}

.breadcrumb-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: var(--primary);
  cursor: pointer;
  font-family: var(--family-sans-serif);
  font-size: 14px;
  padding: 4px 8px;
  border-radius: var(--border-radius);
  text-decoration: none;
  transition: all var(--fast) var(--transition);
}

.breadcrumb-link:hover {
  background: var(--primary-10);
  color: var(--primary-125);
}

.breadcrumb-current {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--foreground);
  font-size: 14px;
  font-weight: 600;
  padding: 4px 8px;
  opacity: 0.7;
}

.browser-search {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); /* Größere Mindestbreite für bessere Bilddarstellung */
  gap: 12px; /* Mehr Abstand zwischen Items */
  padding: 16px;
  overflow-y: auto;
  max-height: 60vh; /* Maximal 60% der Viewport-Höhe */
  min-height: 300px; /* Erhöhte Minimum Höhe */
}

.no-files {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--foreground-subdued);
  padding: 40px;
}

.file-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  min-height: 180px; /* Erhöhte Höhe für bessere Bilddarstellung */
  border: 2px solid transparent;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all var(--fast) var(--transition);
  background: var(--background-page);
}

.file-item:hover {
  background: var(--background-normal);
}

.file-item.selected {
  border-color: var(--primary);
  background: var(--primary-alt);
}

.file-preview {
  width: 100%;
  height: 140px; /* Erhöhte Höhe für bessere Sichtbarkeit */
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius);
  background: var(--background-subdued);
  position: relative;
}

.file-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain; /* Zeigt das komplette Bild ohne Abschneiden */
  object-position: center;
}

.file-icon {
  width: 100%;
  height: 140px; /* Gleiche Höhe wie file-preview */
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--background-subdued);
  border-radius: var(--border-radius);
}

.folder-icon {
  width: 100%;
  height: 140px; /* Gleiche Höhe wie andere Icons */
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-alt);
  border-radius: var(--border-radius);
}

.folder-item {
  background: var(--background-normal-alt);
}

.folder-item:hover {
  background: var(--primary-10);
  transform: scale(1.02);
}

.file-name {
  margin-top: 4px;
  font-size: 11px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  line-height: 1.2;
}

/* Override v-menu arrow to match cell */
:global(.v-menu.v-menu--attached[data-popper-placement^='bottom'] .arrow) {
  top: -4px;
}

:global(.v-menu.v-menu--attached[data-popper-placement^='top'] .arrow) {
  bottom: -4px;
}

/* Adjust v-list-item for custom select content */
.popover-content :deep(.v-list-item-content) {
  padding: 0 !important;
}

/* Dialog overrides for file selection */
:deep(.v-dialog .v-card) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.v-dialog .v-card-title) {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

:deep(.v-dialog .v-card-text) {
  flex: 1;
  overflow: auto;
}

.popover-content :deep(.v-list-item) {
  min-height: auto !important;
  padding: 4px 12px !important;
}

/* Select dropdown wrapper */
.select-dropdown-wrapper {
  width: 100%;
}

.select-dropdown-wrapper :deep(.v-select) {
  width: 100%;
}

.json-error {
  margin-top: 8px;
  font-size: 12px;
}

/* Styles for unsupported/readonly fields */
.edit-cell.field-unsupported,
.edit-cell.field-readonly,
.edit-cell.field-partial {
  opacity: 0.7;
  cursor: not-allowed !important;
}

.edit-cell.field-unsupported:hover,
.edit-cell.field-readonly:hover,
.edit-cell.field-partial:hover {
  background-color: var(--background-subdued);
}

/* Lock icon styling */
.edit-icon.lock-icon {
  color: var(--foreground-subdued);
  opacity: 0.6;
}

/* Override cursor for non-editable cells */
.edit-cell.non-editable,
.edit-cell.field-unsupported,
.edit-cell.field-readonly,
.edit-cell.field-partial {
  cursor: not-allowed !important;
}

.edit-cell.non-editable .cell-display,
.edit-cell.field-unsupported .cell-display,
.edit-cell.field-readonly .cell-display,
.edit-cell.field-partial .cell-display {
  cursor: not-allowed !important;
}
</style>
