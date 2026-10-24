import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DepartmentStrip } from './DepartmentStrip';
import { FilterPanel } from './FilterPanel';
import { Hero } from './Hero';
import { SearchIcon } from './Icons';
import { ProductCard } from './ProductCard';
import { PromoBanner } from './PromoBanner';
import { SiteHeader } from './SiteHeader';
import { TypeTabs } from './TypeTabs';
import { useCatalog } from './useCatalog';
import { useMediaQuery } from './useMediaQuery';
import './catalog.css';

/** Below this width the filters become an off-canvas drawer. */
const DRAWER_QUERY = '(max-width: 899px)';

export default function CatalogPage() {
  const { products, filters, results, bounds, histogram, filtered, counts, update, reset } = useCatalog();

  const isMobile = useMediaQuery(DRAWER_QUERY);
  const [filtersOpen, setFiltersOpen] = useState(() => !window.matchMedia(DRAWER_QUERY).matches);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const filterButton = useRef<HTMLButtonElement>(null);
  const firstGrid = useRef<HTMLUListElement>(null);
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    document.title = 'Catalog — Diplay Clothes';
  }, []);

  // Desktop: filters start open. Phones: they start closed, as a drawer.
  useEffect(() => setFiltersOpen(!isMobile), [isMobile]);
  const drawerOpen = isMobile && filtersOpen;

  const openFilters = () => setFiltersOpen(true);
  const closeFilters = useCallback(() => setFiltersOpen(false), []);

  // When the drawer closes, hand focus back to the Filter button. This runs after the render
  // that lifts `inert` from the page behind the drawer, because an inert element cannot take focus.
  // (It is always that button, not "whatever was focused before": Safari does not focus buttons on tap.)
  const wasDrawerOpen = useRef(false);
  useEffect(() => {
    if (wasDrawerOpen.current && !drawerOpen) filterButton.current?.focus();
    wasDrawerOpen.current = drawerOpen;
  }, [drawerOpen]);

  // Drawer: Escape closes it, the page behind does not scroll, and focus moves inside.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeFilters();
    document.addEventListener('keydown', onKey);
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = 'hidden';
    requestAnimationFrame(() => document.querySelector<HTMLElement>('.cat-filters__close')?.focus());
    return () => {
      document.removeEventListener('keydown', onKey);
      html.style.overflow = previous;
    };
  }, [drawerOpen, closeFilters]);

  // The promo banner sits after two full rows, so we need to know how many columns there are.
  useLayoutEffect(() => {
    const grid = firstGrid.current;
    if (!grid) return;
    const measure = () => {
      const n = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
      if (n > 0) setColumns(n);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [results.length, filtersOpen]);

  const focusSearch = () => {
    searchRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    searchRef.current?.focus({ preventScroll: true });
  };

  const pickDepartment = (id: typeof filters.department) => {
    update({ department: id });
    setMenuOpen(false);
    document.getElementById('cat-results')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  // The banner's claim is computed from the data, so it can never promise more than the badges show.
  const maxSale = Math.max(0, ...products.map((p) => p.sale ?? 0));
  const shopSale = () => {
    update({ sort: 'discount' });
    document.getElementById('cat-results')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const split = columns * 2;
  const head = results.slice(0, split);
  const tail = results.slice(split);

  return (
    <div className="cat" data-filters={filtersOpen ? 'open' : 'closed'}>
      <div inert={drawerOpen}>
        <SiteHeader menuOpen={menuOpen} onMenuToggle={setMenuOpen} onSearch={focusSearch} onPickDepartment={pickDepartment} />
        <DepartmentStrip active={filters.department} onPick={(id) => update({ department: id })} />
        <Hero
          isMobile={isMobile}
          filtersOpen={filtersOpen}
          onToggleFilters={() => (filtersOpen ? closeFilters() : openFilters())}
          sort={filters.sort}
          onSort={(sort) => update({ sort })}
          count={results.length}
          filterButtonRef={filterButton}
        />

        <div className="cat-toolbar">
          <form className="cat-search" role="search" onSubmit={(e) => e.preventDefault()}>
            <input
              ref={searchRef}
              type="search"
              name="q"
              placeholder="Search the catalog"
              aria-label="Search products"
              autoComplete="off"
              value={filters.q}
              onChange={(e) => update({ q: e.target.value })}
            />
            <button type="submit" aria-label="Search">
              <SearchIcon />
            </button>
          </form>
          <TypeTabs counts={counts('type')} active={filters.type} onPick={(type) => update({ type })} />
        </div>
      </div>

      <div className="cat-body">
        <FilterPanel
          products={products}
          filters={filters}
          bounds={bounds}
          histogram={histogram}
          counts={counts}
          update={update}
          drawer={isMobile}
          open={filtersOpen}
          resultCount={results.length}
          onClose={closeFilters}
          onReset={reset}
          filtered={filtered}
        />
        <div className="cat-backdrop" hidden={!drawerOpen} onClick={closeFilters} />

        <main id="cat-results" className="cat-results" inert={drawerOpen}>
          {results.length === 0 ? (
            <div className="cat-empty" role="status">
              <h2>No products found</h2>
              <p>Try removing a filter or searching for something else.</p>
              <button type="button" className="cat-btn cat-btn--solid" onClick={reset}>
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <ul className="cat-grid" ref={firstGrid} aria-label="Products">
                {head.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </ul>
              <PromoBanner maxSale={maxSale} onShop={shopSale} />
              {tail.length > 0 && (
                <ul className="cat-grid" aria-label="More products">
                  {tail.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </ul>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
