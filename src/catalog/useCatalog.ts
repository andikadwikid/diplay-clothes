import { useCallback, useEffect, useMemo, useState } from 'react';
import { catalog } from './data';
import type { CatalogProduct } from './data';
import {
  applyFilters,
  defaultFilters,
  facetCounts,
  isFiltered,
  parseFilters,
  priceBounds,
  priceHistogram,
  serializeFilters,
} from './filters';
import type { Facet, Filters } from './filters';

const BOUNDS = priceBounds(catalog);
const HISTOGRAM_BINS = 36;

export interface CatalogState {
  products: readonly CatalogProduct[];
  filters: Filters;
  results: CatalogProduct[];
  bounds: typeof BOUNDS;
  histogram: number[];
  filtered: boolean;
  counts: (facet: Facet) => Map<string, number>;
  update: (patch: Partial<Filters>) => void;
  reset: () => void;
}

/**
 * Filter state for the catalogue page. The state lives in the query string
 * (shareable, survives a reload) and is written with replaceState so filtering
 * never fills the back button with entries.
 */
export function useCatalog(products: readonly CatalogProduct[] = catalog): CatalogState {
  const [filters, setFilters] = useState<Filters>(() => parseFilters(window.location.search, products, BOUNDS));

  useEffect(() => {
    const next = `${window.location.pathname}${serializeFilters(filters, BOUNDS)}${window.location.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current) window.history.replaceState(null, '', next);
  }, [filters]);

  const update = useCallback((patch: Partial<Filters>) => {
    setFilters((f) => {
      const next = { ...f, ...patch };
      // Keep the two price handles from crossing.
      if (next.min > next.max) next.min = next.max;
      return next;
    });
  }, []);
  const reset = useCallback(() => setFilters(defaultFilters(BOUNDS)), []);

  const results = useMemo(() => applyFilters(products, filters), [products, filters]);
  const histogram = useMemo(() => priceHistogram(products, BOUNDS, HISTOGRAM_BINS), [products]);
  const counts = useCallback((facet: Facet) => facetCounts(products, filters, facet), [products, filters]);

  return {
    products,
    filters,
    results,
    bounds: BOUNDS,
    histogram,
    filtered: isFiltered(filters, BOUNDS),
    counts,
    update,
    reset,
  };
}
