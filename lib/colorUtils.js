/**
 * Utilidades de color compartidas (projectAnalyzer, imageScanner).
 * Contraste según WCAG 2.x.
 */

export const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isHex(val) {
  return typeof val === 'string' && HEX_RE.test(val);
}

export function normalizeHex(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return `#${h.toUpperCase()}`;
}

export function hexToRgb(hex) {
  const h = normalizeHex(hex);
  return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
}

export function rgbToHex([r, g, b]) {
  const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

export function luminance(hex) {
  const toLinear = c => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Mezcla lineal en sRGB: t=0 → a, t=1 → b */
export function mix(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(ca.map((v, i) => v + (cb[i] - v) * t));
}

/**
 * Acerca `color` hacia blanco (sobre fondo oscuro) o negro (sobre fondo claro)
 * lo mínimo necesario para alcanzar `min` de contraste contra `against`.
 */
export function ensureContrast(color, against, min = 3) {
  if (contrast(color, against) >= min) return normalizeHex(color);
  const target = luminance(against) < 0.18 ? '#FFFFFF' : '#000000';
  for (let t = 0.05; t <= 1.0001; t += 0.05) {
    const c = mix(color, target, t);
    if (contrast(c, against) >= min) return c;
  }
  return target;
}

/** Color de texto legible sobre `bg`: blanco o casi negro, el de mayor contraste. */
export function textOn(bg) {
  return contrast('#FFFFFF', bg) >= contrast('#111111', bg) ? '#FFFFFF' : '#111111';
}
