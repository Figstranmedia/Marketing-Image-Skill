# Design Engine — Flujo Completo

Motor de diseño para generar imágenes de marketing desde proyectos reales.
Lee la identidad visual del proyecto → genera imágenes con FLUX → compone los diseños → exporta PNG listos para publicar.

---

## Flujo de 9 pasos (plan original)

```
PASO 1  Abrir Cowork en la carpeta del proyecto
PASO 2  Analizar el contenido del proyecto
PASO 3  Detectar identidad visual (marca, tipografías, colores, estilo)
PASO 4  Construir prompts FLUX basados en la identidad detectada
PASO 5  Generar imágenes con Replicate (FLUX Schnell)
PASO 6  Optimizar prompts según las fortalezas del generador
PASO 7  Componer el diseño usando las reglas de la marca
PASO 8  Aplicar tipografía legible según la plataforma destino
PASO 9  Exportar resultado a subcarpeta del proyecto
```

Comando que activa los 9 pasos en un solo llamado:
```bash
node cli.js create "tu tema" [--format instagram-carousel] [--template full-bleed-image] [--scale 2]
```

---

## PASO 1 — Abrir en la carpeta del proyecto

Cowork monta la carpeta del usuario. El skill detecta `SKILL_HOME` y el `projectPath` activo.

```bash
# El skill detecta automáticamente:
# 1. SKILL_HOME (donde está cli.js)
# 2. projectPath (carpeta abierta en Cowork — donde se leerá la marca y se guardarán los assets)
echo "SKILL_HOME=$SKILL_HOME"
echo "PROJECT=$PROJECT_PATH"
```

Si el usuario no especificó carpeta de proyecto, usar el Desktop como destino de los assets.

---

## PASO 2 — Analizar el contenido del proyecto

`lib/projectAnalyzer.js` escanea la carpeta en busca de identidad visual.

```bash
node cli.js analyze [project_path]
```

Archivos que lee (en orden de prioridad):
1. `brand.json` / `brand/brand.json` → paleta, tipografía, tono declarados explícitamente
2. `tailwind.config.js` / `tailwind.config.ts` → colores extendidos del design system
3. CSS Variables en `*.css`, `*.scss` → `--color-*`, `--font-*`, `--primary`, `--accent`
4. `package.json` → nombre del proyecto, tecnología usada
5. Imágenes existentes en `public/`, `assets/`, `src/` → detección de paleta visual

El análisis produce un **Brand Profile**:
```json
{
  "name": "Mi Proyecto",
  "palette": {
    "primary":   "#1a1a2e",
    "secondary": "#16213e",
    "accent":    "#f97316"
  },
  "typography": {
    "heading": "Space Grotesk",
    "body":    "Inter"
  },
  "tone": "professional|creative|energetic|minimal",
  "confidence": "high|medium|low"
}
```

**Si `confidence: 'low'`** (no se encontró identidad clara):
- `primary: '#0f0f0f'`, `secondary: '#1a1a2e'`, `accent: '#f97316'`
- Tipografía: `Space Grotesk` + `Inter`
- Tono: neutro / universal

---

## PASO 3 — Detectar identidad visual

Con el Brand Profile listo, el skill tiene:

| Elemento | Uso posterior |
|----------|--------------|
| `palette.primary` | Fondo principal, base de gradientes |
| `palette.secondary` | Extremo de gradiente, overlays secundarios |
| `palette.accent` | Chips, líneas, botones CTA, SVG burst |
| `typography.heading` | Títulos — `role: "title"` |
| `typography.body` | Subtítulos, cuerpo — `role: "subtitle|body"` |
| `tone` | Decisión de template (oscuro/claro/minimal) |

**Derivar template base del tono:**
- `professional` → `editorial-light`, `split-layout`
- `creative` / `energetic` → `editorial-dark`, `full-bleed-image`
- `minimal` → `minimal-centered`, `quote-card`
- `announcement` (lanzamiento/evento) → `announcement`, `cta-bold`

---

## PASO 4 — Construir prompts FLUX desde la identidad

Los prompts se construyen en `lib/promptGenerator.js`. Extraen el estilo visual de la marca para que la imagen FLUX sea coherente con el diseño final.

**Estructura de un prompt efectivo:**
```
[sujeto visual] + [estilo fotográfico] + [paleta de color] + [mood] + [calidad]
```

**Basado en el Brand Profile:**
```js
// Ejemplo: marca oscura con acento naranja, tono energético
prompt = `${topic}, cinematic lighting, deep dark background with orange accent glow,
          dramatic composition, high contrast, editorial photography style,
          professional quality, sharp focus`

// Ejemplo: marca clara, profesional
prompt = `${topic}, clean bright studio lighting, minimalist background,
          professional headshot style, light airy atmosphere, high resolution`
```

**Tipos de slide y su rol visual:**
| Tipo | Descripción visual que busca FLUX |
|------|----------------------------------|
| `hero` | Imagen dominante — sujeto principal del tema |
| `body` | Imagen de soporte — contexto, ambiente, detalle |
| `cta` | Imagen de cierre — energética, llamativa, acción |

---

## PASO 5 — Generar imágenes con Replicate (FLUX Schnell)

```bash
# Flujo completo (recomendado):
node cli.js create "tu tema"

# Solo generación de imágenes:
node cli.js generate instagram-carousel "tu tema"

# Ver prompts sin generar (dry-run):
node cli.js generate instagram-carousel "tu tema" --dry-run

# Alternativa local con ComfyUI:
node cli.js generate instagram-carousel "tu tema" --local
```

**Costo:** FLUX Schnell = $0.003/imagen · un carrusel de 3 slides = ~$0.009

---

## PASO 6 — Optimizar prompts según las fortalezas del generador

FLUX Schnell tiene fortalezas y limitaciones conocidas. Los prompts las aprovechan:

**FLUX es fuerte en:**
- Iluminación cinematográfica y dramática
- Retratos y personas con alta fidelidad
- Fondos abstractos, texturas, atmósferas
- Composiciones simétricas centradas
- Colores saturados y contrastados

**FLUX tiene limitaciones en:**
- Texto dentro de la imagen → NUNCA pedir texto en el prompt
- Múltiples objetos con relaciones espaciales complejas
- Logos o iconos específicos

**Reglas de prompt para FLUX:**
1. Sin texto en el prompt
2. Describir luz antes que contenido: `"dramatic side lighting, ..."` → mejor resultado
3. Añadir siempre calidad al final: `"sharp focus, 4k quality, professional"`
4. Usar el acento de color de la marca en el prompt: `"with ${accent} color accent"`
5. Mencionar el estilo fotográfico: `cinematic | editorial | minimalist | documentary`

---

## PASO 7 — Componer el diseño con las reglas de la marca

Una vez generadas las imágenes, el Design Engine combina todo en un DesignSpec.

### 7A. Decidir el diseño

**¿Cuántos slides?**
- 1 → post único, impacto directo
- 3 → carrusel estándar: hook / valor / CTA
- 4 → narrativo: hook / problema / solución / CTA
- 5+ → educativo / storytelling

**¿Cuál es la emoción principal?**
- Inspiración → `editorial-dark` o `full-bleed-image`
- Información → `list-card`, `data-visual`, `split-layout`
- Urgencia → `cta-bold`, `announcement`
- Reflexión → `quote-card`
- Elegancia → `editorial-light`, `minimal-centered`

**Secuencias recomendadas:**

```
3 slides:  full-bleed-image → list-card → cta-bold
4 slides:  full-bleed-image → editorial-dark → list-card → cta-bold
5 slides:  full-bleed-image → data-visual → list-card → quote-card → cta-bold
```

### 7B. Herramientas de edición disponibles

Cada elemento va en `pages[n].elements[]`:

**Texto**
```json
{ "type": "text", "role": "title|subtitle|label|body|cta",
  "content": "...", "x": 40, "y": "bottom:200",
  "width": 1000, "size": 72, "weight": 700,
  "color": "#fff", "opacity": 0.82, "align": "left|center|right",
  "shadow": true, "font": "Space Grotesk" }
```

**Chip / Badge**
```json
{ "type": "chip", "text": "01 / HOOK",
  "x": 40, "y": 60, "color": "rgba(255,255,255,0.14)",
  "textColor": "#fff", "fontSize": 18, "borderRadius": 20 }
```

**Overlay (para legibilidad sobre imagen)**
```json
{ "type": "overlay",
  "variant": "gradient-bottom|gradient-top|solid|vignette",
  "color": "rgba(0,0,0,1)", "opacity": 0.7, "height": "65%" }
```

**Imagen**
```json
{ "type": "image",
  "src": "flux:hero|project:public/img/photo.jpg|url:https://...",
  "x": 0, "y": 0, "width": 1080, "height": 1350,
  "fit": "cover|contain", "borderRadius": 0 }
```

**SVG personalizado**
```json
{ "type": "svg", "x": 0, "y": 0, "width": 1080, "height": 1350,
  "content": "<circle cx='900' cy='200' r='300' fill='#f97316' opacity='0.06'/>" }
```

### 7C. Templates disponibles (11)

| Template | Cuándo usarlo |
|----------|--------------|
| `full-bleed-image` | Imagen FLUX de fondo + texto |
| `editorial-dark` | Sin imagen — tipografía + acento de color |
| `editorial-light` | Marca clara, LinkedIn, profesional |
| `minimal-centered` | Mensaje corto y poderoso |
| `split-layout` | 50% imagen / 50% texto |
| `list-card` | 2–5 items comparables o pasos |
| `cta-bold` | Último slide — botón + call to action |
| `quote-card` | Cita, testimonio, frase inspiracional |
| `data-visual` | Número o estadística dominante |
| `announcement` | Evento, fecha, lanzamiento |
| `presentation-slide` | YouTube thumbnail, 16:9 |

### 7D. Elementos vectoriales (shapes.js)

**Formas geométricas:**
```json
{ "type": "shape", "shape": "rect|circle|ellipse|triangle|diamond|hexagon|star|polygon",
  "x": 100, "y": 100, "width": 200, "height": 200,
  "fill": "#f97316", "stroke": "#fff", "strokeWidth": 2,
  "borderRadius": 12, "rotate": 0, "opacity": 0.9 }
```

**Conectores (línea recta con flechas):**
```json
{ "type": "shape", "shape": "connector",
  "x1": 100, "y1": 400, "x2": 500, "y2": 400,
  "stroke": "#f97316", "strokeWidth": 3,
  "arrowEnd": true, "arrowStart": false,
  "dashArray": "8,4" }
```

**Conector curvo (arco Bézier):**
```json
{ "type": "shape", "shape": "curved-connector",
  "x1": 100, "y1": 600, "x2": 600, "y2": 600,
  "cpx": 350, "cpy": 400,
  "stroke": "#fff", "strokeWidth": 2, "arrowEnd": true }
```

**Señales / Iconos:**
```json
{ "type": "shape", "shape": "signal",
  "signal": "checkmark|x|warning|info|arrow-right|arrow-left|arrow-up|arrow-down|star-badge|plus|minus",
  "x": 80, "y": 300, "size": 64,
  "color": "#fff", "fill": "rgba(249,115,22,0.9)" }
```

### 7E. Fondos texturizados (backgrounds.js)

```json
{ "type": "solid",   "color": "#0f0f0f" }
{ "type": "gradient","angle": 135,
  "stops": [{"color":"#0f0f0f","pos":0},{"color":"#1a1a2e","pos":100}] }
{ "type": "radial",  "cx": "50%", "cy": "30%",
  "stops": [{"color":"#3d1e00","pos":0},{"color":"#0f0f0f","pos":70}] }
{ "type": "texture", "variant": "noise|grid|dots|diagonal|topography",
  "color": "#f97316", "opacity": 0.06, "bg": "#0f0f0f" }
{ "type": "glassmorphism", "baseColor": "#ffffff", "opacity": 0.15, "blur": 20 }
```

| Variante textura | Opacidad ideal | Uso |
|-----------------|---------------|-----|
| `noise` | 0.04–0.08 | Universal, orgánico |
| `grid` | 0.06–0.12 | Tech / digital |
| `dots` | 0.06–0.12 | Moderno, música, creativo |
| `diagonal` | 0.06–0.10 | Energético |
| `topography` | 0.08–0.14 | Premium, artístico |

---

## PASO 8 — Tipografía legible por plataforma

`formats.js` define los tamaños mínimos por formato para garantizar legibilidad en dispositivos móviles.

| Formato | title | subtitle | body | Plataforma |
|---------|-------|----------|------|-----------|
| `instagram-carousel` | 72px | 32px | 28px | Feed móvil (4:5) |
| `instagram-story` | 80px | 36px | 30px | Story pantalla completa |
| `instagram-square` | 72px | 32px | 28px | Feed cuadrado |
| `linkedin-post` | 56px | 28px | 24px | Feed desktop/móvil |
| `twitter-post` | 44px | 24px | 20px | Timeline compacto |
| `youtube-thumbnail` | 80px | 40px | 32px | Thumbnail 720p |
| `presentation-16-9` | 72px | 36px | 28px | Pantalla grande |
| `poster-a4` | 120px | 56px | 44px | Impresión 300dpi |

**Reglas de contraste obligatorias:**
- Texto sobre imagen → siempre `"shadow": true` + overlay
- Contraste mínimo WCAG AA → 4.5:1 para texto normal, 3:1 para título grande
- Accent claro (`#f59e0b`, `#a3e635`) → `textColor: '#000'`
- Accent oscuro (`#7c3aed`, `#1e40af`) → `textColor: '#fff'`

**Reglas de layout:**
- Padding mínimo desde bordes: `40px`
- Stories: safe area `120px` arriba y abajo (UI del teléfono)
- Chip de label: siempre `x: 40, y: 60` — coherencia entre slides
- Texto principal: tercio inferior (`y: 'bottom:200'`)
- Decoración: tercio superior, opuesto al texto

---

## PASO 9 — Exportar a subcarpeta del proyecto

El renderer genera PNG via Puppeteer (Chrome del sistema). Guarda en `marketing-assets/` dentro del proyecto.

```bash
# Estándar
node cli.js design [folder]

# Retina 2x (recomendado para producción)
node cli.js design [folder] --scale 2

# Solo HTML preview (sin Chrome)
node cli.js design [folder] --preview
```

**Estructura de salida:**
```
[project]/
  marketing-assets/
    [topic]-[format]-[fecha]/
      flux-raw/          ← imágenes FLUX originales (no publicar)
        slide-1-hero.webp
        slide-2-body.webp
        slide-3-cta.webp
      slide-1.png        ← render final listo para publicar
      slide-2.png
      slide-3.png
      manifest.json      ← metadata + captions generados por Haiku
```

`manifest.json`:
```json
{
  "topic": "mi tema",
  "format": "instagram-carousel",
  "slides": [
    { "file": "slide-1.png", "caption": "Caption listo para publicar..." },
    { "file": "slide-2.png", "caption": "..." },
    { "file": "slide-3.png", "caption": "..." }
  ]
}
```

---

## Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| Texto invisible sobre imagen | Falta overlay | Siempre `overlay gradient-bottom` antes del texto |
| Texto cortado en story | Safe areas no respetadas | No colocar elementos bajo `bottom:200` ni sobre `top:120` |
| Diseño vacío | Sin decoración en editorial | En `editorial-dark`: siempre burst SVG de círculos |
| Font no carga | Nombre incorrecto | Verificar nombre exacto en fonts.google.com |
| CTA ilegible | Accent oscuro con texto negro | Si luminancia < 0.3 → `textColor: '#fff'` |
| Copy genérico | Sin `ANTHROPIC_API_KEY` | Agregar key en `.env` para activar Claude Haiku |
| Imágenes no encontradas | Alias `flux:` sin generar | Correr `node cli.js generate` primero |
| Rate limit Replicate | Demasiadas requests | Esperar 30s o usar `--local` con ComfyUI |
| Chip choca con borde | `y` mal calculado | Usar siempre `x: 40, y: 60` |
| Burst SVG invisible | Opacidad muy baja | Exterior: 0.08–0.15 / punto central: 0.6–0.9 |
