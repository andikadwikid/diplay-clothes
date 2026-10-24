import { ArrowUpRight } from './Icons';

interface Props {
  /** Largest discount on the shelf, in percent; the seal is left out when there is none. */
  maxSale: number;
  /** "Shop the sale" shows the biggest discounts first. */
  onShop: () => void;
}

/**
 * Promotional banner. The right-hand picture is built from the catalog's own artwork,
 * so it needs no extra image files.
 */
export function PromoBanner({ maxSale, onShop }: Props) {
  return (
    <aside className="cat-promo" aria-label="Season sale">
      <div className="cat-promo__main">
        <p className="cat-promo__kicker">Season sale</p>
        <h2>
          Last call
          <br />
          for the season.
        </h2>
        <p className="cat-promo__copy">
          Selected jackets, knits and everyday carry, marked down for a few more weeks.
        </p>
        <button type="button" className="cat-promo__cta" onClick={onShop}>
          Shop the sale
          <ArrowUpRight />
        </button>

        {maxSale > 0 && (
          <svg className="cat-promo__seal" viewBox="0 0 200 200" role="img" aria-label={`Save up to ${maxSale}%`}>
            <defs>
              <path id="seal-ring" d="M100 100m-74 0a74 74 0 1 1 148 0a74 74 0 1 1-148 0" />
            </defs>
            <circle cx="100" cy="100" r="96" className="seal-bg" />
            <circle cx="100" cy="100" r="88" className="seal-line" />
            <text className="seal-ring">
              <textPath href="#seal-ring" startOffset="0">
                SEASON SALE · SEASON SALE · SEASON SALE ·
              </textPath>
            </text>
            <text x="100" y="92" textAnchor="middle" className="seal-small">SAVE UP TO</text>
            <text x="100" y="138" textAnchor="middle" className="seal-big">{maxSale}%</text>
          </svg>
        )}

        <span className="cat-promo__mark" aria-hidden="true">Diplay</span>
      </div>

      <div className="cat-promo__art" aria-hidden="true">
        <img className="cat-promo__img cat-promo__img--tote" src="/images/catalog/market-tote.svg" alt="" />
        <img className="cat-promo__img cat-promo__img--coat" src="/images/catalog/sherpa-jacket.svg" alt="" />
        <img className="cat-promo__img cat-promo__img--pack" src="/images/catalog/weekender-backpack.svg" alt="" />
      </div>
    </aside>
  );
}
