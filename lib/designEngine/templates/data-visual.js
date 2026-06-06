import { getDimensions, getTypography } from '../formats.js';

/**
 * data-visual — número grande (estadística, métrica) + descriptor.
 * Ideal para logros, stats, resultados.
 *
 * contents: { number, numberUnit?, title?, subtitle?, label?, accentColor? }
 *   number: '4.8M' | '2×' | '97%'
 *   numberUnit: 'streams' | 'más rápido' | 'satisfacción'
 */
export function generate(brand, contents, format = 'instagram-carousel') {
  const { width, height } = getDimensions(format);
  const typo = getTypography(format);

  const accent  = contents.accentColor ?? brand.palette?.accent ?? brand.colors?.accent ?? '#f97316';
  const primary = brand.palette?.primary ?? brand.colors?.primary ?? '#0f0f0f';
  const secondary = brand.palette?.secondary ?? brand.colors?.secondary ?? '#1a1a2e';

  const number     = contents.number     ?? '—';
  const numberUnit = contents.numberUnit ?? '';
  const title      = contents.title      ?? '';
  const subtitle   = contents.subtitle   ?? '';
  const label      = contents.label      ?? '';

  // Tamaño del número: dominante
  const numberSize = Math.round(typo.title * 2.2);

  const elements = [];

  // Arco decorativo detrás del número
  elements.push({
    type: 'shape', shape: 'circle',
    x: 'center', y: `top:${Math.round(height * 0.22)}`,
    width: Math.round(Math.min(width, height) * 0.55),
    height: Math.round(Math.min(width, height) * 0.55),
    fill: 'transparent',
    stroke: accent,
    strokeWidth: 2,
    opacity: 0.12,
    zIndex: 1,
  });

  if (label) {
    elements.push({
      type: 'chip', text: label,
      x: 'center', y: `top:${Math.round(height * 0.08)}`,
      color: accent, textColor: '#000000',
      zIndex: 25,
    });
  }

  // Número enorme
  elements.push({
    type: 'text', role: 'title',
    content: number,
    x: 'center', y: `top:${Math.round(height * 0.28)}`,
    width: width - 80,
    color: accent,
    size: numberSize,
    weight: 700,
    align: 'center',
    letterSpacing: -0.02,
    zIndex: 20,
  });

  // Unidad / contexto del número
  if (numberUnit) {
    elements.push({
      type: 'text', role: 'subtitle',
      content: numberUnit,
      x: 'center', y: `top:${Math.round(height * 0.28) + numberSize + 10}`,
      width: width - 120,
      color: 'rgba(255,255,255,0.65)',
      align: 'center',
      letterSpacing: 0.1,
      zIndex: 20,
    });
  }

  // Separador
  elements.push({
    type: 'shape', shape: 'rect',
    x: 'center', y: 'center',
    width: 40, height: 3,
    fill: accent, borderRadius: 2, opacity: 0.5,
    zIndex: 18,
  });

  if (title) {
    elements.push({
      type: 'text', role: 'body',
      content: title,
      x: 40, y: `bottom:${subtitle ? typo.subtitle + 100 : 100}`,
      width: width - 80,
      color: '#ffffff', weight: 500,
      align: 'center',
      zIndex: 20,
    });
  }

  if (subtitle) {
    elements.push({
      type: 'text', role: 'subtitle',
      content: subtitle,
      x: 40, y: 'bottom:65',
      width: width - 80,
      color: 'rgba(255,255,255,0.6)',
      align: 'center',
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
        stops: [{ color: primary, pos: 0 }, { color: secondary, pos: 100 }],
      },
      elements,
    }],
  };
}
