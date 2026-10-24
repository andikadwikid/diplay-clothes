import { useCallback, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent, PointerEvent } from 'react';
import { Hanger } from './Hanger';
import type { InteractiveClothingRackProps, RackProduct } from './types';
import './InteractiveClothingRack.css';

/** Every product image is a transparent 4:5 canvas, so the layout can be sized up front. */
const IMAGE_WIDTH = 800;
const IMAGE_HEIGHT = 1000;

type InputKind = 'mouse' | 'touch' | 'keyboard';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const describe = (product: RackProduct) =>
  product.badge ? `${product.name}, ${product.badge.label}` : product.name;

/**
 * A rail of hanging garments. Hovering, focusing or tapping a piece turns it to
 * face the viewer while the rest of the rack slides aside.
 *
 * Hit areas are equal-width slots that never move; only the artwork inside
 * them animates. That keeps hover stable (no flicker as neighbours slide) and
 * means the nearest hanger always wins.
 */
export function InteractiveClothingRack({
  products,
  label,
  idleCaption,
  children,
  className,
}: InteractiveClothingRackProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const slots = useRef(new Map<string, HTMLLIElement>());
  const lastInput = useRef<InputKind>('mouse');
  // Whether the pressed product was already active when the touch began. Focus
  // (which also activates) fires before `click`, so state alone can't tell us.
  const wasActiveOnPress = useRef(false);

  const activeIndex = products.findIndex((product) => product.id === activeId);

  const activate = useCallback((id: string) => setActiveId(id), []);
  const deactivate = useCallback(
    (id: string) => setActiveId((current) => (current === id ? null : current)),
    [],
  );

  const revealSlot = useCallback((id: string) => {
    slots.current.get(id)?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, []);

  const step = (direction: 1 | -1) => {
    if (products.length === 0) return;
    const from = activeIndex === -1 ? (direction === 1 ? -1 : 0) : activeIndex;
    const next = products[(from + direction + products.length) % products.length];
    activate(next.id);
    revealSlot(next.id);
  };

  const handleClick = (event: MouseEvent<HTMLElement>, product: RackProduct) => {
    // Touch has no hover: the first tap on a link only turns the piece around.
    if (lastInput.current === 'touch' && !wasActiveOnPress.current) {
      if (product.href) event.preventDefault();
      activate(product.id);
      revealSlot(product.id);
      return;
    }
    if (!product.href) activate(product.id);
  };

  return (
    <div
      role="group"
      className={['rack', className].filter(Boolean).join(' ')}
      aria-label={label}
      data-has-active={activeIndex !== -1}
      style={{ '--count': products.length } as CSSProperties}
      onKeyDown={() => {
        lastInput.current = 'keyboard';
      }}
    >
      <div className="rack__scroller">
        <div className="rack__track">
          <div className="rack__rail" aria-hidden="true" />
          <ul className="rack__list" role="list">
            {products.map((product, index) => {
              const isActive = index === activeIndex;
              const dir = activeIndex === -1 ? 0 : Math.sign(index - activeIndex);

              const shared = {
                className: 'rack__hit',
                'aria-label': describe(product),
                onPointerDown: (event: PointerEvent<HTMLElement>) => {
                  lastInput.current = event.pointerType === 'touch' ? 'touch' : 'mouse';
                  wasActiveOnPress.current = isActive;
                },
                onPointerEnter: (event: PointerEvent<HTMLElement>) => {
                  if (event.pointerType !== 'touch') activate(product.id);
                },
                onPointerLeave: (event: PointerEvent<HTMLElement>) => {
                  if (event.pointerType !== 'touch') deactivate(product.id);
                },
                onFocus: () => activate(product.id),
                onBlur: () => {
                  // On touch the selection should outlive focus.
                  if (lastInput.current !== 'touch') deactivate(product.id);
                },
                onClick: (event: MouseEvent<HTMLElement>) => handleClick(event, product),
              };

              const piece = (
                <span className="rack__piece" aria-hidden="true">
                  <Hanger />
                  <span className="rack__garment">
                    <img
                      className="rack__img rack__img--hanging"
                      src={product.hangingImage.src}
                      srcSet={product.hangingImage.srcSet}
                      sizes={product.hangingImage.sizes}
                      width={IMAGE_WIDTH}
                      height={IMAGE_HEIGHT}
                      alt={product.alt?.hanging ?? `${product.name} hanging on the rail`}
                      decoding="async"
                      draggable={false}
                    />
                    <img
                      className="rack__img rack__img--front"
                      src={product.frontImage.src}
                      srcSet={product.frontImage.srcSet}
                      sizes={product.frontImage.sizes}
                      width={IMAGE_WIDTH}
                      height={IMAGE_HEIGHT}
                      alt={product.alt?.front ?? `${product.name}, front view`}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  </span>
                  {product.badge && (
                    <span className="rack__tag" data-tone={product.badge.tone ?? 'dark'}>
                      {product.badge.label}
                    </span>
                  )}
                </span>
              );

              return (
                <li
                  key={product.id}
                  className="rack__slot"
                  data-active={isActive}
                  style={{ '--dir': dir } as CSSProperties}
                  ref={(node) => {
                    if (node) slots.current.set(product.id, node);
                    else slots.current.delete(product.id);
                  }}
                >
                  {product.href ? (
                    <a href={product.href} {...shared}>
                      {piece}
                    </a>
                  ) : (
                    <button type="button" aria-pressed={isActive} {...shared}>
                      {piece}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="rack__footer">
        <button
          type="button"
          className="rack__step"
          aria-label="Previous piece"
          onClick={() => step(-1)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>

        <div className="rack__caption">
          <div className="rack__caption-item" data-on={activeIndex === -1} aria-hidden={activeIndex !== -1}>
            <p className="rack__idle">{idleCaption}</p>
          </div>
          {products.map((product, index) => (
            <div
              key={product.id}
              className="rack__caption-item"
              data-on={index === activeIndex}
              aria-hidden={index !== activeIndex}
            >
              <p className="rack__name">{product.name}</p>
              {product.meta && <p className="rack__meta">{product.meta}</p>}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="rack__step"
          aria-label="Next piece"
          onClick={() => step(1)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M9.5 5.5 16 12l-6.5 6.5" />
          </svg>
        </button>
      </div>

      {children && <div className="rack__extra">{children}</div>}
    </div>
  );
}
