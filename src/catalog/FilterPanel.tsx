import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { CATEGORIES, COLORS, GENDERS } from './data';
import type { CatalogProduct, CategoryId } from './data';
import type { Facet, Filters, PriceBounds } from './filters';
import {
  AllIcon, BagsIcon, ChevronDown, ChevronUp, CloseIcon, FoodIcon, PlugIcon, ShirtIcon, SofaIcon, WatchIcon,
} from './Icons';
import { PriceRange } from './PriceRange';

const CATEGORY_ICONS: Record<CategoryId, (p: { className?: string }) => ReactNode> = {
  fashion: ShirtIcon,
  watches: WatchIcon,
  bags: BagsIcon,
  electronic: PlugIcon,
  food: FoodIcon,
  home: SofaIcon,
};

interface SectionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function Section({ title, open, onToggle, children }: SectionProps) {
  const id = useId();
  return (
    <section className="cat-section">
      <h2>
        <button type="button" className="cat-section__head" aria-expanded={open} aria-controls={id} onClick={onToggle}>
          <span>{title}</span>
          {open ? <ChevronUp /> : <ChevronDown />}
        </button>
      </h2>
      <div id={id} className="cat-section__body" hidden={!open}>
        {children}
      </div>
    </section>
  );
}

interface CheckProps {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  icon?: ReactNode;
  count?: number;
  children: ReactNode;
}

function Check({ checked, disabled, onChange, icon, count, children }: CheckProps) {
  return (
    <label className="cat-check" data-checked={checked} data-disabled={disabled || undefined}>
      {icon}
      <span className="cat-check__text">
        {children}
        {count !== undefined && (
          <small>
            <span className="cat-sr">, </span>
            {count}
          </small>
        )}
      </span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

interface Props {
  products: readonly CatalogProduct[];
  filters: Filters;
  bounds: PriceBounds;
  histogram: number[];
  counts: (facet: Facet) => Map<string, number>;
  update: (patch: Partial<Filters>) => void;
  /** Mobile: the panel is an off-canvas drawer. */
  drawer: boolean;
  open: boolean;
  resultCount: number;
  onClose: () => void;
  onReset: () => void;
  filtered: boolean;
}

const toggle = <T,>(list: readonly T[], value: T, on: boolean): T[] =>
  on ? (list.includes(value) ? [...list] : [...list, value]) : list.filter((v) => v !== value);

export function FilterPanel({
  products, filters, bounds, histogram, counts, update, drawer, open, resultCount, onClose, onReset, filtered,
}: Props) {
  const [sections, setSections] = useState({ category: true, gender: false, colors: false, brands: false, price: true });
  const flip = (key: keyof typeof sections) => setSections((s) => ({ ...s, [key]: !s[key] }));

  const genderCounts = counts('gender');
  const colorCounts = counts('color');
  const brandCounts = counts('brand');
  const brands = [...new Set(products.map((p) => p.brand))].sort((a, b) => a.localeCompare(b));

  return (
    <aside
      id="cat-filters"
      className="cat-filters"
      aria-label="Filters"
      data-drawer={drawer}
      data-open={open}
      // A closed drawer (or a hidden panel) must not be reachable by keyboard.
      inert={!open}
    >
      {drawer && (
        <div className="cat-filters__bar">
          <span>Filters</span>
          <button type="button" className="cat-filters__close" aria-label="Close filters" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
      )}

      <Section title="Category" open={sections.category} onToggle={() => flip('category')}>
        <Check
          checked={filters.categories.length === 0}
          icon={<AllIcon className="cat-check__icon" />}
          onChange={() => update({ categories: [] })}
        >
          All products
        </Check>
        {CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICONS[c.id];
          return (
            <Check
              key={c.id}
              checked={filters.categories.includes(c.id)}
              icon={<Icon className="cat-check__icon" />}
              onChange={(on) => update({ categories: toggle(filters.categories, c.id, on) })}
            >
              {c.label}
            </Check>
          );
        })}
      </Section>

      <Section title="Gender" open={sections.gender} onToggle={() => flip('gender')}>
        {GENDERS.map((g) => {
          const n = genderCounts.get(g.id) ?? 0;
          const on = filters.genders.includes(g.id);
          return (
            <Check key={g.id} checked={on} disabled={n === 0 && !on} count={n} onChange={(v) => update({ genders: toggle(filters.genders, g.id, v) })}>
              {g.label}
            </Check>
          );
        })}
      </Section>

      <Section title="Color" open={sections.colors} onToggle={() => flip('colors')}>
        <div className="cat-swatches">
          {COLORS.map((c) => {
            const n = colorCounts.get(c.id) ?? 0;
            const on = filters.colors.includes(c.id);
            return (
              <label key={c.id} className="cat-swatch" data-checked={on} data-disabled={(n === 0 && !on) || undefined} title={`${c.label} (${n})`}>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={n === 0 && !on}
                  aria-label={`${c.label}, ${n} products`}
                  onChange={(e) => update({ colors: toggle(filters.colors, c.id, e.target.checked) })}
                />
                <span className="cat-swatch__dot" style={{ background: c.swatch }} />
                <span className="cat-swatch__name">{c.label}</span>
              </label>
            );
          })}
        </div>
      </Section>

      <Section title="Brand" open={sections.brands} onToggle={() => flip('brands')}>
        {brands.map((b) => {
          const n = brandCounts.get(b) ?? 0;
          const on = filters.brands.includes(b);
          return (
            <Check key={b} checked={on} disabled={n === 0 && !on} count={n} onChange={(v) => update({ brands: toggle(filters.brands, b, v) })}>
              {b}
            </Check>
          );
        })}
      </Section>

      <Section title="Price" open={sections.price} onToggle={() => flip('price')}>
        <PriceRange
          bounds={bounds}
          histogram={histogram}
          min={filters.min}
          max={filters.max}
          onChange={(min, max) => update({ min, max })}
        />
      </Section>

      <div className="cat-filters__foot">
        <button type="button" className="cat-link" onClick={onReset} disabled={!filtered}>
          Clear all filters
        </button>
        {drawer && (
          <button type="button" className="cat-btn cat-btn--solid" onClick={onClose}>
            Show {resultCount} {resultCount === 1 ? 'product' : 'products'}
          </button>
        )}
      </div>
    </aside>
  );
}
