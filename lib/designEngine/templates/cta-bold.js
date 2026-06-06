import { getDimensions, getTypography } from '../formats.js';

/**
 * cta-bold — call to action dominante, botón grande.
 * Ideal para el último slide del carrusel.
 *
 * contents: { title, subtitle, ctaText, label, backgroundImage? }
 */
export function generate(brand, contents, format = 'instagram-carousel') {
  const { width, height } = getDimensions(format);
  const typo = getTypography(format);

  const accent  = brand.palette?.accent   ?? brand.colors?.accent   ?? '#f59e0b';
  const primary = brand.palette?.primary  ?? brand.colors?.primary  ?? '#0c0a09';

  const title    = contents.title    ?? '';
  const subtitle = contents.subtitle ?? '';
  const ctaText  = contents.ctaText  ?? 'Comenzar ahora';
  const label    = contents.label    ?? '';
  const bg       = contents.backgroundImage;

  const btnH = typo.cta + 36;
  const btnY = 70;

  const elements = [];

  if (bg) {
    elements.push({
      type: 'overlay', variant: 'gradient-bottom',
      color: primary, opacity: 0.92, height: '80%', zIndex: 3,
    });
    elements.push({
      type: 'overlay', variant: 'gradient-top',
      color: primary, opacity: 0.5, height: '30%', zIndex: 3,
    });
  }

  // Burst decorativo
  elements.push({
    type: 'svg',
    x: 0, y: 0, width, height, zIndex: 1,
    content: `
      <circle cx="${width * 0.65}" cy="${height * 0.22}" r="180" fill="${accent}" opacity="0.07"/>
      <circle cx="${width * 0.65}" cy="${height * 0.22}" r="120" fill="${accent}" opacity="0.06"/>
      <circle cx="${width * 0.65}" cy="${height * 0.22}" r="70"  fill="${accent}" opacity="0.08"/>
      <circle cx="${width * 0.65}" cy="${height * 0.22}" r="28"  fill="${accent}" opacity="0.6"/>
    `,
  });

  if (label) {
    elements.push({
      type: 'chip', text: label,
      x: 40, y: 60,
      zIndex: 25,
    });
  }

  if (title) {
    elements.push({
      type: 'text', role: 'title',
      content: title,
      x: 40, y: `bottom:${btnH + btnY + typo.subtitle + 50}`,
      width: width - 80,
      color: '#ffffff', weight: 700, shadow: true,
      zIndex: 20,
    });
  }

  if (subtitle) {
    elements.push({
      type: 'text', role: 'subtitle',
      content: subtitle,
      x: 40, y: `bottom:${btnH + btnY + 14}`,
      width: width - 80,
      color: 'rgba(255,255,255,0.75)',
      zIndex: 20,
    });
  }

  // Botón CTA
  elements.push({
    type: 'shape', shape: 'rect',
    x: 40, y: `bottom:${btnY}`,
    width: width - 80, height: btnH,
    fill: accent, borderRadius: 14,
    zIndex: 22,
  });

  elements.push({
    type: 'text', role: 'cta',
    content: ctaText,
    x: 40, y: `bottom:${btnY + Math.round((btnH - typo.cta) / 2)}`,
    width: width - 80,
    color: '#000000',
    weight: 700, align: 'center',
    letterSpacing: 0.04,
    zIndex: 23,
  });

  return {
    format,
    brand,
    pages: [{
      background: bg
        ? { type: 'image', src: bg, fit: 'cover' }
        : { type: 'radial', cx: '65%', cy: '22%', stops: [{ color: '#3d1e00', pos: 0 }, { color: primary, pos: 70 }] },
      elements,
    }],
  };
}
