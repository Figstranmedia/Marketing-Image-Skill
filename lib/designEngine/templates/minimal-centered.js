import { getDimensions, getTypography } from '../formats.js';

/**
 * minimal-centered — fondo sólido, contenido centrado, mucho espacio en blanco.
 * El más limpio. Ideal para quotes, mensajes cortos, brand statements.
 *
 * contents: { title, subtitle, label, backgroundColor?, textColor? }
 */
export function generate(brand, contents, format = 'instagram-carousel') {
  const { width, height } = getDimensions(format);
  const typo = getTypography(format);

  const accent = brand.palette?.accent ?? brand.colors?.accent ?? '#f97316';
  const bg     = contents.backgroundColor ?? brand.palette?.primary ?? brand.colors?.primary ?? '#0f0f0f';
  const tc     = contents.textColor ?? '#ffffff';

  const title    = contents.title ?? '';
  const subtitle = contents.subtitle ?? '';
  const label    = contents.label ?? '';

  const elements = [];

  // Decoración sutil: círculo grande en fondo
  elements.push({
    type: 'shape', shape: 'circle',
    x: 'center', y: 'center',
    width: Math.min(width, height) * 0.85,
    height: Math.min(width, height) * 0.85,
    fill: 'transparent',
    stroke: accent,
    strokeWidth: 1,
    opacity: 0.08,
    zIndex: 1,
  });

  if (label) {
    elements.push({
      type: 'chip', text: label,
      x: 'center', y: `top:${Math.round(height * 0.12)}`,
      color: 'transparent',
      textColor: accent,
      border: `1px solid ${accent}`,
      zIndex: 25,
    });
  }

  if (title) {
    const titleY = subtitle ? 'center' : 'center';
    const titleOffset = subtitle ? Math.round(typo.subtitle / 2 + 20) : 0;
    elements.push({
      type: 'text', role: 'title',
      content: title,
      x: 'center', y: titleOffset ? `top:${Math.round(height / 2 - typo.title - titleOffset)}` : 'center',
      width: width - 120,
      color: tc,
      weight: 700,
      align: 'center',
      zIndex: 20,
    });
  }

  if (subtitle) {
    elements.push({
      type: 'text', role: 'subtitle',
      content: subtitle,
      x: 'center', y: `top:${Math.round(height / 2 + 20)}`,
      width: width - 160,
      color: tc,
      opacity: 0.7,
      align: 'center',
      zIndex: 20,
    });
  }

  // Acento: línea corta centrada abajo del título
  elements.push({
    type: 'shape', shape: 'rect',
    x: 'center', y: `bottom:${Math.round(height * 0.12)}`,
    width: 40, height: 4,
    fill: accent, borderRadius: 2,
    zIndex: 18,
  });

  return {
    format,
    brand,
    pages: [{
      background: { type: 'solid', color: bg },
      elements,
    }],
  };
}
