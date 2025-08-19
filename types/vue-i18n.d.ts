declare module 'vue-i18n' {
  import { App } from 'vue';

  export interface I18n {
    global: {
      t: (key: string, ...args: any[]) => string;
      locale: {
        value: string;
      };
      messages: {
        value: Record<string, any>;
      };
    };
    install: (app: App) => void;
  }

  export function useI18n(): {
    t: (key: string, ...args: any[]) => string;
    locale: {
      value: string;
    };
    messages: {
      value: Record<string, any>;
    };
  };

  export function createI18n(options: any): I18n;
}

// Extended Field interface for Directus
import type { Field as DirectusField } from '@directus/types';

declare module '@directus/types' {
  interface ExtendedField extends DirectusField {
    interface?: string;
    display?: string;
    displayOptions?: Record<string, any>;
    width?: 'half' | 'half-left' | 'half-right' | 'full' | 'fill';
    options?: Record<string, any>;
    note?: string;
    conditions?: any[];
    required?: boolean;
    readonly?: boolean;
    hidden?: boolean;
    sort?: number;
    group?: string;
    translations?: any;
    system?: boolean;
  }
}

export interface SortItem {
  field: string;
  desc: boolean;
}
