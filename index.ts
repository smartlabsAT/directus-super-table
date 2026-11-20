import { computed } from 'vue';
import { defineLayout, useStores } from '@directus/extensions-sdk';
import { formatTitle } from '@directus/format-title';
import LayoutComponent from './src/super-table.vue';
import ActionsComponent from './src/actions.vue';
import OptionsComponent from './src/options.vue';
import { requestCollectionRefresh } from './src/utils/requestCollectionRefresh';

// Workaround: TS 6.0.2 crashes on complex SDK v17 types in defineLayout() inline objects.
// Extract config to bypass the compiler crash (same fix as expandable-blocks).
const layoutConfig = {
  id: 'super-layout-table',
  name: 'Super Table',
  icon: 'table_rows',
  component: LayoutComponent,
  slots: {
    options: OptionsComponent,
    sidebar: () => null,
    actions: ActionsComponent,
  },
  headerShadow: false,
  setup(props: any, { emit }: any) {
    const { useFieldsStore } = useStores();
    const fieldsStore = useFieldsStore();

    // Issue #48: Expose a flat list of currently visible columns to slot
    // components (options sidebar). Each entry uses the *root* field key as id
    // (translations.title rather than translations.title:de-DE) so all
    // language variants of the same root field share a single override entry.
    // Multiple language columns of the same root collapse into one picker entry.
    const availableFieldChoices = computed(() => {
      const layoutFields: string[] = props.layoutQuery?.fields ?? [];
      const customFieldNames: Record<string, string> = props.layoutOptions?.customFieldNames ?? {};
      const seen = new Map<string, { key: string; label: string }>();
      for (const key of layoutFields) {
        const rootKey = key.includes(':') ? key.split(':')[0] : key;
        if (seen.has(rootKey)) continue;
        const root = rootKey.split('.')[0];
        const fieldData = fieldsStore.getField(props.collection, root);
        const fallbackName = fieldData?.name ?? formatTitle(rootKey);
        seen.set(rootKey, { key: rootKey, label: customFieldNames[key] ?? fallbackName });
      }
      return Array.from(seen.values());
    });

    return {
      ...props,
      emit,
      availableFieldChoices,
      refresh: () => requestCollectionRefresh(props.collection),
    };
  },
} as any;

export default defineLayout(layoutConfig);
