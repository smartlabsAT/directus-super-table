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
