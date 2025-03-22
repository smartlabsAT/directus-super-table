import { ref, computed, Ref } from 'vue';
import { formatTitle } from '@directus/format-title';
import type { Field } from '@directus/types';

export function useTableFields(
  fields: Ref<string[]>,
  fieldsInCollection: Ref<Field[]>,
  collection: Ref<string>,
  fieldsStore: any,
  relationsStore: any,
  layoutOptions: Ref<any>
) {
  // Custom field names mapping - initialize from layoutOptions if available
  const customFieldNames = ref<Record<string, string>>(layoutOptions.value?.customFieldNames || {});
  
  // Rename dialog state
  const showRenameDialog = ref(false);
  const renameFieldKey = ref<string>('');
  const renameFieldValue = ref<string>('');
  const originalFieldName = ref<string>('');
  
  // Language dialog state  
  const showLanguageDialog = ref(false);
  const pendingTranslationField = ref<any>(null);
  const selectedLanguagesForField = ref<string[]>([]);

  // Get display name for a field (custom or original)
  function getFieldName(fieldKey: string): string {
    // Check for custom name first
    if (customFieldNames.value[fieldKey]) {
      return customFieldNames.value[fieldKey];
    }
    
    // For translation fields with language suffix
    if (fieldKey.includes(':')) {
      const [baseField, langCode] = fieldKey.split(':');
      const originalField = fieldsInCollection.value.find((f: Field) => f.field === baseField);
      const fieldName = originalField?.name || baseField;
      
      // Remove language suffix from display but keep in the key
      const baseName = baseField.includes('.')
        ? baseField.split('.').pop()
        : baseField;
      
      const displayName = originalField?.name || baseName;
      return `${displayName} (${langCode})`;
    }
    
    // For regular fields
    const field = fieldsInCollection.value.find((f: Field) => f.field === fieldKey);
    return field?.name || fieldKey;
  }

  // Helper function for translation field metadata
  function getTranslationFieldMetadata(fieldKey: string) {
    if (fieldKey.startsWith('translations.')) {
      const subFieldName = fieldKey.split('.')[1];
      
      // Find the translations relation
      const relationsForField = relationsStore.getRelationsForField(collection.value, 'translations');
      
      if (relationsForField && relationsForField.length > 0) {
        const relation = relationsForField[0];
        // For O2M translations, the related collection contains the field definitions
        const translationsCollection = relation.related_collection || relation.collection;
        
        if (translationsCollection) {
          // Get field metadata from the translations collection
          const translationField = fieldsStore.getField(translationsCollection, subFieldName);
          if (translationField) {
            return translationField;
          }
        }
      }
    }
    return null;
  }

  // Rename field functions
  function renameField(fieldKey: string) {
    renameFieldKey.value = fieldKey;
    
    // Get field metadata and determine original name
    let field = fieldsStore.getField(collection.value, fieldKey);
    
    // For translation fields with language suffix
    if (fieldKey.includes(':')) {
      const actualFieldKey = fieldKey.split(':')[0];
      field = fieldsStore.getField(collection.value, actualFieldKey);
      
      // Special handling for translation fields
      if (actualFieldKey.startsWith('translations.') && !field) {
        const translationField = getTranslationFieldMetadata(actualFieldKey);
        if (translationField) {
          field = translationField;
        }
      }
    }
    
    // Store the original system name
    originalFieldName.value = field?.name || formatTitle(fieldKey.includes(':') ? fieldKey.split(':')[0] : fieldKey);
    
    // Set current value (custom or original)
    renameFieldValue.value = customFieldNames.value[fieldKey] || originalFieldName.value;
    
    showRenameDialog.value = true;
  }

  function resetToOriginal() {
    renameFieldValue.value = originalFieldName.value;
  }

  function confirmRename() {
    if (renameFieldValue.value && renameFieldKey.value) {
      // If the value is the same as original, remove the custom name
      if (renameFieldValue.value === originalFieldName.value) {
        delete customFieldNames.value[renameFieldKey.value];
      } else {
        // Store the custom name
        customFieldNames.value[renameFieldKey.value] = renameFieldValue.value;
      }
      
      // Save to layoutOptions so it persists
      layoutOptions.value = {
        ...layoutOptions.value,
        customFieldNames: { ...customFieldNames.value }
      };
    }
    
    cancelRename();
  }

  function cancelRename() {
    showRenameDialog.value = false;
    renameFieldKey.value = '';
    renameFieldValue.value = '';
    originalFieldName.value = '';
  }

  // Language selection functions
  function showLanguageSelectionForField(field: any) {
    pendingTranslationField.value = field;
    selectedLanguagesForField.value = [];
    showLanguageDialog.value = true;
  }

  function cancelLanguageSelection() {
    showLanguageDialog.value = false;
    pendingTranslationField.value = null;
    selectedLanguagesForField.value = [];
  }

  function confirmLanguageSelection() {
    if (pendingTranslationField.value && selectedLanguagesForField.value.length > 0) {
      const baseField = pendingTranslationField.value.key;
      
      // Add a field for each selected language
      const newFields = [...fields.value];
      selectedLanguagesForField.value.forEach(langCode => {
        const fieldWithLang = `${baseField}:${langCode}`;
        if (!newFields.includes(fieldWithLang)) {
          newFields.push(fieldWithLang);
        }
      });
      
      fields.value = newFields;
    }
    
    cancelLanguageSelection();
  }

  // Field management
  function toggleField(field: Field) {
    const fieldKey = field.field;
    const fieldIndex = fields.value.indexOf(fieldKey);
    
    if (fieldIndex > -1) {
      // Remove field
      fields.value = fields.value.filter(f => f !== fieldKey);
      // Also remove any custom name
      delete customFieldNames.value[fieldKey];
    } else {
      // Add field
      fields.value = [...fields.value, fieldKey];
    }
  }

  function removeField(fieldKey: string) {
    fields.value = fields.value.filter(f => f !== fieldKey);
    // Also remove custom name if exists
    delete customFieldNames.value[fieldKey];
  }

  return {
    customFieldNames,
    showRenameDialog,
    renameFieldKey,
    renameFieldValue,
    originalFieldName,
    showLanguageDialog,
    pendingTranslationField,
    selectedLanguagesForField,
    getFieldName,
    renameField,
    resetToOriginal,
    confirmRename,
    cancelRename,
    showLanguageSelectionForField,
    cancelLanguageSelection,
    confirmLanguageSelection,
    toggleField,
    removeField
  };
}