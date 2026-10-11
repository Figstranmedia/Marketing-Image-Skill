import fs from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import { rgbToHex, luminance, hexToRgb } from './colorUtils.js';

/**
 * Escanea la carpeta del producto (SKILL.md, paso 2F): clasifica imágenes y mide la
 * paleta de los logos/PNG por píxeles, ignorando el fondo blanco y la transparencia.
 * Sin dependencias: decodifica PNG con zlib. JPG/WebP se listan pero no se miden.
 */

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'marketing-assets', '.marketing-assets', 'dist', 'build',
  '.next', 'out', 'salida', 'chunks', '.cache',
]);
const SKIP_PATHS = [/Graficas[\\/]ai-generadas/i, /public[\\/]icons/i, /favicon/i];
const LOGO_RE = /logo|isotipo|imagotipo|isologo|brand|marca/i;
const RASTER_RE = /\.(png|jpe?g|webp|gif)$/i;

const MAX_DEPTH = 6;
const MAX_MEASURED = 30;
const MAX_SAMPLES = 160_000; // píxeles muestreados por imagen

// ── PNG ────────────────────────────────────────────────────────────────────────

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/**
 * Decodifica un PNG no entrelazado a RGBA 8 bits.
 * Soporta tipos de color 0, 2, 3, 4, 6 y profundidades 1–16. Devuelve null si no puede.
 */
export function decodePNG(buf) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIG)) return null;

  let off = 8, ihdr = null, palette = null, trns = null;
  const idat = [];
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0), height: data.readUInt32BE(4),
        depth: data[8], color: data[9], interlace: data[12],
      };
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (!ihdr || ihdr.interlace !== 0 || !(ihdr.color in CHANNELS)) return null;

  const { width, height, depth, color } = ihdr;
  const channels = CHANNELS[color];
  const bitsPerPixel = channels * depth;
  const bpp = Math.max(1, bitsPerPixel >> 3);
  const stride = Math.ceil((width * bitsPerPixel) / 8);

  let raw;
  try { raw = zlib.inflateSync(Buffer.concat(idat)); } catch { return null; }
  if (raw.length < (stride + 1) * height) return null;

  // Quitar filtros por scanline
  const px = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const r = raw[src + x];
      const a = x >= bpp ? px[dst + x - bpp] : 0;
      const b = y > 0 ? px[dst + x - stride] : 0;
      const c = x >= bpp && y > 0 ? px[dst + x - stride - bpp] : 0;
      let v;
      switch (filter) {
        case 0: v = r; break;
        case 1: v = r + a; break;
        case 2: v = r + b; break;
        case 3: v = r + ((a + b) >> 1); break;
        case 4: v = r + paeth(a, b, c); break;
        default: return null;
      }
      px[dst + x] = v & 0xff;
    }
  }

  // Lector de una muestra (canal) en la posición dada, normalizada a 8 bits
  const sample = (rowStart, index) => {
    if (depth === 8) return px[rowStart + index];
    if (depth === 16) return px[rowStart + index * 2];
    const bitPos = index * depth;
    const byte = px[rowStart + (bitPos >> 3)];
    const shift = 8 - depth - (bitPos & 7);
    return (byte >> shift) & ((1 << depth) - 1);
  };
  const scale = depth < 8 && color !== 3 ? 255 / ((1 << depth) - 1) : 1;

  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const row = y * stride;
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const i = x * channels;
      let r, g, b, al = 255;
      if (color === 3) {
        const idx = sample(row, i);
        r = palette?.[idx * 3] ?? 0; g = palette?.[idx * 3 + 1] ?? 0; b = palette?.[idx * 3 + 2] ?? 0;
        if (trns && idx < trns.length) al = trns[idx];
      } else if (color === 0 || color === 4) {
        r = g = b = Math.round(sample(row, i) * scale);
        if (color === 4) al = sample(row, i + 1);
      } else {
        r = sample(row, i); g = sample(row, i + 1); b = sample(row, i + 2);
        if (color === 6) al = sample(row, i + 3);
      }
      rgba[o] = r; rgba[o + 1] = g; rgba[o + 2] = b; rgba[o + 3] = al;
    }
  }
  return { width, height, data: rgba };
}

// ── Paleta ─────────────────────────────────────────────────────────────────────

/**
 * Histograma normalizado de una imagen RGBA: cada color cuantizado a 5 bits por canal,
 * con su color medio. Ignora alfa < 200 y casi-blanco (los tres canales > 235).
 */
function histogram({ width, height, data }) {
  const total = width * height;
  const step = Math.max(1, Math.floor(total / MAX_SAMPLES));
  const buckets = new Map();
  let counted = 0;
  for (let p = 0; p < total; p += step) {
    const o = p * 4;
    const r = data[o], g = data[o + 1], b = data[o + 2], a = data[o + 3];
    if (a < 200) continue;
    if (r > 235 && g > 235 && b > 235) continue;
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const bk = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bk.n++; bk.r += r; bk.g += g; bk.b += b;
    buckets.set(key, bk);
    counted++;
  }
  if (counted === 0) return [];
  return [...buckets.values()].map(bk => ({
    rgb: [bk.r / bk.n, bk.g / bk.n, bk.b / bk.n],
    share: bk.n / counted,
  }));
}

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Agrupa colores cercanos (antialias, compresión) y devuelve los dominantes. */
function cluster(entries, radius = 28, top = 6) {
  const sorted = [...entries].sort((x, y) => y.share - x.share);
  const groups = [];
  for (const e of sorted) {
    const g = groups.find(gr => dist(gr.rgb, e.rgb) < radius);
    if (g) {
      const w = g.share + e.share;
      g.rgb = g.rgb.map((v, i) => (v * g.share + e.rgb[i] * e.share) / w);
      g.share = w;
    } else {
      groups.push({ rgb: [...e.rgb], share: e.share });
    }
  }
  const total = groups.reduce((s, g) => s + g.share, 0) || 1;
  return groups
    .sort((x, y) => y.share - x.share)
    .filter(g => g.share / total >= 0.02)
    .slice(0, top)
    .map(g => ({ hex: rgbToHex(g.rgb), share: +(g.share / total).toFixed(3) }));
}

export function saturation(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  const l = (max + min) / 2;
  return (max - min) / (1 - Math.abs(2 * l - 1));
}

// ── Escaneo ────────────────────────────────────────────────────────────────────

export class ImageScanner {
  constructor(projectPath) {
    this.projectPath = path.resolve(projectPath);
  }

  async walk(dir = this.projectPath, depth = 0, out = []) {
    if (depth > MAX_DEPTH) return out;
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return out; }
    for (const e of entries) {
      if (e.name.startsWith('.') && e.name !== '.') continue;
      const full = path.join(dir, e.name);
      const rel = path.relative(this.projectPath, full);
      if (SKIP_PATHS.some(re => re.test(rel))) continue;
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) await this.walk(full, depth + 1, out);
      } else if (RASTER_RE.test(e.name) || /\.svg$/i.test(e.name)) {
        out.push(rel);
      }
    }
    return out;
  }

  /** Un SVG que solo envuelve un raster (<image href="data:...">) no es un vector real. */
  async isRealVector(rel) {
    try {
      const svg = await fs.readFile(path.join(this.projectPath, rel), 'utf-8');
      return !/<image[\s>]/i.test(svg) && /<(path|circle|rect|polygon|ellipse|line|text)[\s>]/i.test(svg);
    } catch {
      return false;
    }
  }

  /**
   * @returns {Promise<{ dominant: string[], colors: {hex, share}[], measured: string[],
   *   logos: string[], images: string[], logo: string|null, logoVector: string|null }>}
   */
  async scan() {
    const files = await this.walk();
    const logos = files.filter(f => LOGO_RE.test(f));
    const images = files.filter(f => RASTER_RE.test(f) && !LOGO_RE.test(f));
    const pngs = files.filter(f => /\.png$/i.test(f));

    // Mide logos PNG; si no hay, el resto de PNG. Cada archivo pesa igual (un logo pesa 3).
    const logoPngs = pngs.filter(f => LOGO_RE.test(f));
    const toMeasure = (logoPngs.length ? logoPngs : pngs).slice(0, MAX_MEASURED);
    const merged = [];
    const measured = [];
    for (const rel of toMeasure) {
      let img;
      try { img = decodePNG(await fs.readFile(path.join(this.projectPath, rel))); } catch { img = null; }
      if (!img) continue;
      const weight = LOGO_RE.test(rel) ? 3 : 1;
      const hist = histogram(img);
      if (!hist.length) continue;
      hist.forEach(h => merged.push({ rgb: h.rgb, share: h.share * weight }));
      measured.push(rel);
    }
    const colors = cluster(merged);

    const svgLogos = logos.filter(f => /\.svg$/i.test(f));
    let logoVector = null;
    for (const f of svgLogos) {
      if (await this.isRealVector(f)) { logoVector = f; break; }
    }
    const logo = logos.find(f => RASTER_RE.test(f)) ?? svgLogos[0] ?? null;

    return {
      dominant: colors.map(c => c.hex),
      colors,
      measured,
      logos,
      images,
      logo,
      logoVector,
    };
  }

  /**
   * Asigna roles de marca a los colores medidos:
   *  - tinta: el más oscuro con luminancia < 0.08 (si no, #1A1A1A)
   *  - acento: el cromático (saturación ≥ 0.25) más frecuente
   *  - acento_claro: el siguiente cromático, si es más claro que el acento
   *  - fondo: #FFFFFF — el blanco se excluye de la medición, así que no se puede inferir
   */
  static assignRoles(colors) {
    const hexes = colors.map(c => c.hex);
    const dark = hexes.filter(h => luminance(h) < 0.08).sort((a, b) => luminance(a) - luminance(b));
    const chromatic = hexes.filter(h => saturation(h) >= 0.25 && luminance(h) >= 0.02);
    const acento = chromatic[0] ?? null;
    const acentoClaro = chromatic.slice(1).find(h => luminance(h) > luminance(acento)) ?? null;
    return {
      fondo: '#FFFFFF',
      tinta: dark[0] ?? '#1A1A1A',
      acento,
      acento_claro: acentoClaro,
    };
  }
}
