// Mock data for testing
import { vi } from 'vitest';

export const mockLanguages = [
  { code: 'en-US', name: 'English' },
  { code: 'de-DE', name: 'German' },
  { code: 'fr-FR', name: 'French' },
  { code: 'es-ES', name: 'Spanish' },
];

export const mockFields = [
  { field: 'id', type: 'integer', name: 'ID' },
  { field: 'title', type: 'string', name: 'Title' },
  { field: 'content', type: 'text', name: 'Content' },
  { field: 'status', type: 'string', name: 'Status' },
  { field: 'translations', type: 'alias', name: 'Translations' },
  { field: 'translations.description', type: 'text', name: 'Description' },
  { field: 'translations.title', type: 'string', name: 'Title (Translation)' },
  { field: 'created_at', type: 'timestamp', name: 'Created At' },
  { field: 'updated_at', type: 'timestamp', name: 'Updated At' },
];

export const mockTranslationFields = [
  'translations.description',
  'translations.description:en-US',
  'translations.description:de-DE',
  'translations.title',
  'translations.title:en-US',
  'translations.title:de-DE',
];

export const mockItems = [
  {
    id: 1,
    title: 'Test Item 1',
    content: 'Test content 1',
    status: 'published',
    translations: [
      { languages_code: 'en-US', description: 'English description 1', title: 'English title 1' },
      { languages_code: 'de-DE', description: 'German description 1', title: 'German title 1' },
    ],
  },
  {
    id: 2,
    title: 'Test Item 2',
    content: 'Test content 2',
    status: 'draft',
    translations: [
      { languages_code: 'en-US', description: 'English description 2', title: 'English title 2' },
      { languages_code: 'fr-FR', description: 'French description 2', title: 'French title 2' },
    ],
  },
];

export const mockApiResponse = {
  data: mockItems,
  meta: {
    total_count: 2,
    filter_count: 2,
  },
};

export const mockFieldsStore = {
  getField: vi.fn((collection: string, fieldKey: string) => {
    return mockFields.find((f) => f.field === fieldKey);
  }),
  getFieldsForCollection: vi.fn(() => mockFields),
};

export const mockRelationsStore = {
  getRelationsForField: vi.fn(() => [
    {
      collection: 'test_collection',
      related_collection: 'test_collection_translations',
      field: 'translations',
      related_field: 'item_id',
    },
  ]),
};