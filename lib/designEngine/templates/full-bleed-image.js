import { getDimensions, getTypography } from '../formats.js';

/**
 * full-bleed-image — imagen de fondo a full con texto sobre overlay gradiente.
 * El template más usado para carruseles con imágenes FLUX.
 *
 * contents: { title, subtitle, label, backgroundImage, ctaText? }
 * backgroundImage puede ser 'flux:hero' | 'flux:body' | 'flux:cta' | ruta
 */
export function generate(brand, contents, format = 'instagram-carousel') {
  const { width, height } = getDimensions(format);
  const typo = getTypography(format);
  const accent = brand.palette?.accent ?? brand.colors?.accent ?? '#f97316';
  const label = contents.label ?? '';
  const title = contents.title ?? '';
  const subtitle = contents.subtitle ?? '';
  const bg = contents.backgroundImage ?? 'flux:hero';

  const elements = [
    // Overlay oscuro desde abajo
    { type: 'overlay', variant: 'gradient-bottom', color: 'rgba(0,0,0,0.92)', opacity: 1, height: '70%', zIndex: 3 },
  ];

  if (label) {
    elements.push({
      type: 'chip', text: label,
      x: 40, y: 60,
      color: `rgba(255,255,255,0.14)`,
      textColor: '#ffffff',
      zIndex: 25,
    });
  }

  // Línea de acento
  elements.push({
    type: 'shape', shape: 'rect',
    x: 40, y: `bottom:${typo.title + 80}`,
    width: 60, height: 5,
    fill: accent,
    borderRadius: 3,
    zIndex: 18,
  });

  if (title) {
    elements.push({
      type: 'text', role: 'title',
      content: title,
      x: 40, y: `bottom:${typo.subtitle + 80}`,
      width: width - 80,
      color: '#ffffff',
      weight: 700,
      shadow: true,
      zIndex: 20,
    });
  }

  if (subtitle) {
    elements.push({
      type: 'text', role: 'subtitle',
      content: subtitle,
      x: 40, y: 'bottom:70',
      width: width - 80,
      color: '#ffffff',
      opacity: 0.82,
      zIndex: 20,
    });
  }

  if (contents.ctaText) {
    elements.push({
      type: 'chip',
      text: contents.ctaText,
      x: 40, y: 'bottom:70',
      color: accent,
      textColor: '#000000',
      zIndex: 26,
    });
  }

  return {
    format,
    brand,
    pages: [{
      background: { type: 'image', src: bg, fit: 'cover' },
      elements,
    }],
  };
}
