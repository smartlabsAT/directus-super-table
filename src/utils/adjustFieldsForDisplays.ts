// CORE CHANGES - Following original Directus approach
import { useStores } from '@directus/extensions-sdk';

/**
 * Adjusts fields based on their display configuration, following the original Directus pattern.
 * This function replicates the core logic from Directus core for proper display field resolution.
 */
export function adjustFieldsForDisplays(
  fields: readonly string[],
  parentCollection: string
): string[] {
  // Get the fields store, but handle the case where it's not available
  let fieldsStore: any = null;
  try {
    const { useFieldsStore } = useStores();
    fieldsStore = useFieldsStore();
  } catch {
    // Stores not available, return original fields
    return [...fields];
  }

  if (!fieldsStore) return [...fields];

  const adjustedFields: string[] = fields
    .map((fieldKey) => {
      const field = fieldsStore.getField(parentCollection, fieldKey);

      if (!field) return fieldKey;
      if (field.meta?.display === null) return fieldKey;

      // Get the display definition - this is where the magic happens!
      const displayId = field.meta?.display;
      if (!displayId) return fieldKey;

      // Get display-specific fields based on display type
      let displayFields: string[] | null = null;

      try {
        // Handle different display types with their specific field requirements
        switch (displayId) {
          case 'related-values': {
            // For related-values, we need fields for the template
            const template = field.meta?.display_options?.template;
            if (template) {
              // Parse template to extract field requirements
              const templateFields = extractFieldsFromTemplate(template);
              displayFields = templateFields.map((f) => `${fieldKey}.${f}`);
            } else {
              // Default fields for related-values without template
              displayFields = [`${fieldKey}.id`];
            }
            break;
          }
          case 'image': {
            // Image display needs these specific fields
            displayFields = [
              `${fieldKey}.id`,
              `${fieldKey}.type`,
              `${fieldKey}.title`,
              `${fieldKey}.filename_download`,
              `${fieldKey}.width`,
              `${fieldKey}.height`,
            ];
            break;
          }
          case 'file': {
            // File display needs these specific fields
            displayFields = [
              `${fieldKey}.id`,
              `${fieldKey}.type`,
              `${fieldKey}.title`,
              `${fieldKey}.filename_download`,
              `${fieldKey}.filesize`,
            ];
            break;
          }
          case 'user': {
            // User display needs these specific fields
            displayFields = [
              `${fieldKey}.id`,
              `${fieldKey}.avatar.id`,
              `${fieldKey}.email`,
              `${fieldKey}.first_name`,
              `${fieldKey}.last_name`,
            ];
            break;
          }
          default: {
            // For other display types, try to get fields from display definition
            // This is a fallback that covers most cases
            const isRelational = field?.meta?.special?.some((s: string) =>
              ['m2o', 'm2m', 'o2m', 'files', 'translations'].includes(s)
            );

            if (isRelational) {
              displayFields = [
                `${fieldKey}.id`,
                `${fieldKey}.status`,
                `${fieldKey}.title`,
                `${fieldKey}.name`,
              ];
            }
            break;
          }
        }
      } catch {
        // If display field resolution fails, continue with original field
        return fieldKey;
      }

      if (displayFields) {
        return displayFields.map((displayField) => {
          // Handle special cases like thumbnails for files
          if (displayField.includes('$thumbnail') && field.collection === 'directus_files') {
            return displayField
              .split('.')
              .filter((part) => part !== '$thumbnail')
              .join('.');
          }
          return displayField;
        });
      }

      return fieldKey;
    })
    .flat();

  return adjustedFields;
}

/**
 * Extracts field names from a display template string
 * This is a simplified version of the template parser
 */
function extractFieldsFromTemplate(template: string): string[] {
  if (!template) return [];

  const fieldMatches = template.match(/\{\{([^}]+)\}\}/g);
  if (!fieldMatches) return [];

  return fieldMatches
    .map((match) => match.replace(/\{\{|\}\}/g, '').trim())
    .filter((field) => field && !field.includes('(') && !field.includes(')'))
    .map((field) => field.split('.').pop() || field); // Get the last part for nested fields
}
