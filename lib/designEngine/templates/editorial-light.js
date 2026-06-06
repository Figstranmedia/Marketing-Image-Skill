import { getDimensions, getTypography } from '../formats.js';

/**
 * editorial-light — fondo claro, tipografía en colores de marca.
 * Ideal para contenido profesional / LinkedIn.
 *
 * contents: { title, subtitle, label, accentColor? }
 */
export function generate(brand, contents, format = 'instagram-carousel') {
  const { width, height } = getDimensions(format);
  const typo = getTypography(format);

  const accent  = contents.accentColor ?? brand.palette?.accent ?? brand.colors?.accent ?? '#0f0f0f';
  const primary = brand.palette?.primary ?? brand.colors?.primary ?? '#0f0f0f';

  const label    = contents.label ?? '';
  const title    = contents.title ?? '';
  const subtitle = contents.subtitle ?? '';

  const titleBottomOffset = typo.subtitle + 80;

  const elements = [];

  // Decoración: líneas verticales sutiles
  elements.push({
    type: 'svg',
    x: 0, y: 0, width, height,
    zIndex: 1,
    content: `
      <rect x="${width - 80}" y="0" width="3" height="${height * 0.4}" fill="${accent}" opacity="0.15" rx="2"/>
      <rect x="${width - 60}" y="0" width="3" height="${height * 0.25}" fill="${accent}" opacity="0.08" rx="2"/>
    `,
  });

  if (label) {
    elements.push({
      type: 'chip', text: label,
      x: 40, y: 60,
      color: accent,
      textColor: '#ffffff',
      zIndex: 25,
    });
  }

  // Línea de acento
  elements.push({
    type: 'shape', shape: 'rect',
    x: 40, y: `bottom:${titleBottomOffset + 20}`,
    width: 60, height: 5,
    fill: accent, borderRadius: 3,
    zIndex: 18,
  });

  if (title) {
    elements.push({
      type: 'text', role: 'title',
      content: title,
      x: 40, y: `bottom:${titleBottomOffset}`,
      width: width - 80,
      color: primary,
      weight: 700,
      zIndex: 20,
    });
  }

  if (subtitle) {
    elements.push({
      type: 'text', role: 'subtitle',
      content: subtitle,
      x: 40, y: 'bottom:70',
      width: width - 80,
      color: `rgba(0,0,0,0.65)`,
      zIndex: 20,
    });
  }

  return {
    format,
    brand,
    pages: [{
      background: { type: 'solid', color: '#f8f6f2' },
      elements,
    }],
  };
}
