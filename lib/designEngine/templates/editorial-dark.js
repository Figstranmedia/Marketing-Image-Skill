import { getDimensions, getTypography } from '../formats.js';

/**
 * editorial-dark — fondo oscuro con gradiente, tipografía dominante, acento de color.
 * Ideal para slides de presentación sin imagen de fondo.
 *
 * contents: { title, subtitle, label, accentColor? }
 */
export function generate(brand, contents, format = 'instagram-carousel') {
  const { width, height } = getDimensions(format);
  const typo = getTypography(format);

  const primary  = brand.palette?.primary   ?? brand.colors?.primary   ?? '#0f0f0f';
  const secondary = brand.palette?.secondary ?? brand.colors?.secondary ?? '#1a1a2e';
  const accent   = contents.accentColor ?? brand.palette?.accent ?? brand.colors?.accent ?? '#f97316';

  const label    = contents.label ?? '';
  const title    = contents.title ?? '';
  const subtitle = contents.subtitle ?? '';

  const titleBottomOffset = typo.subtitle + 80;

  const elements = [];

  // Decoración SVG: burst sutil en esquina superior derecha
  elements.push({
    type: 'svg',
    x: 0, y: 0, width, height,
    zIndex: 1,
    content: `
      <circle cx="${width * 0.82}" cy="${height * 0.18}" r="140" fill="${accent}" opacity="0.06"/>
      <circle cx="${width * 0.82}" cy="${height * 0.18}" r="90"  fill="${accent}" opacity="0.05"/>
      <circle cx="${width * 0.82}" cy="${height * 0.18}" r="50"  fill="${accent}" opacity="0.07"/>
      <circle cx="${width * 0.82}" cy="${height * 0.18}" r="20"  fill="${accent}" opacity="0.12"/>
    `,
  });

  if (label) {
    elements.push({
      type: 'chip', text: label,
      x: 40, y: 60,
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
      color: '#ffffff',
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
      color: 'rgba(255,255,255,0.78)',
      zIndex: 20,
    });
  }

  return {
    format,
    brand,
    pages: [{
      background: {
        type: 'gradient',
        angle: 145,
        stops: [
          { color: primary, pos: 0 },
          { color: secondary, pos: 100 },
        ],
      },
      elements,
    }],
  };
}
