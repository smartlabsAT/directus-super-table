# Field Type Support Documentation

## Overview
This extension includes field type validation to prevent data corruption. Only tested and verified field types are enabled for inline editing. The approach is binary: fields are either fully editable or locked - no partial support.

## Fully Supported Field Types

### Text & String Fields
- ✅ `string` - Basic text input
- ✅ `text` - Multi-line text
- ✅ `input` - Standard input field
- ✅ `input-email` - Email input
- ✅ `input-url` - URL input
- ✅ `textarea` - Text area input
- ✅ `wysiwyg` - Rich text editor
- ✅ `input-rich-text-html` - HTML rich text
- ✅ `input-rich-text-md` - Markdown rich text

### Number Fields
- ✅ `integer` - Whole numbers
- ✅ `bigInteger` - Large whole numbers
- ✅ `float` - Decimal numbers
- ✅ `decimal` - Precise decimal numbers
- ✅ `input-number` - Number input interface
- ✅ `slider` - Slider interface

### Boolean & Selection
- ✅ `boolean` - True/false values
- ✅ `toggle` - Toggle switch
- ✅ `select-dropdown` - Dropdown selection
- ✅ `select-radio` - Radio button selection

### Image Fields (Custom Renderer)
- ✅ `file-image` - Image file selection with preview
- ✅ `image` - Image display and selection
- ✅ `select-color` - Color picker (with ColorCell)
- ✅ `color` - Color display

## Unsupported Fields

### File Fields (Non-Image)
- ❌ `file` - General files (PDFs, Word, Excel, etc.)
- ❌ `files` - Multiple file selection
- Note: Only IMAGE files are supported, not documents

### Date/Time Fields (Issue #5)
- ❌ `date` - Date picker broken
- ❌ `datetime` - DateTime picker broken
- ❌ `time` - Time picker broken
- ❌ `timestamp` - Timestamp fields

### Tags & Complex Fields
- ❌ `tags` - Tag input (Issue #10)
- ❌ `json` - JSON editor
- ❌ `csv` - CSV data

### Security-Sensitive Fields
- ❌ `hash` - Password/hash fields
- ❌ `input-hash` - Hash input
- ❌ `input-password` - Password input

### Relational Fields
- ❌ `many-to-one`
- ❌ `one-to-many`
- ❌ `many-to-many`
- ❌ `many-to-any`
- ❌ `translations` - Complex translation interface

### Other Unsupported Types
- ❌ `geometry` - Geographic data
- ❌ `map` - Map interface
- ❌ `list` - List interface
- ❌ `repeater` - Repeater fields
- ❌ `select-multiple-dropdown` - Multi-select
- ❌ `select-multiple-checkbox` - Multi-checkbox
- ❌ `input-code` - Code editor
- ❌ `input-multiline` - Multiline input
- ❌ `input-autocomplete-api` - API autocomplete

## Visual Indicators

### Binary Approach: Edit or Lock
- ✏️ **Edit Icon** - Field is fully editable
- 🔒 **Lock Icon** - Field is NOT editable

### Visual Feedback (Edit Mode Only)
- **Icons** - Only shown when edit mode is active
- **Tooltips** - Explain why field is not editable
- **Opacity** - Non-editable fields are dimmed (70% opacity)
- **Cursor** - Non-editable fields show `not-allowed` cursor
- **Hover** - Subtle background change on non-editable fields

## Configuration

Fields are automatically checked for:
- Field type compatibility
- Interface compatibility
- Read-only status
- System field status (id, date_created, etc.)
- Security-sensitive patterns (password, secret, token)

## Adding New Field Support

To add support for a new field type:

1. Update `src/constants/supportedFields.ts`:
   - Add to `SUPPORTED_FIELD_TYPES`
   - Add to `SUPPORTED_INTERFACES`

2. Implement custom renderer if needed:
   - Create component in `src/components/CellRenderers/`
   - Add to `EditableCellRelational.vue`

3. Test thoroughly:
   - Verify data saves correctly
   - Check for data corruption
   - Test edge cases

4. Update this documentation

## Important Notes

### Image vs File Fields
- **Images Only**: The extension supports ONLY image files (`file-image`, `image` interfaces)
- **No Documents**: General file fields for PDFs, Word docs, etc. are NOT supported
- **UUID Handling**: Image fields using UUID references are automatically detected and supported

### No Partial Support
- The extension uses a binary approach: fields are either fully editable or locked
- There's no "partial" or "limited" support state
- This provides clear user expectations and prevents confusion

## Safety First

This feature prioritizes data integrity over convenience. Fields are disabled by default unless explicitly verified as safe for inline editing. This prevents:
- Data corruption
- Data loss
- Invalid data states
- Security vulnerabilities

## Known Limitations

1. **Date/Time Fields** (Issue #5): Currently broken, need fix
2. **Tags Fields** (Issue #10): Complex implementation needed
3. **Multiple Files**: Not yet implemented
4. **Document Files**: Only images supported, not PDFs/docs