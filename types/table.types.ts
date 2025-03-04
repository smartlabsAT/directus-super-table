import type { Field, Item, Sort, Filter } from '@directus/types';
import type { Ref, ComputedRef } from 'vue';

// Quick Filter interface for storing filter presets
export interface QuickFilter {
  id: string;
  name: string;
  filter: Filter;
  description?: string;
  icon?: string;
  color?: string;
  isPinned?: boolean;
  order?: number;
}

export interface LayoutOptions {
  showToolbar?: boolean;
  showSelect?: boolean;
  spacing?: 'compact' | 'cozy' | 'comfortable';
  widths?: Record<string, number>;
  align?: Record<string, 'left' | 'center' | 'right'>;
  customFieldNames?: Record<string, string>;
  selectedLanguage?: string;
  autoSave?: boolean;
  editMode?: boolean;
  quickFilters?: QuickFilter[];
  activeQuickFilterId?: string;
}

export interface LayoutQuery {
  page?: number;
  limit?: number;
  sort?: string[];
  fields?: string[];
  [key: string]: any;
}

export interface Language {
  code: string;
  name: string;
}

export interface TranslationUpdate {
  isTranslation: boolean;
  language: string;
  translationField: string;
  value: any;
}

export interface TableHeader {
  text: string;
  value: string;
  description?: string | null;
  width?: number | null;
  align?: 'left' | 'center' | 'right';
  field: any;
  sortable: boolean;
}

export interface EditValue {
  [field: string]: any | TranslationUpdate;
}

export interface Edits {
  [itemId: string]: EditValue;
}