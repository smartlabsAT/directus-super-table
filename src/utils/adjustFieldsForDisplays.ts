// CORE CHANGES
import { useStores } from '@directus/extensions-sdk';

export function adjustFieldsForDisplays(
  fields: readonly string[],
  parentCollection: string
): string[] {
  // Simplified version that ensures root fields are included for relations
  const adjustedFields = new Set<string>();

  // Try to get the fields store, but handle the case where it's not available
  let fieldsStore: any = null;
  try {
    const { useFieldsStore } = useStores();
    fieldsStore = useFieldsStore();
  } catch (error) {
    // Stores not available in this context, continue without special handling
  }

  fields.forEach((fieldKey) => {
    // Always add the original field
    adjustedFields.add(fieldKey);

    // If it's a nested field, also add the root field
    if (fieldKey.includes('.')) {
      const rootField = fieldKey.split('.')[0];
      adjustedFields.add(rootField);

      // Check if it's a translations field and needs special handling
      if (fieldsStore) {
        try {
          const field = fieldsStore.getField(parentCollection, rootField);
          if (field && field.meta?.special?.includes('translations')) {
            // Add the translations field itself
            adjustedFields.add('translations');
            // Keep the specific translation field path
            adjustedFields.add(fieldKey);
          }
        } catch (error) {
          // Field not found or error accessing it, continue
        }
      }
    }
  });

  return Array.from(adjustedFields);
}
