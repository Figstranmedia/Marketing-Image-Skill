import { getDimensions, getTypography } from '../formats.js';

/**
 * announcement — evento/fecha prominente.
 * Ideal para conciertos, lanzamientos, eventos.
 *
 * contents: { title, date, location?, subtitle?, label?, backgroundImage? }
 */
export function generate(brand, contents, format = 'instagram-carousel') {
  const { width, height } = getDimensions(format);
  const typo = getTypography(format);

  const accent   = brand.palette?.accent   ?? brand.colors?.accent   ?? '#f59e0b';
  const primary  = brand.palette?.primary  ?? brand.colors?.primary  ?? '#0c0a09';
  const secondary = brand.palette?.secondary ?? brand.colors?.secondary ?? '#1a1a2e';

  const title    = contents.title    ?? '';
  const date     = contents.date     ?? '';
  const location = contents.location ?? '';
  const subtitle = contents.subtitle ?? '';
  const label    = contents.label    ?? '';
  const bg       = contents.backgroundImage;

  const dateSize     = Math.round(typo.subtitle * 1.1);
  const locationSize = Math.round(typo.label * 1.1);

  const elements = [];

  if (bg) {
    elements.push({
      type: 'overlay', variant: 'solid', color: primary, opacity: 0.72, zIndex: 3,
    });
    elements.push({
      type: 'overlay', variant: 'gradient-bottom',
      color: primary, opacity: 0.9, height: '50%', zIndex: 4,
    });
  }

  // Textura diagonal sutil
  if (!bg) {
    elements.push({
      type: 'svg',
      x: 0, y: 0, width, height, zIndex: 1,
      content: `
        <defs>
          <pattern id="diag-${Date.now()}" patternUnits="userSpaceOnUse" width="20" height="20" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="20" stroke="${accent}" stroke-width="0.5" opacity="0.1"/>
          </pattern>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#diag-${Date.now()})"/>
        <circle cx="${width * 0.5}" cy="${height * 0.38}" r="${Math.round(Math.min(width, height) * 0.4)}" fill="${accent}" opacity="0.04"/>
      `,
    });
  }

  if (label) {
    elements.push({
      type: 'chip', text: label,
      x: 40, y: 60,
      color: accent, textColor: '#000000',
      zIndex: 25,
    });
  }

  if (date) {
    elements.push({
      type: 'text', role: 'subtitle',
      content: date,
      x: 40, y: bg ? `top:${Math.round(height * 0.32)}` : `top:${Math.round(height * 0.28)}`,
      width: width - 80,
      color: accent,
      size: dateSize,
      weight: 700,
      letterSpacing: 0.12,
      zIndex: 20,
    });
  }

  if (title) {
    const titleY = date
      ? (bg ? Math.round(height * 0.32) : Math.round(height * 0.28)) + dateSize + 20
      : Math.round(height * 0.35);

    elements.push({
      type: 'text', role: 'title',
      content: title,
      x: 40, y: `top:${titleY}`,
      width: width - 80,
      color: '#ffffff', weight: 700, shadow: true,
      zIndex: 20,
    });
  }

  if (location) {
    elements.push({
      type: 'text', role: 'label',
      content: `📍 ${location}`,
      x: 40, y: 'bottom:120',
      width: width - 80,
      color: 'rgba(255,255,255,0.75)',
      size: locationSize,
      letterSpacing: 0.06,
      zIndex: 20,
    });
  }

  if (subtitle) {
    elements.push({
      type: 'text', role: 'subtitle',
      content: subtitle,
      x: 40, y: 'bottom:70',
      width: width - 80,
      color: 'rgba(255,255,255,0.65)',
      zIndex: 20,
    });
  }

  return {
    format,
    brand,
    pages: [{
      background: bg
        ? { type: 'image', src: bg, fit: 'cover' }
        : {
            type: 'texture',
            variant: 'noise',
            color: accent,
            opacity: 0.04,
            bg: primary,
          },
      elements,
    }],
  };
}
