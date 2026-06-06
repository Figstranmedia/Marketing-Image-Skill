# Design Engine — Especificación para Implementación

## Contexto del proyecto

`marketing-image-skill` es un skill de Cowork (Claude) que genera contenido visual para redes sociales en 3 fases:

1. **Brand analysis** (`lib/projectAnalyzer.js`) — lee colores HEX, fuentes y tono desde archivos del proyecto (brand.json, tailwind.config, CSS variables)
2. **Image generation** (`lib/fluxClient.js` + `scripts/generate_flux_urls.js`) — genera imágenes de fondo con FLUX Schnell via Replicate API
3. **Design engine** (`lib/designEngine/` — **esto es lo que hay que construir**) — Claude compone el diseño final en HTML/CSS, Puppeteer lo convierte a PNG

Ya existe un prototipo básico en `lib/htmlEditor/` (compositor.js, renderer.js, templates.js). El design engine **reemplaza y expande** ese prototipo. `lib/htmlEditor/` puede eliminarse o migrarse.

---

## Objetivo

Construir `lib/designEngine/` — un motor de diseño neutral que Claude usa para crear cualquier pieza visual desde cualquier proyecto. No está limitado a posts de redes sociales; puede generar posters, certificados, portadas, flyers, invitaciones, y cualquier diseño que quepa en un canvas rectangular.

Claude es el diseñador: genera el JSON de diseño, el motor lo convierte a PNG/PDF.

---

## Estructura de carpetas

```
lib/designEngine/
├── index.js              ← API pública (render, preview, listFormats, listTemplates)
├── compositor.js         ← HTML generator: DesignSpec JSON → HTML string
├── renderer.js           ← Puppeteer: HTML → PNG/PDF
├── formats.js            ← Dimensiones por plataforma
├── importer.js           ← Resuelve rutas de imágenes (FLUX, proyecto, URL)
│
├── tools/
│   ├── typography.js     ← Utilidades de texto: font loading, line clamping, safe sizes
│   ├── shapes.js         ← SVG elements: rect, circle, triangle, polygon, line, arrow
│   ├── backgrounds.js    ← Fondos: gradient, solid, image, texture, glassmorphism, noise
│   └── effects.js        ← Overlays, border-radius helpers, opacity, blend modes
│
└── templates/
    ├── index.js          ← Registry: lista y carga plantillas por nombre
    ├── instagram-carousel.js
    ├── instagram-story.js
    ├── linkedin-post.js
    ├── twitter-post.js
    ├── facebook-ad.js
    ├── poster-vertical.js
    └── presentation-slide.js
```

---

## La spec de diseño (DesignSpec)

Este es el JSON que Claude genera para describir un diseño. El compositor lo convierte a HTML.

```ts
interface DesignSpec {
  format: string;           // 'instagram-carousel' | 'instagram-story' | etc.
  width?: number;           // Override de dimensiones (opcional)
  height?: number;
  brand: BrandProfile;      // Del projectAnalyzer
  pages: PageSpec[];        // 1 page = 1 slide/imagen de output
}

interface PageSpec {
  background: BackgroundSpec;
  elements: ElementSpec[];
}

// BACKGROUNDS

type BackgroundSpec =
  | { type: 'solid';        color: string }
  | { type: 'gradient';     angle: number; stops: { color: string; pos: number }[] }
  | { type: 'radial';       cx: string; cy: string; stops: { color: string; pos: number }[] }
  | { type: 'image';        src: string; fit: 'cover'|'contain'|'fill'; position?: string }
  | { type: 'texture';      variant: 'noise'|'grid'|'dots'|'diagonal'|'topography'; color: string; opacity: number; bg: string }
  | { type: 'glassmorphism'; baseColor: string; blur: number; opacity: number };

// ELEMENTS

type ElementSpec =
  | TextElement
  | ImageElement
  | ShapeElement
  | SVGElement
  | ConnectorElement
  | OverlayElement
  | ChipElement;

interface BaseElement {
  id?: string;
  x?: number | string;   // px o 'center' o 'left:40' o 'right:40'
  y?: number | string;   // px o 'center' o 'top:40' o 'bottom:80'
  width?: number | string;
  height?: number;
  opacity?: number;
  zIndex?: number;
}

interface TextElement extends BaseElement {
  type: 'text';
  content: string;           // Soporta \n para saltos de línea
  role: 'title'|'subtitle'|'body'|'label'|'cta';
  font?: string;             // Nombre de Google Font o brand font
  size?: number;             // px — si se omite, usar el tamaño del role según formato
  weight?: 400|500|700;
  color?: string;
  align?: 'left'|'center'|'right';
  lineHeight?: number;
  letterSpacing?: number;
  maxLines?: number;         // Clamp de líneas
  shadow?: boolean;          // text-shadow sutil para legibilidad
}

interface ImageElement extends BaseElement {
  type: 'image';
  src: string;               // Ruta local, URL, o alias 'flux:hero' | 'flux:body' | etc.
  fit: 'cover'|'contain'|'fill'|'none';
  borderRadius?: number;
  grayscale?: boolean;
  brightness?: number;       // 0-2, default 1
}

interface ShapeElement extends BaseElement {
  type: 'shape';
  shape: 'rect'|'circle'|'ellipse'|'triangle'|'diamond'|'hexagon'|'star'|'polygon';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  sides?: number;            // Para polygon
  points?: string;           // Para polygon custom (SVG points format)
  rotate?: number;           // grados
}

interface SVGElement extends BaseElement {
  type: 'svg';
  content: string;           // SVG inline (sin <svg> wrapper, solo el contenido)
  viewBox?: string;
}

interface ConnectorElement extends BaseElement {
  type: 'connector';
  variant: 'line'|'arrow'|'dashed-line'|'dashed-arrow'|'curved';
  x1: number; y1: number;
  x2: number; y2: number;
  color?: string;
  strokeWidth?: number;
}

interface OverlayElement extends BaseElement {
  type: 'overlay';
  variant: 'gradient-bottom'|'gradient-top'|'gradient-left'|'gradient-right'|'solid'|'vignette';
  color?: string;
  opacity?: number;
  height?: string;           // % del canvas, ej: '60%'
}

interface ChipElement extends BaseElement {
  type: 'chip';
  text: string;
  color?: string;            // background color
  textColor?: string;
  borderRadius?: number;
  border?: string;
  fontSize?: number;
}
```

---

## formats.js

Exportar un objeto con dimensiones por plataforma:

```js
export const FORMATS = {
  'instagram-carousel':  { width: 1080, height: 1350, label: 'Instagram Post (4:5)' },
  'instagram-story':     { width: 1080, height: 1920, label: 'Instagram Story (9:16)' },
  'instagram-square':    { width: 1080, height: 1080, label: 'Instagram Square (1:1)' },
  'linkedin-post':       { width: 1200, height: 627,  label: 'LinkedIn Post (1.91:1)' },
  'linkedin-square':     { width: 1080, height: 1080, label: 'LinkedIn Square' },
  'twitter-post':        { width: 1024, height: 512,  label: 'Twitter/X Post (2:1)' },
  'facebook-ad':         { width: 1200, height: 628,  label: 'Facebook Ad' },
  'facebook-story':      { width: 1080, height: 1920, label: 'Facebook Story' },
  'youtube-thumbnail':   { width: 1280, height: 720,  label: 'YouTube Thumbnail (16:9)' },
  'poster-a4':           { width: 2480, height: 3508, label: 'Poster A4 (300dpi)' },
  'poster-letter':       { width: 2550, height: 3300, label: 'Poster Letter (300dpi)' },
  'presentation-16-9':   { width: 1920, height: 1080, label: 'Presentación 16:9' },
  'email-banner':        { width: 600,  height: 200,  label: 'Email Banner' },
};

// Tipografía mínima garantizada para legibilidad mobile por formato
export const FORMAT_TYPOGRAPHY = {
  'instagram-carousel':  { title: 72, subtitle: 32, label: 20, body: 28 },
  'instagram-story':     { title: 80, subtitle: 36, label: 22, body: 30 },
  'instagram-square':    { title: 72, subtitle: 32, label: 20, body: 28 },
  'linkedin-post':       { title: 56, subtitle: 28, label: 18, body: 24 },
  'twitter-post':        { title: 44, subtitle: 24, label: 16, body: 20 },
  'facebook-ad':         { title: 56, subtitle: 28, label: 18, body: 24 },
  'youtube-thumbnail':   { title: 80, subtitle: 40, label: 24, body: 32 },
  'presentation-16-9':   { title: 72, subtitle: 36, label: 22, body: 28 },
};

// Safe areas por plataforma (evitar UI del dispositivo)
export const FORMAT_SAFE_AREAS = {
  'instagram-story':  { top: 120, bottom: 200, left: 40, right: 40 },
  'facebook-story':   { top: 120, bottom: 200, left: 40, right: 40 },
  default:            { top: 40,  bottom: 40,  left: 40, right: 40 },
};
```

---

## templates/

Cada template exporta una función:

```js
// Firma estándar para todos los templates
export function generate(brand, contents, format) {
  // brand: BrandProfile de projectAnalyzer
  // contents: { title, subtitle, label, items, ctaText, backgroundImage }
  // format: string del formato destino
  return DesignSpec; // objeto completo listo para compositor
}
```

### Templates a implementar (basados en formatos de alto desempeño)

| Template | Descripción | Estructura |
|----------|-------------|------------|
| `editorial-dark` | Fondo oscuro, tipografía grande, acento de color | overlay + título dominante + subtítulo |
| `editorial-light` | Fondo claro, tipografía en color de marca | sin overlay, texto de color |
| `split-layout` | 50% imagen / 50% texto en columnas | grid 2 columnas |
| `full-bleed-image` | Imagen de fondo con texto sobre overlay | cover image + gradient overlay |
| `minimal-centered` | Fondo sólido, contenido centrado, mucho espacio | centrado vertical y horizontal |
| `list-card` | Lista numerada con items visuales | fondo + chip + título + pills numeradas |
| `cta-bold` | Call to action dominante, botón grande | imagen/gradiente + texto + botón |
| `quote-card` | Cita destacada, atribución | fondo minimal + comillas decorativas + texto |
| `data-visual` | Número grande + contexto | número XXL + descriptor + fuente |
| `announcement` | Evento/fecha prominente | fondo texturizado + fecha + título + lugar |

---

## backgrounds.js

Fondos texturizados implementados como HTML/CSS o SVG inline:

```js
export const textures = {
  // Noise orgánico con SVG feTurbulence
  noise: (color, opacity, bg) => `...`,

  // Grid fino
  grid: (color, opacity, bg, spacing = 40) => `...`,

  // Puntos
  dots: (color, opacity, bg, size = 3, spacing = 30) => `...`,

  // Líneas diagonales
  diagonal: (color, opacity, bg, angle = 45, spacing = 20) => `...`,

  // Topografía (ondas concéntricas)
  topography: (color, opacity, bg) => `...`,

  // Glassmorphism
  glassmorphism: (baseColor, blur = 20, opacity = 0.15) => `...`,
};
```

---

## importer.js

Resuelve rutas de imágenes desde múltiples fuentes:

```js
/**
 * Resuelve la ruta/URL real de una imagen para usar en el diseño.
 *
 * Aliases soportados:
 *   'flux:hero'     → busca en outputFolder/flux-raw/slide-*-hero.webp
 *   'flux:body'     → busca en outputFolder/flux-raw/slide-*-body.webp
 *   'flux:cta'      → busca en outputFolder/flux-raw/slide-*-cta.webp
 *   'project:path'  → busca en projectPath/path
 *   'url:https://…' → URL externa (para Puppeteer)
 *   './path'        → ruta relativa al outputFolder
 *   '/absolute'     → ruta absoluta
 */
export async function resolveImageSrc(src, { projectPath, outputFolder }) { ... }

/**
 * Escanea flux-raw/ y devuelve las imágenes disponibles con sus tipos.
 */
export async function listFluxImages(outputFolder) { ... }

/**
 * Escanea el proyecto y devuelve imágenes clasificadas por tipo
 * (performance, identity, editorial, brand)
 * Reutiliza la lógica de imageDetector.js
 */
export async function listProjectImages(projectPath) { ... }
```

---

## compositor.js

Genera HTML completo desde DesignSpec. Reglas:

- Dimensiones exactas en `<html>` y `<body>`: `width: Xpx; height: Ypx; overflow: hidden`
- Google Fonts: `<link>` dinámico con las fuentes del brand + cualquier override de elementos
- CSS variables inyectadas: `--accent`, `--accent2`, `--font-heading`, `--font-body`, `--primary`, `--secondary`
- Todos los elementos con `position: absolute`
- Backgrounds como primer layer, overlays antes del contenido, texto siempre arriba
- Soporte para alias `x: 'center'`, `x: 'right:40'`, `y: 'bottom:80'`, `y: 'center'`
- Texturas via SVG feTurbulence o CSS `background-image: repeating-linear-gradient()`
- Elementos SVG (shapes, connectors) inlineados directamente en el HTML
- `z-index` automático: background=0, textures=1, image=2, overlays=3, shapes=10, text=20, chips=25

---

## renderer.js

Igual al prototipo existente en `lib/htmlEditor/renderer.js`. Copiar y ajustar:

- Detectar Chrome del sistema (macOS: `/Applications/Google Chrome.app/...`, Linux: `/usr/bin/google-chrome`)
- Fallback a Chrome descargado por Puppeteer
- Soporte para escala 2x (retina): `{ scale: 2 }` → viewport 2× + screenshot clip al tamaño real
- Esperar `document.fonts.ready` + 1500ms para carga de Google Fonts
- Output: PNG siempre. PDF opcional via `page.pdf()` para formatos poster/print

---

## index.js — API pública

```js
/**
 * Renderiza un DesignSpec completo (todas las páginas) a PNG files.
 * Retorna array de rutas a los PNG generados.
 */
export async function render(spec, outputFolder, opts = {}) { ... }

/**
 * Genera HTML de preview sin renderizar (para debug en browser).
 * Retorna string HTML para la primera página.
 */
export function preview(spec) { ... }

/**
 * Devuelve la lista de formatos disponibles con dimensiones.
 */
export function listFormats() { ... }

/**
 * Devuelve la lista de templates disponibles.
 */
export function listTemplates() { ... }

/**
 * Genera un DesignSpec desde un template por nombre.
 */
export function fromTemplate(templateName, brand, contents, format) { ... }

/**
 * Verifica que el renderer esté disponible (Chrome).
 */
export async function checkRenderer() { ... }
```

---

## CLI — comando `design`

Agregar a `cli.js`:

```
node cli.js design [outputFolder] [--template nombre] [--format formato] [--scale 2] [--preview] [--debug-html]
```

- `outputFolder`: carpeta dentro del proyecto (ej: `marketing-assets/2026-06-04_1700_instagram-carousel`)
- `--template`: nombre del template a usar
- `--format`: override de formato
- `--scale 2`: renderizar en 2x (retina)
- `--preview`: guardar HTML sin renderizar
- `--debug-html`: guardar HTML además del PNG

---

## Integración con el skill completo

El flujo completo después de implementar el design engine:

```
1. node cli.js analyze [project]
   → Brand Profile (colores, fuentes, tono)

2. node scripts/generate_flux_urls.js '[prompts]'
   → URLs de imágenes FLUX (guardadas en flux-raw/)

3. node cli.js design marketing-assets/fecha_formato --template full-bleed-image
   → Claude genera el DesignSpec JSON
   → compositor.js genera HTML
   → renderer.js → PNG en marketing-assets/fecha_formato/

4. Output final:
   marketing-assets/
   └── 2026-06-04_1700_instagram-carousel/
       ├── flux-raw/
       │   ├── slide-1-hero.webp
       │   ├── slide-2-body.webp
       │   └── slide-3-cta.webp
       ├── slide-1-hero.png       ← diseño final
       ├── slide-2-body.png
       ├── slide-3-cta.png
       └── manifest.json
```

---

## Notas de implementación

- Usar ES Modules (`import/export`) — el proyecto ya tiene `"type": "module"` en package.json
- No romper la API pública existente de `lib/htmlEditor/` hasta que el design engine esté completo — migrar gradualmente
- Los templates deben ser funciones puras: misma entrada → mismo output (sin side effects)
- El compositor debe ser testeble sin Puppeteer: `preview()` devuelve HTML que se puede abrir en browser
- Puppeteer: preferir `executablePath` del sistema antes de descargar Chrome en node_modules
- Textures con SVG feTurbulence funcionan en Puppeteer pero NO en node-canvas — mantener Puppeteer como único renderer
- Google Fonts require red access; si Puppeteer corre offline, agregar fallback a fuentes del sistema

---

## Dependencias adicionales necesarias

```json
{
  "puppeteer": "^22.0.0"   // ya instalado
}
```

No se requieren dependencias adicionales. Todo lo demás (SVG, CSS, HTML) se genera programáticamente.
