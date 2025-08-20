import { ref, computed } from 'vue';
import { useStores } from '@directus/extensions-sdk';
import { useTableApi } from './api';
import type { Language } from '../types/table.types';
import { DEFAULT_LANGUAGES, DEFAULT_LANGUAGE_CODE } from '../constants/languages';

export function useLanguageSelector() {
  const tableApi = useTableApi();
  const { useUserStore } = useStores();
  const userStore = useUserStore();

  // Available languages
  const languages = ref<Language[]>([]);
  const loadingLanguages = ref(false);

  // Selected language - default to user's language
  const selectedLanguage = ref<string>(userStore.currentUser?.language || DEFAULT_LANGUAGE_CODE);

  // Fetch available languages from Directus
  async function fetchLanguages() {
    if (languages.value.length > 0) return;

    loadingLanguages.value = true;
    try {
      const languageData = await tableApi.fetchLanguages();

      if (languageData) {
        languages.value = languageData;
      } else {
        // Fallback to default languages if languages collection doesn't exist
        languages.value = DEFAULT_LANGUAGES.slice(0, 4); // Use first 4 languages
      }
    } catch {
      // Fallback to default languages on error
      languages.value = DEFAULT_LANGUAGES.slice(0, 4); // Use first 4 languages
    } finally {
      loadingLanguages.value = false;
    }
  }

  // Get language name by code
  function getLanguageName(code: string): string {
    const lang = languages.value.find((l) => l.code === code);
    return lang?.name || code;
  }

  // Set selected language
  function setLanguage(code: string) {
    selectedLanguage.value = code;
  }

  return {
    languages: computed(() => languages.value),
    selectedLanguage,
    loadingLanguages: computed(() => loadingLanguages.value),
    fetchLanguages,
    getLanguageName,
    setLanguage,
  };
}
