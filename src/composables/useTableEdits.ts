import { ref, computed, Ref } from 'vue';
import type { Field } from '@directus/types';
import type { Edits, TranslationUpdate } from '../types/table.types';
import { useTableApi } from './api';

export function useTableEdits(
  collection: Ref<string>,
  primaryKeyField: Ref<Field | null>,
  items: Ref<any[]>,
  getItems: () => Promise<void>
) {
  const tableApi = useTableApi();
  const edits = ref<Edits>({});
  const hasEdits = computed(() => Object.keys(edits.value).length > 0);
  const savingCells = ref<Record<string, boolean>>({});

  function updateFieldValue(itemId: string | number, field: string, value: any) {
    if (!edits.value[itemId]) {
      edits.value[itemId] = {};
    }
    
    // Handle translation updates specially
    if (typeof value === 'object' && value?.isTranslation) {
      // Store translation update with metadata
      edits.value[itemId][field] = value;
    } else {
      edits.value[itemId][field] = value;
    }
  }

  async function autoSaveEdits() {
    // Auto-save immediately - save only the current item's changes
    // Find which item has changes
    const itemsWithChanges = Object.keys(edits.value);
    if (itemsWithChanges.length === 0) return;
    
    // Save the most recent change (usually only one item is edited at a time)
    const itemId = itemsWithChanges[itemsWithChanges.length - 1];
    const changes = edits.value[itemId];
    
    // Mark cells as saving
    for (const field of Object.keys(changes)) {
      savingCells.value[`${itemId}_${field}`] = true;
    }
    
    try {
      // Prepare the update payload
      let updatePayload: Record<string, any> = {};
      
      for (const [field, value] of Object.entries(changes)) {
        if (typeof value === 'object' && value?.isTranslation) {
          // Handle translation updates
          const item = items.value.find((i: any) => i[primaryKeyField.value?.field!] == itemId);
          if (item) {
            // Build translation update structure
            const existingTranslations = item.translations || [];
            const translationForLang = existingTranslations.find(
              (t: any) => t.languages_code === value.language
            );
            
            if (translationForLang) {
              // Update existing translation
              updatePayload.translations = existingTranslations.map((t: any) => {
                if (t.languages_code === value.language) {
                  return {
                    ...t,
                    [value.translationField]: value.value
                  };
                }
                return t;
              });
            } else {
              // Create new translation for this language
              updatePayload.translations = [
                ...existingTranslations,
                {
                  languages_code: value.language,
                  [value.translationField]: value.value
                }
              ];
            }
          }
        } else {
          // Regular field update
          updatePayload[field] = value;
        }
      }
      
      // Use tableApi to update the item
      for (const [field, value] of Object.entries(updatePayload)) {
        if (field === 'translations') {
          // For full translations update
          await tableApi.updateItem(
            collection.value,
            itemId,
            'translations',
            { isFullTranslations: true, translations: value }
          );
        } else {
          await tableApi.updateItem(collection.value, itemId, field, value);
        }
      }
      
      // Clear edits for this item
      delete edits.value[itemId];
      
      // Refresh the item data
      await getItems();
    } catch (error) {
      console.error('Failed to save edits:', error);
    } finally {
      // Clear saving state
      for (const field of Object.keys(changes)) {
        delete savingCells.value[`${itemId}_${field}`];
      }
    }
  }

  function resetEdits() {
    edits.value = {};
  }

  return {
    edits,
    hasEdits,
    savingCells,
    updateFieldValue,
    autoSaveEdits,
    resetEdits
  };
}