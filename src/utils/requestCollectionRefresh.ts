/**
 * Directus core calls the layout state's `refresh()` after a bulk delete,
 * archive, batch edit or manual flow run. Super Table fetches its own data in
 * the component, so route that call to the component's `refresh-collection`
 * listener (which ignores events for other collections).
 */
export function requestCollectionRefresh(collection: string): void {
  window.dispatchEvent(new CustomEvent('refresh-collection', { detail: { collection } }));
}
