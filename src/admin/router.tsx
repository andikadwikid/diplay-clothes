import { useSyncExternalStore } from 'react';
import type { AnchorHTMLAttributes, MouseEvent } from 'react';

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', listener);
  };
}

/** Client-side navigation. pushState does not fire popstate, so we notify ourselves. */
export function navigate(to: string, { replace = false } = {}) {
  if (replace) window.history.replaceState(null, '', to);
  else window.history.pushState(null, '', to);
  listeners.forEach((listener) => listener());
  if (!replace) window.scrollTo(0, 0);
}

export function usePath(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.pathname.replace(/\/+$/, '') || '/',
    () => '/',
  );
}

/** An <a> that navigates without a page load (but still opens normally in a new tab). */
export function Link({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const handle = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
      rest.target === '_blank'
    ) {
      return;
    }
    event.preventDefault();
    navigate(href);
  };
  return <a href={href} onClick={handle} {...rest} />;
}
