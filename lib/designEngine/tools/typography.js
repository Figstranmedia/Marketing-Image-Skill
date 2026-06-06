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

/**
 * Normaliza el nombre de una fuente para usarlo en CSS font-family.
 * Agrega comillas si el nombre tiene espacios.
 */
export function cssFontFamily(name) {
  if (!name) return 'Inter, sans-serif';
  return name.includes(' ') ? `'${name}', sans-serif` : `${name}, sans-serif`;
}
