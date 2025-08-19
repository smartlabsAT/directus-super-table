import { ref, computed, Ref, watch } from 'vue';
import { useStores } from '@directus/extensions-sdk';
import { Filter } from '@directus/types';
import type { QuickFilter, LayoutOptions } from '../types/table.types';
import { useTableApi } from './api';

export interface FilterPreset extends QuickFilter {
  collection: string;
  isSystem?: boolean;
  isRole?: boolean;
  isPersonal?: boolean;
  isShared?: boolean;
  resultCount?: number;
  userId?: string;
}

export interface FilterChip {
  id: string;
  label: string;
  field?: string;
  operator?: string;
  value?: any;
  source: 'quick' | 'manual';
  filter?: Filter;
  presetId?: string;
}

export function useFilterPresets(
  collection: Ref<string>,
  layoutOptions: Ref<LayoutOptions | undefined>,
  emit: (event: string, ...args: any[]) => void
) {
  const tableApi = useTableApi();
  const { useUserStore } = useStores();
  const userStore = useUserStore();
  
  // State - now derived from layoutOptions
  const quickFilters = ref<Filter>({});
  const manualFilters = ref<Filter>({});
  const filterLogic = ref<'and' | 'or'>('and');
  
  // Get quick filters from layoutOptions
  const allPresets = computed(() => {
    const filters = layoutOptions.value?.quickFilters || [];
    return filters.map(f => ({
      ...f,
      collection: collection.value,
      isPersonal: true
    } as FilterPreset));
  });
  
  // Get active filter ID from layoutOptions
  const activePresetIds = computed({
    get: () => {
      const activeId = layoutOptions.value?.activeQuickFilterId;
      return activeId ? [activeId] : [];
    },
    set: (ids: string[]) => {
      updateLayoutOptions({
        activeQuickFilterId: ids.length > 0 ? ids[0] : undefined
      });
    }
  });
  
  const quickFilterChips = computed((): FilterChip[] => {
    return activePresetIds.value.map(presetId => {
      const preset = allPresets.value.find(p => p.id === presetId);
      if (!preset) return null;
      
      return {
        id: presetId,
        label: preset.name,
        source: 'quick',
        filter: preset.filter,
        presetId: preset.id
      };
    }).filter(Boolean) as FilterChip[];
  });
  
  const manualFilterChips = computed((): FilterChip[] => {
    const chips: FilterChip[] = [];
    
    for (const [field, conditions] of Object.entries(manualFilters.value)) {
      if (typeof conditions === 'object' && conditions !== null) {
        for (const [operator, value] of Object.entries(conditions)) {
          chips.push({
            id: `${field}-${operator}`,
            label: formatFilterLabel(field, operator, value),
            field,
            operator,
            value,
            source: 'manual'
          });
        }
      }
    }
    
    return chips;
  });
  
  const mergedFilters = computed(() => {
    const filters: Filter[] = [];
    
    // Add quick filters
    if (Object.keys(quickFilters.value).length > 0) {
      filters.push(quickFilters.value);
    }
    
    // Add manual filters
    if (Object.keys(manualFilters.value).length > 0) {
      filters.push(manualFilters.value);
    }
    
    if (filters.length === 0) return null;
    if (filters.length === 1) return filters[0];
    
    // Merge using the selected logic
    if (filterLogic.value === 'or') {
      return { _or: filters };
    } else {
      return { _and: filters };
    }
  });
  
  // Helper function to update layoutOptions
  function updateLayoutOptions(updates: Partial<LayoutOptions>) {
    emit('update:layoutOptions', {
      ...layoutOptions.value,
      ...updates
    });
  }
  
  // Watch for active filter changes and rebuild quick filters
  watch(activePresetIds, () => {
    rebuildQuickFilters();
  });
  
  function rebuildQuickFilters() {
    if (activePresetIds.value.length === 0) {
      quickFilters.value = {};
      return;
    }
    
    const activePresets = allPresets.value.filter(p => 
      activePresetIds.value.includes(p.id)
    );
    
    if (activePresets.length === 0) {
      quickFilters.value = {};
    } else if (activePresets.length === 1) {
      quickFilters.value = activePresets[0].filter;
    } else {
      // Multiple presets active - merge with AND
      quickFilters.value = {
        _and: activePresets.map(p => p.filter)
      };
    }
  }
  
  async function loadPresets() {
    // Quick filters are now loaded from layoutOptions automatically
    // Rebuild filters based on active selection
    rebuildQuickFilters();
  }
  
  async function savePreset(preset: Omit<FilterPreset, 'id'>) {
    const newPreset: QuickFilter = {
      ...preset,
      id: `filter-${Date.now()}`,
    };
    
    const currentFilters = layoutOptions.value?.quickFilters || [];
    const updatedFilters = [...currentFilters, newPreset];
    
    updateLayoutOptions({
      quickFilters: updatedFilters
    });
    
    // If pinned, automatically activate it
    if (preset.isPinned) {
      activePresetIds.value = [newPreset.id];
    }
    
    // Also try to save to Directus presets API for backward compatibility
    try {
      await tableApi.savePreset({
        bookmark: preset.name,
        collection: collection.value,
        layout: 'super-layout-table',
        layout_query: {
          filter: preset.filter
        },
        user: userStore.currentUser?.id
      });
    } catch (error) {
      console.warn('Failed to save preset to API (will be saved with layout):', error);
    }
  }
  
  async function deletePreset(preset: FilterPreset) {
    const currentFilters = layoutOptions.value?.quickFilters || [];
    const updatedFilters = currentFilters.filter(f => f.id !== preset.id);
    
    updateLayoutOptions({
      quickFilters: updatedFilters,
      // Clear active filter if it was deleted
      activeQuickFilterId: activePresetIds.value[0] === preset.id 
        ? undefined 
        : layoutOptions.value?.activeQuickFilterId
    });
    
    // Clear quick filters if this was the active one
    if (activePresetIds.value.includes(preset.id)) {
      activePresetIds.value = [];
      quickFilters.value = {};
    }
  }
  
  function togglePreset(preset: FilterPreset) {
    const index = activePresetIds.value.indexOf(preset.id);
    
    if (index >= 0) {
      // Deactivate
      activePresetIds.value = [];
      quickFilters.value = {};
    } else {
      // Activate (deactivate all others first - single selection)
      activePresetIds.value = [preset.id];
      rebuildQuickFilters();
    }
  }
  
  function removeQuickFilter(chipId: string) {
    activePresetIds.value = activePresetIds.value.filter(id => id !== chipId);
    rebuildQuickFilters();
  }
  
  function removeManualFilter(chipId: string) {
    const [field, operator] = chipId.split('-');
    
    if (manualFilters.value[field]) {
      if (operator && manualFilters.value[field][operator] !== undefined) {
        delete manualFilters.value[field][operator];
        
        // If no more operators for this field, remove the field
        if (Object.keys(manualFilters.value[field]).length === 0) {
          delete manualFilters.value[field];
        }
      }
    }
  }
  
  function clearAllFilters() {
    activePresetIds.value = [];
    quickFilters.value = {};
    manualFilters.value = {};
  }
  
  function movePreset(preset: FilterPreset, direction: number) {
    const currentFilters = layoutOptions.value?.quickFilters || [];
    const index = currentFilters.findIndex(f => f.id === preset.id);
    
    if (index === -1) return;
    
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= currentFilters.length) return;
    
    // Create a copy of the filters array
    const updatedFilters = [...currentFilters];
    
    // Swap the filters
    [updatedFilters[index], updatedFilters[newIndex]] = [updatedFilters[newIndex], updatedFilters[index]];
    
    // Update the order property for both filters
    updatedFilters[index].order = index;
    updatedFilters[newIndex].order = newIndex;
    
    updateLayoutOptions({
      quickFilters: updatedFilters
    });
  }
  
  function updatePreset(preset: FilterPreset, updates: Partial<FilterPreset>) {
    const currentFilters = layoutOptions.value?.quickFilters || [];
    const index = currentFilters.findIndex(f => f.id === preset.id);
    
    if (index === -1) return;
    
    // Create a copy of the filters array with the updated preset
    const updatedFilters = [...currentFilters];
    updatedFilters[index] = {
      ...updatedFilters[index],
      ...updates
    };
    
    updateLayoutOptions({
      quickFilters: updatedFilters
    });
  }
  
  function updateManualFilters(filters: Filter | null | undefined) {
    if (!filters || Object.keys(filters).length === 0) {
      manualFilters.value = {};
    } else {
      manualFilters.value = filters;
    }
  }
  
  function formatFilterLabel(field: string, operator: string, value: any): string {
    const operatorLabels: Record<string, string> = {
      '_eq': 'equals',
      '_neq': 'not equals',
      '_contains': 'contains',
      '_ncontains': 'does not contain',
      '_starts_with': 'starts with',
      '_ends_with': 'ends with',
      '_gt': 'greater than',
      '_gte': 'greater than or equal',
      '_lt': 'less than',
      '_lte': 'less than or equal',
      '_in': 'is one of',
      '_nin': 'is not one of',
      '_between': 'is between',
      '_nbetween': 'is not between',
      '_empty': 'is empty',
      '_nempty': 'is not empty',
      '_null': 'is null',
      '_nnull': 'is not null'
    };
    
    const op = operatorLabels[operator] || operator;
    
    // Format value
    let formattedValue = value;
    if (value === '$NOW') {
      formattedValue = 'now';
    } else if (typeof value === 'string' && value.startsWith('$NOW')) {
      formattedValue = value.replace('$NOW', 'now');
    } else if (value === '$CURRENT_USER') {
      formattedValue = 'current user';
    } else if (typeof value === 'boolean') {
      formattedValue = value ? 'yes' : 'no';
    }
    
    // Format field name
    const formattedField = field
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    if (operator === '_empty' || operator === '_nempty' || operator === '_null' || operator === '_nnull') {
      return `${formattedField} ${op}`;
    }
    
    return `${formattedField} ${op} ${formattedValue}`;
  }
  
  return {
    // State
    allPresets,
    activePresetIds,
    quickFilters,
    manualFilters,
    mergedFilters,
    filterLogic,
    quickFilterChips,
    manualFilterChips,
    
    // Methods
    loadPresets,
    savePreset,
    deletePreset,
    togglePreset,
    movePreset,
    updatePreset,
    removeQuickFilter,
    removeManualFilter,
    clearAllFilters,
    updateManualFilters
  };
}