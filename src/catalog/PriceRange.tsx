import type { CSSProperties } from 'react';
import type { PriceBounds } from './filters';

interface Props {
  bounds: PriceBounds;
  histogram: number[];
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
}

const money = (n: number) => `$${n}`;

/** Price histogram with a two-handle slider. Two native range inputs keep it keyboard- and screen-reader-friendly. */
export function PriceRange({ bounds, histogram, min, max, onChange }: Props) {
  const span = bounds.max - bounds.min || 1;
  const lo = ((min - bounds.min) / span) * 100;
  const hi = ((max - bounds.min) / span) * 100;
  const tallest = Math.max(1, ...histogram);

  return (
    <div className="pr" style={{ '--lo': lo, '--hi': hi } as CSSProperties}>
      <div className="pr__bars" aria-hidden="true">
        {histogram.map((count, i) => {
          const center = ((i + 0.5) / histogram.length) * 100;
          const inside = center >= lo && center <= hi;
          return (
            <span
              key={i}
              className={inside ? 'pr__bar is-in' : 'pr__bar'}
              style={{ height: `${count === 0 ? 8 : 18 + (count / tallest) * 82}%` }}
            />
          );
        })}
      </div>

      <div className="pr__slider">
        <div className="pr__track">
          <div className="pr__range" />
        </div>
        <input
          className="pr__input pr__input--min"
          type="range"
          min={bounds.min}
          max={bounds.max}
          step={1}
          value={min}
          aria-label="Minimum price"
          aria-valuetext={money(min)}
          style={{ zIndex: lo > 50 ? 5 : 3 }}
          onChange={(e) => onChange(Math.min(Number(e.target.value), max), max)}
        />
        <input
          className="pr__input pr__input--max"
          type="range"
          min={bounds.min}
          max={bounds.max}
          step={1}
          value={max}
          aria-label="Maximum price"
          aria-valuetext={money(max)}
          style={{ zIndex: 4 }}
          onChange={(e) => onChange(min, Math.max(Number(e.target.value), min))}
        />
      </div>

      <div className="pr__labels" aria-hidden="true">
        <span className="pr__end pr__end--min" hidden={lo < 14}>{money(bounds.min)}</span>
        <output className="pr__pill pr__pill--min">{money(min)}</output>
        <output className="pr__pill pr__pill--max">{money(max)}</output>
        <span className="pr__end pr__end--max" hidden={hi > 86}>{money(bounds.max)}</span>
      </div>
    </div>
  );
}
