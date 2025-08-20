import { Filter } from '@directus/types';

export interface FilterPreset {
  id: string;
  name: string;
  collection: string;
  filter: Filter | null;
  color?: string;
  icon?: string;
  description?: string;
  resultCount?: number;
  order?: number;
  isPinned?: boolean;
  isSystem?: boolean;
  isShared?: boolean;
}

export interface SortItem {
  field: string;
  direction: 'asc' | 'desc';
}
