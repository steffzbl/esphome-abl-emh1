// Genereert aansluitschema.svg + aansluitschema.png (ESP32 + 2x RS485 + iEM3155 + ABL)
const fs = require('fs');
const { Resvg } = require('@resvg/resvg-js');

const W = 1600, H = 1060;
const F = "Segoe UI, Arial, sans-serif";
let s = [];
const add = (x) => s.push(x);
const t = (x, y, txt, o = {}) =>
  add(`<text x="${x}" y="${y}" font-family="${F}" font-size="${o.size || 14}" fill="${o.fill || '#1f2933'}" ` +
      `font-weight="${o.bold ? 700 : 400}" text-anchor="${o.anchor || 'start'}" dominant-baseline="${o.base || 'central'}"` +
      `${o.mono ? ' font-family="Consolas, monospace"' : ''}>${txt}</text>`);

// ---------- Kleuren ----------
const C = {
  tx: '#2E9E4F', rx: '#2F7FD0', de: '#8E44AD', a: '#F08C1A', b: '#1F5FBF',
  v33: '#D62828', gnd: '#222222', pcbEsp: '#1d2b3a', pcbRs: '#1f5fa8',
};

// ---------- Achtergrond + titel ----------
add(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
t(60, 50, 'Aansluitschema ESP32 → RS485 → Schneider iEM3155 &amp; ABL eMH3', { size: 28, bold: true });
t(60, 88, 'Pinnen volgens abl-emh3-wallbox.yaml · bovenaanzicht, niet op schaal', { size: 16, fill: '#52606d' });

// ---------- Pin-header helper ----------
function pin(x, y, used) {
  add(`<rect x="${x - 9}" y="${y - 9}" width="18" height="18" rx="2" fill="#2b2b2b" stroke="#111" stroke-width="1"/>`);
  add(`<rect x="${x - 5}" y="${y - 5}" width="10" height="10" rx="1" fill="${used ? '#f2c14e' : '#b89a4a'}"/>`);
  if (used) add(`<circle cx="${x}" cy="${y}" r="13" fill="none" stroke="#f2c14e" stroke-width="2"/>`);
}

// ---------- ESP32 DevKit ----------
const esp = { x: 80, y: 130, w: 290, h: 770 };
add(`<rect x="${esp.x}" y="${esp.y}" width="${esp.w}" height="${esp.h}" rx="14" fill="${C.pcbEsp}" stroke="#0c141d" stroke-width="3"/>`);
// montagegaten
for (const [hx, hy] of [[100, 150], [350, 150], [100, 880], [350, 880]])
  add(`<circle cx="${hx}" cy="${hy}" r="8" fill="#ffffff" stroke="#c9a227" stroke-width="3"/>`);
// WROOM-module
add(`<rect x="160" y="145" width="130" height="285" rx="4" fill="#3a3f44" stroke="#15181b" stroke-width="2"/>`);
let zig = 'M172,160';
for (let i = 0; i < 6; i++) zig += ` l0,28 l17,0 l0,-28 l${i < 5 ? 17 : 0},0`;
add(`<path d="${zig}" fill="none" stroke="#c9a227" stroke-width="3"/>`);
add(`<rect x="168" y="205" width="114" height="215" rx="3" fill="#c9ced4" stroke="#8a9199" stroke-width="2"/>`);
t(225, 300, 'ESP32', { size: 20, bold: true, anchor: 'middle', fill: '#39424b' });
t(225, 326, 'WROOM-32', { size: 14, anchor: 'middle', fill: '#39424b' });
// knoppen, led, USB
add(`<rect x="110" y="835" width="34" height="26" rx="3" fill="#d9d9d9" stroke="#555"/><circle cx="127" cy="848" r="7" fill="#333"/>`);
add(`<rect x="306" y="835" width="34" height="26" rx="3" fill="#d9d9d9" stroke="#555"/><circle cx="323" cy="848" r="7" fill="#333"/>`);
t(127, 822, 'EN', { size: 12, anchor: 'middle', fill: '#e6edf3' });
t(323, 822, 'BOOT', { size: 12, anchor: 'middle', fill: '#e6edf3' });
add(`<rect x="185" y="880" width="80" height="42" rx="5" fill="#b8bec5" stroke="#6b737b" stroke-width="2"/>`);
t(225, 940, 'micro-USB', { size: 13, anchor: 'middle', fill: '#52606d' });
t(225, 615, 'ESP32 DevKit', { size: 14, bold: true, anchor: 'middle', fill: '#e6edf3' }); t(225, 635, '30-pin', { size: 12, anchor: 'middle', fill: '#9fb3c8' });
add(`<rect x="200" y="455" width="50" height="50" rx="3" fill="#111" /><rect x="190" y="520" width="70" height="36" rx="3" fill="#111"/>`);

const leftPins = ['EN', 'VP', 'VN', 'D34', 'D35', 'D32', 'D33', 'D25', 'D26', 'D27', 'D14', 'D12', 'D13', 'GND', 'VIN'];
const rightPins = ['D23', 'D22', 'TX0', 'RX0', 'D21', 'D19', 'D18', 'D5', 'TX2', 'RX2', 'D4', 'D2', 'D15', 'GND', '3V3'];
const usedRight = { D21: 1, D19: 1, D18: 1, TX2: 1, RX2: 1, D4: 1, GND: 1, '3V3': 1 };
const py = (i) => 260 + i * 38;
const espPin = {};
leftPins.forEach((n, i) => { pin(105, py(i), false); if (py(i) > 440) t(122, py(i), n, { size: 13, fill: '#9fb3c8' }); });
rightPins.forEach((n, i) => {
  pin(345, py(i), !!usedRight[n]); espPin[n] = py(i);
  t(328, py(i), n, { size: 13, anchor: 'end', fill: usedRight[n] ? '#ffffff' : '#9fb3c8', bold: !!usedRight[n] });
});

// ---------- RS485-modules ----------
const hdr = ['VCC', 'GND', 'DI', 'DE', 'RE', 'RO'];
function rsModule(y0, caption) {
  const x0 = 640, w = 300, h = 220;
  t(x0, y0 - 18, caption, { size: 17, bold: true });
  add(`<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="8" fill="${C.pcbRs}" stroke="#123a66" stroke-width="3"/>`);
  for (const [hx, hy] of [[x0 + 20, y0 + 16], [x0 + w - 20, y0 + 16], [x0 + 20, y0 + h - 16], [x0 + w - 20, y0 + h - 16]])
    add(`<circle cx="${hx}" cy="${hy}" r="6" fill="#ffffff" stroke="#c9a227" stroke-width="2"/>`);
  const pins = {};
  hdr.forEach((n, i) => {
    const y = y0 + 40 + i * 30; pins[n] = y; pin(660, y, true);
    t(680, y, n, { size: 14, bold: true, fill: '#ffffff' });
  });
  // chip (SOIC-8)
  const cx = 770, cy = y0 + 85;
  for (let i = 0; i < 4; i++) {
    add(`<rect x="${cx - 12}" y="${cy + 8 + i * 14}" width="12" height="6" fill="#c0c0c0"/>`);
    add(`<rect x="${cx + 80}" y="${cy + 8 + i * 14}" width="12" height="6" fill="#c0c0c0"/>`);
  }
  add(`<rect x="${cx}" y="${cy}" width="80" height="70" rx="3" fill="#161616"/>`);
  t(cx + 40, cy + 28, 'MAX3485', { size: 12, anchor: 'middle', fill: '#d0d0d0' });
  t(cx + 40, cy + 46, '(3,3V)', { size: 11, anchor: 'middle', fill: '#a0a0a0' });
  t(cx + 40, y0 + h - 22, 'RS485-module', { size: 13, anchor: 'middle', fill: '#dbe7f5' });
  // 120 ohm weerstand
  add(`<rect x="${x0 + 200}" y="${y0 + 36}" width="30" height="12" rx="2" fill="#1b1b1b"/>`);
  t(x0 + 215, y0 + 62, '120Ω', { size: 11, anchor: 'middle', fill: '#dbe7f5' });
  // schroefterminal A/B
  const ya = y0 + 95, yb = y0 + 145;
  add(`<rect x="900" y="${ya - 28}" width="64" height="106" rx="4" fill="#1f8a4c" stroke="#115c31" stroke-width="2"/>`);
  for (const [yy, lab] of [[ya, 'A'], [yb, 'B']]) {
    add(`<circle cx="932" cy="${yy}" r="12" fill="#c7ccd1" stroke="#6b737b" stroke-width="2"/>`);
    add(`<line x1="924" y1="${yy - 8}" x2="940" y2="${yy + 8}" stroke="#555" stroke-width="3"/>`);
    t(885, yy, lab, { size: 16, bold: true, anchor: 'end', fill: '#ffffff' });
  }
  return { pins, ya, yb };
}
const mIem = rsModule(170, 'RS485-module 2 → kWh-meter (bus iem3155)');
const mAbl = rsModule(610, 'RS485-module 1 → laadpaal (bus uart_bus)');

// ---------- Draden met 'hops' bij kruisingen ----------
const wires = []; // {pts:[[x,y],...], color, dotAt:[[x,y]]}
function wire(pts, color, dots = []) { wires.push({ pts, color, dots }); }
// kWh-meter (omhoog)
wire([[345, espPin.D19], [490, espPin.D19], [490, mIem.pins.DI], [660, mIem.pins.DI]], C.tx);
wire([[345, espPin.D21], [440, espPin.D21], [440, mIem.pins.DE], [660, mIem.pins.DE]], C.de);
wire([[610, mIem.pins.DE], [610, mIem.pins.RE], [660, mIem.pins.RE]], C.de, [[610, mIem.pins.DE]]);
wire([[345, espPin.D18], [540, espPin.D18], [540, mIem.pins.RO], [660, mIem.pins.RO]], C.rx);
// laadpaal (omlaag)
wire([[345, espPin.TX2], [540, espPin.TX2], [540, mAbl.pins.DI], [660, mAbl.pins.DI]], C.tx);
wire([[345, espPin.D4], [440, espPin.D4], [440, mAbl.pins.DE], [660, mAbl.pins.DE]], C.de);
wire([[610, mAbl.pins.DE], [610, mAbl.pins.RE], [660, mAbl.pins.RE]], C.de, [[610, mAbl.pins.DE]]);
wire([[345, espPin.RX2], [490, espPin.RX2], [490, mAbl.pins.RO], [660, mAbl.pins.RO]], C.rx);

const segs = [];
wires.forEach((w, wi) => { for (let i = 0; i < w.pts.length - 1; i++) segs.push({ wi, a: w.pts[i], b: w.pts[i + 1] }); });
const verticals = segs.filter((g) => g.a[0] === g.b[0]);
function wirePath(w, wi) {
  let d = `M${w.pts[0][0]},${w.pts[0][1]}`;
  for (let i = 1; i < w.pts.length; i++) {
    const [x1, y1] = w.pts[i - 1], [x2, y2] = w.pts[i];
    if (y1 === y2) {
      const dir = Math.sign(x2 - x1);
      const hits = verticals.filter((v) => v.wi !== wi &&
        (v.a[0] - x1) * (v.a[0] - x2) < 0 &&
        (y1 - v.a[1]) * (y1 - v.b[1]) < 0).map((v) => v.a[0]).sort((p, q) => dir * (p - q));
      for (const hx of hits) d += ` L${hx - dir * 10},${y1} A10,10 0 0 ${dir > 0 ? 1 : 0} ${hx + dir * 10},${y1}`;
    }
    d += ` L${x2},${y2}`;
  }
  return d;
}
wires.forEach((w, wi) => {
  const d = wirePath(w, wi);
  add(`<path d="${d}" fill="none" stroke="#1a1a1a" stroke-opacity="0.35" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>`);
  add(`<path d="${d}" fill="none" stroke="${w.color}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>`);
  w.dots.forEach(([x, y]) => add(`<circle cx="${x}" cy="${y}" r="7" fill="${w.color}" stroke="#1a1a1a" stroke-width="1.5"/>`));
});
// GPIO-labels langs de draden
const glab = (y, txt) => t(372, y - 13, txt, { size: 13, bold: true, fill: '#1f2933' });
glab(espPin.D21, 'GPIO21'); glab(espPin.D19, 'GPIO19'); glab(espPin.D18, 'GPIO18');
glab(espPin.TX2, 'GPIO17'); glab(espPin.RX2, 'GPIO16'); glab(espPin.D4, 'GPIO4');

// ---------- Voeding als net-labels ----------
function netTag(x, y, label, color, dir) { // dir: -1 = punt naar links, 1 = naar rechts
  const w = 58, h = 26;
  const x0 = dir < 0 ? x - w : x;
  const tip = dir < 0 ? x0 - 12 : x0 + w + 12;
  const base = dir < 0 ? x0 : x0 + w;
  add(`<path d="M${dir < 0 ? x0 + w : x0},${y - h / 2} L${base},${y - h / 2} L${tip},${y} L${base},${y + h / 2} L${dir < 0 ? x0 + w : x0},${y + h / 2} Z" fill="${color}" stroke="#111" stroke-width="1"/>`);
  t(x0 + w / 2, y, label, { size: 13, bold: true, anchor: 'middle', fill: '#ffffff' });
}
function stub(x1, y, x2, color) {
  add(`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#1a1a1a" stroke-opacity="0.35" stroke-width="9" stroke-linecap="round"/>`);
  add(`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${color}" stroke-width="6" stroke-linecap="round"/>`);
}
for (const m of [mIem, mAbl]) {
  stub(620, m.pins.VCC, 660, C.v33); netTag(620, m.pins.VCC, '3V3', C.v33, 1 * -1);
  stub(620, m.pins.GND, 660, C.gnd); netTag(620, m.pins.GND, 'GND', C.gnd, -1);
}
stub(345, espPin['3V3'], 395, C.v33); netTag(395, espPin['3V3'], '3V3', C.v33, 1);
stub(345, espPin.GND, 395, C.gnd); netTag(395, espPin.GND, 'GND', C.gnd, 1);

// ---------- Twisted pair naar apparaten ----------
function twisted(ya, yb, xStart, xEnd) {
  const ym = (ya + yb) / 2, amp = 7, x1 = xStart + 45, x2 = xEnd - 45;
  const mk = (y0, ph) => {
    let d = `M${xStart},${y0} L${xStart + 20},${y0} L${x1},${ym + amp * Math.sin(ph)}`;
    for (let x = x1; x <= x2; x += 3) d += ` L${x},${(ym + amp * Math.sin(ph + (x - x1) / 9)).toFixed(1)}`;
    d += ` L${xEnd - 20},${y0} L${xEnd},${y0}`;
    return d;
  };
  for (const [y0, col, ph] of [[yb, C.b, Math.PI], [ya, C.a, 0]]) {
    const d = mk(y0, ph);
    add(`<path d="${d}" fill="none" stroke="#1a1a1a" stroke-opacity="0.35" stroke-width="8" stroke-linejoin="round"/>`);
    add(`<path d="${d}" fill="none" stroke="${col}" stroke-width="5" stroke-linejoin="round"/>`);
  }
  t((xStart + xEnd) / 2, ya - 32, 'getwist paar (bv. UTP)', { size: 13, anchor: 'middle', fill: '#52606d' });
}
twisted(mIem.ya, mIem.yb, 944, 1180);
twisted(mAbl.ya, mAbl.yb, 944, 1180);

// ---------- Schneider iEM3155 ----------
add(`<rect x="1170" y="150" width="360" height="290" rx="12" fill="#eef1f4" stroke="#6c757d" stroke-width="3"/>`);
add(`<rect x="1170" y="${mIem.ya - 40}" width="80" height="170" rx="4" fill="#9aa4ae" stroke="#5f6b76" stroke-width="2"/>`);
const iemTerm = [[mIem.ya, 'D1 / +'], [mIem.yb, 'D0 / −'], [mIem.yb + 50, '0V']];
for (const [yy, lab] of iemTerm) {
  add(`<circle cx="1190" cy="${yy}" r="11" fill="#d7dce1" stroke="#5f6b76" stroke-width="2"/>`);
  add(`<line x1="1183" y1="${yy - 7}" x2="1197" y2="${yy + 7}" stroke="#555" stroke-width="3"/>`);
  t(1208, yy, lab, { size: 13, bold: true, fill: '#1f2933' });
}
stub(1120, mIem.yb + 50, 1180, C.gnd); netTag(1120, mIem.yb + 50, 'GND', C.gnd, -1);
t(1030, mIem.yb + 78, '0V optioneel naar GND', { size: 12, anchor: 'middle', fill: '#52606d' });
add(`<rect x="1290" y="180" width="210" height="70" rx="6" fill="#28402c" stroke="#18261a" stroke-width="2"/>`);
t(1395, 215, '1234.567 kWh', { size: 20, anchor: 'middle', fill: '#9be39f', bold: true });
t(1395, 300, 'Schneider iEM3155', { size: 19, bold: true, anchor: 'middle' });
t(1395, 330, 'Modbus-RTU · adres 2', { size: 14, anchor: 'middle', fill: '#52606d' });
t(1395, 352, '19200 baud · 8E1', { size: 14, anchor: 'middle', fill: '#52606d' });

// ---------- ABL eMH3 controllerprint ----------
add(`<rect x="1170" y="590" width="360" height="270" rx="12" fill="#2d6a4f" stroke="#1b4332" stroke-width="3"/>`);
add(`<rect x="1170" y="${mAbl.ya - 40}" width="80" height="130" rx="4" fill="#1f8a4c" stroke="#115c31" stroke-width="2"/>`);
for (const [yy, lab] of [[mAbl.ya, 'A (+)'], [mAbl.yb, 'B (−)']]) {
  add(`<circle cx="1190" cy="${yy}" r="11" fill="#c7ccd1" stroke="#6b737b" stroke-width="2"/>`);
  add(`<line x1="1183" y1="${yy - 7}" x2="1197" y2="${yy + 7}" stroke="#555" stroke-width="3"/>`);
  t(1208, yy, lab, { size: 13, bold: true, fill: '#ffffff' });
}
t(1395, 660, 'ABL eMH3', { size: 19, bold: true, anchor: 'middle', fill: '#ffffff' });
t(1395, 688, 'controllerprint', { size: 14, anchor: 'middle', fill: '#d8f3dc' });
t(1395, 716, 'Modbus-ASCII · 38400 · 8E1', { size: 14, anchor: 'middle', fill: '#d8f3dc' });
add(`<rect x="1280" y="760" width="230" height="70" rx="6" fill="#fff3cd" stroke="#d62828" stroke-width="2"/>`);
t(1395, 783, '⚠ 230/400V aanwezig', { size: 14, bold: true, anchor: 'middle', fill: '#9b1c1c' });
t(1395, 807, 'eerst spanningsloos maken', { size: 13, anchor: 'middle', fill: '#9b1c1c' });

// ---------- Legenda ----------
const ly = 985;
add(`<rect x="60" y="${ly - 35}" width="1480" height="80" rx="10" fill="#f5f7fa" stroke="#d9e2ec"/>`);
const leg = [[C.tx, 'TX → DI'], [C.rx, 'RO → RX'], [C.de, 'DE + RE (richting)'], [C.a, 'A (+)'], [C.b, 'B (−)'], [C.v33, '3V3'], [C.gnd, 'GND']];
let lx = 90;
for (const [col, lab] of leg) {
  add(`<line x1="${lx}" y1="${ly}" x2="${lx + 40}" y2="${ly}" stroke="${col}" stroke-width="6" stroke-linecap="round"/>`);
  t(lx + 52, ly, lab, { size: 14 });
  lx += lab.length * 8 + 80;
}
t(1510, ly, 'Gelijke net-labels (3V3 / GND) zijn met elkaar verbonden', { size: 13, anchor: 'end', fill: '#52606d' });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${s.join('\n')}</svg>`;
fs.writeFileSync('aansluitschema.svg', svg);
const png = new Resvg(svg, { fitTo: { mode: 'width', value: 3200 }, font: { loadSystemFonts: true, defaultFontFamily: 'Segoe UI' } }).render().asPng();
fs.writeFileSync('aansluitschema.png', png);
console.log('ok', png.length);

