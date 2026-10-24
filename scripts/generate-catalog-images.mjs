// Generates the placeholder product artwork used by the catalog page.
//
// Output: public/images/catalog/<slug>.svg  (600 x 500 canvas, one front/flat-lay view each).
// The seven hoodies / tees / crewnecks in the catalog reuse the rack artwork in
// public/images/products, so they are not drawn here.
//
// These are stand-ins for real product photography, drawn from scratch (nothing is traced
// from the design reference). Replace them with transparent WebP/PNG cut-outs and update
// src/catalog/data.ts.
//
// Usage: npm run catalog-images

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'images', 'catalog');

/* ------------------------------------------------------------------ helpers */

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hex = (c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const mix = (h, t, a) => hex(rgb(h).map((v, i) => v + (t[i] - v) * a));
const light = (h, a) => mix(h, [255, 255, 255], a);
const dark = (h, a) => mix(h, [0, 0, 0], a);

const stop = (o, c, op = 1) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${op}"/>`;
const grad = (id, stops, { x1 = 0, y1 = 0, x2 = 1, y2 = 0 } = {}) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, op]) => stop(o, c, op)).join('')}</linearGradient>`;

/** Soft left-to-right fabric shading: darker edges, lighter middle. */
const fabric = (id, base) =>
  grad(id, [[0, dark(base, 0.14)], [0.22, base], [0.5, light(base, 0.07)], [0.78, base], [1, dark(base, 0.16)]]);

const svg = (defs, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 500" width="600" height="500">\n` +
  `<defs>${defs}<filter id="soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="9"/></filter></defs>\n${body}\n</svg>\n`;

/** Soft contact shadow under the product. */
const shadow = (cx, cy, rx, ry = 12) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity="0.13" filter="url(#soft)"/>`;

const edge = (c) => `stroke="${dark(c, 0.28)}" stroke-width="1.6" stroke-linejoin="round"`;
const stitch = (d, c, w = 1.2) =>
  `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-dasharray="3.5 3" stroke-linecap="round"/>`;
const mirrorX = (inner) => `<g transform="translate(600 0) scale(-1 1)">${inner}</g>`;

/** A fluffy collar/trim: overlapping circles along a path of [x, y, r] points. */
const fleece = (pts, c) =>
  pts
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${dark(c, 0.12)}" stroke-width="1"/>`)
    .join('') +
  pts
    .map(([x, y, r]) => `<circle cx="${x - r * 0.25}" cy="${y - r * 0.3}" r="${r * 0.5}" fill="${light(c, 0.45)}" opacity="0.7"/>`)
    .join('');

const arcPoints = (x0, x1, yBase, lift, n, r) =>
  Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return [x0 + (x1 - x0) * t, yBase - lift * Math.sin(Math.PI * t), r * (0.9 + 0.2 * Math.sin(i * 2.3))];
  });

const label = (x, y, text, size, color, extra = '') =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="${size}" fill="${color}" ${extra}>${text}</text>`;

/* ------------------------------------------------------------------ jackets */

/**
 * One parametric cropped jacket, flat-lay, front view. Options:
 *   body, sleeve        main colours
 *   collar              'fleece' | 'stand' | 'hood' | 'rib'
 *   closure             'buttons' | 'zip'
 *   pockets             'chest' | 'welt' | 'none'
 *   hemY                bottom of the body (longer = parka)
 *   trim                colour of cuffs / hem band
 *   fleeceTrim          draw fleece cuffs + hem (shearling look)
 *   quilted             horizontal baffles
 *   panel               contrasting colour-block (bomber)
 */
function jacket(o) {
  const { body, sleeve = o.body, collar = 'fleece', closure = 'buttons', pockets = 'none', hemY = 372, trim, fleeceTrim = false, quilted = false, panel } = o;
  const trimC = trim ?? dark(body, 0.18);
  const lining = o.lining ?? '#efe6d4';
  const collarC = o.collarColor ?? '#f1e7d2';
  const ids = { b: 'gb', s: 'gs', t: 'gt' };
  const defs = fabric(ids.b, body) + fabric(ids.s, sleeve) + fabric(ids.t, trimC);

  const sleeveShape = (fill) => `
    <path d="M230 132 C196 142 164 252 ${hemY > 400 ? 142 : 146} ${hemY + 8} L ${hemY > 400 ? 196 : 192} ${hemY + 18}
             C 200 320 214 262 224 206 Z" fill="${fill}" ${edge(sleeve)}/>`;
  const cuff = fleeceTrim
    ? fleece(
        [[158, hemY - 2, 15], [168, hemY + 6, 15], [178, hemY + 12, 14], [150, hemY - 14, 13]].map(([x, y, r]) => [x, y, r]),
        collarC,
      )
    : `<path d="M${hemY > 400 ? 143 : 147} ${hemY - 14} L ${hemY > 400 ? 194 : 190} ${hemY - 4} L ${hemY > 400 ? 196 : 192} ${hemY + 18} L ${hemY > 400 ? 142 : 146} ${hemY + 8} Z" fill="url(#${ids.t})" ${edge(trimC)}/>`;

  // body
  let torso = `<path d="M224 134 L376 134 L392 ${hemY} Q300 ${hemY + 10} 208 ${hemY} Z" fill="url(#${ids.b})" ${edge(body)}/>`;
  const hem = fleeceTrim
    ? fleece(Array.from({ length: 9 }, (_, i) => [228 + i * 18.5, hemY - 2 + (i % 2) * 3, 14]), collarC)
    : `<path d="M209 ${hemY - 16} L391 ${hemY - 16} L392 ${hemY} Q300 ${hemY + 10} 208 ${hemY} Z" fill="url(#${ids.t})" ${edge(trimC)}/>`;

  let details = '';
  if (quilted) {
    const strips = [];
    for (let y = 138, i = 0; y < hemY - 14; y += 36, i++) {
      const w = 8 + i * 0.5;
      strips.push(`<path d="M${223 - w} ${y} Q300 ${y - 7} ${377 + w} ${y} L${379 + w} ${y + 34} Q300 ${y + 40} ${221 - w} ${y + 34} Z" fill="url(#${ids.b})" stroke="${dark(body, 0.22)}" stroke-width="1.4" stroke-linejoin="round"/>`);
    }
    torso = strips.join('');
  }
  if (panel) {
    details += `<path d="M224 134 L376 134 L380 214 Q300 236 220 214 Z" fill="${panel}" opacity="0.96" ${edge(panel)}/>
      <path d="M222 212 Q300 238 378 212 L379 230 Q300 256 221 230 Z" fill="${dark(panel, 0.08)}"/>`;
  }
  if (pockets === 'chest') {
    for (const x of [244, 318]) {
      details += `<path d="M${x} 168 h38 v44 h-38 Z" fill="${dark(body, 0.04)}" ${edge(body)}/>
        <path d="M${x} 168 h38 v14 l-19 9 l-19 -9 Z" fill="${dark(body, 0.1)}" ${edge(body)}/>
        <circle cx="${x + 19}" cy="184" r="3.4" fill="${light(body, 0.55)}" stroke="${dark(body, 0.3)}" stroke-width="0.8"/>`;
      details += stitch(`M${x + 3} 172 h32 v36 h-32 Z`, light(body, 0.35));
    }
    details += stitch(`M226 160 Q300 178 374 160`, light(body, 0.35));
  }
  if (pockets === 'welt') {
    for (const x of [238, 362]) details += `<path d="M${x} 280 L${x + (x < 300 ? 8 : -8)} 340" stroke="${dark(body, 0.25)}" stroke-width="2.4" stroke-linecap="round"/>`;
  }
  if (closure === 'buttons') {
    const ys = hemY > 400 ? [170, 215, 260, 305, 350, 395] : [166, 208, 250, 292, 334];
    details += `<path d="M300 138 V${hemY - 8}" stroke="${dark(body, 0.3)}" stroke-width="1.6"/>`;
    details += ys.map((y) => `<circle cx="300" cy="${y}" r="5.6" fill="${o.buttonColor ?? dark(body, 0.45)}" stroke="${dark(body, 0.6)}" stroke-width="0.8"/><circle cx="298.4" cy="${y - 1.6}" r="1.4" fill="#fff" opacity="0.35"/>`).join('');
  } else {
    details += `<path d="M300 140 V${hemY - 4}" stroke="${dark(body, 0.32)}" stroke-width="2"/>
      <path d="M300 142 V${hemY - 6}" stroke="#dcdcd8" stroke-width="5" stroke-dasharray="2.2 3.4"/>
      <rect x="294" y="${o.pullY ?? 176}" width="12" height="26" rx="4" fill="#cfcfcb" stroke="#7d7d78" stroke-width="1.2"/>`;
  }

  // collar
  let collarSvg = '';
  if (collar === 'fleece') {
    collarSvg =
      `<path d="M258 120 L342 120 L300 196 Z" fill="${lining}" stroke="${dark(lining, 0.15)}" stroke-width="1"/>` +
      fleece([...arcPoints(238, 364, 132, 30, 8, 18), ...arcPoints(250, 350, 140, 24, 6, 15)], collarC);
  } else if (collar === 'rib' || collar === 'stand') {
    collarSvg = `<path d="M252 122 Q300 98 348 122 L352 150 Q300 168 248 150 Z" fill="url(#${ids.t})" ${edge(trimC)}/>
      ${stitch('M256 140 Q300 156 344 140', light(trimC, 0.4))}`;
  } else if (collar === 'hood') {
    collarSvg = `<ellipse cx="300" cy="118" rx="76" ry="62" fill="${dark(body, 0.12)}" ${edge(body)}/>
      <ellipse cx="300" cy="126" rx="50" ry="42" fill="${dark(body, 0.5)}"/>
      ${fleece(Array.from({ length: 14 }, (_, i) => { const a = Math.PI * (0.05 + (0.9 * i) / 13); return [300 - Math.cos(a) * 62, 132 - Math.sin(a) * 56, 11]; }), collarC)}`;
  }

  const back = collar === 'hood' ? collarSvg.split('<ellipse cx="300" cy="126"')[0] : '';
  const front = collar === 'hood' ? '<ellipse cx="300" cy="126"' + collarSvg.split('<ellipse cx="300" cy="126"')[1] : collarSvg;

  return svg(
    defs,
    `${shadow(300, hemY + 26, 150, 10)}
     ${back}
     ${mirrorX(sleeveShape(`url(#${ids.s})`) + cuff)}${sleeveShape(`url(#${ids.s})`)}${cuff}
     ${torso}${quilted ? '' : hem}${panel ? '' : ''}
     ${details}
     ${front}`,
  );
}

/* --------------------------------------------------------------- bottoms/tops */

function pants({ body, kind = 'jeans', len = 380 }) {
  const defs = fabric('gb', body) + grad('gl', [[0, dark(body, 0.12)], [1, light(body, 0.04)]]);
  const hemY = len;
  const taper = (m) => {
    const x = (v) => (m ? 600 - v : v);
    const wTop = 100, bottomY = hemY;
    return `<path d="M${x(206)} ${wTop} L${x(300)} ${wTop} L${x(hemY > 300 ? 283 : 292)} ${bottomY} L${x(hemY > 300 ? 232 : 214)} ${bottomY} Q${x(hemY > 300 ? 214 : 190)} 280 ${x(206)} ${wTop} Z" fill="url(#gb)" ${edge(body)}/>`;
  };
  let d = '';
  d += `<path d="M208 98 H392 V126 H208 Z" fill="${dark(body, 0.08)}" ${edge(body)}/>`;
  d += [226, 262, 338, 374].map((x) => `<rect x="${x - 4}" y="96" width="8" height="34" rx="2" fill="${dark(body, 0.14)}" ${edge(body)}/>`).join('');
  d += `<path d="M300 126 V220" stroke="${dark(body, 0.35)}" stroke-width="1.8"/>
        <path d="M300 126 Q282 150 286 196" fill="none" stroke="${dark(body, 0.35)}" stroke-width="1.6"/>`;
  d += stitch('M298 130 Q286 152 290 192', light(body, 0.4));
  d += `<circle cx="300" cy="112" r="6" fill="#c9b27a" stroke="#7a6a3a" stroke-width="1"/>`;
  if (kind === 'jeans') {
    for (const m of [false, true]) {
      const x = (v) => (m ? 600 - v : v);
      d += `<path d="M${x(226)} 128 Q${x(250)} 168 ${x(272)} 138" fill="none" stroke="${dark(body, 0.3)}" stroke-width="1.6"/>`;
      d += stitch(`M${x(228)} 133 Q${x(250)} 170 ${x(270)} 143`, light(body, 0.45));
      d += `<path d="M${x(236)} ${hemY - 30} L${x(256)} ${hemY - 30} L${x(257)} ${hemY - 18}" fill="none" stroke="${light(body, 0.3)}" stroke-width="1" stroke-dasharray="3 3"/>`;
    }
    d += `<ellipse cx="258" cy="260" rx="26" ry="60" fill="${light(body, 0.12)}" opacity="0.35"/><ellipse cx="342" cy="260" rx="26" ry="60" fill="${light(body, 0.12)}" opacity="0.35"/>`;
  } else {
    // trousers: pleats + crease
    for (const x of [250, 350]) d += `<path d="M${x} 132 Q${x + (x < 300 ? 4 : -4)} 190 ${x + (x < 300 ? 10 : -10)} ${hemY - 20}" fill="none" stroke="${dark(body, 0.2)}" stroke-width="1.6"/>`;
    for (const x of [236, 364]) d += `<path d="M${x} 130 q${x < 300 ? 8 : -8} 14 0 30" fill="none" stroke="${dark(body, 0.28)}" stroke-width="1.6"/>`;
  }
  // Drawn small, then scaled up so trousers have the same visual weight as the other items.
  return svg(defs, `<g transform="translate(300 268) scale(1.3) translate(-300 -240)">${shadow(300, hemY + 14, 130, 9)}${taper(false)}${taper(true)}<path d="M300 100 V${hemY}" stroke="${dark(body, 0.22)}" stroke-width="1.6"/>${d}</g>`);
}

function shirt({ body, kind = 'oxford' }) {
  const defs = fabric('gb', body);
  const long = kind === 'oxford';
  const c = dark(body, 0.28);
  const sleeve = long
    ? `<path d="M226 138 C192 150 160 250 150 372 L194 384 C198 320 212 262 224 208 Z" fill="url(#gb)" ${edge(body)}/>
       <path d="M149 360 L195 372 L194 388 L148 376 Z" fill="${dark(body, 0.12)}" ${edge(body)}/>`
    : `<path d="M226 138 C196 148 170 178 156 226 L200 246 C208 226 216 214 224 206 Z" fill="url(#gb)" ${edge(body)}/>
       <path d="M156 226 L200 246 L196 258 L150 238 Z" fill="${dark(body, 0.14)}" ${edge(body)}/>`;
  const placket = kind === 'oxford'
    ? `<path d="M290 150 V366" stroke="${c}" stroke-width="1.5"/><path d="M310 150 V366" stroke="${c}" stroke-width="1.5"/>` +
      [176, 214, 252, 290, 328].map((y) => `<circle cx="300" cy="${y}" r="4.4" fill="#f4f1ea" stroke="${c}" stroke-width="1"/>`).join('') +
      `<path d="M322 178 h36 v40 h-36 Z" fill="none" stroke="${c}" stroke-width="1.4"/>`
    : `<path d="M288 142 V214 h24 V142" fill="${dark(body, 0.06)}" stroke="${c}" stroke-width="1.4"/>` +
      [168, 196].map((y) => `<circle cx="300" cy="${y}" r="4.4" fill="#f4f1ea" stroke="${c}" stroke-width="1"/>`).join('');
  const collar = kind === 'oxford'
    ? `<path d="M254 124 L298 150 L276 192 L246 150 Z" fill="${light(body, 0.1)}" ${edge(body)}/><path d="M346 124 L302 150 L324 192 L354 150 Z" fill="${light(body, 0.1)}" ${edge(body)}/>`
    : `<path d="M252 126 L300 160 L270 164 L240 142 Z" fill="${dark(body, 0.1)}" ${edge(body)}/><path d="M348 126 L300 160 L330 164 L360 142 Z" fill="${dark(body, 0.1)}" ${edge(body)}/>`;
  const hemY = kind === 'oxford' ? 388 : 352;
  return svg(
    defs,
    `${shadow(300, hemY + 20, 140)}
     ${mirrorX(sleeve)}${sleeve}
     <path d="M226 136 Q300 122 374 136 L384 ${hemY} Q300 ${hemY + 10} 216 ${hemY} Z" fill="url(#gb)" ${edge(body)}/>
     ${placket}${collar}`,
  );
}

/* ------------------------------------------------------------- accessories etc */

function tote() {
  const body = '#d9c9a8';
  return svg(
    fabric('gb', body) + grad('gh', [[0, '#8a6b3a'], [1, '#b08a52']], { x1: 0, y1: 0, x2: 0, y2: 1 }),
    `${shadow(300, 438, 150)}
     <path d="M236 200 C236 80 364 80 364 200" fill="none" stroke="url(#gh)" stroke-width="16" stroke-linecap="round"/>
     <path d="M188 190 H412 L428 432 H172 Z" fill="url(#gb)" ${edge(body)}/>
     <path d="M188 190 H412 L414 214 H186 Z" fill="${dark(body, 0.08)}"/>
     ${Array.from({ length: 14 }, (_, i) => `<path d="M${186 + i * 17} 214 L${178 + i * 18} 432" stroke="${dark(body, 0.06)}" stroke-width="1"/>`).join('')}
     <rect x="252" y="270" width="96" height="96" rx="6" fill="#faf6ec" stroke="${dark(body, 0.3)}" stroke-width="1.2"/>
     ${label(300, 316, 'DIPLAY', 15, '#2a2a28', 'font-weight="700" letter-spacing="3"')}
     ${label(300, 336, 'MARKET TOTE', 8.5, '#6a6a64', 'letter-spacing="2.4"')}`,
  );
}

function backpack() {
  const body = '#3c4a3a';
  return svg(
    fabric('gb', body) + fabric('gp', dark(body, 0.1)),
    `${shadow(300, 440, 130)}
     <path d="M262 118 Q300 70 338 118" fill="none" stroke="${dark(body, 0.4)}" stroke-width="12" stroke-linecap="round"/>
     <path d="M214 160 Q214 100 300 100 Q386 100 386 160 L400 410 Q400 438 372 438 H228 Q200 438 200 410 Z" fill="url(#gb)" ${edge(body)}/>
     <path d="M232 292 H368 V400 Q368 414 354 414 H246 Q232 414 232 400 Z" fill="url(#gp)" ${edge(body)}/>
     <path d="M240 300 H360" stroke="#d9d4c2" stroke-width="2.4" stroke-dasharray="4 3"/>
     <rect x="290" y="296" width="20" height="14" rx="5" fill="#bdb7a2" stroke="#6d6a58" stroke-width="1"/>
     <path d="M226 190 H374" stroke="${dark(body, 0.3)}" stroke-width="2.2"/>
     <path d="M232 200 H368" stroke="#d9d4c2" stroke-width="2.4" stroke-dasharray="4 3"/>
     <rect x="262" y="226" width="76" height="36" rx="6" fill="#d9d4c2" stroke="${dark(body, 0.3)}" stroke-width="1.2"/>
     ${label(300, 250, 'DIPLAY', 13, '#2e3a2d', 'font-weight="700" letter-spacing="3"')}
     <path d="M200 230 Q176 300 196 380" fill="none" stroke="${dark(body, 0.45)}" stroke-width="10" stroke-linecap="round"/>
     <path d="M400 230 Q424 300 404 380" fill="none" stroke="${dark(body, 0.45)}" stroke-width="10" stroke-linecap="round"/>`,
  );
}

function watch() {
  return svg(
    grad('gs', [[0, '#9aa0a6'], [0.5, '#e8ebee'], [1, '#8d939a']], { x1: 0, y1: 0, x2: 1, y2: 1 }) +
      grad('gst', [[0, '#3a2a20'], [0.5, '#5b4232'], [1, '#33241b']]) +
      grad('gd', [[0, '#f6f4ee'], [1, '#dcd8cc']], { x1: 0, y1: 0, x2: 1, y2: 1 }),
    `${shadow(300, 462, 90, 8)}
     <path d="M254 30 H346 L356 160 H244 Z" fill="url(#gst)" stroke="#1f150f" stroke-width="1.4"/>
     <path d="M244 340 H356 L346 470 H254 Z" fill="url(#gst)" stroke="#1f150f" stroke-width="1.4"/>
     ${Array.from({ length: 5 }, (_, i) => `<circle cx="300" cy="${392 + i * 16}" r="3" fill="#1f150f" opacity="0.7"/>`).join('')}
     <rect x="388" y="238" width="16" height="24" rx="4" fill="url(#gs)" stroke="#6d7379" stroke-width="1.2"/>
     <circle cx="300" cy="250" r="112" fill="url(#gs)" stroke="#6d7379" stroke-width="1.6"/>
     <circle cx="300" cy="250" r="96" fill="#1d2127" stroke="#6d7379" stroke-width="1.2"/>
     <circle cx="300" cy="250" r="90" fill="url(#gd)"/>
     ${Array.from({ length: 60 }, (_, i) => { const a = (i / 60) * Math.PI * 2; const big = i % 5 === 0; const r1 = big ? 70 : 80; return `<path d="M${300 + Math.sin(a) * r1} ${250 - Math.cos(a) * r1} L${300 + Math.sin(a) * 86} ${250 - Math.cos(a) * 86}" stroke="#2a2d31" stroke-width="${big ? 2.4 : 1}"/>`; }).join('')}
     <circle cx="300" cy="226" r="20" fill="none" stroke="#9a9e98" stroke-width="1.2"/><circle cx="262" cy="262" r="16" fill="none" stroke="#9a9e98" stroke-width="1.2"/><circle cx="338" cy="262" r="16" fill="none" stroke="#9a9e98" stroke-width="1.2"/>
     ${label(300, 206, 'DIPLAY', 9, '#2a2d31', 'letter-spacing="2.4" font-weight="700"')}
     <path d="M300 250 L300 190" stroke="#1f2328" stroke-width="3.4" stroke-linecap="round"/>
     <path d="M300 250 L344 276" stroke="#1f2328" stroke-width="3.4" stroke-linecap="round"/>
     <path d="M300 250 L252 214" stroke="#b83a2e" stroke-width="1.6" stroke-linecap="round"/>
     <circle cx="300" cy="250" r="5" fill="#1f2328"/>`,
  );
}

function headphones() {
  const c = '#2a2d33';
  return svg(
    grad('gc', [[0, '#40444c'], [0.5, '#2a2d33'], [1, '#1b1d21']]) + grad('gp', [[0, '#d8c9b4'], [1, '#bfae96']], { x1: 0, y1: 0, x2: 0, y2: 1 }),
    `${shadow(300, 440, 150, 9)}
     <path d="M150 300 C150 90 450 90 450 300" fill="none" stroke="#14161a" stroke-width="30" stroke-linecap="round"/>
     <path d="M150 300 C150 96 450 96 450 300" fill="none" stroke="#3a3e46" stroke-width="22" stroke-linecap="round"/>
     <path d="M232 128 C270 104 330 104 368 128" fill="none" stroke="#c9b9a2" stroke-width="12" stroke-linecap="round"/>
     <rect x="112" y="262" width="80" height="152" rx="36" fill="url(#gc)" stroke="#111" stroke-width="1.6"/>
     <rect x="408" y="262" width="80" height="152" rx="36" fill="url(#gc)" stroke="#111" stroke-width="1.6"/>
     <rect x="176" y="278" width="38" height="120" rx="19" fill="url(#gp)" stroke="#8d7d66" stroke-width="1.2"/>
     <rect x="386" y="278" width="38" height="120" rx="19" fill="url(#gp)" stroke="#8d7d66" stroke-width="1.2"/>
     <circle cx="152" cy="338" r="9" fill="#52565f"/><circle cx="448" cy="338" r="9" fill="#52565f"/>`,
  );
}

function coffee() {
  const body = '#2f2420';
  return svg(
    fabric('gb', body),
    `${shadow(300, 448, 110, 9)}
     <path d="M200 80 L400 80 L412 436 Q300 452 188 436 Z" fill="url(#gb)" ${edge(body)}/>
     <path d="M200 80 L400 80 L402 122 H198 Z" fill="${light(body, 0.12)}"/>
     ${Array.from({ length: 9 }, (_, i) => `<path d="M${204 + i * 22} 82 V120" stroke="${dark(body, 0.4)}" stroke-width="1.2"/>`).join('')}
     <rect x="226" y="170" width="148" height="190" rx="6" fill="#e9dfcc" stroke="#b9ab8e" stroke-width="1.2"/>
     <circle cx="300" cy="228" r="30" fill="none" stroke="#2f2420" stroke-width="2.4"/>
     <path d="M300 204 C288 220 288 236 300 252 C312 236 312 220 300 204 Z" fill="#2f2420"/>
     ${label(300, 290, 'DIPLAY', 20, '#2f2420', 'font-weight="700" letter-spacing="4"')}
     ${label(300, 312, 'SINGLE ORIGIN COFFEE', 8.6, '#5b4c40', 'letter-spacing="1.8"')}
     ${label(300, 338, 'Whole Bean · 250 g', 9.4, '#5b4c40')}
     <circle cx="300" cy="150" r="6" fill="#524339" stroke="#14100e" stroke-width="1"/>`,
  );
}

function candle() {
  return svg(
    grad('gg', [[0, '#c9ccc9', 0.9], [0.4, '#f3f4f2', 0.95], [1, '#b9bdb9', 0.9]]) + grad('gw', [[0, '#efe3cb'], [1, '#d9c8a4']], { x1: 0, y1: 0, x2: 0, y2: 1 }),
    `${shadow(300, 440, 120, 9)}
     <rect x="200" y="140" width="200" height="290" rx="18" fill="url(#gg)" stroke="#9ea29e" stroke-width="1.6"/>
     <rect x="210" y="190" width="180" height="230" rx="10" fill="url(#gw)"/>
     <ellipse cx="300" cy="190" rx="90" ry="8" fill="#f4ead6"/>
     <path d="M300 190 V150" stroke="#2c2622" stroke-width="3"/>
     <path d="M300 112 C284 132 286 150 300 160 C314 150 316 132 300 112 Z" fill="#f2b84b"/><path d="M300 128 C294 138 295 148 300 154 C305 148 306 138 300 128 Z" fill="#fff1c9"/>
     <rect x="240" y="250" width="120" height="110" rx="4" fill="#faf8f2" stroke="#d9ceb4" stroke-width="1.2"/>
     ${label(300, 296, 'DIPLAY', 17, '#2f2a24', 'font-weight="700" letter-spacing="4"')}
     ${label(300, 318, 'SOY WAX CANDLE', 8.4, '#6b6354', 'letter-spacing="2"')}
     ${label(300, 340, 'Cedar &amp; Fig', 9.4, '#6b6354')}`,
  );
}

function lamp() {
  return svg(
    grad('gs', [[0, '#d9d4c8'], [0.5, '#f5f2ea'], [1, '#c9c3b4']]) + grad('gb', [[0, '#c8c8c6'], [0.5, '#f1f1ef'], [1, '#a9a9a6']]),
    `${shadow(300, 458, 110, 8)}
     <ellipse cx="300" cy="446" rx="94" ry="14" fill="url(#gb)" stroke="#8a8a87" stroke-width="1.4"/>
     <path d="M300 440 C300 250 300 120 410 90" fill="none" stroke="#2b2b2a" stroke-width="7" stroke-linecap="round"/>
     <path d="M330 100 C340 70 470 70 486 140 L330 140 Z" fill="url(#gs)" stroke="#8d887a" stroke-width="1.6"/>
     <ellipse cx="408" cy="140" rx="78" ry="10" fill="#fff6dd" stroke="#8d887a" stroke-width="1.2"/>
     <ellipse cx="408" cy="141" rx="46" ry="5" fill="#ffe9a8" opacity="0.8"/>`,
  );
}

/* ------------------------------------------------------------------- catalog */

const items = {
  'denim-jacket': () => jacket({ body: '#8fb3dc', collar: 'fleece', pockets: 'chest', buttonColor: '#d9e5f4', trim: '#7ea3cf', lining: '#f1e8d6' }),
  'wool-coat': () => jacket({ body: '#8e949c', collar: 'fleece', buttonColor: '#2a2c30', trim: '#7d838b', hemY: 380 }),
  'sherpa-jacket': () => jacket({ body: '#d9bf92', collar: 'fleece', closure: 'zip', fleeceTrim: true, pockets: 'welt', collarColor: '#f4ead4', lining: '#f4ead4', pullY: 190 }),
  'denim-bomber': () => jacket({ body: '#7fa3d1', sleeve: '#a8c2e4', collar: 'rib', closure: 'zip', panel: '#eef2f8', trim: '#5f86b9' }),
  'puffer-jacket': () => jacket({ body: '#eadfce', collar: 'stand', closure: 'zip', quilted: true, trim: '#d6c9b3', pullY: 168, hemY: 380 }),
  'expedition-parka': () => jacket({ body: '#5f6b4a', collar: 'hood', closure: 'zip', pockets: 'welt', hemY: 424, trim: '#4a5538', collarColor: '#d8cfbd', pullY: 196 }),
  'straight-jeans': () => pants({ body: '#7d9fcc', kind: 'jeans' }),
  'wool-trousers': () => pants({ body: '#b9a98e', kind: 'trousers' }),
  'oxford-shirt': () => shirt({ body: '#dde6f0', kind: 'oxford' }),
  'pique-polo': () => shirt({ body: '#2f4a3b', kind: 'polo' }),
  'market-tote': tote,
  'weekender-backpack': backpack,
  'steel-watch': watch,
  'studio-headphones': headphones,
  'single-origin-coffee': coffee,
  'soy-candle': candle,
  'arc-floor-lamp': lamp,
};

mkdirSync(OUT_DIR, { recursive: true });
for (const [slug, draw] of Object.entries(items)) writeFileSync(join(OUT_DIR, `${slug}.svg`), draw());
console.log(`Wrote ${Object.keys(items).length} catalog images to ${OUT_DIR}`);
