# Changelog

All notable changes to the Super Layout Table Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## v0.6.3 — Open rows in a new tab (Ctrl/Cmd+click)

Implements #72. Table rows can be opened in a new browser tab, matching the
"open in new tab" behavior users expect from links.

### Added
- **Ctrl/Cmd+click opens the row in a new tab.** Ctrl+click (Windows/Linux) or
  Cmd+click (macOS) on a row opens its detail page in a new tab; a normal
  left-click keeps the existing behavior (navigate in the same tab, or edit when
  edit mode is on). Because `v-table` only emits `click:row` while `clickable`
  (which the layout disables in edit mode), modifier-clicks are intercepted in the
  capture phase and stopped before the cell editor or in-tab navigation react — so
  it works in both normal and edit mode without opening the inline editor.

### Internal
- Detail-route construction is shared via `getItemRoute` / `getItemRouteOrWarn`
  (a consistent "missing primary key" warning for both the row-click and
  modifier-click paths). The new tab opens with `noopener,noreferrer`, and the
  primary key is URL-encoded. `vue-tsc`, ESLint and Prettier green; verified live
  (edit mode on) that Ctrl/Cmd+click opens the correct row id in a new tab while a
  plain click still opens the inline editor.

## v0.6.2 — Unified deep-build, lifecycle consolidation & bare-translation display

Follow-up to v0.6.1 (#70). Consolidates the `super-table.vue` orchestrator and
unifies the `deep`-query construction onto a single schema-driven classifier.

### Changed (behavior)
- **To-many relations are fetched completely.** First-level `o2m`/`m2m`/`files`
  columns (and bare `translations`) are now fetched unbounded
  (`deep[<field>][_limit]=-1`), consistent with the nested-M2A policy — previously
  they were capped at the server's default page size (silently truncating the
  displayed, comma-joined list) or not fetched at all. A column on a very large
  to-many relation now fetches every row: the inherent cost of displaying it fully.
- **`deep` is built by one schema-driven classifier** (`buildDeep`), so first-level
  and nested entries share a single source of truth (`describeHop`). The previous
  ad-hoc `special.includes(...)` first-level branch is gone.

### Added
- **Bare `translations` columns render the active-language value** instead of raw
  JSON. The active-language row (current user's language, falling back to the first
  available) is rendered through the column's configured template or a heuristic
  field (`description`/`title`/…), with HTML stripped.

### Internal
- The two `onMounted`/`onUnmounted` blocks in `super-table.vue` are merged into a
  single auditable pair; `pickTranslationRow` is exported for reuse. ~130 net lines
  removed from the orchestrator. 431/431 unit tests, `vue-tsc`, ESLint, Prettier
  all green; verified live across 13 collections + the M2A/translation flows.

## v0.6.1 — Robustness & test hardening

Follow-up to v0.6.0 (#68). No functional behavior change — internal hardening and
additional unit coverage; verified with a live regression of the v0.6.0
nested-translation feature.

### Changed
- **Fetch dedup is more robust.** The query fingerprint now canonicalizes nested
  `filter`/`deep`/`alias` key order, so two semantically identical queries built
  with a different key insertion order dedupe to a single request; array order
  stays significant. The fingerprint is a dedup-only comparison key and never
  forms the wire query. `sort` is normalized (`?? null`) consistently with the
  other parameters.
- **Single user-language helper.** The current user's language lookup for nested
  translations is extracted into a pure, typed `resolveUserLanguage` helper and
  reused at both call sites, removing duplicated untyped (`as any`) access.

### Tests
- Added coverage for the non-default translation language field at the render and
  query-expansion levels, deep M2O chains (resolution and validation), the field
  picker's single-file vs. to-many handling, the fingerprint canonicalization, and
  the user-language helper (16 new unit tests).

## v0.6.0 — Deep relational paths in M2A templates (nested translations)

### Added
- **M2A templates resolve deep relational paths**, including a `translations`
  relation stored *inside* the target collection — e.g.
  `{{item:service.translations.label}}` (M2A → target → translations → value).
  Resolution is generic and schema-driven: each hop is interpreted via the
  relations store, so it scales to arbitrary depth (M2O chains, files, nested
  translations) without per-level special-casing.
- **Per-relation language-field detection.** The translation language column is
  read from the relation (its `junction_field`), not hardcoded — so collections
  using a non-default language field still resolve.
- **Language selection for nested translations.** An optional `:lang` suffix on
  the token (`…translations.label:de-DE`) picks the language; without it the
  current user's language is used, falling back to the first available row.

### Fixed
- **Invalid deep template fields no longer blank the view.** Every segment of
  an `item:collection.path` token is now validated against the schema before
  the request is built; unknown fields are dropped with a `console.warn`
  (`[super-layout-table] Dropped template field …`) and the cell degrades to
  an empty value — previously the API rejected the whole request (403) and the
  table rendered zero rows with no hint.
- **HTML translation values render as plain text in M2A cells.** Resolved
  template values are stripped of HTML tags (entities decoded, script/style
  contents dropped), matching the native `formatted-value` display used by
  regular columns; raw `<p data-start=…>` markup is no longer shown.
- **Nested to-many relations inside M2A items are fetched unbounded.** The
  items request now emits `deep[<field>][item:<collection>][<relation>][_limit]=-1`
  for every to-many hop crossed by an expanded template path, so e.g. a
  translations set larger than the server's default page size (100) is no
  longer silently truncated.
- **The native header search now drives the layout.** It previously had no
  effect in this layout (only the toolbar search filtered). Native input is
  mirrored into the layout search (same intelligent `_or` filter, incl.
  translations/UUID/integer handling). Note: the reverse direction (toolbar →
  native header pill) is not possible — the Directus layout wrapper does not
  forward `update:search` from layouts. The header pill's own little result
  badge is computed by Directus core with native search semantics and can
  undercount (e.g. translation-only matches); the table and its pagination
  use the layout's filter and are authoritative. For the same reason, clearing
  the search from inside the layout cannot clear the native header pill — the
  table filters correctly, but the pill keeps its text until cleared natively.
- **Item count no longer double-applies the search.** The count request passed
  the search as a native `search` param on top of the `_or` filter, so counts
  could disagree with the visible rows (native search misses translations /
  UUID / integer matches). The count now uses exactly the list's filter.
  Counts over to-many search filters (e.g. translations) now use a distinct
  count, so a single match with several translations no longer inflates the
  total.
- **Exactly one fetch per change.** Bookmark loads fired three identical
  items+count request pairs (identity churn after async language hydration),
  template edits fired two (duplicate watcher), and every layout-options write
  (column width, alignment, edit mode) triggered a needless refetch. A content
  fingerprint plus a coalescing single-flight runner reduce all of these to a
  single request pair — and overlapping responses can no longer arrive out of
  order.
- **Per-segment template validation covers all relational branches.** Junction
  (`{{treatment.x.y}}`), parent, M2M and M2O/O2M/files tokens are now walked
  segment by segment like M2A item tokens (translations keep their deliberate
  client-side tolerance). Drop warnings are deduplicated per session.
- **Column Display Template editor: lossless textarea + field picker.** The
  native chip editor silently dropped the extension-only `:lang` suffix on
  nested-translation tokens (and re-serialized it away on edit). It is replaced
  by a plain textarea (every token visible, lossless round-trip) plus a
  schema-driven "+" field picker: for M2A columns it drills target collections
  incl. nested translations and offers an inline language choice (inserting the
  full `…:de-DE` token); for other relational columns it inserts relative
  tokens. Scalar / per-language translation columns show the textarea only.

Requested by @Abdallah-Awwad as a follow-up to #60.

## v0.5.1 — M2A picker templates, field scopes & guard fix (Issue #60)

### Fixed
- **M2A column displays built with the native picker showed an empty cell.**
  Rooted at the parent collection, the picker emits field-key-prefixed tokens
  (`{{treatment.collection}}`, `{{treatment.item:service.name}}`) — not the
  hand-written `{{item:...}}` form the renderer expected. A shared
  `stripM2AFieldPrefix` helper now normalises both forms on the query and render
  sides, so picked templates resolve correctly.
- **Discriminator-only / non-item templates blanked the whole cell.** A template
  with no `item:` token (e.g. `{{collection}}`) made the API omit the junction
  `item`, and a guard then skipped every row as if the item were
  permission-denied. The guard now distinguishes a not-fetched item
  (`undefined`) from a genuinely absent one (`null`), so these templates render.

### Added
- **Parent-row and junction-level fields in M2A templates.** Bare tokens
  (`{{code}}`) resolve against the parent row and field-prefixed tokens
  (`{{treatment.sort}}`) against the junction row, alongside the discriminator
  and per-collection `item:` values. On a name clash the most specific (deepest)
  token wins. Every token is validated against its target before the request, so
  an unknown token is dropped instead of 403'ing.

### Refactor
- M2A junction-row rendering extracted into a pure, unit-tested `buildM2ASegments`
  helper; `resolveM2ARelation` now also reports the junction collection. The
  conventional `collection` discriminator token lives in `displayHeuristics` and
  is shared by the query and render sides so they cannot drift.

## v0.5.0 — Many-to-Any support (Issue #60)

### Added
- **Many-to-Any (M2A) fields are now supported** as display columns. The
  `related-values` display and per-column overrides resolve the polymorphic
  `item:collection.field` template syntax, including nested chains such as
  `{{item:partners_catalog.catalog_id.title}}` (M2A → M2O → scalar). Each
  junction row renders against its own collection discriminator. Reported by
  @Abdallah-Awwad in #60.
- **In-body error state:** when the items request fails, the layout now shows
  an explicit error notice instead of a blank body under a live pagination bar.

### Fixed
- **M2A raw template / empty cell:** M2A columns previously rendered the literal
  display template (or an empty cell) because the query never expanded the
  per-collection `item:` paths and the renderer never unwrapped the junction
  rows. Both paths now handle M2A.
- **M2A column display → 0 results:** adding a column-display template on an M2A
  field expanded into an invalid junction field path, 403'd the items request,
  and blanked the table while pagination stayed visible. Invalid/bare tokens are
  now dropped before the request, and the footer is gated on the same
  renderable-data condition as the table.

### Refactor
- New `resolveM2ARelation` helper centralises the M2A junction-shape lookup
  (discriminator, item field, allowed collections) in one place, mirroring the
  `resolveTranslationsCollection` pattern — replacing three hand-written copies
  across the query and render layers.
- M2A template grammar (`M2A_TOKEN_RE`, `parseM2AToken`, `buildM2AFieldPath`)
  now lives in `displayHeuristics`, so the field-path emit and the render-side
  read share a single source and cannot drift.
- Cell rendering reuses `get` from `@directus/utils` for nested-path access
  instead of a bespoke walker.

## v0.4.2 — Marketplace metadata

### Changed
- Added `icon: 'table_rows'` to package.json for better Marketplace
  presentation.
- Removed the hard-coded version line from README — version history is
  tracked in CHANGELOG, the README copy was always lagging.

## v0.4.1 — Hotfix: M2M pivot 403 + collection-switch (Issue #55)

### Fixed
- **M2M pivot 403:** `related-values` display no longer queries
  `${field}.name` on the junction collection. Field paths now traverse
  `junction_field` to the actual target and drop tokens missing there.
- **Collection-switch stale fields:** `useCollection` now receives a
  reactive `Ref`, so the field list refreshes when the collection prop
  changes. Reported by @draxx318 in #55.
- **M2M display rendering:** Junction-row unwrap also runs for
  field-settings displays (was previously override/heuristic only),
  fixing literal `{{name}}` leaks.
- **Override on primitive fields:** A column-display template on a
  non-relational field now applies to the value instead of returning
  em-dash.

### Refactor
- New `expandTokensThroughRelation` helper unifies M2M-junction
  traversal across the override, heuristic, and `related-values`
  branches of `adjustFieldsForDisplays`. Closes the drift class behind
  #34 and #55.

## v0.4.0 — Permission-aware layout (Issue #37)

### Fixed
- **Bug A:** Translation language columns the user cannot read are no longer rendered
- **Bug B:** Inline-edit popover blocked on cells the user cannot update; tooltip explains
- **Bug C:** `[object Object]` no longer leaks into translation cells when popover open
- **Bug D:** Hauptcollection field permissions and translations field permissions handled consistently
- **Bug E:** Filters referencing inaccessible fields are sanitized server-side; user notified
- **Bug F:** Auto-resolved by Bug A — language code never leaks into header
- **Bug G:** Bulk-action duplicate button hidden when user lacks create permission
- **L2 (post-audit):** Asymmetric permissions — when the `languages` collection is unrestricted but the translations junction has a row-level filter on `languages_code`, an aggregate-query probe now resolves the exact accessible languages (instead of `--` placeholder columns).
- **L5 (post-audit):** File-browser drawer no longer renders empty when the user lacks read on `directus_files`. A clear warning notification fires instead.

### Added
- `usePermissions` composable as single source of truth for permission checks
- `sanitizeFilter` utility for permission-aware filter trees
- `useTranslationLanguages` composable: probes the translations junction collection for accessible languages (covers row-level filters not exposed by `/permissions/me`)
- 403 errors during inline-save now surface as notifications instead of being swallowed

### Refactor
- `combinedFilter` no longer mixes side-effects with computed evaluation; the user notification is now emitted from a dedicated watcher.
- `PermissionAction` union no longer includes the unused `'share'` action.
- `usePermissions` guards against array-shaped permission stores (legacy / future Directus shape changes) instead of silently failing.
- `fieldsWithRelational` clarifies its behaviour: the primary key and translation language code path are added BEFORE the permission gate, and sanitize drops them only if the user lacks read permission. This mirrors native Directus's `useCollection.primaryKeyField`, which is itself permission-filtered, so users without PK read access see the same graceful degradation in both layouts (items render with limited interaction) instead of an empty 403 error state.
- `useTableApi.fetchItems` no longer requests `meta=filter_count,total_count` together with the items. The server resolves that meta block via `countDistinct(<pk>)` and would 403 for users without read on the primary key; the count is now fetched in parallel via `aggregate[count]=*` (`fetchItemCount`), which uses SQL `COUNT(*)` and works regardless of field-level permissions. Users without PK access can now use the layout instead of seeing an empty 403 state.

### Known limitations
- Bulk-action **Edit / Delete / Add Item** buttons (rendered by Directus Core, not by this extension) remain visible-but-disabled when the user lacks the corresponding permission. A future Directus core PR is required to fully hide them.

## [0.3.2] - 2026-05-09

### Fixed
- **Inline editing silently failing for collections with non-`id` primary key
  (Issue #44).** `handleUpdate` and `handleBooleanToggle` in
  `EditableCellRelational.vue` were detecting the primary key by name pattern
  matching (`key === 'id' || key.endsWith('_id')`), which produced no result on
  collections whose primary key uses a different name (`code`, `slug`, `uuid`,
  `sku`, …). Both functions now read the primary key field name from the
  `primaryKeyField` computed property, which is sourced from the Directus
  schema via the parent component. The previous heuristic could also have
  selected an unrelated foreign-key column ending in `_id` and dispatched the
  PATCH against the wrong record; that misdirection is no longer possible.



### Changed
- Bumped 21 development dependencies to their latest patch versions within
  current major ranges. No runtime API changes.

### Updated Dependencies

#### Directus
- `@directus/extensions-sdk` 17.1.1 → 17.1.4
- `@directus/types` 15.0.1 → 15.0.3
- `@directus/utils` 13.4.0 → 13.4.1

#### Vue ecosystem
- `vue` 3.5.32 → 3.5.34
- `vue-router` 5.0.4 → 5.0.6
- `@vue/test-utils` 2.4.6 → 2.4.10
- `@vitejs/plugin-vue` 6.0.5 → 6.0.6
- `vue-tsc` 3.2.6 → 3.2.8

#### Build & Test tooling
- `vite` 8.0.3 → 8.0.11
- `vitest` 4.1.2 → 4.1.5
- `@vitest/coverage-v8` 4.1.2 → 4.1.5
- `@vitest/ui` 4.1.2 → 4.1.5
- `typescript` 6.0.2 → 6.0.3
- `prettier` 3.8.1 → 3.8.3
- `happy-dom` 20.8.9 → 20.9.0
- `jsdom` 29.0.1 → 29.1.1

#### Linting
- `eslint` 10.2.0 → 10.3.0
- `@typescript-eslint/eslint-plugin` 8.58.0 → 8.59.2
- `@typescript-eslint/parser` 8.58.0 → 8.59.2
- `eslint-plugin-vue` 10.8.0 → 10.9.1

#### Types
- `@types/node` 22.19.17 → 22.19.18 (intentionally kept on major 22 to match
  the Docker container Node 22.18 and the CI matrix on 20.x / 22.x)

### Node compatibility
Common engine subset across all updated tooling: `>=20.19.0`, `>=22.13.0`,
or `>=24.0.0`. Node 23 is excluded by `vitest` and `eslint`.

## [0.3.0] - 2026-05-09

### Added
- **Per-column display configuration for relational fields (Issue #48).** A new
  "Column Displays" section in the layout sidebar lets you pick a relational
  column and assign a Directus display template (e.g. `{{ first_name }} {{ last_name }}`)
  without leaving the layout. Saved per layout preset under
  `layoutOptions.columnDisplays`.
- Heuristic display fallback for relational fields with no explicit display
  configuration: `directus_users` → `{{first_name}} {{last_name}}`,
  `directus_files` → `{{title}}` / `{{filename_download}}`, custom
  collections → first existing of `name | title | label`.
- M2M columns automatically resolve through the junction table — the override
  template targets the related collection directly, no manual `junction_field`
  hop required.
- Storage-key normalization for translation columns: a single override on
  `translations.title` applies to every language column for that field
  (`translations.title:de-DE`, `translations.title:en-US`, …).

### Fixed
- **Empty table after deleting fields (Issue #47).** Stale references in saved
  layout presets now self-heal at read time. `layoutQuery.fields`,
  `layoutQuery.sort`, and `layoutOptions.columnDisplays` drop entries pointing
  at fields that no longer exist on the collection, eliminating the HTTP 403
  that previously left the table blank.

### Changed
- `adjustFieldsForDisplays` now accepts an optional `overrides` parameter and
  expands template tokens into deep API paths, including M2M junction
  traversal. Translations bypass the heuristic + junction logic to preserve
  the existing dedicated render path.
- `useAliasFields` forwards the `columnDisplays` override map so the API query
  requests the fields the override template references.

### Internal
- New utility `src/utils/displayHeuristics.ts` (parser, target-collection
  resolver, heuristic picker) with 19 unit tests.
- New utility `src/utils/fieldValidity.ts::filterValidColumnDisplays` mirroring
  the existing `filterValidFields` / `filterValidSort` symmetry.
- New composable `src/composables/useColumnDisplays.ts` for CRUD over the
  override map (empty template = remove entry).
- New components in `src/components/`: `ColumnDisplaysSection.vue`,
  `ColumnDisplayItem.vue`, `ColumnDisplayEditor.vue`.
- Test infrastructure: `tests/setup.ts` now mocks `@directus/extensions-sdk`
  globally so the test runtime never pulls `@directus/themes` (which would
  drag in `pinia`, an indirect dep that fails on clean CI installs).

## [0.2.18] - 2026-04-04

### Changed
- Updated all 28 dependencies to latest versions (Issue #45)
- Aligned dependency versions with expandable-blocks (v1.3.4) and expandable-blocks-api (v0.3.0)

### Security
- Resolved 1 CRITICAL vulnerability (happy-dom RCE via VM Context Escape)
- Resolved 5 HIGH vulnerabilities in direct dependencies (playwright SSL bypass, axios SSRF, rollup XSS/path traversal, glob command injection)
- Reduced total vulnerabilities from 10 to 4 (remaining are transitive SDK dependencies)

### Updated Dependencies

#### Production
- `lodash` 4.17.21 → 4.18.1
- `@directus/format-title` 12.0.1 → 12.1.2

#### Dev — Major Updates
- `@directus/extensions-sdk` 11.0.10 → 17.1.1
- `@directus/types` 13.2.2 → 15.0.1
- `typescript` 5.x → 6.0.2
- `eslint` 9.x → 10.2.0
- `@eslint/js` 9.x → 10.0.1
- `vitest` 3.2.4 → 4.1.2
- `@vitest/coverage-v8` 3.2.4 → 4.1.2
- `@vitest/ui` 3.2.4 → 4.1.2
- `happy-dom` 18.0.1 → 20.8.9
- `jsdom` 26.1.0 → 29.0.1
- `vue-router` 4.5.1 → 5.0.4
- `vite` added as direct dependency (8.0.3) for Vitest 4 peer requirement

#### Dev — Minor/Patch Updates
- `@directus/utils` 13.0.9 → 13.4.0
- `@typescript-eslint/eslint-plugin` 8.40.0 → 8.58.0
- `@typescript-eslint/parser` 8.40.0 → 8.58.0
- `@vitejs/plugin-vue` 6.0.1 → 6.0.5
- `@playwright/test` 1.54.2 → 1.59.1
- `playwright` 1.54.2 → 1.59.1
- `@types/lodash` 4.14.202 → 4.17.24
- `@types/node` 24.3.0 → 22.19.17
- `chalk` 5.5.0 → 5.6.2
- `eslint-plugin-prettier` 5.5.4 → 5.5.5
- `eslint-plugin-vue` 10.4.0 → 10.8.0
- `prettier` 3.6.2 → 3.8.1
- `vue` 3.5.18 → 3.5.32
- `vue-eslint-parser` 10.2.0 → 10.4.0
- `vue-tsc` 3.0.5 → 3.2.6

### Technical Details
- Workaround for TS 6.0.2 compiler crash with SDK v17 complex types in `index.ts` (config object extracted with `as any`)
- Removed deprecated `baseUrl` from `tsconfig.json` (deprecated in TypeScript 6)
- Regenerated `pnpm-lock.yaml` from scratch

## [0.2.17] - 2026-03-04

### Added
- Full support for Tag fields with visual tag editor (Issue #10)
- TagCell component for visual tag display as chips in table cells
- TagEditor component with popover-based editing interface
- Native Directus v-chip integration for tag display and editing
- Tag detection for both explicit 'tags' interface and JSON array fields
- Enhanced field support system for tag fields
- Popover-based tag editing with Add/Remove functionality

### Changed
- Updated supportedFields.ts: 'tags' interface now fully supported (was 'partial')
- Enhanced InlineEditPopover.vue with dedicated tag editing interface
- Improved field support detection for tag fields regardless of JSON type
- Removed edit pencil icon from editable cells (hover background is sufficient indicator)
- Edit-icon for non-editable fields (lock) now uses overlay positioning to save cell space
- Tag chips in editor now show pointer cursor and translated "Remove" tooltip on hover

### Fixed
- Tag fields are now properly recognized as editable in table view
- Resolved field support level detection for tag interface with JSON type
- Tag fields no longer show "limited support" warnings
- Fixed tag chips being clipped in narrow columns due to edit icon taking inline space

### Technical Details
- New component: `src/components/TagCell.vue` (display-only component)
- New component: `src/components/CellRenderers/TagEditor.vue` (popover editor)
- Enhanced: `src/components/InlineEditPopover.vue` with tag interface support
- Updated: `src/components/EditableCellRelational.vue` with tag field integration
- Modified: `src/utils/fieldSupport.ts` with special case handling for tag fields
- Updated: `src/constants/supportedFields.ts` with full tag interface support

## [0.2.16] - 2025-11-20

### Added
- Added configurable language code field support for translation collections (Issue #39)
- New `languageCodeField` layout option to specify custom field names instead of hardcoded 'languages_code'
- UI field in options panel to configure the language code field name

### Fixed
- Fixed layout crash when translation collection uses a custom language code field name
- Extension now supports any field name for language identification in translations

### Changed
- Refactored all components to use configurable language code field via `useTranslationConfig` composable
- Updated `super-table.vue`, `api.ts`, `useTableEdits.ts`, `EditableCellRelational.vue`, and `InlineEditPopover.vue`
- Maintains backward compatibility with default 'languages_code' field name

## [0.2.15] - 2025-10-27

### Fixed
- Fixed hardcoded 'id' primary key field assumption throughout the extension (Issue #36)
- Extension now dynamically detects the actual primary key field from collection schema using `useCollection()` composable
- All components and utilities now support collections with custom primary key fields (e.g., `uuid`, `custom_id`, etc.)

### Changed
- **UI Components**: Updated `super-table.vue`, `EditableCellRelational.vue`, `RelationalCell.vue`, and `actions.vue` to use dynamic primary key detection
- **Utility Functions**: Enhanced `adjustFieldsForDisplays.ts` with `getPrimaryKeyForCollection()` helper
- All primary key references now use fallback logic: detect from schema → fallback to 'id' with warning
- Improved compatibility with non-standard Directus installations and custom collection schemas

## [0.2.14] - 2025-10-09

### Fixed
- Fixed extension requesting non-existent `.title`, `.status`, `.name` fields in translations and custom collections (Issue #34)
- Added field existence validation before requesting display fields to prevent PostgreSQL errors
- Translations fields are now handled separately without adding standard field assumptions
- Native Directus collections (directus_files, directus_users) now validate field existence before requesting
- Custom collections now use conservative approach (only request `id` field)
- Image and file displays now validate `.title` field existence in directus_files
- User display now validates `.avatar` field existence in directus_users

### Changed
- Enhanced `adjustFieldsForDisplays` utility with three-tier field validation strategy:
  1. Translations: No standard fields added (uses deep parameter)
  2. Native Directus collections: Validate each standard field individually
  3. Custom collections: Only request safe `id` field

## [0.2.13] - 2025-09-10

### Fixed
- Updated GitHub Actions to latest versions (upload-artifact@v4, download-artifact@v4, codecov/codecov-action@v4)
- Fixed workflow notification job logic to properly handle security audit warnings
- Improved CI/CD pipeline stability and removed deprecated action warnings
- Added proper token configuration for Codecov integration

## [0.2.12] - 2025-09-10

### Added
- Enhanced Language Column Management (Issue #8)
- Smart language detection and filtering for translation fields
- LanguageSelectionDialog with "Currently Active" and "Available Languages" sections  
- Visual status indicators for active languages with chip display
- Mode-based dialog behavior ('add' vs 'manage' modes)
- useExistingLanguageDetection composable for language field analysis

### Changed
- Language selection workflow now preserves column order and settings
- Dialog shows only available (not yet added) languages to prevent duplicates
- Enhanced addLanguagesToField function for existing translation fields
- Improved language field management without disrupting table configuration

### Fixed
- Translation fields no longer require complete removal and re-addition to add languages
- Column-specific settings (width, alignment, custom names) are preserved when adding languages
- Language field detection now properly identifies existing language suffixes (e.g., 'translations.description:de-DE')

### Technical Details
- New composable: `src/composables/useExistingLanguageDetection.ts`
- Enhanced: `src/components/LanguageSelectionDialog.vue` with smart filtering
- Updated: `src/composables/useTableFields.ts` with language detection integration
- Modified: `src/super-table.vue` for enhanced dialog props and mode handling

## [0.2.10] - 2025-08-30

### Fixed
- Fixed manual sort column disappearing during column resizing operations
- Removed loading state dependency from sortAllowed computed property to prevent temporary hiding of manual sort handles
- Manual sort column now remains consistently visible during all table interactions

### Technical Details
- Issue #27: Manual sort handlers would temporarily disappear when resizing columns
- Root cause: `sortAllowed` computed property included `!loading.value` condition
- Solution: Simplified `sortAllowed` to only check for sort field existence and readonly state

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