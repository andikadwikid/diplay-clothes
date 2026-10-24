export interface ProductImage {
  /** Fallback URL. Use a transparent WebP/AVIF/PNG cut-out. */
  src: string;
  /** Optional responsive candidates, e.g. "/img/hoodie-600.webp 600w, /img/hoodie-1200.webp 1200w". */
  srcSet?: string;
  /** Matching `sizes` hint for `srcSet`. */
  sizes?: string;
}

export interface ProductBadge {
  label: string;
  /** `dark` = black tag, `light` = white tag. Defaults to `dark`. */
  tone?: 'dark' | 'light';
}

export interface RackProduct {
  /** Stable, unique identifier. Used as the React key. */
  id: string;
  name: string;
  /** Secondary line shown under the name while the product is active. */
  meta?: string;
  /** Resting pose on the rail (side-on and narrow in the reference design). */
  hangingImage: ProductImage;
  /** Front-facing pose shown while the product is active. */
  frontImage: ProductImage;
  /** When set, the product is a link. On touch, the first tap only activates it. */
  href?: string;
  /** Small hang-tag attached to the hook, e.g. "NEW" or "-20%". */
  badge?: ProductBadge;
  /** Overrides the generated alt text. */
  alt?: { hanging?: string; front?: string };
}

export interface InteractiveClothingRackProps {
  products: readonly RackProduct[];
  /** Accessible name for the rack. Also used as the list label. */
  label: string;
  /** Text shown under the rack while no product is active. */
  idleCaption?: React.ReactNode;
  /** Rendered under the caption, e.g. a call-to-action. */
  children?: React.ReactNode;
  className?: string;
}
