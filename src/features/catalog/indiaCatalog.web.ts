import type { IndiaCatalogState } from './indiaCatalogConfig';

export type { IndiaCatalogState } from './indiaCatalogConfig';

export async function searchIndiaCatalogAsync(_query: string) {
  return [];
}

export function searchIndiaCatalog(_query: string) {
  return [];
}

export function getIndiaCatalogDb() {
  return null;
}

export function getIndiaCatalogState(): IndiaCatalogState {
  return 'idle';
}

export function getIndiaCatalogError(): string | null {
  return null;
}

export function subscribeIndiaCatalogState(_listener: (state: IndiaCatalogState) => void) {
  return () => {};
}

export function prepareIndiaCatalog(): void {}
