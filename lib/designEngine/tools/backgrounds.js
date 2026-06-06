/**
 * Genera HTML/CSS para los fondos de los slides.
 * Cada función retorna un string HTML que se inserta como primer layer.
 */

export function renderBackground(bg = {}, width, height) {
  const uniqueId = Math.random().toString(36).slice(2, 8);

  switch (bg.type) {
    case 'solid':
      return `<div style="position:absolute;inset:0;background:${bg.color ?? '#0f0f0f'};z-index:0;"></div>`;

    case 'gradient': {
      const angle = bg.angle ?? 135;
      const stops = bg.stops ?? [{ color: '#0f0f0f', pos: 0 }, { color: '#1a1a2e', pos: 100 }];
      const css = stops.map(s => `${s.color} ${s.pos}%`).join(', ');
      return `<div style="position:absolute;inset:0;background:linear-gradient(${angle}deg, ${css});z-index:0;"></div>`;
    }

    case 'radial': {
      const cx = bg.cx ?? '50%';
      const cy = bg.cy ?? '50%';
      const stops = bg.stops ?? [{ color: '#1a1a2e', pos: 0 }, { color: '#0f0f0f', pos: 100 }];
      const css = stops.map(s => `${s.color} ${s.pos}%`).join(', ');
      return `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at ${cx} ${cy}, ${css});z-index:0;"></div>`;
    }

    case 'image': {
      const fit = bg.fit ?? 'cover';
      const pos = bg.position ?? 'center';
      return `<div style="position:absolute;inset:0;z-index:0;">
  <img src="${bg.src}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:${fit};object-position:${pos};">
</div>`;
    }

    case 'texture': {
      const variant = bg.variant ?? 'noise';
      const color = bg.color ?? '#ffffff';
      const opacity = bg.opacity ?? 0.08;
      const bgBase = bg.bg ?? '#0f0f0f';
      return renderTexture(variant, color, opacity, bgBase, uniqueId, width, height);
    }

    case 'glassmorphism': {
      const baseColor = bg.baseColor ?? '#ffffff';
      const blur = bg.blur ?? 20;
      const glassOpacity = bg.opacity ?? 0.15;
      // Parse hex to rgba
      const rgba = hexToRgba(baseColor, glassOpacity);
      return `<div style="position:absolute;inset:0;background:${rgba};backdrop-filter:blur(${blur}px);-webkit-backdrop-filter:blur(${blur}px);z-index:0;"></div>`;
    }

    default:
      return `<div style="position:absolute;inset:0;background:#0f0f0f;z-index:0;"></div>`;
  }
}

function renderTexture(variant, color, opacity, bg, uid, w, h) {
  const base = `<div style="position:absolute;inset:0;background:${bg};z-index:0;">`;
  const close = '</div>';

  switch (variant) {
    case 'noise':
      return `${base}
  <svg style="position:absolute;inset:0;width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg">
    <filter id="noise-${uid}">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#noise-${uid})" opacity="${opacity}" fill="${color}"/>
  </svg>${close}`;

    case 'grid':
      return `${base}
  <div style="position:absolute;inset:0;background-image:linear-gradient(${color} 1px, transparent 1px),linear-gradient(90deg, ${color} 1px, transparent 1px);background-size:40px 40px;opacity:${opacity};"></div>${close}`;

    case 'dots':
      return `${base}
  <div style="position:absolute;inset:0;background-image:radial-gradient(${color} 2px, transparent 2px);background-size:30px 30px;opacity:${opacity};"></div>${close}`;

    case 'diagonal':
      return `${base}
  <div style="position:absolute;inset:0;background-image:repeating-linear-gradient(45deg, ${color} 0px, ${color} 1px, transparent 1px, transparent 20px);opacity:${opacity};"></div>${close}`;

    case 'topography':
      return `${base}
  <svg style="position:absolute;inset:0;width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg">
    <filter id="topo-${uid}">
      <feTurbulence type="turbulence" baseFrequency="0.015" numOctaves="4" seed="2"/>
      <feDisplacementMap in="SourceGraphic" scale="60"/>
    </filter>
    <rect width="100%" height="100%" fill="none" stroke="${color}" stroke-width="1.5"
      filter="url(#topo-${uid})" opacity="${opacity}"/>
    ${topographyLines(w, h, color, opacity)}
  </svg>${close}`;

    default:
      return `${base}${close}`;
  }
}

function topographyLines(w, h, color, opacity) {
  const lines = [];
  const step = 60;
  for (let y = step; y < (h || 1350); y += step) {
    // Ondas orgánicas simuladas con curvas bezier
    const variance = 30;
    const pts = [];
    for (let x = 0; x <= (w || 1080); x += 120) {
      const dy = Math.sin(x / 200) * variance + Math.cos(x / 80 + y / 100) * variance * 0.5;
      pts.push(`${x},${y + dy}`);
    }
    const d = pts.reduce((acc, p, i) => {
      if (i === 0) return `M ${p}`;
      const prev = pts[i - 1].split(',');
      const curr = p.split(',');
      const mx = (parseFloat(prev[0]) + parseFloat(curr[0])) / 2;
      return `${acc} Q ${prev[0]},${prev[1]} ${mx},${(parseFloat(prev[1]) + parseFloat(curr[1])) / 2}`;
    }, '');
    lines.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="1" opacity="${opacity * 1.5}"/>`);
  }
  return lines.join('\n');
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}
