import { getDimensions, getTypography } from '../formats.js';

/**
 * list-card — lista numerada con items visuales.
 * Ideal para "3 razones", "5 pasos", "beneficios".
 *
 * contents: { title, items: string[], label, backgroundImage? }
 */
export function generate(brand, contents, format = 'instagram-carousel') {
  const { width, height } = getDimensions(format);
  const typo = getTypography(format);

  const accent   = brand.palette?.accent   ?? brand.colors?.accent   ?? '#f97316';
  const accent2  = brand.palette?.secondary ?? brand.colors?.secondary ?? '#3b82f6';
  const primary  = brand.palette?.primary  ?? brand.colors?.primary  ?? '#0f0f0f';
  const secondary = '#1a1a2e';

  const title  = contents.title ?? '';
  const items  = contents.items ?? [];
  const label  = contents.label ?? '';
  const bg     = contents.backgroundImage;

  const colors = [accent, accent2, '#10b981', '#f59e0b', '#8b5cf6'];

  const elements = [];

  if (bg) {
    elements.push({
      type: 'overlay', variant: 'solid', color: primary, opacity: 0.88, zIndex: 3,
    });
  }

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
      x: 40, y: label ? 120 : 80,
      width: width - 80,
      color: '#ffffff', weight: 700,
      zIndex: 20,
    });
  }

  // Separador
  elements.push({
    type: 'shape', shape: 'rect',
    x: 40, y: (label ? 120 : 80) + typo.title + 20,
    width: 60, height: 4,
    fill: accent, borderRadius: 2,
    zIndex: 18,
  });

  // Items numerados
  const listStartY = (label ? 120 : 80) + typo.title + 60;
  const itemH = Math.min(Math.round((height - listStartY - 60) / Math.max(items.length, 1)), 120);

  items.slice(0, 5).forEach((item, i) => {
    const color = colors[i % colors.length];
    const itemY = listStartY + i * (itemH + 12);

    // Número badge
    elements.push({
      type: 'shape', shape: 'circle',
      x: 40, y: itemY,
      width: 44, height: 44,
      fill: color,
      zIndex: 20,
    });

    // Número
    elements.push({
      type: 'text', role: 'label',
      content: String(i + 1),
      x: 40, y: itemY + 10,
      width: 44,
      color: '#ffffff', weight: 700,
      align: 'center',
      size: 20,
      zIndex: 21,
    });

    // Texto del item
    elements.push({
      type: 'text', role: 'body',
      content: item,
      x: 100, y: itemY + 6,
      width: width - 140,
      color: 'rgba(255,255,255,0.9)',
      maxLines: 2,
      zIndex: 20,
    });
  });

  return {
    format,
    brand,
    pages: [{
      background: bg
        ? { type: 'image', src: bg, fit: 'cover' }
        : { type: 'gradient', angle: 160, stops: [{ color: primary, pos: 0 }, { color: secondary, pos: 100 }] },
      elements,
    }],
  };
}
