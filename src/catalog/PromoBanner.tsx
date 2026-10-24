/** Wavy circle (a scalloped seal) as an SVG path. */
function scallop(cx: number, cy: number, r: number, amp: number, bumps: number): string {
  const steps = 240;
  const pts = Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    const rr = r + amp * Math.sin(a * bumps);
    return `${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)}`;
  });
  return `M${pts.join(' L')} Z`;
}

const SEAL = scallop(100, 100, 82, 5, 14);

const Sparkle = ({ className }: { className: string }) => (
  <svg className={`cat-promo__spark ${className}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 0c.8 6.6 5.4 11.2 12 12-6.6.8-11.2 5.4-12 12-.8-6.6-5.4-11.2-12-12C6.6 11.2 11.2 6.6 12 0z" />
  </svg>
);

/**
 * Promotional banner. The right-hand artwork is an illustration drawn for this page
 * (shopping bags), standing in for the photograph in the design.
 */
export function PromoBanner() {
  return (
    <aside className="cat-promo" aria-label="Season sale">
      <div className="cat-promo__main">
        <h2>
          Season Ends.
          <br />
          Savings Begin.
        </h2>
        <p>Season’s Biggest Clearance Sale on Fashion, Electronics, Accessories, and Essentials.</p>

        <Sparkle className="cat-promo__spark--a" />
        <Sparkle className="cat-promo__spark--b" />
        <Sparkle className="cat-promo__spark--c" />

        <svg className="cat-promo__seal" viewBox="0 0 200 200" role="img" aria-label="Up to 50% off">
          <path d={SEAL} transform="translate(6 4)" fill="#9b9b9b" opacity="0.7" />
          <path d={SEAL} fill="#000" />
          <text x="100" y="78" textAnchor="middle" fill="#fff" fontSize="15" letterSpacing="1">UP TO</text>
          <text x="100" y="122" textAnchor="middle" fill="#fff" fontSize="46" fontWeight="500" letterSpacing="-1">50%</text>
          <text x="100" y="152" textAnchor="middle" fill="#fff" fontSize="23">OFF</text>
        </svg>

        <span className="cat-promo__mark" aria-hidden="true">DIPLAY</span>
      </div>

      <div className="cat-promo__art" aria-hidden="true">
        <svg viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="promoBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#e7e2e0" />
              <stop offset="1" stopColor="#f6f2f0" />
            </linearGradient>
            <linearGradient id="bagA" x1="0" y1="0" x2="1" y2="0.2">
              <stop offset="0" stopColor="#5b1f35" />
              <stop offset="0.55" stopColor="#7d2d47" />
              <stop offset="1" stopColor="#5a2034" />
            </linearGradient>
            <linearGradient id="bagB" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#4a1a2c" />
              <stop offset="1" stopColor="#68263c" />
            </linearGradient>
          </defs>
          <rect width="400" height="520" fill="url(#promoBg)" />
          <ellipse cx="210" cy="520" rx="260" ry="60" fill="#000" opacity="0.08" />
          <path d="M250 190 C240 130 290 100 330 130 M300 200 C300 130 350 110 372 150" stroke="#1b1b1b" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M230 250 L350 235 L372 520 L250 520 Z" fill="url(#bagB)" />
          <path d="M60 270 L300 215 L330 520 L90 520 Z" fill="url(#bagA)" />
          <path d="M60 270 L300 215 L304 240 L66 296 Z" fill="#000" opacity="0.16" />
          <path d="M120 250 C110 190 180 150 215 168 M205 232 C200 170 260 150 290 190" stroke="#1b1b1b" strokeWidth="5" fill="none" strokeLinecap="round" />
          <text x="150" y="436" fill="#fff" opacity="0.9" fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic" fontSize="30" transform="rotate(-8 150 436)">Diplay</text>
        </svg>
      </div>
    </aside>
  );
}
