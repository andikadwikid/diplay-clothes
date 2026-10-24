import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

/** Pointer travel (px) before a press becomes a drag, so plain clicks still work. */
const DRAG_THRESHOLD = 5;
/** How much pointer history (ms) is used to estimate the speed at release. */
const VELOCITY_WINDOW = 90;
/** Glide decay time constant (ms). Higher = the rack coasts further. */
const FRICTION_MS = 350;
/** Speed limits in px/ms. */
const MAX_SPEED = 4;
const MIN_SPEED = 0.03;

interface Options {
  /** Called once when a press turns into a drag. */
  onDragStart: () => void;
  /** Called when dragging *and* gliding have fully stopped, with the last pointer position. */
  onSettle: (point: { x: number; y: number } | null) => void;
}

/**
 * Click-and-drag scrolling for mouse and pen, with a momentum glide on release.
 *
 * Touch is deliberately left to the browser's native scrolling, which already
 * has the right feel (momentum, rubber-banding) on real devices. Native
 * wheel/trackpad scrolling is untouched too.
 *
 * - A press only becomes a drag after DRAG_THRESHOLD px, so clicks and links
 *   behave normally; the click that ends a drag is swallowed.
 * - Pressing while the rack is still gliding catches it (and that click is
 *   swallowed too, so catching a moving rack never opens a product).
 */
export function useDragScroll(ref: RefObject<HTMLElement | null>, options: Options) {
  const [dragging, setDragging] = useState(false);
  /** True from the start of a drag until the glide ends. */
  const moving = useRef(false);
  const stopRef = useRef<() => void>(() => {});

  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let pressed = false;
    let moved = false;
    let pointerId = -1;
    let startX = 0;
    let startLeft = 0;
    let samples: { t: number; x: number }[] = [];
    let lastPoint: { x: number; y: number } | null = null;
    let raf = 0;
    let suppressClick = false;

    const maxScroll = () => el.scrollWidth - el.clientWidth;
    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const end = (settle: boolean) => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (!moving.current) return;
      moving.current = false;
      setDragging(false);
      if (settle) latest.current.onSettle(lastPoint);
    };

    const glide = (speed: number) => {
      let v = speed;
      // Track the position as a float: scrollLeft rounds to whole pixels.
      let pos = el.scrollLeft;
      let prev = performance.now();
      const frame = (now: number) => {
        const dt = Math.min(now - prev, 50);
        prev = now;
        pos = Math.min(Math.max(pos - v * dt, 0), maxScroll());
        el.scrollLeft = pos;
        v *= Math.exp(-dt / FRICTION_MS);
        if (Math.abs(v) < MIN_SPEED || pos <= 0 || pos >= maxScroll()) return end(true);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.button !== 0 || maxScroll() <= 1) return;
      const caughtGlide = raf !== 0;
      end(false);
      suppressClick = caughtGlide;
      pressed = true;
      moved = false;
      pointerId = e.pointerId;
      startX = e.clientX;
      startLeft = el.scrollLeft;
      samples = [{ t: e.timeStamp, x: e.clientX }];
      lastPoint = { x: e.clientX, y: e.clientY };
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      lastPoint = { x: e.clientX, y: e.clientY };
      if (!pressed || e.pointerId !== pointerId) return;

      const dx = e.clientX - startX;
      if (!moved) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return;
        moved = true;
        moving.current = true;
        try {
          el.setPointerCapture(pointerId);
        } catch {
          /* the pointer may already be gone; the drag still works */
        }
        setDragging(true);
        latest.current.onDragStart();
      }

      el.scrollLeft = startLeft - dx;
      samples.push({ t: e.timeStamp, x: e.clientX });
      while (samples.length > 2 && e.timeStamp - samples[0].t > VELOCITY_WINDOW) samples.shift();
    };

    const release = (e: PointerEvent, cancelled: boolean) => {
      if (!pressed || e.pointerId !== pointerId) return;
      pressed = false;
      if (!moved) return;
      try {
        el.releasePointerCapture(pointerId);
      } catch {
        /* already released */
      }
      suppressClick = true; // the browser fires a click right after this pointerup
      lastPoint = { x: e.clientX, y: e.clientY };

      const first = samples[0];
      const last = samples[samples.length - 1];
      const pausedBeforeRelease = e.timeStamp - last.t > 60;
      let v = !pausedBeforeRelease && last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
      v = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, v));

      if (cancelled || Math.abs(v) < MIN_SPEED || reducedMotion()) return end(true);
      glide(v);
    };

    const onUp = (e: PointerEvent) => release(e, false);
    const onCancel = (e: PointerEvent) => release(e, true);
    const onLeave = () => {
      if (!pressed) lastPoint = null;
    };
    const onClick = (e: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      e.preventDefault();
      e.stopPropagation();
    };
    const onInterrupt = () => {
      if (raf) end(false); // wheel or touch takes over from a glide
    };
    const onDragStartNative = (e: Event) => e.preventDefault(); // no ghost-image drags of links/images

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('click', onClick, true);
    el.addEventListener('wheel', onInterrupt, { passive: true });
    el.addEventListener('touchstart', onInterrupt, { passive: true });
    el.addEventListener('dragstart', onDragStartNative);
    stopRef.current = () => end(false);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('click', onClick, true);
      el.removeEventListener('wheel', onInterrupt);
      el.removeEventListener('touchstart', onInterrupt);
      el.removeEventListener('dragstart', onDragStartNative);
      stopRef.current = () => {};
      moving.current = false;
    };
  }, [ref]);

  return {
    dragging,
    moving,
    /** Stop any drag or glide (use before scrolling the rack programmatically). */
    stop: () => stopRef.current(),
  };
}
