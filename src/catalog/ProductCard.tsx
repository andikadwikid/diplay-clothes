import type { CatalogProduct } from './data';
import { StarIcon } from './Icons';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/**
 * One cell of the product grid. The product name is a real link whose hit area is stretched
 * over the whole card (see `.cat-card__name a::after`), so the card is one big target
 * without nesting interactive elements.
 */
export function ProductCard({ product }: { product: CatalogProduct }) {
  const { name, price, sale, rating, reviews, image, href } = product;
  // `price` is the selling price, so the price before the discount is derived from it.
  const was = sale ? Math.round(price / (1 - sale / 100)) : null;

  return (
    <li className="cat-grid__item">
      <article className="cat-card">
        <div className="cat-card__media">
          {sale ? (
            <span className="cat-card__badge" aria-label={`${sale}% off`}>
              −{sale}%
            </span>
          ) : null}
          {/* Decorative: the product name right below already says what this is. */}
          <img src={image} alt="" width={600} height={500} loading="lazy" decoding="async" draggable={false} />
        </div>

        <div className="cat-card__info">
          <h3 className="cat-card__name">
            <a href={href ?? '#'}>{name}</a>
          </h3>
          <p className="cat-card__price">
            <span>{usd.format(price)}</span>
            {was ? (
              <s>
                <span className="cat-sr">Was </span>
                {usd.format(was)}
              </s>
            ) : null}
          </p>
          <p className="cat-card__rating" aria-label={`Rated ${rating} out of 5 from ${reviews} reviews`}>
            <StarIcon />
            <span>
              {rating.toFixed(1)} <small>({reviews})</small>
            </span>
          </p>
        </div>
      </article>
    </li>
  );
}
