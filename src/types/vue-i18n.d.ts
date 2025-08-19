declare module 'vue-i18n' {
  export function useI18n(): {
    t: (key: string, ...args: any[]) => string;
    locale: any;
    locales: any[];
  };
  export const createI18n: any;
  export type Composer = any;
  export type VueI18n = any;
}

// Extend the Field type from Directus to include additional properties
import { Field as DirectusField } from '@directus/types';

declare module '@directus/types' {
  interface Field extends DirectusField {
    interface?: string;
    interfaceOptions?: Record<string, any>;
    display?: string;
    displayOptions?: Record<string, any>;
  }
}
