import { getDimensions, getTypography } from '../formats.js';

/**
 * presentation-slide — formato 16:9 para YouTube thumbnails, presentaciones y pantallas grandes.
 *
 * Estructura: texto en tercio izquierdo/central, decoración en el derecho.
 * Adaptado a landscape — el tercio inferior no aplica.
 *
 * contents: { title, subtitle, label, backgroundImage?, numberBig?, accentColor? }
 * numberBig: número grande opcional (para data-visual en 16:9)
 */
export function generate(brand, contents, format = 'presentation-16-9') {
  const { width, height } = getDimensions(format);
  const typo = getTypography(format);

  const primary   = brand.palette?.primary   ?? brand.colors?.primary   ?? '#0f0f0f';
  const secondary = brand.palette?.secondary ?? brand.colors?.secondary ?? '#1a1a2e';
  const accent    = contents.accentColor ?? brand.palette?.accent ?? brand.colors?.accent ?? '#f97316';

  const title     = contents.title    ?? '';
  const subtitle  = contents.subtitle ?? '';
  const label     = contents.label    ?? '';
  const bg        = contents.backgroundImage;
  const numberBig = contents.numberBig ?? null;

  // Zonas del layout landscape
  const padX   = Math.round(width * 0.06);  // ~6% margen izquierdo
  const textW  = Math.round(width * 0.56);  // texto ocupa 56% del ancho
  const centerY = Math.round(height / 2);

  const elements = [];

  if (bg) {
    elements.push({
      type: 'overlay', variant: 'gradient-right',
      color: primary, opacity: 0.85, height: '55%', zIndex: 3,
    });
    elements.push({
      type: 'overlay', variant: 'solid',
      color: primary, opacity: 0.45, zIndex: 2,
    });
  }

  // Decoración: burst en zona derecha
  elements.push({
    type: 'svg',
    x: 0, y: 0, width, height, zIndex: 1,
    content: `
      <circle cx="${Math.round(width * 0.82)}" cy="${centerY}" r="${Math.round(height * 0.55)}" fill="${accent}" opacity="0.06"/>
      <circle cx="${Math.round(width * 0.82)}" cy="${centerY}" r="${Math.round(height * 0.35)}" fill="${accent}" opacity="0.05"/>
      <circle cx="${Math.round(width * 0.82)}" cy="${centerY}" r="${Math.round(height * 0.18)}" fill="${accent}" opacity="0.08"/>
      <circle cx="${Math.round(width * 0.82)}" cy="${centerY}" r="${Math.round(height * 0.06)}" fill="${accent}" opacity="0.7"/>
    `,
  });

  // Línea de acento vertical izquierda
  elements.push({
    type: 'shape', shape: 'rect',
    x: padX - 16, y: Math.round(height * 0.2),
    width: 5, height: Math.round(height * 0.6),
    fill: accent, borderRadius: 3, zIndex: 18,
  });

  if (label) {
    elements.push({
      type: 'chip', text: label,
      x: padX, y: Math.round(height * 0.14),
      zIndex: 25,
    });
  }

  if (numberBig) {
    // Modo data-visual 16:9: número enorme centrado horizontalmente
    elements.push({
      type: 'text', role: 'title',
      content: numberBig,
      x: 'center', y: Math.round(height * 0.12),
      width: Math.round(width * 0.5),
      color: accent,
      size: Math.round(typo.title * 2),
      weight: 700, align: 'center',
      zIndex: 20,
    });
  } else if (title) {
    const titleY = label
      ? Math.round(height * 0.14) + 50
      : Math.round(height * 0.22);
    elements.push({
      type: 'text', role: 'title',
      content: title,
      x: padX, y: titleY,
      width: textW,
      color: '#ffffff', weight: 700, shadow: !!bg,
      zIndex: 20,
    });
  }

  if (subtitle) {
    const subtitleY = label
      ? Math.round(height * 0.14) + 50 + typo.title + 20
      : Math.round(height * 0.22) + typo.title + 20;
    elements.push({
      type: 'text', role: 'subtitle',
      content: subtitle,
      x: padX, y: subtitleY,
      width: textW,
      color: 'rgba(255,255,255,0.78)',
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
            type: 'gradient',
            angle: 135,
            stops: [{ color: primary, pos: 0 }, { color: secondary, pos: 100 }],
          },
      elements,
    }],
  };
}
