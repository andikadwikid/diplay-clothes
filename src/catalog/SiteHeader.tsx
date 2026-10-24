import { useEffect, useRef } from 'react';
import { DEPARTMENTS } from './data';
import type { DepartmentId } from './data';
import { BagIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from './Icons';

interface Props {
  menuOpen: boolean;
  onMenuToggle: (open: boolean) => void;
  onSearch: () => void;
  onPickDepartment: (id: DepartmentId) => void;
}

/** Top bar: menu, wordmark, and the search / account / bag actions. */
export function SiteHeader({ menuOpen, onMenuToggle, onSearch, onPickDepartment }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (menuOpen && !el.open) el.showModal();
    if (!menuOpen && el.open) el.close();
  }, [menuOpen]);

  return (
    <>
      <header className="cat-header">
        <button
          type="button"
          className="cat-header__cell cat-header__menu"
          aria-label="Open menu"
          aria-haspopup="dialog"
          onClick={() => onMenuToggle(true)}
        >
          <MenuIcon />
        </button>

        <a className="cat-header__logo" href="/" aria-label="Diplay home">
          Diplay
        </a>

        <div className="cat-header__actions">
          <button type="button" className="cat-header__cell" aria-label="Search products" onClick={onSearch}>
            <SearchIcon />
          </button>
          {/* There is no customer account or cart yet; kept as part of the design. */}
          <button type="button" className="cat-header__cell" aria-label="Account (coming soon)" aria-disabled="true" title="Coming soon">
            <UserIcon />
          </button>
          <button type="button" className="cat-header__cell" aria-label="Bag (coming soon)" aria-disabled="true" title="Coming soon">
            <BagIcon />
          </button>
        </div>
      </header>

      <dialog
        ref={dialog}
        className="cat-menu"
        aria-label="Menu"
        onCancel={(e) => {
          e.preventDefault();
          onMenuToggle(false);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onMenuToggle(false); // click on the backdrop
        }}
      >
        <div className="cat-menu__panel">
          <div className="cat-menu__head">
            <span>Menu</span>
            <button type="button" className="cat-menu__close" aria-label="Close menu" onClick={() => onMenuToggle(false)}>
              <CloseIcon />
            </button>
          </div>
          <nav aria-label="Site">
            <ul className="cat-menu__list">
              <li><a href="/">Home</a></li>
              <li><a href="/catalog" aria-current="page">Catalog</a></li>
            </ul>
            <p className="cat-menu__title">Departments</p>
            <ul className="cat-menu__list">
              {DEPARTMENTS.map((d) => (
                <li key={d.id}>
                  <button type="button" onClick={() => onPickDepartment(d.id)}>{d.label}</button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </dialog>
    </>
  );
}
