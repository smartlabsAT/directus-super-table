# Changelog

All notable changes to the Super Layout Table Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive debug logging for search functionality troubleshooting
- Native Directus search field integration and synchronization
- Enhanced Many-to-One relation search with proper nested syntax
- Intelligent field type detection for relational fields

### Fixed
- **Search functionality improvements** (Issue #24):
  - Native Directus search field (top-right) now works properly with extension
  - Improved Many-to-One relation search using correct API syntax
  - JSON fields properly excluded from search (Directus limitation)
  - Search correctly resets pagination to page 1 when performing new searches
  - Fixed pagination display when no search results are found

## [0.2.8] - 2025-08-22

### Added
- Published to npm registry as `directus-extension-super-table`
- LICENSE file (MIT)
- Complete package.json metadata for npm publishing
- Repository, homepage, and bug tracking URLs

### Changed
- Updated package.json with proper npm configuration
- Main entry point now correctly points to dist/index.js

## [0.2.7] - 2025-08-22

### Added
- Direct Boolean Toggle option for single-click boolean field editing (Issue #16)
- New BooleanToggleCell component with auto-save functionality
- Layout option to enable/disable direct boolean editing
- Demo GIF in README for better project visibility
- .npmignore configuration to exclude demo assets from npm package

### Changed
- Boolean fields can now be toggled with a single click when Direct Boolean Toggle is enabled
- Reduced interaction steps for boolean fields from 3 clicks to 1 click

## [0.2.6] - 2025-08-21

### Added
- Smart hover preview for images that follows mouse position (Issue #6)
- Column alignment support for ColorCell component
- Proper aspect ratio preservation for all images

### Changed
- Image display now uses `object-fit: contain` to show complete images without cropping
- File browser thumbnails increased from 60px to 140px for better visibility
- Hover preview dynamically positions to avoid screen edges

### Fixed
- Images being cropped in table cells and file browser (Issue #6)
- Column alignment not working for image and color cells
- Cursor showing as `not-allowed` when hovering over cells in non-edit mode
- Navigation to detail page blocked by incorrect cursor styles

## [0.2.5] - 2025-08-21

### Fixed
- Added explicit write permissions to GitHub Release workflow
- Resolves 403 permission errors when creating releases
- GitHub Actions can now create releases automatically

## [0.2.4] - 2025-08-21

### Fixed
- GitHub Release workflow now checks if release exists before creating
- Prevents 403 errors when release already exists
- Assets are uploaded to existing releases automatically

## [0.2.3] - 2025-08-21

### Added
- Full date/time field support for inline editing (Issue #5)
- Date picker with calendar for date/datetime/time/timestamp fields
- Unified header actions UI - Save/Cancel buttons in popover header for ALL field types
- Native Directus v-drawer pattern implementation for file browser
- Icon-only rounded buttons matching native Directus style
- Wider popover for date fields to accommodate calendar
- date-fns dependency for proper date formatting

### Changed
- Moved all popover action buttons from footer to header for consistency
- File browser now uses native v-drawer #actions slot pattern
- Improved button styling to match Directus native UI
- Auto-save indicator only shows when actually enabled

### Fixed
- Date picker not updating input field on selection (Issue #5)
- Date values showing as "false" after save
- v-model conflicts in date picker by using :value + @input pattern
- File browser buttons not appearing in drawer header
- Auto-save indicator showing incorrectly

## [0.2.2] - 2025-08-20

### Added
- Field support registry for inline editing validation (Issue #11)
- Binary edit/lock icon system for field editability indication
- Comprehensive field support utility functions
- Field support documentation (docs/FIELD_SUPPORT.md)
- Special handling for image fields with UUID type
- Tooltips explaining why fields cannot be edited

### Changed
- Refactored field editability checking to use centralized system
- Icons only show when edit mode is active
- Simplified field support to binary approach (editable or locked)

### Fixed
- Tags field showing as editable when it shouldn't be
- Image fields incorrectly blocked due to UUID type
- Inconsistent UI between different unsupported field types
- Lock icons showing outside of edit mode

### Security
- Prevent data corruption by blocking unsupported field types from inline editing
- Added validation for sensitive fields (passwords, tokens, secrets)

## [Unreleased] - v0.2.0

### Added
- Enhanced Quick Filter visual indicators with active states
- Multiple visual cues for active filters (border, dot, animations)
- English fallback for all UI messages
- Comprehensive README documentation for stable release
- CHANGELOG.md file for version tracking

### Changed
- Improved button positioning in action bar
- Clean architecture refactoring - removed core-clones folder
- Reorganized utility files into standard directories
- Updated .gitignore to exclude built files

### Fixed
- Color picker closing editor without saving
- Duplicate button positioning issue resolved

### Removed
- Unnecessary core-clones folder structure
- Unused import files

## [v0.1.0] - 2025-01-18 - Production Ready

### Added
- Production-ready bundled extension code
- Source files and utilities for development
- Static text replacements for better UX

### Changed
- Replaced translation keys with static text for notifications
- Improved overall stability for production use

### Fixed
- Various minor bugs and edge cases

## [v0.0.9] - 2025-01-17

### Added
- Enhanced quick filter button styles with active state
- Improved visual feedback for filter activation

### Changed
- Reordered save filter button for better UX
- Adjusted toolbar styles and alignment

## [v0.0.8] - 2025-01-17

### Added
- Click.stop implementation for better user interaction
- Scrolling fix for icon menu

### Changed
- Updated translation keys to static text
- Adjusted toolbar alignment and search input flex

## [v0.0.7] - 2025-01-16

### Fixed
- Icon menu scrolling issues
- Toolbar alignment problems

## [v0.0.6] - 2025-01-16

### Changed
- Improved focus styles for accessibility
- Enhanced table cell styling for text overflow

### Fixed
- Box-shadow removed from editing cells
- Edit-toggle class updated to use v-icon

## [v0.0.5] - 2025-01-15

### Added
- Item duplication process with translations
- Duplicate action button in table

### Changed
- Enhanced table cell styling
- Improved text overflow handling

## [v0.0.4] - 2025-01-15

### Added
- Manual sort handling with reactivity
- Field dialogs with sorting implementation
- Table actions and pagination composables

### Fixed
- Sort order persistence issues
- Field dialog reactivity

## [v0.0.3] - 2025-01-14

### Added
- Bookmark edit and delete functionality
- Bookmarks management with save and load
- Move preset functionality for reordering filters
- Update preset function for modifying quick filters

### Changed
- Improved bookmark management UI
- Enhanced filter reordering experience

## [v0.0.2] - 2025-01-14

### Added
- Icon and color selectors for save filter dialog
- Color themes for quick filter buttons
- Quick filter save event handling
- Edit mode toggle for EditableCellRelational component
- InlineEditPopover for improved inline editing

### Changed
- Enhanced filter UI with visual customization
- Improved inline editing experience

## [v0.0.1] - 2025-01-13 - Initial Release

### Added
- Core table layout component with Directus v-table integration
- Translation field handling with language selection
- Composables for table state management
- TypeScript type definitions for table structures
- Core table components and cell renderers
- Main entry point and build configuration
- Package.json with project dependencies
- Initial repository setup

### Features
- Native Directus table integration
- Inline editing capabilities
- Quick filter system
- Bookmark management
- Column management (add, remove, rename, reorder)
- Custom cell renderers for different field types
- Translation support with multi-language columns
- Bulk operations support
- Row actions (edit, duplicate, delete)

[Unreleased]: https://github.com/yourusername/super-layout-table/compare/v0.1.0...HEAD
[v0.1.0]: https://github.com/yourusername/super-layout-table/compare/v0.0.9...v0.1.0
[v0.0.9]: https://github.com/yourusername/super-layout-table/compare/v0.0.8...v0.0.9
[v0.0.8]: https://github.com/yourusername/super-layout-table/compare/v0.0.7...v0.0.8
[v0.0.7]: https://github.com/yourusername/super-layout-table/compare/v0.0.6...v0.0.7
[v0.0.6]: https://github.com/yourusername/super-layout-table/compare/v0.0.5...v0.0.6
[v0.0.5]: https://github.com/yourusername/super-layout-table/compare/v0.0.4...v0.0.5
[v0.0.4]: https://github.com/yourusername/super-layout-table/compare/v0.0.3...v0.0.4
[v0.0.3]: https://github.com/yourusername/super-layout-table/compare/v0.0.2...v0.0.3
[v0.0.2]: https://github.com/yourusername/super-layout-table/compare/v0.0.1...v0.0.2
[v0.0.1]: https://github.com/yourusername/super-layout-table/releases/tag/v0.0.1