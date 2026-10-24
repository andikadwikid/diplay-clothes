/**
 * Wire hook + wooden neck, drawn in the same coordinate space as the rack
 * pieces: x is centred on the hanger, y = 0 is the centre line of the rail.
 * The hook's curl ends at the rail's top edge so it reads as passing behind
 * the tube. The hanger arms are omitted because the garment hides them.
 */
export function Hanger() {
  return (
    <svg
      className="rack__hanger"
      viewBox="-60 -20 120 220"
      aria-hidden="true"
      focusable="false"
    >
      <path className="rack__hook" d="M0 126 V6 C0 -15 14 -15 14 -6" />
      <rect className="rack__neck" x="-9" y="108" width="18" height="64" rx="6" />
      <rect className="rack__neck-shine" x="-5.5" y="113" width="3.5" height="54" rx="1.75" />
    </svg>
  );
}
