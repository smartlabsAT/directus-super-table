/**
 * Utility functions to check field support for inline editing
 */

import type { Field } from '@directus/types';
import {
  SUPPORTED_FIELD_TYPES,
  SUPPORTED_INTERFACES,
  SPECIAL_FIELD_CONDITIONS,
} from '../constants/supportedFields';

/**
 * Check if a field is editable based on its type and interface
 */
export function isFieldEditable(field: Field | null, fieldKey?: string): boolean {
  if (!field) return false;

  // Check for readonly meta flag
  if (field.meta?.readonly === true) return false;

  // Check for system/generated fields
  if (field.schema?.is_generated === true) return false;
  if (field.schema?.is_primary_key === true) return false;
  if (field.schema?.has_auto_increment === true) return false;

  // Check against readonly field list
  if (fieldKey && SPECIAL_FIELD_CONDITIONS.readonlyFields.includes(fieldKey)) {
    return false;
  }

  // Check for sensitive field patterns
  if (fieldKey) {
    const lowerFieldKey = fieldKey.toLowerCase();
    const isSensitive = SPECIAL_FIELD_CONDITIONS.sensitivePatterns.some((pattern) =>
      lowerFieldKey.includes(pattern)
    );
    if (isSensitive) return false;
  }

  // Check interface support FIRST for special cases
  const interfaceType = field.meta?.interface || field.interface;

  // Special case: IMAGE fields with UUID type are fully supported
  // Note: Only image files, not general files!
  if (interfaceType === 'file-image' || interfaceType === 'image') {
    return true; // Images are fully supported regardless of underlying type
  }

  // Regular file fields are NOT supported (PDFs, docs, etc.)
  if (interfaceType === 'file' || interfaceType === 'files') {
    return false; // Non-image files are not supported
  }

  // Check field type support
  const fieldType = field.type?.toLowerCase();
  const typeSupported = fieldType ? SUPPORTED_FIELD_TYPES[fieldType] : false;

  // If type is not supported at all, return false
  if (!typeSupported) return false;

  if (!interfaceType) {
    // No interface specified, check if type is fully supported
    return typeSupported === true;
  }

  const interfaceSupported = SUPPORTED_INTERFACES[interfaceType];

  // If interface is not supported at all, return false
  if (!interfaceSupported) return false;

  // Both type and interface must be FULLY supported (not 'partial')
  // Partial support = not editable inline
  return typeSupported === true && interfaceSupported === true;
}

/**
 * Get a warning message explaining why a field is not editable
 */
export function getFieldEditWarning(field: Field | null, fieldKey?: string): string {
  if (!field) return 'Field information not available';

  // Check for readonly flag
  if (field.meta?.readonly === true) {
    return 'This field is configured as read-only';
  }

  // Check for system/generated fields
  if (field.schema?.is_generated === true) {
    return 'Generated fields cannot be edited';
  }
  if (field.schema?.is_primary_key === true) {
    return 'Primary key fields cannot be edited';
  }
  if (field.schema?.has_auto_increment === true) {
    return 'Auto-increment fields cannot be edited';
  }

  // Check against readonly field list
  if (fieldKey && SPECIAL_FIELD_CONDITIONS.readonlyFields.includes(fieldKey)) {
    return `System field "${fieldKey}" cannot be edited`;
  }

  // Check for sensitive field patterns
  if (fieldKey) {
    const lowerFieldKey = fieldKey.toLowerCase();
    const isSensitive = SPECIAL_FIELD_CONDITIONS.sensitivePatterns.some((pattern) =>
      lowerFieldKey.includes(pattern)
    );
    if (isSensitive) {
      return 'Security-sensitive fields cannot be edited in table view';
    }
  }

  // Check interface support FIRST for special cases
  const interfaceType = field.meta?.interface || field.interface;

  // Special case: IMAGE fields are supported (not general files!)
  if (interfaceType === 'file-image' || interfaceType === 'image') {
    return ''; // No warning for image fields
  }

  // Regular file fields are NOT supported
  if (interfaceType === 'file' || interfaceType === 'files') {
    return 'File fields (non-image) are not supported for inline editing. Please use the item detail view.';
  }

  // Check field type support
  const fieldType = field.type?.toLowerCase();
  const typeSupported = fieldType ? SUPPORTED_FIELD_TYPES[fieldType] : false;

  if (!typeSupported) {
    return `Field type "${field.type}" is not yet supported for inline editing. Please use the item detail view.`;
  }

  if (typeSupported === 'partial') {
    return `Field type "${field.type}" has limited support for inline editing. Some features may not work as expected.`;
  }

  if (!interfaceType) {
    return 'No interface configured for this field';
  }

  const interfaceSupported = SUPPORTED_INTERFACES[interfaceType];

  if (!interfaceSupported) {
    return `Interface "${interfaceType}" is not yet supported for inline editing. Please use the item detail view.`;
  }

  if (interfaceSupported === 'partial') {
    // Provide specific messages for known partial support cases
    switch (interfaceType) {
      case 'tags':
        return 'Tag fields have limited support (Issue #10). Complex tag operations should be done in detail view.';
      case 'files':
        return 'Multiple file fields have limited support. Use the detail view for managing multiple files.';
      default:
        return `Interface "${interfaceType}" has limited support for inline editing.`;
    }
  }

  return 'This field cannot be edited inline for unknown reasons';
}

/**
 * Get field support level for UI display
 */
export type FieldSupportLevel = 'full' | 'partial' | 'none' | 'readonly';

export function getFieldSupportLevel(field: Field | null, fieldKey?: string): FieldSupportLevel {
  if (!field) return 'none';

  // Check for readonly conditions first
  if (
    field.meta?.readonly === true ||
    field.schema?.is_generated === true ||
    field.schema?.is_primary_key === true ||
    field.schema?.has_auto_increment === true ||
    (fieldKey && SPECIAL_FIELD_CONDITIONS.readonlyFields.includes(fieldKey))
  ) {
    return 'readonly';
  }

  // Check for sensitive fields
  if (fieldKey) {
    const lowerFieldKey = fieldKey.toLowerCase();
    const isSensitive = SPECIAL_FIELD_CONDITIONS.sensitivePatterns.some((pattern) =>
      lowerFieldKey.includes(pattern)
    );
    if (isSensitive) return 'readonly';
  }

  const interfaceType = field.meta?.interface || field.interface;

  // Special case: IMAGE fields are fully supported (not general files!)
  if (interfaceType === 'file-image' || interfaceType === 'image') {
    return 'full';
  }

  // Regular file fields are NOT supported
  if (interfaceType === 'file' || interfaceType === 'files') {
    return 'none';
  }

  const fieldType = field.type?.toLowerCase();
  const typeSupported = fieldType ? SUPPORTED_FIELD_TYPES[fieldType] : false;
  const interfaceSupported = interfaceType ? SUPPORTED_INTERFACES[interfaceType] : false;

  // If either is not supported, return none
  if (!typeSupported || !interfaceSupported) {
    return 'none';
  }

  // If either is partial, return partial
  if (typeSupported === 'partial' || interfaceSupported === 'partial') {
    return 'partial';
  }

  // Both are fully supported
  return 'full';
}
