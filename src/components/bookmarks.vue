<template>
  <div class="bookmarks-container">
    <!-- Bookmark Selector -->
    <v-select
      v-if="bookmarks.length > 0"
      v-model="selectedBookmark"
      :items="bookmarkItems"
      :placeholder="t('select_bookmark')"
      @update:model-value="loadBookmark"
    >
      <template #prepend>
        <v-icon name="bookmark" />
      </template>
    </v-select>

    <!-- Save Current View Button -->
    <v-button
      v-tooltip="t('save_as_bookmark')"
      icon
      secondary
      @click="openSaveDialog"
    >
      <v-icon name="bookmark_add" />
    </v-button>

    <!-- Manage Bookmarks Button -->
    <v-button
      v-if="bookmarks.length > 0"
      v-tooltip="t('manage_bookmarks')"
      icon
      secondary
      @click="openManageDialog"
    >
      <v-icon name="settings" />
    </v-button>

    <!-- Save Bookmark Dialog -->
    <v-dialog
      v-model="saveDialogActive"
      :title="t('save_bookmark')"
      @esc="saveDialogActive = false"
    >
      <div class="save-dialog-content">
        <v-input
          v-model="newBookmarkName"
          :placeholder="t('bookmark_name')"
          autofocus
          @keydown.enter="saveBookmark"
        />
        
        <v-textarea
          v-model="newBookmarkDescription"
          :placeholder="t('bookmark_description_placeholder')"
        />

        <v-checkbox
          v-model="newBookmarkIsDefault"
          :label="t('set_as_default')"
        />

        <v-checkbox
          v-model="newBookmarkIsGlobal"
          :label="t('share_globally')"
          :disabled="!canCreateGlobalBookmarks"
        />
      </div>

      <template #actions>
        <v-button secondary @click="saveDialogActive = false">
          {{ t('cancel') }}
        </v-button>
        <v-button
          :disabled="!newBookmarkName"
          @click="saveBookmark"
        >
          {{ t('save') }}
        </v-button>
      </template>
    </v-dialog>

    <!-- Manage Bookmarks Dialog -->
    <v-dialog
      v-model="manageDialogActive"
      :title="t('manage_bookmarks')"
      @esc="manageDialogActive = false"
    >
      <div class="manage-dialog-content">
        <v-list>
          <v-draggable
            v-model="bookmarks"
            item-key="id"
            handle=".drag-handle"
            @update:model-value="updateBookmarkOrder"
          >
            <template #item="{ element: bookmark }">
              <v-list-item
                :active="bookmark.id === selectedBookmark"
              >
                <v-list-item-icon>
                  <v-icon name="drag_handle" class="drag-handle" />
                </v-list-item-icon>
                
                <v-list-item-content>
                  <div class="bookmark-info">
                    <div class="bookmark-name">
                      {{ bookmark.name }}
                      <v-chip v-if="bookmark.isDefault" x-small>
                        {{ t('default') }}
                      </v-chip>
                      <v-chip v-if="bookmark.isGlobal" x-small>
                        {{ t('global') }}
                      </v-chip>
                    </div>
                    <div v-if="bookmark.description" class="bookmark-description">
                      {{ bookmark.description }}
                    </div>
                  </div>
                </v-list-item-content>

                <v-list-item-icon>
                  <v-menu placement="bottom-end" show-arrow>
                    <template #activator="{ toggle }">
                      <v-icon
                        name="more_vert"
                        clickable
                        @click="toggle"
                      />
                    </template>

                    <v-list>
                      <v-list-item
                        clickable
                        @click="editBookmark(bookmark)"
                      >
                        <v-list-item-icon>
                          <v-icon name="edit" />
                        </v-list-item-icon>
                        <v-list-item-content>
                          {{ t('edit') }}
                        </v-list-item-content>
                      </v-list-item>

                      <v-list-item
                        clickable
                        @click="duplicateBookmark(bookmark)"
                      >
                        <v-list-item-icon>
                          <v-icon name="content_copy" />
                        </v-list-item-icon>
                        <v-list-item-content>
                          {{ t('duplicate') }}
                        </v-list-item-content>
                      </v-list-item>

                      <v-divider />

                      <v-list-item
                        clickable
                        :disabled="bookmark.isDefault"
                        @click="setAsDefault(bookmark)"
                      >
                        <v-list-item-icon>
                          <v-icon name="star" />
                        </v-list-item-icon>
                        <v-list-item-content>
                          {{ t('set_as_default') }}
                        </v-list-item-content>
                      </v-list-item>

                      <v-divider />

                      <v-list-item
                        clickable
                        class="danger"
                        @click="deleteBookmark(bookmark)"
                      >
                        <v-list-item-icon>
                          <v-icon name="delete" />
                        </v-list-item-icon>
                        <v-list-item-content>
                          {{ t('delete') }}
                        </v-list-item-content>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </v-list-item-icon>
              </v-list-item>
            </template>
          </v-draggable>
        </v-list>
      </div>

      <template #actions>
        <v-button @click="manageDialogActive = false">
          {{ t('done') }}
        </v-button>
      </template>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useApi, useStores } from '@directus/extensions-sdk';

export interface Bookmark {
  id: string;
  name: string;
  description?: string;
  collection: string;
  config: {
    fields?: string[];
    filter?: any;
    sort?: string[];
    search?: string;
    limit?: number;
    view?: string;
  };
  isDefault?: boolean;
  isGlobal?: boolean;
  userId?: string;
  order?: number;
}

const props = defineProps<{
  collection: string;
  currentConfig: {
    fields?: string[];
    filter?: any;
    sort?: string[];
    search?: string;
    limit?: number;
  };
}>();

const emit = defineEmits<{
  'load-bookmark': [bookmark: Bookmark];
}>();

const { t } = useI18n();
const api = useApi();
const { useUserStore, usePermissionsStore } = useStores();
const userStore = useUserStore();
const permissionsStore = usePermissionsStore();

// State
const bookmarks = ref<Bookmark[]>([]);
const selectedBookmark = ref<string | null>(null);
const saveDialogActive = ref(false);
const manageDialogActive = ref(false);
const newBookmarkName = ref('');
const newBookmarkDescription = ref('');
const newBookmarkIsDefault = ref(false);
const newBookmarkIsGlobal = ref(false);
const editingBookmark = ref<Bookmark | null>(null);

// Computed
const bookmarkItems = computed(() => {
  return bookmarks.value.map(bookmark => ({
    text: bookmark.name,
    value: bookmark.id,
    description: bookmark.description
  }));
});

const canCreateGlobalBookmarks = computed(() => {
  // Check if user has permission to create global bookmarks
  return userStore.isAdmin || permissionsStore.hasPermission('directus_bookmarks', 'create');
});

// Load bookmarks on mount
onMounted(async () => {
  await loadBookmarks();
  
  // Auto-select default bookmark if exists
  const defaultBookmark = bookmarks.value.find(b => b.isDefault);
  if (defaultBookmark) {
    selectedBookmark.value = defaultBookmark.id;
    loadBookmark(defaultBookmark.id);
  }
});

// Methods
async function loadBookmarks() {
  try {
    // Load user bookmarks and global bookmarks for this collection
    const response = await api.get('/bookmarks', {
      params: {
        filter: {
          _and: [
            {
              collection: {
                _eq: props.collection
              }
            },
            {
              _or: [
                {
                  user: {
                    _eq: userStore.currentUser?.id
                  }
                },
                {
                  user: {
                    _null: true
                  }
                }
              ]
            }
          ]
        },
        sort: ['order', 'name']
      }
    });

    if (response.data?.data) {
      bookmarks.value = response.data.data.map((bookmark: any) => ({
        id: bookmark.id,
        name: bookmark.name,
        description: bookmark.description,
        collection: bookmark.collection,
        config: bookmark.config || {},
        isDefault: bookmark.is_default || false,
        isGlobal: !bookmark.user,
        userId: bookmark.user,
        order: bookmark.order || 0
      }));
    }
  } catch (error) {
    // If bookmarks API is not available, use local storage fallback
    const localBookmarks = localStorage.getItem(`bookmarks_${props.collection}`);
    if (localBookmarks) {
      bookmarks.value = JSON.parse(localBookmarks);
    }
  }
}

function loadBookmark(bookmarkId: string) {
  const bookmark = bookmarks.value.find(b => b.id === bookmarkId);
  if (bookmark) {
    emit('load-bookmark', bookmark);
  }
}

function openSaveDialog() {
  saveDialogActive.value = true;
  newBookmarkName.value = '';
  newBookmarkDescription.value = '';
  newBookmarkIsDefault.value = false;
  newBookmarkIsGlobal.value = false;
  editingBookmark.value = null;
}

function openManageDialog() {
  manageDialogActive.value = true;
}

async function saveBookmark() {
  if (!newBookmarkName.value) return;

  const bookmarkData: Bookmark = {
    id: editingBookmark.value?.id || generateId(),
    name: newBookmarkName.value,
    description: newBookmarkDescription.value,
    collection: props.collection,
    config: props.currentConfig,
    isDefault: newBookmarkIsDefault.value,
    isGlobal: newBookmarkIsGlobal.value,
    userId: newBookmarkIsGlobal.value ? undefined : userStore.currentUser?.id
  };

  try {
    if (editingBookmark.value) {
      // Update existing bookmark
      await api.patch(`/bookmarks/${editingBookmark.value.id}`, {
        name: bookmarkData.name,
        description: bookmarkData.description,
        config: bookmarkData.config,
        is_default: bookmarkData.isDefault,
        user: bookmarkData.isGlobal ? null : bookmarkData.userId
      });
      
      // Update local state
      const index = bookmarks.value.findIndex(b => b.id === editingBookmark.value!.id);
      if (index >= 0) {
        bookmarks.value[index] = bookmarkData;
      }
    } else {
      // Create new bookmark
      const response = await api.post('/bookmarks', {
        name: bookmarkData.name,
        description: bookmarkData.description,
        collection: bookmarkData.collection,
        config: bookmarkData.config,
        is_default: bookmarkData.isDefault,
        user: bookmarkData.isGlobal ? null : userStore.currentUser?.id
      });
      
      if (response.data?.data) {
        bookmarkData.id = response.data.data.id;
      }
      
      bookmarks.value.push(bookmarkData);
    }

    // If set as default, update other bookmarks
    if (newBookmarkIsDefault.value) {
      bookmarks.value.forEach(b => {
        if (b.id !== bookmarkData.id) {
          b.isDefault = false;
        }
      });
    }

    // Select the new/edited bookmark
    selectedBookmark.value = bookmarkData.id;
    loadBookmark(bookmarkData.id);
  } catch (error) {
    // Fallback to local storage
    const localBookmarks = [...bookmarks.value];
    
    if (editingBookmark.value) {
      const index = localBookmarks.findIndex(b => b.id === editingBookmark.value!.id);
      if (index >= 0) {
        localBookmarks[index] = bookmarkData;
      }
    } else {
      localBookmarks.push(bookmarkData);
    }
    
    localStorage.setItem(`bookmarks_${props.collection}`, JSON.stringify(localBookmarks));
    bookmarks.value = localBookmarks;
  }

  saveDialogActive.value = false;
}

function editBookmark(bookmark: Bookmark) {
  editingBookmark.value = bookmark;
  newBookmarkName.value = bookmark.name;
  newBookmarkDescription.value = bookmark.description || '';
  newBookmarkIsDefault.value = bookmark.isDefault || false;
  newBookmarkIsGlobal.value = bookmark.isGlobal || false;
  saveDialogActive.value = true;
}

function duplicateBookmark(bookmark: Bookmark) {
  const duplicate: Bookmark = {
    ...bookmark,
    id: generateId(),
    name: `${bookmark.name} (Copy)`,
    isDefault: false
  };
  
  bookmarks.value.push(duplicate);
  saveBookmarksList();
}

async function deleteBookmark(bookmark: Bookmark) {
  if (!confirm(t('delete_bookmark_confirm'))) return;

  try {
    await api.delete(`/bookmarks/${bookmark.id}`);
  } catch (error) {
    // Continue with local deletion
  }

  const index = bookmarks.value.findIndex(b => b.id === bookmark.id);
  if (index >= 0) {
    bookmarks.value.splice(index, 1);
    saveBookmarksList();
  }

  if (selectedBookmark.value === bookmark.id) {
    selectedBookmark.value = null;
  }
}

async function setAsDefault(bookmark: Bookmark) {
  // Clear other defaults
  bookmarks.value.forEach(b => {
    b.isDefault = b.id === bookmark.id;
  });

  try {
    // Update all bookmarks via API
    for (const b of bookmarks.value) {
      await api.patch(`/bookmarks/${b.id}`, {
        is_default: b.isDefault
      });
    }
  } catch (error) {
    // Save to local storage as fallback
    saveBookmarksList();
  }
}

async function updateBookmarkOrder() {
  // Update order values
  bookmarks.value.forEach((bookmark, index) => {
    bookmark.order = index;
  });

  try {
    // Update order via API
    for (const bookmark of bookmarks.value) {
      await api.patch(`/bookmarks/${bookmark.id}`, {
        order: bookmark.order
      });
    }
  } catch (error) {
    // Save to local storage as fallback
    saveBookmarksList();
  }
}

function saveBookmarksList() {
  localStorage.setItem(`bookmarks_${props.collection}`, JSON.stringify(bookmarks.value));
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}
</script>

<style scoped>
.bookmarks-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.save-dialog-content,
.manage-dialog-content {
  padding: 20px;
  min-width: 400px;
}

.save-dialog-content > * + * {
  margin-top: 20px;
}

.bookmark-info {
  flex: 1;
}

.bookmark-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.bookmark-description {
  color: var(--foreground-subdued);
  font-size: 12px;
  margin-top: 4px;
}

.drag-handle {
  cursor: move;
  color: var(--foreground-subdued);
}

.danger {
  --v-list-item-color: var(--danger);
  --v-list-item-color-hover: var(--danger);
  --v-list-item-icon-color: var(--danger);
}
</style>