import { DEPARTMENTS } from './data';
import type { DepartmentId } from './data';
import { ChevronsRight } from './Icons';

interface Props {
  active: DepartmentId | null;
  onPick: (id: DepartmentId | null) => void;
}

/** The row of department shortcuts under the header. Click again to clear. */
export function DepartmentStrip({ active, onPick }: Props) {
  return (
    <nav className="cat-departments" aria-label="Departments">
      <ul>
        {DEPARTMENTS.map((d) => {
          const on = active === d.id;
          return (
            <li key={d.id}>
              <button type="button" aria-pressed={on} onClick={() => onPick(on ? null : d.id)}>
                <span>{d.label}</span>
                <ChevronsRight />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
