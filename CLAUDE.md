# marketing-image-skill — contexto de sesión

## Conocimiento experto de diseño
Para cualquier tarea de diseño, leer primero:
- `lib/designEngine/DESIGN_SKILL.md` — reglas de templates, tipografía, color, composición y coherencia de carrusel
- `lib/designEngine/templates/index.js` — catálogo de los 11 templates disponibles
- `lib/designEngine/formats.js` — dimensiones, tipografía mínima y safe areas por plataforma

## Estado actual (2026-06-04)

| Componente | Estado |
|---|---|
| FLUX via Replicate | Funcional — `scripts/generate_flux_urls.js` |
| ComfyUI local | Funcional — `lib/comfyuiClient.js` end-to-end con FLUX Schnell |
| projectAnalyzer | Lee brand.json, tailwind.config, CSS vars; extrae HEX reales |
| SKILL.md | Flujo 0→7 completo, es el guión que sigue Cowork |

> **Nota:** HANDOFF.md decía que ComfyUI estaba "abandonado" (error "Prompt has no outputs").
> Ese bug fue resuelto en sesión 2026-06-04. El cliente actual en `lib/comfyuiClient.js` funciona.

---

## Entradas principales

**Cowork** (devuelve JSON con URLs públicas de Replicate):
```
cd $SKILL_HOME
node scripts/generate_flux_urls.js '[{"type":"hero","prompt":"..."},{"type":"body","prompt":"..."},{"type":"cta","prompt":"..."}]'
```

**CLI — comandos disponibles:**
```
# Análisis
node cli.js analyze [project_path]          # Brand Profile del proyecto

# Generación de imágenes FLUX
node cli.js generate [format] "[topic]"              # Replicate cloud
node cli.js generate [format] "[topic]" --local      # ComfyUI local
node cli.js generate [format] "[topic]" --dry-run    # solo prompts
node cli.js generate [format] "[topic]" --json       # output JSON

# Diseño (HTML → PNG)
node cli.js design <folder> --template [nombre]      # renderizar
node cli.js design <folder> --copy --topic "tema"    # con copy real (Haiku)
node cli.js design <folder> --preview                # solo HTML, sin Puppeteer
node cli.js design <folder> --scale 2                # retina 2x

# Copywriting standalone
node cli.js copy <folder> --topic "tema"             # re-renderiza con copy real

# Tests
node cli.js test-flux         # verificar Replicate
node cli.js test-comfyui      # verificar ComfyUI
node cli.js test-renderer     # verificar Chrome/Puppeteer

# Otros
node cli.js list              # listar assets generados
node cli.js init [path]       # inicializar análisis
```

---

## Carpetas de assets

- `marketing-assets/` — visible en Finder, creada por código actual
- `.marketing-assets/` — oculta, legacy de sesiones anteriores al 2026-06-03

---

## Design Engine (`lib/designEngine/`)

Construido completo. Reemplaza `lib/htmlEditor/` como motor de diseño principal.

```
node cli.js design <folder> [--template nombre] [--scale 2] [--preview] [--debug-html]
```

Templates: `full-bleed-image` (default), `editorial-dark`, `editorial-light`, `minimal-centered`,
`split-layout`, `list-card`, `cta-bold`, `quote-card`, `data-visual`, `announcement`

Renderer: Chrome del sistema detectado. `--preview` genera HTML sin Puppeteer.
API pública: `render(spec, folder, opts)`, `preview(spec)`, `fromTemplate(name, brand, contents, format)`.

---

## Copywriter (`lib/copywriter.js`)

Genera títulos, subtítulos, labels y captions reales con Claude Haiku. Requiere `ANTHROPIC_API_KEY` en `.env`.

```bash
# Integrado en design:
node cli.js design [folder] --template full-bleed-image --copy --topic "Religión del Espíritu"

# Standalone (re-renderiza carpeta existente con copy real):
node cli.js copy [folder] --topic "Religión del Espíritu"
```

Sin `ANTHROPIC_API_KEY`: funciona igual pero con `Slide 1`, `Slide 2` como placeholders.
Captions guardadas en `manifest.json` bajo la clave `caption`.

---

## Pendiente (prioridad)

1. Configurar `ANTHROPIC_API_KEY` en `.env` para activar el copywriter
2. `lib/imageScanner.js` — Step 2F de SKILL.md documentado pero sin código
3. Tests básicos + prep para publicación open source

---

## Variables de entorno relevantes

| Variable | Default | Descripción |
|---|---|---|
| `REPLICATE_API_TOKEN` | — | Token de Replicate. Ver `.env`. |
| `ANTHROPIC_API_KEY` | — | Para copywriter (Claude Haiku). Ver `.env`. |
| `FLUX_MODEL` | `schnell` | `schnell` ($0.003/img) o `pro` ($0.04/img) |
| `SKILL_HOME` | `~/Desktop/marketing-image-skill` | Ruta al directorio del skill |
| `COMFYUI_API_URL` | `http://localhost:8188` | URL de ComfyUI local |
| `COMFYUI_MAX_WAIT` | `600000` | Timeout ComfyUI en ms (10 min) |
| `COMFYUI_FLUX_UNET` | `flux1-schnell-fp8.safetensors` | Modelo UNET |
| `COMFYUI_CLIP1` | `clip_l.safetensors` | CLIP-L |
| `COMFYUI_CLIP2` | `t5xxl_fp8_e4m3fn.safetensors` | T5XXL |
| `COMFYUI_VAE` | `ae.safetensors` | VAE |
