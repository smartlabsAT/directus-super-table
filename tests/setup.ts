import { vi } from 'vitest';
import { config } from '@vue/test-utils';

// Global test setup for Vue Test Utils and mocks

// Mock Directus composables and utilities that are commonly used
vi.mock('@directus/utils', () => ({
  formatTitle: (str: string) => str.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
  isDirectusError: vi.fn(() => false),
}));

vi.mock('@directus/format-title', () => ({
  default: (str: string) => str.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
}));

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key, // Return key as-is for testing
    n: (value: number) => value.toString(),
    locale: { value: 'en-US' },
  }),
}));

// Mock Directus stores
const mockFieldsStore = {
  getField: vi.fn(),
  getFieldsForCollection: vi.fn(),
};

const mockRelationsStore = {
  getRelationsForField: vi.fn(() => []),
};

const mockCollectionStore = {
  getCollection: vi.fn(),
};

vi.mock('@/stores', () => ({
  useFieldsStore: () => mockFieldsStore,
  useRelationsStore: () => mockRelationsStore,
  useCollectionStore: () => mockCollectionStore,
}));

// Mock Directus SDK
vi.mock('@directus/sdk', () => ({
  createDirectus: vi.fn(),
  rest: vi.fn(),
  readItems: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  createItem: vi.fn(),
}));

// Configure Vue Test Utils global properties
config.global.mocks = {
  $t: (key: string) => key,
  $n: (value: number) => value.toString(),
};

config.global.stubs = {
  // Stub common Directus components
  'v-dialog': true,
  'v-card': true,
  'v-card-title': true,
  'v-card-text': true,
  'v-card-actions': true,
  'v-button': true,
  'v-input': true,
  'v-checkbox': true,
  'v-chip': true,
  'v-divider': true,
  'v-notice': true,
  'v-table': true,
  'v-pagination': true,
};