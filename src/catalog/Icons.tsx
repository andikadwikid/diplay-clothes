import type { ReactNode, SVGProps } from 'react';

/** Small outline icons (24px grid, 1.5px stroke). They inherit `currentColor` and are decorative. */
function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

type P = SVGProps<SVGSVGElement>;

export const MenuIcon = (p: P) => <Icon {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>;
export const CloseIcon = (p: P) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>;
export const SearchIcon = (p: P) => <Icon {...p}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></Icon>;
export const UserIcon = (p: P) => <Icon {...p}><circle cx="12" cy="8" r="3.6" /><path d="M5.5 20c.6-3.6 3.2-5.4 6.5-5.4s5.9 1.8 6.5 5.4z" /></Icon>;
export const BagIcon = (p: P) => <Icon {...p}><path d="M6 8h12l1 12H5z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></Icon>;
export const ChevronsRight = (p: P) => <Icon {...p}><path d="m7 6 6 6-6 6M12.5 6l6 6-6 6" /></Icon>;
export const ArrowUpRight = (p: P) => <Icon {...p}><path d="M7 17 17 7M9 7h8v8" /></Icon>;
export const ChevronUp = (p: P) => <Icon {...p}><path d="m6 14 6-6 6 6" /></Icon>;
export const ChevronDown = (p: P) => <Icon {...p}><path d="m6 10 6 6 6-6" /></Icon>;
export const SlidersIcon = (p: P) => <Icon {...p}><path d="M4 8h9M17 8h3M4 16h3M11 16h9" /><circle cx="15" cy="8" r="2" /><circle cx="9" cy="16" r="2" /></Icon>;

export function StarIcon(p: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...p}>
      <path d="m12 2.8 2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17l-5.6 3.1 1.2-6.3L3 9.4l6.3-.8z" />
    </svg>
  );
}

/* Category icons */
export const AllIcon = (p: P) => <Icon {...p}><path d="M12 3.5 19 7.5v9L12 20.5 5 16.5v-9z" /><path d="M5 7.5 12 11.5l7-4M12 11.5v9" /></Icon>;
export const ShirtIcon = (p: P) => <Icon {...p}><path d="M8.5 4 4 6.5 6 11l2-.9V20h8v-9.9l2 .9 2-4.5L15.5 4C14.8 5.4 13.5 6 12 6S9.2 5.4 8.5 4z" /></Icon>;
export const WatchIcon = (p: P) => <Icon {...p}><circle cx="12" cy="12" r="4.6" /><path d="M12 9.8V12l1.5 1M9.5 7.4 10 3.5h4l.5 3.9M9.5 16.6l.5 3.9h4l.5-3.9" /></Icon>;
export const BagsIcon = (p: P) => <Icon {...p}><path d="M6 9h12l1 11H5z" /><path d="M9 9V7.5a3 3 0 0 1 6 0V9M9.5 13.5c.7 1.2 1.6 1.8 2.5 1.8s1.8-.6 2.5-1.8" /></Icon>;
export const PlugIcon = (p: P) => <Icon {...p}><path d="M9 3.5v4M15 3.5v4M7 7.5h10v3.5a5 5 0 0 1-10 0z" /><path d="M12 16v4.5" /></Icon>;
export const FoodIcon = (p: P) => <Icon {...p}><path d="M4 12h16a8 8 0 0 1-16 0z" /><path d="M8 8c1-2 2.4-2 4 0 1.6-2 3-2 4 0" /></Icon>;
export const SofaIcon = (p: P) => <Icon {...p}><path d="M5 11V8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5V11" /><path d="M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v4H3z" /><path d="M6 17v2M18 17v2" /></Icon>;
export const CheckIcon = (p: P) => <Icon {...p} strokeWidth={2.4}><path d="m6 12.5 4 4 8-9" /></Icon>;
