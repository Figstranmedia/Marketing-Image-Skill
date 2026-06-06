import { getDimensions, getTypography } from './formats.js';
import { googleFontsLink, collectFonts, defaultSizeForRole, cssFontFamily } from './tools/typography.js';
import { renderShapeElement } from './tools/shapes.js';
import { renderBackground } from './tools/backgrounds.js';
import { renderOverlay } from './tools/effects.js';
import { resolveImageSrc } from './importer.js';

// z-index defaults por tipo de elemento
const Z_DEFAULTS = {
  background: 0, texture: 1, image: 2, overlay: 3, shape: 10,
  svg: 5, connector: 5, text: 20, chip: 25,
};

function resolvePosition(x, y) {
  const transforms = [];
  let xStyle = '';
  let yStyle = '';

  if (x === undefined || x === null) {
    xStyle = 'left:40px;';
  } else if (x === 'center') {
    xStyle = 'left:50%;';
    transforms.push('translateX(-50%)');
  } else if (typeof x === 'string' && x.startsWith('right:')) {
    xStyle = `right:${parseInt(x.split(':')[1], 10)}px;`;
  } else if (typeof x === 'string' && x.startsWith('left:')) {
    xStyle = `left:${parseInt(x.split(':')[1], 10)}px;`;
  } else {
    xStyle = `left:${x}px;`;
  }

  if (y === undefined || y === null) {
    yStyle = 'top:40px;';
  } else if (y === 'center') {
    yStyle = 'top:50%;';
    transforms.push('translateY(-50%)');
  } else if (typeof y === 'string' && y.startsWith('bottom:')) {
    yStyle = `bottom:${parseInt(y.split(':')[1], 10)}px;top:auto;`;
  } else if (typeof y === 'string' && y.startsWith('top:')) {
    yStyle = `top:${parseInt(y.split(':')[1], 10)}px;`;
  } else {
    yStyle = `top:${y}px;`;
  }

  const transformStr = transforms.length ? `transform:${transforms.join(' ')};` : '';
  return `${xStyle}${yStyle}${transformStr}`;
}

function dimStyle(w, h) {
  const wStyle = w !== undefined ? `width:${typeof w === 'number' ? w + 'px' : w};` : '';
  const hStyle = h !== undefined ? `height:${typeof h === 'number' ? h + 'px' : h};` : '';
  return `${wStyle}${hStyle}`;
}

function renderElement(el, brand, format, context) {
  const zIndex = el.zIndex ?? Z_DEFAULTS[el.type] ?? 10;
  const opacity = el.opacity !== undefined ? `opacity:${el.opacity};` : '';
  const pos = resolvePosition(el.x, el.y);
  const dims = dimStyle(el.width, el.height);

  switch (el.type) {
    case 'text':    return renderTextEl(el, brand, format, pos, dims, zIndex, opacity);
    case 'image':   return renderImageEl(el, pos, dims, zIndex, opacity, context);
    case 'shape':   return renderShapeElement(el, pos, zIndex, opacity, dims.split(';')[0] + ';', dims.split(';')[1] + ';');
    case 'svg':     return renderSVGEl(el, pos, dims, zIndex, opacity);
    case 'connector': return renderConnectorEl(el, zIndex);
    case 'overlay': return renderOverlay(el, zIndex);
    case 'chip':    return renderChipEl(el, brand, pos, zIndex);
    default:        return '';
  }
}

function renderTextEl(el, brand, format, pos, dims, zIndex, opacity) {
  const typo = getTypography(format);
  const role = el.role ?? 'body';

  // Font family: override explícito > role-based brand font > fallback
  let fontFamily;
  if (el.font) {
    fontFamily = cssFontFamily(el.font);
  } else if (role === 'title' || role === 'label') {
    fontFamily = `var(--font-heading)`;
  } else {
    fontFamily = `var(--font-body)`;
  }

  const fontSize   = el.size ?? typo[role] ?? typo.body ?? 28;
  const fontWeight = el.weight ?? (role === 'title' ? 700 : role === 'subtitle' ? 500 : 400);
  const color      = el.color ?? '#ffffff';
  const align      = el.align ?? 'left';
  const lineH      = el.lineHeight ?? (role === 'title' ? 1.08 : 1.35);
  const ls         = el.letterSpacing ? `letter-spacing:${el.letterSpacing}em;` : '';
  const shadow     = el.shadow ? 'text-shadow:0 2px 12px rgba(0,0,0,0.5);' : '';

  let clamp = '';
  if (el.maxLines) {
    clamp = `overflow:hidden;display:-webkit-box;-webkit-line-clamp:${el.maxLines};-webkit-box-orient:vertical;`;
  }

  const lines = (el.content || '')
    .split('\\n')
    .map(l => `<span style="display:block">${l}</span>`)
    .join('');

  return `<div style="position:absolute;${pos}${dims}font-family:${fontFamily};font-size:${fontSize}px;font-weight:${fontWeight};color:${color};text-align:${align};line-height:${lineH};${ls}${shadow}${clamp}${opacity}z-index:${zIndex};">${lines}</div>`;
}

function renderImageEl(el, pos, dims, zIndex, opacity, context) {
  const fit    = el.fit ?? 'cover';
  const br     = el.borderRadius ? `border-radius:${el.borderRadius}px;` : '';
  const filters = [];
  if (el.grayscale) filters.push('grayscale(1)');
  if (el.brightness !== undefined && el.brightness !== 1) filters.push(`brightness(${el.brightness})`);
  const filter = filters.length ? `filter:${filters.join(' ')};` : '';

  // src ya debe estar resuelto (ver generatePageHTML)
  const src = el._resolvedSrc ?? el.src ?? '';

  return `<div style="position:absolute;${pos}${dims}overflow:hidden;${br}${opacity}z-index:${zIndex};">
  <img src="${src}" style="width:100%;height:100%;object-fit:${fit};${filter}">
</div>`;
}

function renderSVGEl(el, pos, dims, zIndex, opacity) {
  const vb = el.viewBox ?? `0 0 ${el.width ?? 100} ${el.height ?? 100}`;
  return `<svg style="position:absolute;${pos}${dims}${opacity}z-index:${zIndex};" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">
  ${el.content ?? ''}
</svg>`;
}

function renderConnectorEl(el, zIndex) {
  const color = el.color ?? '#ffffff';
  const sw = el.strokeWidth ?? 2;
  const pad = sw + 4;

  const minX = Math.min(el.x1, el.x2);
  const minY = Math.min(el.y1, el.y2);
  const svgW = Math.abs(el.x2 - el.x1) + pad * 2;
  const svgH = Math.abs(el.y2 - el.y1) + pad * 2;

  const lx1 = el.x1 - minX + pad;
  const ly1 = el.y1 - minY + pad;
  const lx2 = el.x2 - minX + pad;
  const ly2 = el.y2 - minY + pad;

  let d;
  if (el.variant === 'curved') {
    const mx = (lx1 + lx2) / 2;
    d = `M ${lx1} ${ly1} Q ${mx} ${ly1} ${lx2} ${ly2}`;
  } else {
    d = `M ${lx1} ${ly1} L ${lx2} ${ly2}`;
  }

  const dashes = (el.variant === 'dashed-line' || el.variant === 'dashed-arrow')
    ? 'stroke-dasharray="8 6"' : '';

  const needsArrow = el.variant === 'arrow' || el.variant === 'dashed-arrow';
  const markerId = `arrow-${zIndex}-${Math.random().toString(36).slice(2, 6)}`;
  const markerDef = needsArrow
    ? `<defs><marker id="${markerId}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill="${color}"/></marker></defs>`
    : '';
  const markerEnd = needsArrow ? `marker-end="url(#${markerId})"` : '';

  return `<svg style="position:absolute;left:${minX - pad}px;top:${minY - pad}px;overflow:visible;z-index:${zIndex};" width="${svgW}" height="${svgH}">
  ${markerDef}
  <path d="${d}" stroke="${color}" stroke-width="${sw}" fill="none" ${dashes} ${markerEnd}/>
</svg>`;
}

function renderChipEl(el, brand, pos, zIndex) {
  const accent = brand.palette?.accent ?? brand.colors?.accent ?? '#f97316';
  const bg     = el.color ?? `rgba(255,255,255,0.14)`;
  const tc     = el.textColor ?? '#ffffff';
  const br     = el.borderRadius ?? 100;
  const border = el.border ?? '1px solid rgba(255,255,255,0.22)';
  const fs     = el.fontSize ?? 18;

  return `<div style="position:absolute;${pos}background:${bg};color:${tc};border:${border};border-radius:${br}px;padding:8px 20px;font-family:var(--font-body);font-size:${fs}px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);white-space:nowrap;z-index:${zIndex};">${el.text ?? ''}</div>`;
}

/**
 * Genera el HTML completo de una página (un slide = un PNG).
 * Resuelve las rutas de imágenes antes de renderizar.
 */
export async function generatePageHTML(pageSpec, { width, height, brand, format, outputFolder, projectPath }) {
  // Resolver src de imágenes asíncronamente
  const resolvedElements = await Promise.all(
    (pageSpec.elements ?? []).map(async el => {
      if (el.type === 'image' && el.src) {
        return { ...el, _resolvedSrc: await resolveImageSrc(el.src, { projectPath, outputFolder }) };
      }
      return el;
    })
  );

  // Resolver src del background si es imagen
  let resolvedBg = pageSpec.background ?? { type: 'solid', color: '#0f0f0f' };
  if (resolvedBg.type === 'image' && resolvedBg.src) {
    const resolved = await resolveImageSrc(resolvedBg.src, { projectPath, outputFolder });
    resolvedBg = { ...resolvedBg, src: resolved };
  }

  const heading = brand.fonts?.heading ?? 'Space Grotesk';
  const body    = brand.fonts?.body    ?? 'Inter';
  const primary = brand.palette?.primary   ?? brand.colors?.primary   ?? '#0f0f0f';
  const accent  = brand.palette?.accent    ?? brand.colors?.accent    ?? '#f97316';
  const accent2 = brand.palette?.secondary ?? brand.colors?.secondary ?? '#3b82f6';

  // Recoger fuentes extra usadas en elementos de esta página
  const extraFonts = resolvedElements
    .filter(el => el.type === 'text' && el.font)
    .map(el => el.font);

  const allFonts = [...new Set([heading, body, ...extraFonts])];
  const fontsHtml = googleFontsLink(allFonts);

  const bgHtml = renderBackground(resolvedBg, width, height);

  const elementsHtml = resolvedElements
    .map(el => renderElement(el, brand, format, { outputFolder, projectPath }))
    .join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${width}">
${fontsHtml}
<style>
* { margin:0; padding:0; box-sizing:border-box; }
:root {
  --primary:      ${primary};
  --accent:       ${accent};
  --accent2:      ${accent2};
  --font-heading: ${heading.includes(' ') ? `'${heading}'` : heading}, sans-serif;
  --font-body:    ${body.includes(' ') ? `'${body}'` : body}, sans-serif;
}
html, body {
  width:${width}px;
  height:${height}px;
  overflow:hidden;
  background:${primary};
  position:relative;
}
</style>
</head>
<body>
${bgHtml}
${elementsHtml}
</body>
</html>`;
}
