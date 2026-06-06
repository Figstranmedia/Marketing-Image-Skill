import { getDimensions, getTypography } from '../formats.js';

/**
 * split-layout — imagen izquierda, texto derecha (o top/bottom en formatos verticales).
 * Para formatos landscape (linkedin, twitter, youtube) usa split vertical 50/50.
 * Para formatos portrait (instagram) usa split horizontal 40% imagen / 60% texto.
 *
 * contents: { title, subtitle, label, backgroundImage, ctaText? }
 */
export function generate(brand, contents, format = 'instagram-carousel') {
  const { width, height } = getDimensions(format);
  const typo = getTypography(format);

  const accent   = brand.palette?.accent ?? brand.colors?.accent ?? '#f97316';
  const primary  = brand.palette?.primary ?? brand.colors?.primary ?? '#0f0f0f';
  const secondary = brand.palette?.secondary ?? brand.colors?.secondary ?? '#1a1a2e';

  const title    = contents.title ?? '';
  const subtitle = contents.subtitle ?? '';
  const label    = contents.label ?? '';
  const bg       = contents.backgroundImage ?? 'flux:hero';

  const isLandscape = width > height;
  const elements = [];

  if (isLandscape) {
    // Landscape: imagen en mitad izquierda, texto en mitad derecha
    const half = Math.round(width / 2);

    elements.push({
      type: 'image', src: bg, fit: 'cover',
      x: 0, y: 0, width: half, height,
      zIndex: 2,
    });

    // Separador vertical
    elements.push({
      type: 'shape', shape: 'rect',
      x: half, y: 0, width: 4, height,
      fill: accent, zIndex: 10,
    });

    // Panel texto
    elements.push({
      type: 'shape', shape: 'rect',
      x: half, y: 0, width: width - half, height,
      fill: primary, zIndex: 5,
    });

    const textX = half + 50;
    const textW = width - half - 100;

    if (label) {
      elements.push({
        type: 'chip', text: label,
        x: textX, y: Math.round(height * 0.15),
        color: accent, textColor: '#000000',
        zIndex: 25,
      });
    }

    if (title) {
      elements.push({
        type: 'text', role: 'title',
        content: title,
        x: textX, y: Math.round(height * 0.35),
        width: textW,
        color: '#ffffff', weight: 700,
        zIndex: 20,
      });
    }

    if (subtitle) {
      elements.push({
        type: 'text', role: 'subtitle',
        content: subtitle,
        x: textX, y: Math.round(height * 0.62),
        width: textW,
        color: 'rgba(255,255,255,0.75)',
        zIndex: 20,
      });
    }

  } else {
    // Portrait: imagen en 40% superior, texto en 60% inferior
    const imgH = Math.round(height * 0.42);

    elements.push({
      type: 'image', src: bg, fit: 'cover',
      x: 0, y: 0, width, height: imgH,
      zIndex: 2,
    });

    // Panel texto
    elements.push({
      type: 'shape', shape: 'rect',
      x: 0, y: imgH, width, height: height - imgH,
      fill: primary, zIndex: 5,
    });

    // Acento horizontal
    elements.push({
      type: 'shape', shape: 'rect',
      x: 0, y: imgH, width, height: 5,
      fill: accent, zIndex: 11,
    });

    const textPad = 50;

    if (label) {
      elements.push({
        type: 'chip', text: label,
        x: textPad, y: imgH + 40,
        zIndex: 25,
      });
    }

    if (title) {
      elements.push({
        type: 'text', role: 'title',
        content: title,
        x: textPad, y: imgH + 100,
        width: width - textPad * 2,
        color: '#ffffff', weight: 700,
        zIndex: 20,
      });
    }

    if (subtitle) {
      elements.push({
        type: 'text', role: 'subtitle',
        content: subtitle,
        x: textPad, y: `bottom:80`,
        width: width - textPad * 2,
        color: 'rgba(255,255,255,0.75)',
        zIndex: 20,
      });
    }
  }

  return {
    format,
    brand,
    pages: [{
      background: { type: 'solid', color: secondary },
      elements,
    }],
  };
}
