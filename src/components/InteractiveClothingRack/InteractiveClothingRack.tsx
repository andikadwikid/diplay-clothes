import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import { Hanger } from './Hanger';
import type { InteractiveClothingRackProps, RackProduct } from './types';
import { useDragScroll } from './useDragScroll';
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
 *
 * With more pieces than fit, the rail scrolls: drag it with the mouse (it
 * glides on release), swipe it on touch, use the arrow keys, or the wheel.
 * Everything rests in its hanging pose while the rack moves, and the piece
 * under the pointer turns round once it stops.
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

  const scrollerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const [scrollable, setScrollable] = useState(false);

  const activeIndex = products.findIndex((product) => product.id === activeId);

  const activate = useCallback((id: string) => setActiveId(id), []);
  const deactivate = useCallback(
    (id: string) => setActiveId((current) => (current === id ? null : current)),
    [],
  );

  const drag = useDragScroll(scrollerRef, {
    // Everything goes back to its hanging pose while the rack is being moved...
    onDragStart: () => setActiveId(null),
    // ...and the piece under the pointer turns round once it has stopped.
    onSettle: (point) => {
      if (!point) return;
      const under = document.elementFromPoint(point.x, point.y);
      if (!under || !scrollerRef.current?.contains(under)) return;
      const id = under.closest<HTMLElement>('[data-product-id]')?.dataset.productId;
      if (id) setActiveId(id);
    },
  });
  const { stop: stopDrag } = drag;

  // Track whether the rail overflows, and drive the position indicator.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setScrollable(max > 1);
      const thumb = thumbRef.current;
      if (!thumb) return;
      const width = Math.min(0.7, Math.max(0.3, el.clientWidth / el.scrollWidth));
      const progress = max > 0 ? el.scrollLeft / max : 0;
      thumb.style.width = `${width * 100}%`;
      // translateX is relative to the thumb itself, hence (1 / width - 1).
      thumb.style.transform = `translateX(${progress * (1 / width - 1) * 100}%)`;
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [products.length]);

  const revealSlot = useCallback(
    (id: string) => {
      stopDrag(); // don't fight a glide that is still running
      slots.current.get(id)?.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    },
    [stopDrag],
  );

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

  /** Arrow keys / Home / End move focus along the rail and bring that piece into view. */
  const handleListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const hits = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('.rack__hit'));
    const current = hits.indexOf(document.activeElement as HTMLElement);
    if (current === -1) return;

    const last = hits.length - 1;
    const target =
      event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : Math.min(last, Math.max(0, current + (event.key === 'ArrowRight' ? 1 : -1)));
    if (target === current) return;

    event.preventDefault();
    hits[target].focus({ preventScroll: true });
    revealSlot(products[target].id);
  };

  return (
    <div
      role="group"
      className={['rack', className].filter(Boolean).join(' ')}
      aria-label={label}
      data-has-active={activeIndex !== -1}
      data-scrollable={scrollable}
      data-dragging={drag.dragging}
      style={{ '--count': products.length } as CSSProperties}
      onKeyDown={() => {
        lastInput.current = 'keyboard';
      }}
    >
      <div className="rack__scroller" ref={scrollerRef}>
        <div className="rack__track">
          <div className="rack__rail" aria-hidden="true" />
          <ul className="rack__list" role="list" onKeyDown={handleListKeyDown}>
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
                  // While the rack is being dragged or gliding, everything stays at rest.
                  if (event.pointerType !== 'touch' && !drag.moving.current) activate(product.id);
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
                  data-product-id={product.id}
                  data-active={isActive}
                  style={{ '--dir': dir } as CSSProperties}
                  ref={(node) => {
                    if (node) slots.current.set(product.id, node);
                    else slots.current.delete(product.id);
                  }}
                >
                  {product.href ? (
                    <a href={product.href} draggable={false} {...shared}>
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

      <div className="rack__progress" aria-hidden="true" hidden={!scrollable}>
        <span className="rack__progress-thumb" ref={thumbRef} />
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
