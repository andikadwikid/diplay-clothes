import { CATEGORIES, COLORS, DEPARTMENTS, GENDERS, TYPES } from './data';
import type { CatalogProduct, CategoryId, ColorId, DepartmentId, Gender, TypeId } from './data';

export type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'reviews' | 'discount';

export const SORTS: readonly { id: SortKey; label: string }[] = [
  { id: 'featured', label: 'Featured' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
  { id: 'rating', label: 'Top Rated' },
  { id: 'reviews', label: 'Most Reviewed' },
  { id: 'discount', label: 'Biggest Discount' },
];

export interface Filters {
  q: string;
  department: DepartmentId | null;
  categories: CategoryId[];
  type: TypeId | null;
  genders: Gender[];
  colors: ColorId[];
  brands: string[];
  min: number;
  max: number;
  sort: SortKey;
}

/** Facets that can be left out when counting (so a facet shows what *would* match if toggled). */
export type Facet = 'department' | 'category' | 'type' | 'gender' | 'color' | 'brand';

export interface PriceBounds {
  min: number;
  max: number;
}

/** Nice round bounds that cover every product. */
export function priceBounds(products: readonly CatalogProduct[]): PriceBounds {
  const prices = products.map((p) => p.price);
  return {
    min: Math.floor(Math.min(...prices) / 10) * 10,
    max: Math.ceil(Math.max(...prices) / 10) * 10,
  };
}

export const defaultFilters = (bounds: PriceBounds): Filters => ({
  q: '',
  department: null,
  categories: [],
  type: null,
  genders: [],
  colors: [],
  brands: [],
  min: bounds.min,
  max: bounds.max,
  sort: 'featured',
});

export function isFiltered(f: Filters, bounds: PriceBounds): boolean {
  return (
    f.q.trim() !== '' || f.department !== null || f.categories.length > 0 || f.type !== null ||
    f.genders.length > 0 || f.colors.length > 0 || f.brands.length > 0 ||
    f.min > bounds.min || f.max < bounds.max
  );
}

const norm = (s: string) => s.toLocaleLowerCase('en').normalize('NFD').replace(/[̀-ͯ]/g, '');

const typeLabel = (id: TypeId) => TYPES.find((t) => t.id === id)?.label ?? id;

/** Does `p` pass every active filter, except the ones listed in `skip`? */
export function matches(p: CatalogProduct, f: Filters, skip: readonly Facet[] = []): boolean {
  const q = norm(f.q.trim());
  if (q) {
    const haystack = norm(`${p.name} ${p.brand} ${typeLabel(p.type)} ${p.color}`);
    if (!q.split(/\s+/).every((word) => haystack.includes(word))) return false;
  }
  if (p.price < f.min || p.price > f.max) return false;
  if (!skip.includes('department') && f.department && p.department !== f.department) return false;
  if (!skip.includes('category') && f.categories.length && !f.categories.includes(p.category)) return false;
  if (!skip.includes('type') && f.type && p.type !== f.type) return false;
  if (!skip.includes('gender') && f.genders.length && !f.genders.includes(p.gender)) return false;
  if (!skip.includes('color') && f.colors.length && !f.colors.includes(p.color)) return false;
  if (!skip.includes('brand') && f.brands.length && !f.brands.includes(p.brand)) return false;
  return true;
}

export function sortProducts(products: readonly CatalogProduct[], sort: SortKey): CatalogProduct[] {
  const list = [...products]; // Array.prototype.sort is stable, so ties keep the catalogue order
  switch (sort) {
    case 'price-asc': return list.sort((a, b) => a.price - b.price);
    case 'price-desc': return list.sort((a, b) => b.price - a.price);
    case 'rating': return list.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    case 'reviews': return list.sort((a, b) => b.reviews - a.reviews);
    case 'discount': return list.sort((a, b) => (b.sale ?? 0) - (a.sale ?? 0));
    default: return list;
  }
}

export function applyFilters(products: readonly CatalogProduct[], f: Filters): CatalogProduct[] {
  return sortProducts(products.filter((p) => matches(p, f)), f.sort);
}

/** How many products would match for each value of `facet`, given all the *other* filters. */
export function facetCounts(products: readonly CatalogProduct[], f: Filters, facet: Facet): Map<string, number> {
  const counts = new Map<string, number>();
  const key = (p: CatalogProduct): string =>
    facet === 'department' ? p.department
    : facet === 'category' ? p.category
    : facet === 'type' ? p.type
    : facet === 'gender' ? p.gender
    : facet === 'color' ? p.color
    : p.brand;
  for (const p of products) {
    if (!matches(p, f, [facet])) continue;
    counts.set(key(p), (counts.get(key(p)) ?? 0) + 1);
  }
  return counts;
}

/** Price distribution of the whole catalogue, for the histogram behind the slider. */
export function priceHistogram(products: readonly CatalogProduct[], bounds: PriceBounds, bins: number): number[] {
  const out = new Array<number>(bins).fill(0);
  const span = bounds.max - bounds.min || 1;
  for (const p of products) {
    const i = Math.min(bins - 1, Math.floor(((p.price - bounds.min) / span) * bins));
    out[i] += 1;
  }
  return out;
}

/* ------------------------------------------------------------------ URL state */

const csv = (v: string | null) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
const pick = <T extends string>(values: string[], allowed: readonly T[]): T[] =>
  values.filter((v): v is T => (allowed as readonly string[]).includes(v));

/** Reads filters from a query string. Unknown or out-of-range values are ignored. */
export function parseFilters(search: string, products: readonly CatalogProduct[], bounds: PriceBounds): Filters {
  const sp = new URLSearchParams(search);
  const base = defaultFilters(bounds);
  const brands = [...new Set(products.map((p) => p.brand))];
  const num = (name: string, fallback: number) => {
    const raw = sp.get(name);
    const n = raw === null || raw.trim() === '' ? NaN : Number(raw);
    return Number.isFinite(n) ? Math.min(bounds.max, Math.max(bounds.min, Math.round(n))) : fallback;
  };

  let min = num('min', bounds.min);
  let max = num('max', bounds.max);
  if (min > max) [min, max] = [max, min];

  const dept = sp.get('dept');
  const type = sp.get('type');
  const sort = sp.get('sort');
  return {
    ...base,
    q: (sp.get('q') ?? '').slice(0, 80),
    department: DEPARTMENTS.some((d) => d.id === dept) ? (dept as DepartmentId) : null,
    categories: pick(csv(sp.get('cat')), CATEGORIES.map((c) => c.id)),
    type: TYPES.some((t) => t.id === type) ? (type as TypeId) : null,
    genders: pick(csv(sp.get('gender')), GENDERS.map((g) => g.id)),
    colors: pick(csv(sp.get('color')), COLORS.map((c) => c.id)),
    brands: csv(sp.get('brand')).filter((b) => brands.includes(b)),
    min,
    max,
    sort: SORTS.some((s) => s.id === sort) ? (sort as SortKey) : 'featured',
  };
}

/** Inverse of parseFilters: only non-default values are written, so a clean page has a clean URL. */
export function serializeFilters(f: Filters, bounds: PriceBounds): string {
  const sp = new URLSearchParams();
  if (f.q.trim()) sp.set('q', f.q.trim());
  if (f.department) sp.set('dept', f.department);
  if (f.categories.length) sp.set('cat', f.categories.join(','));
  if (f.type) sp.set('type', f.type);
  if (f.genders.length) sp.set('gender', f.genders.join(','));
  if (f.colors.length) sp.set('color', f.colors.join(','));
  if (f.brands.length) sp.set('brand', f.brands.join(','));
  if (f.min > bounds.min) sp.set('min', String(f.min));
  if (f.max < bounds.max) sp.set('max', String(f.max));
  if (f.sort !== 'featured') sp.set('sort', f.sort);
  const s = sp.toString();
  return s ? `?${s}` : '';
}
