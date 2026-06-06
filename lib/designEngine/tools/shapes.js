/**
 * Genera HTML/SVG para elementos de forma geométrica.
 */

/**
 * Genera el SVG path para un polígono regular.
 */
function regularPolygon(cx, cy, r, sides, rotate = 0) {
  const points = [];
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides - Math.PI / 2 + (rotate * Math.PI) / 180;
    points.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return points.join(' ');
}

/**
 * Genera el SVG para una estrella.
 */
function starPoints(cx, cy, outerR, innerR, points, rotate = 0) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI * i) / points - Math.PI / 2 + (rotate * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return pts.join(' ');
}

/**
 * Renderiza un ShapeElement como HTML (div para formas simples, SVG para polígonos).
 */
export function renderShapeElement(el, pos, zIndex, opacity, widthStyle, heightStyle) {
  const fill = el.fill ?? 'transparent';
  const stroke = el.stroke ?? 'none';
  const strokeWidth = el.strokeWidth ?? 0;
  const rotate = el.rotate ?? 0;
  const w = el.width ?? 100;
  const h = el.height ?? w;

  switch (el.shape) {
    case 'rect': {
      const br = el.borderRadius ?? 0;
      return `<div style="position:absolute; ${pos} ${widthStyle} ${heightStyle || `height:${h}px;`} background:${fill}; border:${strokeWidth > 0 ? `${strokeWidth}px solid ${stroke}` : 'none'}; border-radius:${br}px; ${opacity} transform:${rotate ? `rotate(${rotate}deg)` : 'none'}; z-index:${zIndex};"></div>`;
    }

    case 'circle':
    case 'ellipse': {
      const ew = el.shape === 'circle' ? w : w;
      const eh = el.shape === 'circle' ? w : h;
      return `<div style="position:absolute; ${pos} width:${ew}px; height:${eh}px; background:${fill}; border:${strokeWidth > 0 ? `${strokeWidth}px solid ${stroke}` : 'none'}; border-radius:50%; ${opacity} z-index:${zIndex};"></div>`;
    }

    case 'triangle': {
      const pts = regularPolygon(w / 2, h / 2, w / 2, 3, rotate);
      return svgShapeWrap(el, pos, zIndex, opacity, w, h,
        `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`);
    }

    case 'diamond': {
      const pts = regularPolygon(w / 2, h / 2, w / 2, 4, rotate);
      return svgShapeWrap(el, pos, zIndex, opacity, w, h,
        `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`);
    }

    case 'hexagon': {
      const pts = regularPolygon(w / 2, h / 2, w / 2, 6, rotate);
      return svgShapeWrap(el, pos, zIndex, opacity, w, h,
        `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`);
    }

    case 'star': {
      const pts = starPoints(w / 2, h / 2, w / 2, w / 4, el.sides ?? 5, rotate);
      return svgShapeWrap(el, pos, zIndex, opacity, w, h,
        `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`);
    }

    case 'polygon': {
      if (el.points) {
        return svgShapeWrap(el, pos, zIndex, opacity, w, h,
          `<polygon points="${el.points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`);
      }
      const sides = el.sides ?? 6;
      const pts2 = regularPolygon(w / 2, h / 2, w / 2, sides, rotate);
      return svgShapeWrap(el, pos, zIndex, opacity, w, h,
        `<polygon points="${pts2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`);
    }

    // ── CONECTORES ──────────────────────────────────────────────────────────
    // Línea recta con punta de flecha opcional en uno o ambos extremos.
    // Props: x1,y1,x2,y2 (coordenadas absolutas dentro del slide),
    //        arrowStart, arrowEnd (boolean), strokeWidth, stroke, dashArray
    case 'line':
    case 'connector': {
      const x1 = el.x1 ?? 0, y1 = el.y1 ?? 0;
      const x2 = el.x2 ?? w,  y2 = el.y2 ?? 0;
      const sw  = el.strokeWidth ?? 2;
      const col = el.stroke ?? '#ffffff';
      const dash = el.dashArray ? `stroke-dasharray="${el.dashArray}"` : '';
      const arrowEnd   = el.arrowEnd   !== false; // default true
      const arrowStart = el.arrowStart ?? false;
      const markerId = `arr-${Math.random().toString(36).slice(2,6)}`;
      const markerDefs = `
        <defs>
          <marker id="${markerId}-e" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="${col}"/>
          </marker>
          <marker id="${markerId}-s" markerWidth="8" markerHeight="8" refX="2" refY="3" orient="auto-start-reverse">
            <path d="M0,0 L0,6 L8,3 z" fill="${col}"/>
          </marker>
        </defs>`;
      const mEnd   = arrowEnd   ? `marker-end="url(#${markerId}-e)"`   : '';
      const mStart = arrowStart ? `marker-start="url(#${markerId}-s)"` : '';
      const svgW = Math.max(Math.abs(x2 - x1) + 20, 20);
      const svgH = Math.max(Math.abs(y2 - y1) + 20, 20);
      return `<svg style="position:absolute;left:${Math.min(x1,x2)-10}px;top:${Math.min(y1,y2)-10}px;overflow:visible;${opacity}z-index:${zIndex};" width="${svgW}" height="${svgH}">
        ${markerDefs}
        <line x1="${x1 - Math.min(x1,x2) + 10}" y1="${y1 - Math.min(y1,y2) + 10}"
              x2="${x2 - Math.min(x1,x2) + 10}" y2="${y2 - Math.min(y1,y2) + 10}"
              stroke="${col}" stroke-width="${sw}" ${dash} ${mEnd} ${mStart}/>
      </svg>`;
    }

    // Flecha curva (arco de Bézier).
    // Props: x1,y1,x2,y2, cpx,cpy (control point), arrowEnd, stroke, strokeWidth
    case 'curve':
    case 'curved-connector': {
      const x1 = el.x1 ?? 0,  y1 = el.y1 ?? 0;
      const x2 = el.x2 ?? w,  y2 = el.y2 ?? h;
      const cpx = el.cpx ?? (x1 + x2) / 2;
      const cpy = el.cpy ?? Math.min(y1, y2) - 80;
      const sw  = el.strokeWidth ?? 2;
      const col = el.stroke ?? '#ffffff';
      const arrowEnd = el.arrowEnd !== false;
      const markerId = `carr-${Math.random().toString(36).slice(2,6)}`;
      const defs = arrowEnd ? `<defs><marker id="${markerId}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="${col}"/></marker></defs>` : '';
      const mEnd = arrowEnd ? `marker-end="url(#${markerId})"` : '';
      const pad = 20;
      const minX = Math.min(x1,x2,cpx)-pad, minY = Math.min(y1,y2,cpy)-pad;
      const svgW = Math.max(x1,x2,cpx)-minX+pad, svgH = Math.max(y1,y2,cpy)-minY+pad;
      return `<svg style="position:absolute;left:${minX}px;top:${minY}px;overflow:visible;${opacity}z-index:${zIndex};" width="${svgW}" height="${svgH}">
        ${defs}
        <path d="M${x1-minX},${y1-minY} Q${cpx-minX},${cpy-minY} ${x2-minX},${y2-minY}"
              fill="none" stroke="${col}" stroke-width="${sw}" ${mEnd}/>
      </svg>`;
    }

    // ── SEÑALES / ICONOS ─────────────────────────────────────────────────────
    // Props: signal (nombre), size, color, fill (fondo del círculo)
    case 'signal': {
      const sz   = el.size ?? 48;
      const col  = el.color ?? '#ffffff';
      const bg   = el.fill  ?? 'transparent';
      const sig  = el.signal ?? 'checkmark';
      let inner = '';
      switch (sig) {
        case 'checkmark':
        case 'check':
          inner = `<circle cx="${sz/2}" cy="${sz/2}" r="${sz/2}" fill="${bg}"/>
                   <polyline points="${sz*.22},${sz*.52} ${sz*.42},${sz*.72} ${sz*.78},${sz*.30}"
                     fill="none" stroke="${col}" stroke-width="${sz*.1}" stroke-linecap="round" stroke-linejoin="round"/>`;
          break;
        case 'x':
        case 'close':
          inner = `<circle cx="${sz/2}" cy="${sz/2}" r="${sz/2}" fill="${bg}"/>
                   <line x1="${sz*.28}" y1="${sz*.28}" x2="${sz*.72}" y2="${sz*.72}" stroke="${col}" stroke-width="${sz*.1}" stroke-linecap="round"/>
                   <line x1="${sz*.72}" y1="${sz*.28}" x2="${sz*.28}" y2="${sz*.72}" stroke="${col}" stroke-width="${sz*.1}" stroke-linecap="round"/>`;
          break;
        case 'warning':
        case 'alert':
          inner = `<polygon points="${sz/2},${sz*.08} ${sz*.94},${sz*.88} ${sz*.06},${sz*.88}" fill="${bg || '#f59e0b'}" stroke="${col}" stroke-width="${sz*.04}"/>
                   <line x1="${sz/2}" y1="${sz*.38}" x2="${sz/2}" y2="${sz*.64}" stroke="${col}" stroke-width="${sz*.1}" stroke-linecap="round"/>
                   <circle cx="${sz/2}" cy="${sz*.76}" r="${sz*.05}" fill="${col}"/>`;
          break;
        case 'info':
          inner = `<circle cx="${sz/2}" cy="${sz/2}" r="${sz/2-.5}" fill="${bg}" stroke="${col}" stroke-width="${sz*.04}"/>
                   <circle cx="${sz/2}" cy="${sz*.3}" r="${sz*.06}" fill="${col}"/>
                   <line x1="${sz/2}" y1="${sz*.44}" x2="${sz/2}" y2="${sz*.72}" stroke="${col}" stroke-width="${sz*.1}" stroke-linecap="round"/>`;
          break;
        case 'arrow-right':
          inner = `<polyline points="${sz*.2},${sz*.3} ${sz*.7},${sz*.5} ${sz*.2},${sz*.7}"
                     fill="none" stroke="${col}" stroke-width="${sz*.1}" stroke-linecap="round" stroke-linejoin="round"/>`;
          break;
        case 'arrow-left':
          inner = `<polyline points="${sz*.8},${sz*.3} ${sz*.3},${sz*.5} ${sz*.8},${sz*.7}"
                     fill="none" stroke="${col}" stroke-width="${sz*.1}" stroke-linecap="round" stroke-linejoin="round"/>`;
          break;
        case 'arrow-up':
          inner = `<polyline points="${sz*.3},${sz*.8} ${sz*.5},${sz*.2} ${sz*.7},${sz*.8}"
                     fill="none" stroke="${col}" stroke-width="${sz*.1}" stroke-linecap="round" stroke-linejoin="round"/>`;
          break;
        case 'arrow-down':
          inner = `<polyline points="${sz*.3},${sz*.2} ${sz*.5},${sz*.8} ${sz*.7},${sz*.2}"
                     fill="none" stroke="${col}" stroke-width="${sz*.1}" stroke-linecap="round" stroke-linejoin="round"/>`;
          break;
        case 'star-badge':
          inner = `<polygon points="${sz/2},${sz*.1} ${sz*.61},${sz*.38} ${sz*.92},${sz*.38} ${sz*.68},${sz*.57} ${sz*.76},${sz*.87} ${sz/2},${sz*.7} ${sz*.24},${sz*.87} ${sz*.32},${sz*.57} ${sz*.08},${sz*.38} ${sz*.39},${sz*.38}"
                     fill="${bg || col}" stroke="${col}" stroke-width="${sz*.03}"/>`;
          break;
        case 'plus':
          inner = `<line x1="${sz/2}" y1="${sz*.2}" x2="${sz/2}" y2="${sz*.8}" stroke="${col}" stroke-width="${sz*.1}" stroke-linecap="round"/>
                   <line x1="${sz*.2}" y1="${sz/2}" x2="${sz*.8}" y2="${sz/2}" stroke="${col}" stroke-width="${sz*.1}" stroke-linecap="round"/>`;
          break;
        case 'minus':
          inner = `<line x1="${sz*.2}" y1="${sz/2}" x2="${sz*.8}" y2="${sz/2}" stroke="${col}" stroke-width="${sz*.1}" stroke-linecap="round"/>`;
          break;
        default:
          inner = `<text x="${sz/2}" y="${sz*.68}" text-anchor="middle" font-size="${sz*.6}" fill="${col}">${sig}</text>`;
      }
      return `<svg style="position:absolute; ${pos} ${opacity} z-index:${zIndex};" width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}">${inner}</svg>`;
    }

    default:
      return '';
  }
}

function svgShapeWrap(el, pos, zIndex, opacity, w, h, svgContent) {
  return `<svg style="position:absolute; ${pos} overflow:visible; ${opacity} z-index:${zIndex};" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${svgContent}</svg>`;
}
