// Generates the placeholder product artwork in public/images/products/.
//
// Every product gets two views on an identical 800 x 1000 transparent canvas:
//   <slug>-hanging.svg  – the resting pose on the rail (side-on, narrow)
//   <slug>-front.svg    – the front-facing pose shown on hover (wide)
//
// These are stand-ins for real product photography. Replace them with
// transparent WebP/AVIF cut-outs that follow the same canvas rules
// (see README.md → "Product image assets") and update src/data/products.ts.
//
// Usage: npm run placeholders

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'images', 'products');

/* ------------------------------------------------------------------ colour */

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const mix = (hex, target, amount) => {
  const c = toRgb(hex);
  return toHex(c.map((v, i) => v + (target[i] - v) * amount));
};
const lighten = (hex, amount) => mix(hex, [255, 255, 255], amount);
const darken = (hex, amount) => mix(hex, [0, 0, 0], amount);

/* ------------------------------------------------------------------ shared */

const svg = (defs, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">\n` +
  `<defs>\n${defs}\n</defs>\n${body}\n</svg>\n`;

const stop = (offset, color, opacity = 1) =>
  `<stop offset="${offset}" stop-color="${color}" stop-opacity="${opacity}"/>`;

/** Gradients and patterns that give flat shapes some fabric volume. */
const paint = (base) => `
<linearGradient id="gBody" x1="0" x2="1" y1="0" y2="0">
  ${stop(0, darken(base, 0.18))}${stop(0.2, base)}${stop(0.5, lighten(base, 0.07))}${stop(0.8, base)}${stop(1, darken(base, 0.22))}
</linearGradient>
<linearGradient id="gSleeve" x1="0" x2="1" y1="0" y2="0">
  ${stop(0, darken(base, 0.22))}${stop(0.4, darken(base, 0.05))}${stop(1, darken(base, 0.24))}
</linearGradient>
<linearGradient id="gRib" x1="0" x2="1" y1="0" y2="0">
  ${stop(0, darken(base, 0.26))}${stop(0.5, darken(base, 0.1))}${stop(1, darken(base, 0.28))}
</linearGradient>
<linearGradient id="gHood" x1="0" x2="1" y1="0" y2="0">
  ${stop(0, darken(base, 0.1))}${stop(0.5, lighten(base, 0.1))}${stop(1, darken(base, 0.12))}
</linearGradient>
<pattern id="rib" width="9" height="9" patternUnits="userSpaceOnUse">
  <rect width="4" height="9" fill="#000" fill-opacity="0.11"/>
</pattern>`;

const edge = (base) => `stroke="${darken(base, 0.3)}" stroke-width="2" stroke-linejoin="round"`;
const mirror = (inner) => `<g transform="translate(800 0) scale(-1 1)">${inner}</g>`;
const ribbed = (d, base) =>
  `<path d="${d}" fill="url(#gRib)" ${edge(base)}/><path d="${d}" fill="url(#rib)"/>`;
const fold = (d) => `<path d="${d}" fill="none" stroke="#000" stroke-opacity="0.09" stroke-width="5" stroke-linecap="round"/>`;

const escapeXml = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Chest print. `width` pins the rendered width so it never runs under a sleeve. */
const printText = (text, { y, size, color, width, x = 400, weight = 800, spacing = 'spacingAndGlyphs' }) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" ` +
  `font-weight="${weight}" font-size="${size}" fill="${color}" textLength="${width}" lengthAdjust="${spacing}">${escapeXml(text)}</text>`;

/* ------------------------------------------------------------- front views */

function frontHoodie({ base, ink, label, sub, zip }) {
  const sleeve = `
    <path d="M242 170 C198 192 168 330 152 560 C144 680 142 780 140 868 L246 880 C248 780 254 690 264 600 C274 520 278 440 282 380 Z"
          fill="url(#gSleeve)" ${edge(base)}/>
    ${fold('M205 300 C190 420 180 560 176 700')}
    ${ribbed('M140 832 L246 844 L248 892 L138 882 Z', base)}`;

  const details = zip
    ? `<path d="M400 200 L400 894" stroke="${darken(base, 0.4)}" stroke-width="5"/>
       <path d="M400 206 L400 888" stroke="#d6d6d6" stroke-width="7" stroke-dasharray="3 5"/>
       <rect x="391" y="214" width="18" height="40" rx="5" fill="#cfcfcf" stroke="#777" stroke-width="2"/>
       <path d="M262 660 L290 800" stroke="${darken(base, 0.35)}" stroke-width="4" stroke-linecap="round"/>
       <path d="M538 660 L510 800" stroke="${darken(base, 0.35)}" stroke-width="4" stroke-linecap="round"/>
       ${printText(label, { x: 474, y: 392, size: 22, color: ink, width: 74, spacing: 'spacing' })}`
    : `<path d="M290 590 L510 590 L536 792 L264 792 Z" fill="#000" fill-opacity="0.05" ${edge(base)}/>
       <path d="M290 590 L510 590" stroke="${lighten(base, 0.25)}" stroke-width="3" stroke-opacity="0.7"/>
       ${printText(label, { y: 470, size: 92, color: ink, width: 236 })}
       ${printText(sub, { y: 512, size: 24, color: ink, width: 200, weight: 400, spacing: 'spacing' })}
       <path d="M372 190 C370 240 366 290 366 340" stroke="${ink}" stroke-width="7" stroke-linecap="round" fill="none"/>
       <path d="M428 190 C430 240 434 290 434 340" stroke="${ink}" stroke-width="7" stroke-linecap="round" fill="none"/>
       <rect x="361" y="336" width="10" height="26" rx="4" fill="${darken(base, 0.5)}"/>
       <rect x="429" y="336" width="10" height="26" rx="4" fill="${darken(base, 0.5)}"/>`;

  return svg(
    paint(base),
    `<path d="M240 172 C290 156 340 164 400 164 C460 164 510 156 560 172 L590 340 C596 520 598 700 590 872 L210 872 C202 700 204 520 210 340 Z"
           fill="url(#gBody)" ${edge(base)}/>
     ${ribbed('M210 836 L590 836 L592 894 L208 894 Z', base)}
     ${details}
     ${sleeve}${mirror(sleeve)}
     <path d="M298 168 C282 108 330 60 400 60 C470 60 518 108 502 168 C470 210 330 210 298 168 Z" fill="url(#gHood)" ${edge(base)}/>
     <path d="M336 150 C340 112 460 112 464 150 C440 180 360 180 336 150 Z" fill="${darken(base, 0.5)}"/>
     <path d="M298 168 C330 210 470 210 502 168" fill="none" stroke="${darken(base, 0.35)}" stroke-width="3"/>`,
  );
}

function frontCrew({ base, ink, label, sub }) {
  const sleeve = `
    <path d="M242 164 C198 186 168 320 152 548 C144 660 142 760 140 848 L246 860 C248 760 254 670 264 590 C274 510 278 430 282 370 Z"
          fill="url(#gSleeve)" ${edge(base)}/>
    ${fold('M205 290 C190 410 180 540 176 680')}
    ${ribbed('M140 812 L246 824 L248 872 L138 862 Z', base)}`;
  return svg(
    paint(base),
    `<g transform="translate(0 -80)">
       <path d="M240 168 C290 150 340 156 400 156 C460 156 510 150 560 168 L590 330 C596 520 598 760 590 920 L210 920 C202 760 204 520 210 330 Z"
             fill="url(#gBody)" ${edge(base)}/>
       ${ribbed('M210 876 L590 876 L592 924 L208 924 Z', base)}
       ${printText(label, { y: 446, size: 52, color: ink, width: 230 })}
       ${printText(sub, { y: 484, size: 20, color: ink, width: 210, weight: 400, spacing: 'spacing' })}
       ${sleeve}${mirror(sleeve)}
       <path d="M334 156 C350 188 450 188 466 156 Z" fill="${darken(base, 0.55)}"/>
       <path d="M312 160 C334 222 466 222 488 160" fill="none" stroke="url(#gRib)" stroke-width="30" stroke-linecap="round"/>
       <path d="M312 160 C334 222 466 222 488 160" fill="none" stroke="url(#rib)" stroke-width="30" stroke-linecap="round"/>
     </g>`,
  );
}

function frontTee({ base, ink, label, sub }) {
  const sleeve = `
    <path d="M246 150 C196 158 136 192 98 254 L168 404 C196 384 232 368 260 360 Z" fill="url(#gSleeve)" ${edge(base)}/>
    ${ribbed('M98 254 L168 404 L186 394 L116 244 Z', base)}`;
  return svg(
    paint(base),
    `<g transform="translate(0 -72)">
       <path d="M244 152 C300 140 340 146 400 146 C460 146 500 140 556 152 L566 380 L560 840 L240 840 L234 380 Z"
             fill="url(#gBody)" ${edge(base)}/>
       <path d="M240.6 806 L559.4 806 L560 840 L240 840 Z" fill="#000" fill-opacity="0.08"/>
       ${printText(label, { y: 430, size: 64, color: ink, width: 200 })}
       ${printText(sub, { y: 468, size: 18, color: ink, width: 190, weight: 400, spacing: 'spacing' })}
       ${fold('M300 520 C296 600 300 700 304 790')}
       ${sleeve}${mirror(sleeve)}
       <path d="M338 147 C352 184 448 184 462 147 Z" fill="${darken(base, 0.55)}"/>
       <path d="M318 152 C336 206 464 206 482 152" fill="none" stroke="url(#gRib)" stroke-width="26" stroke-linecap="round"/>
       <path d="M318 152 C336 206 464 206 482 152" fill="none" stroke="url(#rib)" stroke-width="26" stroke-linecap="round"/>
     </g>`,
  );
}

/* ------------------------------------------------------ hanging (side) views */

const sideSleeve = (base, long = true) =>
  long
    ? `<path d="M392 146 C436 146 470 190 474 260 C480 420 496 640 506 826 L424 842 C408 700 386 500 368 310 C362 240 368 178 392 146 Z"
             fill="url(#gSleeve)" ${edge(base)}/>
       ${fold('M424 230 C430 400 448 600 462 780')}
       ${ribbed('M420 790 L503 776 L507 828 L424 844 Z', base)}`
    : `<path d="M392 142 C440 142 474 176 478 224 L472 340 C446 350 414 346 386 334 C372 270 372 190 392 142 Z"
             fill="url(#gSleeve)" ${edge(base)}/>
       ${ribbed('M386 316 L474 322 L472 342 C446 352 414 348 386 336 Z', base)}`;

const sideBody = (base, hem, hemBand = true) =>
  `<path d="M345 140 C372 118 430 116 452 150 C470 180 474 230 476 300 C482 520 490 720 494 ${hem - 8} L318 ${hem} C322 720 326 520 330 300 C332 230 330 180 345 140 Z"
         fill="url(#gBody)" ${edge(base)}/>
   ${hemBand ? ribbed(`M318 ${hem - 46} L494 ${hem - 54} L494 ${hem - 6} L318 ${hem} Z`, base) : ''}`;

function sideHoodie({ base }) {
  return svg(
    paint(base),
    `${sideBody(base, 892)}
     <path d="M404 84 C340 54 276 84 262 168 C250 250 270 318 322 372 L404 326 Z" fill="url(#gHood)" ${edge(base)}/>
     <path d="M392 108 C336 92 296 128 288 196 C282 252 300 304 336 336" fill="none" stroke="#000" stroke-opacity="0.18" stroke-width="5" stroke-linecap="round"/>
     <path d="M400 90 C430 96 452 130 452 160 C430 146 410 140 392 150 Z" fill="${darken(base, 0.4)}"/>
     ${sideSleeve(base)}`,
  );
}

function sideCrew({ base }) {
  return svg(
    paint(base),
    `<g transform="translate(0 -40)">
       ${sideBody(base, 936)}
       <path d="M344 140 C352 118 384 108 412 116 L408 142 C386 136 364 140 344 152 Z" fill="url(#gRib)" ${edge(base)}/>
       ${sideSleeve(base)}
     </g>`,
  );
}

function sideTee({ base }) {
  return svg(
    paint(base),
    `<g transform="translate(0 -40)">
       ${sideBody(base, 850, false)}
       <path d="M344 140 C352 118 384 108 412 116 L408 142 C386 136 364 140 344 152 Z" fill="url(#gRib)" ${edge(base)}/>
       ${sideSleeve(base, false)}
     </g>`,
  );
}

/* ---------------------------------------------------------------- products */

const products = [
  { slug: 'ash-grey-hoodie', kind: 'hoodie', base: '#a8a9ab', ink: '#2b2b2d', label: 'STUDIO', sub: 'ORIGINAL' },
  { slug: 'jet-black-tee', kind: 'tee', base: '#27272a', ink: '#ecebe7', label: 'Reign', sub: 'EST. 2024' },
  { slug: 'forest-green-hoodie', kind: 'hoodie', base: '#17452f', ink: '#ece5cf', label: 'STUDIO', sub: 'ORIGINAL' },
  { slug: 'cream-crewneck', kind: 'crew', base: '#d8c9ac', ink: '#6a5a3f', label: 'CLASSIC', sub: 'HEAVYWEIGHT FLEECE' },
  { slug: 'rosewood-crewneck', kind: 'crew', base: '#9a6068', ink: '#f2dede', label: 'ROSEWOOD', sub: 'OVERSIZED FIT' },
  { slug: 'bone-boxy-tee', kind: 'tee', base: '#d9d4c7', ink: '#4a463d', label: 'OUTDOOR', sub: 'TRAILS & WILDERNESS' },
  { slug: 'navy-zip-hoodie', kind: 'zip', base: '#1f2a44', ink: '#d9dbe3', label: 'DIPLAY', sub: '' },
];

const FRONT = { hoodie: frontHoodie, zip: (o) => frontHoodie({ ...o, zip: true }), crew: frontCrew, tee: frontTee };
const SIDE = { hoodie: sideHoodie, zip: sideHoodie, crew: sideCrew, tee: sideTee };

mkdirSync(OUT_DIR, { recursive: true });
for (const p of products) {
  writeFileSync(join(OUT_DIR, `${p.slug}-front.svg`), FRONT[p.kind](p));
  writeFileSync(join(OUT_DIR, `${p.slug}-hanging.svg`), SIDE[p.kind](p));
}
console.log(`Wrote ${products.length * 2} placeholder images to ${OUT_DIR}`);
