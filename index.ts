import { defineLayout } from '@directus/extensions-sdk';
import LayoutComponent from './super-layout-table.vue';
import ActionsComponent from './src/actions.vue';

export default defineLayout({
  id: 'super-layout-table',
  name: 'Super Table',
  icon: 'table_rows',
  component: LayoutComponent,
  slots: {
    options: () => null,
    sidebar: () => null,
    actions: ActionsComponent,
  },
  headerShadow: false,
  setup(props, { emit }) {
    // The component handles everything internally
    // Just pass through all props
    return {
      ...props,
      emit,
    };
  },
});