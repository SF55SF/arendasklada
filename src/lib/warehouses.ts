import { getCollection, type CollectionEntry } from 'astro:content';

export type WarehouseEntry = CollectionEntry<'warehouses'>;

export async function getPublishedWarehouses() {
  const warehouses = await getCollection('warehouses', ({ data }) => data.published !== false);

  return warehouses.sort((a, b) => a.data.order - b.data.order);
}

export function getWarehouseUrl(warehouse: WarehouseEntry) {
  return `/${warehouse.data.pageSlug}/`;
}
