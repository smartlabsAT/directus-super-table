# Super Layout Table Extension for Directus

![Quality Checks](https://github.com/smartlabsAT/directus-super-table/workflows/Quality%20Checks/badge.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)
![ESLint](https://img.shields.io/badge/ESLint-0%20errors-brightgreen)
![Prettier](https://img.shields.io/badge/code%20style-prettier-ff69b4)
![Directus](https://img.shields.io/badge/Directus-v11+-00B896)

A powerful and feature-rich table layout extension for Directus 11+ that enhances the default table view with advanced functionality including inline editing, quick filters, bookmarks, and custom cell rendering.

## Version

v0.2.6 - Stable release

## 🌟 Top Features

### 🌍 Multi-Language Translations
Display and edit translations in multiple languages simultaneously as separate columns. Perfect for managing multilingual content with ease.

### ✏️ Column Renaming
Rename table columns on-the-fly without changing the underlying field names. Create user-friendly labels for better readability.

### 🎨 Quick Filters with Colors & Icons
Create custom filter buttons with personalized colors and icons for instant data filtering. Visual organization at its best.

### 🔍 Global Table Search
Powerful search functionality across all table fields, including nested relations and translations. Find anything, anywhere in your data.

### 👁️ View & Edit Mode
Switch seamlessly between read-only view mode and interactive edit mode. Control when and how users can modify data.

### 🖼️ Advanced Image Display & Selection
Smart image handling with hover preview, proper aspect ratios, and built-in file browser for selecting media files directly from table cells.

### 🔄 Deep Duplication
Duplicate items with all their relationships and translations. Perfect for creating variations of complex data structures.



### Display Features
- **Custom Cell Rendering** - Specialized display for different field types
- **Relationship Support** - Handle M2O, O2M, M2M, M2A relationships with deep data access
- **Image Preview** - Inline image display with lightbox support and file browser
- **Status Indicators** - Visual representation of boolean and select fields
- **Translation Support** - Display multiple language translations as separate columns
- **Column Alignment** - Configurable text alignment per column (left, center, right)

### Performance
- **Optimized Loading** - Default 1000 rows with efficient pagination
- **Smart Caching** - Intelligent data caching for better performance
- **Lazy Loading** - Load data as needed for large datasets


## Installation

For detailed information about installing extensions in Directus, see the [official documentation](https://directus.io/docs/self-hosting/including-extensions).

### Via Package Manager (Recommended)

Install the extension using your preferred package manager:

```bash
# Using pnpm
pnpm add directus-extension-super-table

# Using npm
npm install directus-extension-super-table

# Using yarn
yarn add directus-extension-super-table
```

After installation, restart Directus to load the extension:

```bash
# If using Docker
docker-compose restart directus

# If running locally
npx directus start
```

### From Source

1. Clone or download the extension to your Directus extensions folder:
   ```bash
   cd /path/to/directus/extensions
   git clone https://github.com/yourusername/super-layout-table.git
   ```

2. Install dependencies:
   ```bash
   cd super-layout-table
   pnpm install  # or npm install
   ```

3. Build the extension:
   ```bash
   pnpm build  # or npm run build
   ```

4. Restart Directus to load the extension

### Configuration

1. Navigate to your collection settings in Directus Admin Panel
2. Click on "Layout Options" in the collection settings
3. Select "Super Layout Table" from the layout dropdown
4. Configure the layout options according to your needs
5. Save your changes

## Usage Guide

### Quick Filters
Quick Filters provide fast access to frequently used filter combinations:

1. **Creating a Filter**: Click the "+" button in the Quick Filters section
2. **Configure Filter**: Set field, operator, and value
3. **Save Filter**: Give it a name and optional color
4. **Using Filters**: Click filter buttons to toggle them on/off
5. **Filter States**: 
   - Gray (OFF) - Filter not applied
   - Blue (Active) - Filter applied with visual indicators

### Inline Editing
Edit data directly in the table without opening a separate form:

1. **Entering Edit Mode**: Click on any editable cell
2. **Editor Types**:
   - Text fields: Simple input or WYSIWYG editor
   - Boolean: Checkbox toggle
   - Select: Dropdown menu
   - Date/Time: Full date picker with calendar
   - Color: Color picker with alignment support
   - Image/File: Enhanced file browser with larger previews (✨ IMPROVED in v0.2.6)
3. **Unified Header Actions** (✨ NEW in v0.2.3):
   - Save/Cancel buttons now in popover header for all field types
   - Consistent UI across all editors
   - Icon-only buttons matching native Directus style
4. **Saving**: Click save button (✓) or press Enter
5. **Canceling**: Click cancel button (✗) or press Escape

### Column Management
Customize which columns are displayed and how:

1. **Add Columns**: Click "+" button in the table header
2. **Remove Columns**: Use column selector to hide columns
3. **Rename Columns**: Right-click header and select "Rename"
4. **Reorder Columns**: Drag column headers to reorder
5. **Resize Columns**: Drag column borders to resize

### Bookmarks
Save table configurations for quick access:

1. **Save Bookmark**: Configure table, then click bookmark icon → "Save Current"
2. **Load Bookmark**: Select from bookmark dropdown
3. **Update Bookmark**: Load bookmark, make changes, save with same name
4. **Delete Bookmark**: Right-click bookmark and select delete

## Project Structure

```
super-layout-table/
├── src/
│   ├── index.ts                    # Extension entry point
│   ├── super-layout-table.vue      # Main component
│   ├── actions.vue                 # Row/bulk actions component
│   ├── types.ts                    # TypeScript definitions
│   ├── constants.ts                # Constants and defaults
│   └── components/
│       ├── InlineEditPopover.vue   # Inline editor popover
│       ├── QuickFilters.vue        # Quick filter management
│       └── CellRenderers/          # Custom cell renderers
│           ├── ImageCell.vue       # Image display
│           ├── SelectCell.vue      # Select/status display
│           └── BooleanCell.vue     # Boolean checkbox
├── composables/
│   ├── api.ts                      # API operations
│   ├── useAliasFields.ts           # Field aliasing logic
│   └── useLanguageSelector.ts     # Translation language selection
├── utils/
│   ├── adjustFieldsForDisplays.ts  # Display field adjustments
│   └── getDefaultDisplayForType.ts # Default display mapping
├── package.json                     # Package configuration
├── tsconfig.json                   # TypeScript configuration
└── README.md                       # This file
```

## Development

### Prerequisites
- Node.js 18+
- pnpm package manager
- Directus 11.0.0+

### Setup Development Environment
```bash
# Install dependencies
pnpm install

# Start development build with watch mode
pnpm dev

# Build for production
pnpm build

# Run linter
pnpm lint

# Type checking
pnpm type-check

# Run all quality checks
pnpm quality

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format
```

## 🚀 GitHub Actions & CI/CD

This extension includes comprehensive GitHub Actions workflows for maintaining code quality:

### Automated Quality Checks
Every push and pull request triggers automated quality validation:

- **TypeScript Type Checking** - Ensures type safety across the codebase
- **ESLint** - Enforces code quality standards (0 errors, 0 warnings)
- **Prettier** - Validates consistent code formatting
- **Build Validation** - Confirms the extension builds successfully

### Workflow Files

```
.github/workflows/
├── quality-checks.yml  # Main quality validation (runs on push/PR)
├── pr-checks.yml      # PR-specific checks with auto-comments
├── release.yml        # Automated release creation on tags
└── badges.yml         # Status badge updates
```

### Running Locally
You can run the same checks locally before pushing:

```bash
# Run all quality checks at once
pnpm run quality

# Individual checks
pnpm run type-check    # TypeScript validation
pnpm run lint          # ESLint checks
pnpm run format:check  # Prettier validation
pnpm run build         # Build test
```

### Pull Request Workflow
1. Create your feature branch
2. Make your changes
3. Run `pnpm run quality` locally
4. Push to GitHub
5. GitHub Actions will automatically validate your code
6. PR will receive an automated quality report comment

### Extension Configuration
The extension can be configured through the Directus interface with these options:

```typescript
{
  // Number of items to load initially
  defaultRowCount: 1000,
  
  // Row height: 'compact' | 'cozy' | 'comfortable'
  rowHeight: 'comfortable',
  
  // Selection mode: 'none' | 'single' | 'multiple'
  showSelect: 'multiple',
  
  // Enable fixed header
  fixedHeader: true,
  
  // Allow column resizing
  showResize: true,
  
  // Enable inline editing
  allowInlineEdit: true,
  
  // Enable bookmark system
  allowBookmarks: true,
  
  // Enable quick filters
  allowQuickFilters: true
}
```

## API Reference

### Events
The extension emits the following events:

- `update:selection` - When item selection changes
- `update:filters` - When filters are modified
- `update:search` - When search query changes
- `update:limit` - When page size changes
- `update:page` - When current page changes
- `update:sort` - When sort order changes
- `update:fields` - When visible fields change

### Composables
Available composables for extension development:

- `useApi()` - API operations wrapper
- `useAliasFields()` - Field aliasing for complex queries
- `useLanguageSelector()` - Translation language management

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests as needed
5. Submit a pull request

### Code Style
- Use TypeScript with explicit types
- Follow Vue 3 Composition API patterns
- Maintain consistent code formatting
- Add JSDoc comments for public APIs

## Troubleshooting

### Extension not loading
- Ensure the extension is in the correct directory
- Check Directus logs for errors
- Verify all dependencies are installed
- Try clearing browser cache

### Inline editing not working
- Check field permissions in Directus
- Ensure fields are not read-only
- Verify field types are supported

### Performance issues
- Reduce default row count
- Enable pagination for large datasets
- Check browser console for errors

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a detailed version history.

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or feature requests, please create an issue in the repository.

## Credits

Built for Directus 11+ by the community.
Special thanks to all contributors and testers.