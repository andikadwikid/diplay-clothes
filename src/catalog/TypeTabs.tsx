import { TYPES } from './data';
import type { TypeId } from './data';

interface Props {
  counts: Map<string, number>;
  active: TypeId | null;
  onPick: (id: TypeId | null) => void;
}

/** Product-type filter shown as a row of text tabs with counts. Click the active one to clear it. */
export function TypeTabs({ counts, active, onPick }: Props) {
  // Only types that exist for the current search/filters, plus the active one.
  const visible = TYPES.filter((t) => (counts.get(t.id) ?? 0) > 0 || t.id === active);

  return (
    <div className="cat-tabs" role="group" aria-label="Product type">
      {visible.map((t) => {
        const on = active === t.id;
        return (
          <button key={t.id} type="button" className="cat-tab" aria-pressed={on} onClick={() => onPick(on ? null : t.id)}>
            {t.label}
            <sup aria-label={`${counts.get(t.id) ?? 0} products`}>{counts.get(t.id) ?? 0}</sup>
          </button>
        );
      })}
    </div>
  );
}
