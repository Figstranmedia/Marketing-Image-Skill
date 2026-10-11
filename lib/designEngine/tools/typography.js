import { FORMAT_TYPOGRAPHY } from '../formats.js';

function encodeFontName(name) {
  return (name || 'Inter').replace(/\s+/g, '+');
}

/**
 * Genera el bloque <link> de Google Fonts para un conjunto de fuentes.
 * @param {string[]} fontNames - Array de nombres de fuentes
 */
export function googleFontsLink(fontNames = []) {
  const unique = [...new Set(fontNames.filter(Boolean))];
  if (unique.length === 0) return '';
  const families = unique
    .map(f => `family=${encodeFontName(f)}:ital,wght@0,400;0,500;0,700;1,400`)
    .join('&');
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${families}&display=swap" rel="stylesheet">`;
}

/**
 * Extrae todas las fuentes únicas usadas en un DesignSpec.
 * @param {object} spec - DesignSpec completo
 * @param {object} brand - Brand profile
 */
export function collectFonts(spec, brand = {}) {
  const fonts = new Set();
  if (brand.fonts?.heading) fonts.add(brand.fonts.heading);
  if (brand.fonts?.body) fonts.add(brand.fonts.body);

  for (const page of spec.pages || []) {
    for (const el of page.elements || []) {
      if (el.type === 'text' && el.font) fonts.add(el.font);
      if (el.type === 'chip' && el.font) fonts.add(el.font);
    }
  }

  return [...fonts];
}

/**
 * Devuelve el tamaño de fuente por defecto para un role en un formato.
 */
export function defaultSizeForRole(role, format) {
  const typo = FORMAT_TYPOGRAPHY[format] || FORMAT_TYPOGRAPHY['instagram-carousel'];
  return typo[role] ?? typo.body ?? 28;
}

// Clasificaciones tipográficas que una marca puede declarar en vez de una fuente concreta
// (ej. brand.json → tipografia.titulo: "Didone"). Se traducen a una Google Font de esa familia.
const FONT_CLASSES = [
  [/^(didone|didot|bodoni)$/i,                 'Bodoni Moda',       'serif'],
  [/^(garalde|garamond|old ?style)$/i,         'EB Garamond',       'serif'],
  [/^(transitional|baskerville)$/i,            'Libre Baskerville', 'serif'],
  [/^(slab|slab ?serif|egyptian)$/i,           'Roboto Slab',       'serif'],
  [/^serif$/i,                                 'Source Serif 4',    'serif'],
  [/^(grotesk|grotesque)$/i,                   'Space Grotesk',     'sans-serif'],
  [/^(neo-?grotesque|helvetica|swiss)$/i,      'Inter',             'sans-serif'],
  [/^geometric$/i,                             'Poppins',           'sans-serif'],
  [/^humanist$/i,                              'Source Sans 3',     'sans-serif'],
  [/^(sans|sans-serif)$/i,                     'Inter',             'sans-serif'],
  [/^(mono|monospace)$/i,                      'JetBrains Mono',    'monospace'],
];

const SERIF_HINT = /serif|bodoni|didot|garamond|baskerville|playfair|lora|merriweather|cormorant|caslon|crimson|libre caslon|dm serif|fraunces/i;

/**
 * Resuelve el nombre declarado por la marca a { family, fallback }.
 * Una clasificación ("Didone") se cambia por una fuente real; un nombre concreto se respeta
 * y solo se le elige el genérico de respaldo correcto (serif / sans-serif / monospace).
 */
export function resolveFont(name) {
  if (!name) return { family: 'Inter', fallback: 'sans-serif' };
  const trimmed = name.trim();
  for (const [re, family, fallback] of FONT_CLASSES) {
    if (re.test(trimmed)) return { family, fallback };
  }
  if (/mono/i.test(trimmed)) return { family: trimmed, fallback: 'monospace' };
  const isSerif = SERIF_HINT.test(trimmed) && !/sans/i.test(trimmed);
  return { family: trimmed, fallback: isSerif ? 'serif' : 'sans-serif' };
}

/**
 * Normaliza el nombre de una fuente para usarlo en CSS font-family.
 * Agrega comillas si el nombre tiene espacios.
 */
export function cssFontFamily(name) {
  const { family, fallback } = resolveFont(name);
  return family.includes(' ') ? `'${family}', ${fallback}` : `${family}, ${fallback}`;
}
