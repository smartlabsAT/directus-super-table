import { computed, type Ref } from 'vue';
import type { Language } from '../types/table.types';

/**
 * Composable for detecting existing languages in translation fields
 * and providing filtered language lists for smart language management
 */
export function useExistingLanguageDetection(
  currentFields: Ref<string[]>,
  availableLanguages: Ref<Language[]>
) {
  /**
   * Detects existing language codes for a specific translation field
   * @param baseFieldKey - The base field key (e.g., "translations.description")
   * @returns Array of language codes that are already added
   */
  function detectExistingLanguagesForField(baseFieldKey: string): string[] {
    if (!currentFields.value) return [];

    return currentFields.value
      .filter((field) => field.startsWith(baseFieldKey + ':'))
      .map((field) => field.split(':')[1])
      .filter(Boolean); // Remove any undefined values
  }

  /**
   * Gets available (not yet added) languages for a specific field
   * @param baseFieldKey - The base field key (e.g., "translations.description")
   * @returns Array of Language objects that can still be added
   */
  function getAvailableLanguagesForField(baseFieldKey: string): Language[] {
    const existingLanguageCodes = detectExistingLanguagesForField(baseFieldKey);

    return availableLanguages.value.filter((lang) => !existingLanguageCodes.includes(lang.code));
  }

  /**
   * Gets existing languages with full language metadata
   * @param baseFieldKey - The base field key
   * @returns Array of Language objects that are currently active
   */
  function getExistingLanguagesForField(baseFieldKey: string): Language[] {
    const existingLanguageCodes = detectExistingLanguagesForField(baseFieldKey);

    return availableLanguages.value.filter((lang) => existingLanguageCodes.includes(lang.code));
  }

  /**
   * Checks if a field is a translation field
   * @param fieldKey - The field key to check
   * @returns boolean indicating if it's a translation field
   */
  function isTranslationField(fieldKey: string): boolean {
    return fieldKey.startsWith('translations.');
  }

  /**
   * Extracts the base field key from a translation field with language suffix
   * @param fieldKey - Field key (e.g., "translations.description:de-DE")
   * @returns Base field key (e.g., "translations.description")
   */
  function getBaseFieldKey(fieldKey: string): string {
    if (fieldKey.includes(':')) {
      return fieldKey.split(':')[0];
    }
    return fieldKey;
  }

  /**
   * Checks if more languages can be added to a translation field
   * @param baseFieldKey - The base field key
   * @returns boolean indicating if more languages are available
   */
  function canAddMoreLanguages(baseFieldKey: string): boolean {
    return getAvailableLanguagesForField(baseFieldKey).length > 0;
  }

  /**
   * Reactive computed for tracking all translation fields and their language status
   */
  const translationFieldsStatus = computed(() => {
    const translationFields = currentFields.value.filter(isTranslationField);
    const uniqueBaseFields = [...new Set(translationFields.map(getBaseFieldKey))];

    return uniqueBaseFields.map((baseField) => ({
      baseField,
      existingLanguages: getExistingLanguagesForField(baseField),
      availableLanguages: getAvailableLanguagesForField(baseField),
      canAddMore: canAddMoreLanguages(baseField),
    }));
  });

  return {
    detectExistingLanguagesForField,
    getAvailableLanguagesForField,
    getExistingLanguagesForField,
    isTranslationField,
    getBaseFieldKey,
    canAddMoreLanguages,
    translationFieldsStatus,
  };
}
