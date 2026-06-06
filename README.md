# Marketing Image Skill

Skill de generación de imágenes de marketing para proyectos reales. Lee la identidad visual del proyecto (colores, tipografías, tono), genera imágenes de fondo con FLUX via Replicate, compone los diseños finales localmente con el design engine y genera captions listos para publicar.

Funciona desde cualquier carpeta de proyecto. Los resultados se guardan en `marketing-assets/` dentro del propio proyecto.

---

## Flujo completo

```
FASE 1 — Análisis de marca
  node cli.js analyze [project_path]
  → Lee brand.json, tailwind.config, CSS variables
  → Extrae colores HEX reales, fuentes, tono, sector

FASE 2 — Generación de imágenes FLUX
  node scripts/generate_flux_urls.js '[prompts]'
  → Llama Replicate REST API
  → Descarga webp en marketing-assets/fecha_formato/flux-raw/

FASE 3 — Diseño final (HTML → PNG)
  node cli.js design <folder> --template [nombre]
  → Compositor genera HTML desde DesignSpec JSON
  → Puppeteer + Chrome renderiza PNG 1080×1350

FASE 3b — Copywriting (opcional, requiere ANTHROPIC_API_KEY)
  node cli.js copy <folder> --topic "tema"
  → Claude Haiku genera títulos, subtítulos y captions
  → Re-renderiza los slides con contenido real
```

---

## Prerequisitos

| Herramienta | Requerido | Para qué |
|---|---|---|
| Node.js 18+ | Sí | Ejecutar todo |
| `REPLICATE_API_TOKEN` | Sí | Generar imágenes FLUX |
| Google Chrome | Sí | Renderizar PNG (Puppeteer) |
| `ANTHROPIC_API_KEY` | No | Copy real con Claude Haiku |
| ComfyUI local | No | Alternativa gratis a Replicate |

---

## Instalación

```bash
cd ~/Desktop/marketing-image-skill
npm install
cp .env.example .env
# Editar .env y agregar REPLICATE_API_TOKEN
```

Verificar que todo esté listo:

```bash
node cli.js test-flux       # Replicate API
node cli.js test-renderer   # Chrome/Puppeteer
```

---

## Uso

### Flujo básico (sin proyecto específico)

```bash
# 1. Generar imágenes FLUX para un tema
node cli.js generate instagram-carousel "lanzamiento de álbum" --dry-run  # preview
node cli.js generate instagram-carousel "lanzamiento de álbum"            # genera

# 2. Diseñar los slides
node cli.js design marketing-assets/2026-06-04_1800_instagram-carousel \
  --template full-bleed-image --scale 2

# 3. Revisar antes de renderizar (no requiere Chrome)
node cli.js design marketing-assets/2026-06-04_1800_instagram-carousel --preview
```

### Flujo con proyecto específico

```bash
# Desde la carpeta del proyecto:
node $SKILL_HOME/cli.js analyze .
node $SKILL_HOME/cli.js generate instagram-carousel "tour 2026"
node $SKILL_HOME/cli.js design marketing-assets/fecha_formato --template announcement
```

### Con copywriting real

```bash
# Requiere ANTHROPIC_API_KEY en .env
node cli.js design marketing-assets/fecha_formato \
  --template full-bleed-image --copy --topic "Religión del Espíritu"

# O re-renderizar una carpeta ya existente con copy nuevo:
node cli.js copy marketing-assets/fecha_formato --topic "Religión del Espíritu"
```

### Opción local (ComfyUI — sin costo)

```bash
# Iniciar ComfyUI primero:
cd ~/video-ai/ComfyUI && python main.py

# Generar con FLUX local (~3-8 min/imagen en CPU/MPS):
node cli.js generate instagram-carousel "tema" --local
```

---

## CLI — todos los comandos

```
analyze [path]                     Analizar brand del proyecto
generate [format] "[topic]"        Generar imágenes con FLUX (Replicate)
  --dry-run                        Solo prompts, sin generar
  --local                          Usar ComfyUI local en vez de Replicate
  --json                           Output JSON estructurado
design <folder>                    Diseñar slides (HTML → PNG)
  --template [nombre]              Template a usar (default: full-bleed-image)
  --copy --topic "tema"            Generar copy con Claude Haiku y renderizar
  --scale 2                        Renderizar en 2x retina
  --preview                        Solo HTML, sin Chrome
  --debug-html                     Guardar HTML además del PNG
copy <folder> --topic "tema"       Re-renderizar con copy real
list [path]                        Listar assets generados
test-flux                          Verificar Replicate
test-comfyui                       Verificar ComfyUI local
test-renderer                      Verificar Chrome/Puppeteer
```

---

## Templates disponibles (11)

| Template | Cuándo usar |
|---|---|
| `full-bleed-image` | Imagen FLUX de fondo con texto sobre overlay — el más usado |
| `editorial-dark` | Sin imagen — tipografía dominante sobre gradiente oscuro |
| `editorial-light` | Fondo claro, tipografía en colores de marca |
| `minimal-centered` | Mensaje corto y poderoso, todo centrado |
| `split-layout` | 50% imagen / 50% texto en columnas |
| `list-card` | Lista numerada — "3 razones", "5 pasos" |
| `cta-bold` | Último slide — botón dominante, máxima conversión |
| `quote-card` | Cita o frase inspiracional con atribución |
| `data-visual` | Número grande + descriptor — estadísticas, métricas |
| `announcement` | Evento, concierto, lanzamiento — fecha + lugar prominentes |
| `presentation-slide` | Formato 16:9 — YouTube thumbnails, presentaciones |

---

## Formatos soportados (13)

| Formato | Dimensión | Uso |
|---|---|---|
| `instagram-carousel` | 1080×1350 | Posts con múltiples slides |
| `instagram-story` | 1080×1920 | Stories fullscreen |
| `instagram-square` | 1080×1080 | Feed cuadrado |
| `linkedin-post` | 1200×627 | Contenido profesional |
| `linkedin-square` | 1080×1080 | Feed LinkedIn |
| `twitter-post` | 1024×512 | Twitter/X |
| `facebook-ad` | 1200×628 | Anuncios Facebook |
| `facebook-story` | 1080×1920 | Stories Facebook |
| `youtube-thumbnail` | 1280×720 | Miniaturas de video |
| `presentation-16-9` | 1920×1080 | Slides de presentación |
| `poster-a4` | 2480×3508 | Posters impresión A4 |
| `poster-letter` | 2550×3300 | Posters carta |
| `email-banner` | 600×200 | Banners de email |

---

## Estructura de output

```
[proyecto]/marketing-assets/
└── 2026-06-04_1800_instagram-carousel/
    ├── flux-raw/
    │   ├── slide-1-hero.webp      ← imagen FLUX original
    │   ├── slide-2-body.webp
    │   └── slide-3-cta.webp
    ├── slide-01.png               ← diseño final renderizado
    ├── slide-02.png
    ├── slide-03.png
    ├── preview.html               ← (si se usó --preview)
    └── manifest.json              ← brand profile, prompts, captions
```

### manifest.json

```json
{
  "created": "2026-06-04T18:00:00Z",
  "format": "instagram-carousel",
  "topic": "lanzamiento de álbum",
  "brand_analysis": {
    "colors": { "primary": "#020408", "accent": "#c9a84c" },
    "fonts": { "heading": "Space Grotesk", "body": "Inter" },
    "tone": "espiritual",
    "confidence": "high"
  },
  "prompts": [{ "type": "hero", "prompt": "..." }],
  "images": [{ "type": "hero", "path": "flux-raw/slide-1-hero.webp" }],
  "caption": {
    "general": "Descripción para cualquier plataforma",
    "instagram": "Caption con emojis y hashtags",
    "linkedin": "Caption profesional",
    "twitter": "Caption corto < 240 chars"
  }
}
```

---

## Variables de entorno

```bash
REPLICATE_API_TOKEN=r8_...        # Requerido — tokens en replicate.com
FLUX_MODEL=schnell                # schnell ($0.003) o pro ($0.04)
ANTHROPIC_API_KEY=sk-ant-...     # Opcional — para copywriter con Haiku
SKILL_HOME=~/Desktop/marketing-image-skill  # Ruta a este directorio
COMFYUI_API_URL=http://localhost:8188       # Solo si usas ComfyUI local
```

---

## Modelos FLUX

| Modelo | Costo | Velocidad | Uso |
|---|---|---|---|
| `schnell` | $0.003/img | ~5-10s | Iteración, prototipos |
| `pro` | $0.04/img | ~30s | Producción, máxima calidad |
| ComfyUI local | Gratis | 3-8 min/img | Sin costo, requiere GPU/CPU |

---

## Troubleshooting

| Error | Solución |
|---|---|
| `REPLICATE_API_TOKEN not set` | Agregar a `.env` → `node cli.js test-flux` |
| Rate limit 429 | El script reintenta automáticamente con 12s de delay |
| Puppeteer no encontrado | `npm install puppeteer --ignore-scripts` |
| Chrome no detectado | Instalar Google Chrome o configurar `CHROME_PATH` en `.env` |
| Imágenes < 5KB | Error de descarga — repetir el curl de ese slide |
| URLs FLUX expiradas | Válidas ~1 hora — re-generar si pasó más tiempo |
| ComfyUI: Prompt no outputs | Verificar que `lib/comfyuiClient.js` esté actualizado (bug resuelto en 2026-06-04) |
| `ANTHROPIC_API_KEY not set` | Solo afecta el copywriter — el resto funciona igual |
