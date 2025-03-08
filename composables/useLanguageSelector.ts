import { ref, computed, Ref } from 'vue';
import { useApi, useStores } from '@directus/extensions-sdk';

export interface Language {
  code: string;
  name: string;
}

export function useLanguageSelector() {
  const api = useApi();
  const { useUserStore } = useStores();
  const userStore = useUserStore();
  
  // Available languages
  const languages = ref<Language[]>([]);
  const loadingLanguages = ref(false);
  
  // Selected language - default to user's language
  const selectedLanguage = ref<string>(userStore.currentUser?.language || 'en-US');
  
  // Fetch available languages from Directus
  async function fetchLanguages() {
    if (languages.value.length > 0) return;
    
    loadingLanguages.value = true;
    try {
      const response = await api.get('/items/languages', {
        params: {
          fields: ['code', 'name'],
          sort: 'name',
          limit: -1
        }
      });
      
      if (response.data?.data) {
        languages.value = response.data.data;
      } else {
        // Fallback to common languages if languages collection doesn't exist
        languages.value = [
          { code: 'en-US', name: 'English' },
          { code: 'de-DE', name: 'Deutsch' },
          { code: 'fr-FR', name: 'Français' },
          { code: 'es-ES', name: 'Español' }
        ];
      }
    } catch (error) {
      // Fallback to common languages on error
      languages.value = [
        { code: 'en-US', name: 'English' },
        { code: 'de-DE', name: 'Deutsch' },
        { code: 'fr-FR', name: 'Français' },
        { code: 'es-ES', name: 'Español' }
      ];
    } finally {
      loadingLanguages.value = false;
    }
  }
  
  // Get language name by code
  function getLanguageName(code: string): string {
    const lang = languages.value.find(l => l.code === code);
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
    setLanguage
  };
}