/**
 * Registry of supported field types and interfaces for inline editing
 * This prevents data corruption by only allowing tested and verified field types
 */

export const SUPPORTED_FIELD_TYPES: Record<string, boolean | 'partial'> = {
  // Fully supported text and number types
  string: true,
  text: true,
  integer: true,
  bigInteger: true,
  float: true,
  decimal: true,
  boolean: true,

  // JSON is partially supported (depends on interface)
  json: 'partial',

  // Date/Time types are now supported (Issue #5 fixed)
  date: true,
  dateTime: true,
  datetime: true, // Both variants for compatibility
  time: true,
  timestamp: true,

  // File types are partially supported (Issue #9)
  uuid: 'partial', // Only when used with file interface

  // Not supported types
  hash: false, // Security: never allow editing password fields
  csv: false,
  geometry: false,
  geometryPoint: false,
  geometryLineString: false,
  geometryPolygon: false,
  geometryMultiPoint: false,
  geometryMultiLineString: false,
  geometryMultiPolygon: false,
  alias: false, // Virtual fields
  unknown: false,
};

export const SUPPORTED_INTERFACES: Record<string, boolean | 'partial'> = {
  // Fully supported text inputs
  input: true,
  'input-email': true,
  'input-url': true,
  textarea: true,
  'input-rich-text-html': true,
  'input-rich-text-md': true,
  wysiwyg: true,

  // Fully supported selection interfaces
  'select-dropdown': true,
  'select-radio': true,
  boolean: true,
  toggle: true,

  // Fully supported number inputs
  'input-number': true,
  slider: true,

  // Image fields - we have ImageCell component
  'file-image': true, // Fully supported with ImageCell component
  image: true, // Supported with ImageCell

  // General file fields - NOT supported (only images!)
  file: false, // General files (PDFs, docs, etc.) are not supported
  files: false, // Multiple files are not supported

  // Partially supported (with known issues)
  tags: 'partial', // Issue #10 - needs proper support

  // Date/Time interfaces - NOW SUPPORTED (Issue #5 fixed)
  datetime: true,
  date: true,
  time: true,
  timestamp: true,

  // Color interfaces - we have ColorCell component
  'select-color': true, // Fully supported with ColorCell component
  color: true, // Supported with ColorCell
  'input-color': false, // Advanced color picker not supported yet

  // Relational interfaces - NOT supported for inline editing
  'many-to-one': false,
  'one-to-many': false,
  'many-to-many': false,
  'many-to-any': false,
  'list-m2m': false,
  'list-o2m': false,
  'list-m2a': false,
  translations: false, // Complex interface, needs special handling

  // Other unsupported interfaces
  'select-multiple-dropdown': false,
  'select-multiple-checkbox': false,
  'input-hash': false, // Security: never allow
  'input-password': false, // Security: never allow
  map: false,
  'map-point': false,
  'presentation-links': false,
  'presentation-divider': false,
  'presentation-notice': false,
  'input-code': false,
  'input-multiline': false,
  list: false,
  repeater: false,
  'group-standard': false,
  'group-accordion': false,
  'group-detail': false,
  'input-autocomplete-api': false,
};

/**
 * Special cases that need additional checks
 */
export const SPECIAL_FIELD_CONDITIONS = {
  // Fields that should never be editable regardless of type
  readonlyFields: ['id', 'date_created', 'date_updated', 'user_created', 'user_updated'],

  // Field name patterns that suggest they shouldn't be edited
  sensitivePatterns: ['password', 'secret', 'token', 'key', 'hash', 'salt'],

  // System fields that should not be edited
  systemFields: ['sort', '$thumbnail'],
};

/**
 * Configuration for how unsupported fields are displayed
 */
export const UNSUPPORTED_FIELD_CONFIG = {
  showLockIcon: true,
  showTooltip: true,
  dimOpacity: 0.7,
  allowDetailViewNavigation: true,
  showWarningNotification: true,
};
