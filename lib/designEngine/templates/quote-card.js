import { getDimensions, getTypography } from '../formats.js';

/**
 * quote-card — cita destacada con atribución.
 *
 * contents: { quote, quoteAuthor?, label?, backgroundColor?, accentColor? }
 */
export function generate(brand, contents, format = 'instagram-carousel') {
  const { width, height } = getDimensions(format);
  const typo = getTypography(format);

  const accent  = contents.accentColor ?? brand.palette?.accent ?? brand.colors?.accent ?? '#f97316';
  const primary = brand.palette?.primary ?? brand.colors?.primary ?? '#0f0f0f';
  const bg      = contents.backgroundColor ?? primary;

  const quote       = contents.quote ?? '';
  const quoteAuthor = contents.quoteAuthor ?? '';
  const label       = contents.label ?? '';

  // Tamaño de fuente adaptado: quotes largas usan fuente más pequeña
  const quoteLen = quote.length;
  const quoteSize = quoteLen > 120
    ? Math.round(typo.subtitle * 0.9)
    : quoteLen > 60
      ? typo.subtitle
      : Math.round(typo.subtitle * 1.2);

  const elements = [];

  // Comillas decorativas
  elements.push({
    type: 'svg',
    x: 30, y: Math.round(height * 0.12),
    width: 120, height: 100,
    zIndex: 5,
    content: `<text x="0" y="100" font-family="Georgia, serif" font-size="160" fill="${accent}" opacity="0.18">"</text>`,
  });

  if (label) {
    elements.push({
      type: 'chip', text: label,
      x: 40, y: 55,
      color: 'transparent',
      textColor: accent,
      border: `1px solid ${accent}`,
      zIndex: 25,
    });
  }

  // Texto de la cita
  elements.push({
    type: 'text', role: 'subtitle',
    content: quote,
    x: 60, y: 'center',
    width: width - 120,
    color: '#ffffff',
    size: quoteSize,
    lineHeight: 1.5,
    align: 'center',
    zIndex: 20,
  });

  // Línea de atribución
  if (quoteAuthor) {
    elements.push({
      type: 'shape', shape: 'rect',
      x: 'center', y: `bottom:${120}`,
      width: 40, height: 3,
      fill: accent, borderRadius: 2,
      zIndex: 18,
    });

    elements.push({
      type: 'text', role: 'label',
      content: `— ${quoteAuthor}`,
      x: 'center', y: 'bottom:80',
      width: width - 120,
      color: accent,
      align: 'center',
      letterSpacing: 0.08,
      zIndex: 20,
    });
  }

  return {
    format,
    brand,
    pages: [{
      background: { type: 'solid', color: bg },
      elements,
    }],
  };
}
