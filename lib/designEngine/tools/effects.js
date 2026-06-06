/**
 * Genera HTML para overlays y efectos visuales.
 */

export function renderOverlay(el, zIndex) {
  const color = el.color ?? 'rgba(0,0,0,1)';
  const opacity = el.opacity ?? 0.7;
  const height = el.height ?? '60%';

  switch (el.variant) {
    case 'gradient-bottom':
      return `<div style="position:absolute;bottom:0;left:0;right:0;height:${height};background:linear-gradient(to top, ${color} 0%, transparent 100%);opacity:${opacity};pointer-events:none;z-index:${zIndex};"></div>`;

    case 'gradient-top':
      return `<div style="position:absolute;top:0;left:0;right:0;height:${height};background:linear-gradient(to bottom, ${color} 0%, transparent 100%);opacity:${opacity};pointer-events:none;z-index:${zIndex};"></div>`;

    case 'gradient-left':
      return `<div style="position:absolute;top:0;left:0;bottom:0;width:${height};background:linear-gradient(to right, ${color} 0%, transparent 100%);opacity:${opacity};pointer-events:none;z-index:${zIndex};"></div>`;

    case 'gradient-right':
      return `<div style="position:absolute;top:0;right:0;bottom:0;width:${height};background:linear-gradient(to left, ${color} 0%, transparent 100%);opacity:${opacity};pointer-events:none;z-index:${zIndex};"></div>`;

    case 'solid':
      return `<div style="position:absolute;inset:0;background:${color};opacity:${opacity};pointer-events:none;z-index:${zIndex};"></div>`;

    case 'vignette':
      return `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${opacity}) 100%);pointer-events:none;z-index:${zIndex};"></div>`;

    default:
      return '';
  }
}
