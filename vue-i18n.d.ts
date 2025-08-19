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
