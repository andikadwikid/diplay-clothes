import type { Ref } from 'react';
import { ChevronDown, SlidersIcon } from './Icons';
import { SORTS } from './filters';
import type { SortKey } from './filters';

interface Props {
  isMobile: boolean;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  sort: SortKey;
  onSort: (sort: SortKey) => void;
  count: number;
  /** The Filter button, so the page can hand focus back to it when the drawer closes. */
  filterButtonRef: Ref<HTMLButtonElement>;
}

export function Hero({ isMobile, filtersOpen, onToggleFilters, sort, onSort, count, filterButtonRef }: Props) {
  const current = SORTS.find((s) => s.id === sort);
  const filterLabel = isMobile ? 'Filters' : filtersOpen ? 'Hide filters' : 'Show filters';

  return (
    <section className="cat-hero" aria-labelledby="cat-title">
      <h1 id="cat-title" className="cat-hero__title">
        Everyday pieces,
        <br />
        made to be kept.
      </h1>
      <p className="cat-hero__lede">
        Wardrobe staples and a few home essentials in honest materials and easy shapes. Browse the whole shelf, or
        narrow it down with the filters.
      </p>

      <div className="cat-hero__actions">
        <p className="cat-count" role="status" aria-live="polite">
          {count} {count === 1 ? 'product' : 'products'}
        </p>

        <button
          ref={filterButtonRef}
          type="button"
          className="cat-btn cat-btn--outline"
          aria-expanded={isMobile ? undefined : filtersOpen}
          aria-controls="cat-filters"
          onClick={onToggleFilters}
        >
          {filterLabel}
          <SlidersIcon />
        </button>

        {/* A real <select> sits invisibly over the button: native keyboard, screen-reader and mobile-picker behaviour. */}
        <label className="cat-btn cat-btn--solid cat-sort">
          <span>{sort === 'featured' ? 'Sort by' : current?.label}</span>
          <ChevronDown />
          <select aria-label="Sort products" value={sort} onChange={(e) => onSort(e.target.value as SortKey)}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
