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
