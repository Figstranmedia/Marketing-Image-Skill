---
name: marketing-image
description: Genera imágenes de marketing AI para cualquier proyecto. Se activa cuando el usuario quiere crear contenido visual para redes sociales — carruseles, posts, stories, ads — independientemente del stack del proyecto. Lee la identidad visual del proyecto (colores, tipografías, tono), reutiliza imágenes del banco local (Graficas/ai-generadas/) o genera con FLUX via Replicate, y compone los diseños con HTML + headless Chrome. Sin Canva ni Figma. Frases de activación: "haz un carousel sobre X", "crea imágenes de marketing para Y", "genera contenido para redes sociales", "crea un post sobre Z", "genera imágenes para mi marca", "quiero hacer un anuncio de X".
---

# Marketing Image Skill — Flujo Completo

Skill neutro y adaptativo. Funciona desde cualquier proyecto: lee su identidad visual, busca imágenes reutilizables en el banco local, genera con FLUX via Replicate si es necesario, compone los diseños con el design engine HTML + headless Chrome, y exporta PNGs directamente al proyecto. Sin dependencias externas de diseño.

---

## Flujo preferido (producción probada)

```
1. Replicate genera fondos una sola vez → se guardan en Graficas/ai-generadas/
2. Design engine HTML + headless Chrome compone los slides
3. PNGs finales guardados directamente en marketing-assets/ del proyecto
4. Cambios de texto o layout → re-renderizar sin regenerar imágenes (--reuse)
5. Variaciones de formato → --variation (resize/filtros sin consumir Replicate)
6. Sin pasos de exportación a Canva ni Figma
```

**Este flujo maximiza el valor de cada imagen generada.**
En lugar de generar 3 imágenes por carrusel (uso único), se generan **tandas de 10–15 imágenes temáticas** que alimentan múltiples carruseles futuros.

---

## 🧠 Prerequisito: Cargar DESIGN_SKILL.md

Antes de cualquier trabajo de diseño, cargar [`lib/designEngine/DESIGN_SKILL.md`](./lib/designEngine/DESIGN_SKILL.md) — es el cerebro experto que guía todas las decisiones de templates, tipografía, colores y composición.

Este documento es **cargado automáticamente** cuando se referencia, pero úsalo explícitamente como fuente de verdad para:
- Elegir template correcto según el contenido
- Aplicar tipografía según el formato (instagram vs presentation vs poster)
- Coherencia de carrusel (chips, colores de badges, secuencias recomendadas)

---

## ⚠️ STEP 0 — Setup automático (primera vez) o verificación rápida

**Si el usuario compartió un link de GitHub o instaló desde un `.skill` file, Claude maneja todo este paso sin pedirle nada al usuario excepto los tokens.**

### 0.1 Detectar SKILL_HOME

```bash
# El skill busca su propio directorio en este orden:
# 1. Variable de entorno SKILL_HOME
# 2. Directorio de la sesión actual si contiene cli.js
# 3. ~/Desktop/marketing-image-skill (default)
SKILL_HOME="${SKILL_HOME:-$(ls ~/Desktop/marketing-image-skill/cli.js 2>/dev/null && echo ~/Desktop/marketing-image-skill || echo ~/Desktop/marketing-image-skill)}"
echo "SKILL_HOME=$SKILL_HOME"
ls $SKILL_HOME/cli.js 2>/dev/null && echo "✅ Skill encontrado" || echo "❌ Skill no encontrado"
```

Si no se encuentra → instalar automáticamente:
```bash
# Si el usuario compartió un GitHub link:
git clone https://github.com/[repo]/marketing-image-skill ~/Desktop/marketing-image-skill
# Si viene de un .skill file, Cowork ya lo instaló — buscar en la ruta del plugin
```

### 0.2 Instalar dependencias (automático, silencioso)

```bash
cd $SKILL_HOME
ls node_modules/.bin/puppeteer 2>/dev/null && echo "deps:ok" || npm install --ignore-scripts 2>&1 | tail -3
```

Si falla → reportar error específico, no pedirle al usuario que lo haga manualmente.

### 0.3 Instalar Chrome para Puppeteer (solo primera vez)

```bash
ls $SKILL_HOME/node_modules/puppeteer/.local-chromium 2>/dev/null || \
ls ~/.cache/puppeteer/chrome 2>/dev/null || \
ls /Applications/Google\ Chrome.app 2>/dev/null && echo "chrome:ok" || \
(cd $SKILL_HOME && npx puppeteer browsers install chrome 2>&1 | tail -2)
```

Chrome del sistema (macOS) se detecta automáticamente — no necesita descarga si ya tienes Chrome instalado.

### 0.4 Tokens de API (única interacción requerida con el usuario)

Verificar en orden. Solo pedir lo que falta:

```bash
grep "REPLICATE_API_TOKEN" $SKILL_HOME/.env 2>/dev/null | grep -v "^#" | head -1
```

**Si falta REPLICATE_API_TOKEN** → pedirlo una sola vez:
> "Necesito un token de Replicate para generar las imágenes. Es gratis — créalo en https://replicate.com/account/api-tokens (30 segundos) y pégalo aquí."

Cuando lo proporcione, guardarlo:
```bash
echo "REPLICATE_API_TOKEN=r8_xxxx" >> $SKILL_HOME/.env
echo "FLUX_MODEL=schnell" >> $SKILL_HOME/.env
```

**ANTHROPIC_API_KEY** (opcional — para copy con voz de marca):
```bash
grep "ANTHROPIC_API_KEY" $SKILL_HOME/.env 2>/dev/null | grep -v "^#" | head -1
```
Si no está → continuar sin él. El sistema funciona con placeholders. Mencionar al usuario al final: "Para texto con tu voz de marca, agrega ANTHROPIC_API_KEY al .env."

### 0.5 Verificación final rápida

```bash
cd $SKILL_HOME && node cli.js test-renderer 2>&1 | head -2
```

Si todo está en orden: continuar al Step 1.
Si algo falla: reportar qué falló específicamente y resolverlo antes de continuar.

**Tiempo estimado de setup completo desde cero: ~2 minutos** (mayormente descarga de Chrome si no está instalado).

**Solo continuar cuando los prerequisitos estén resueltos.**

---

## ⚡ FLUJO RÁPIDO — Interactivo para Cowork

**El usuario abre Cowork, el skill hace preguntas inteligentes:**

### Flujo conversacional (lo que ve el usuario):

```
Usuario: "Quiero crear un carousel sobre mi nuevo lanzamiento"

Cowork (skill): "📸 Listo para crear sobre 'lanzamiento'
  
¿Qué formato prefieres?
  A) Instagram Carousel — 1080×1350 (lo más común)
  B) Instagram Story — 1080×1920 (fullscreen)
  C) LinkedIn Post — 1200×627 (profesional)
  D) Otro"

Usuario: "A, Instagram Carousel"

Cowork: "¿Qué estilo visual?
  • full-bleed-image (imagen de fondo + overlay + texto)
  • announcement (evento/fecha prominentes)
  • editorial-dark (tipografía dominante)
  • Otro"

Usuario: "announcement"

Cowork: "🎬 Creando 3 slides sobre 'lanzamiento' en Instagram Carousel
  Estilo: announcement
  Generador: Replicate FLUX (45 segundos)
  
  ¿Continuamos? ✓"

[... 45 segundos ...]

Cowork: "✅ Listo!
  
marketing-assets/2026-06-05_1441_instagram-carousel/
├── slide-01.png (evento/fecha prominente)
├── slide-02.png (detalles)
└── slide-03.png (call-to-action)

Próximo paso: ¿Agregar copy real? (títulos/subtítulos con Claude)"
```

### Modos disponibles en el CLI:

```bash
# Flujo completo estándar (genera + diseña)
node cli.js create "lanzamiento" --format instagram-carousel --template announcement

# --reuse: buscar imágenes compatibles en Graficas/ai-generadas/ antes de llamar a Replicate
node cli.js create "lanzamiento" --reuse
node cli.js create "cosmos" --reuse --tags "cosmos,fractal,geometria-sagrada"

# --variation: aplicar cambios a imagen existente SIN consumir Replicate
node cli.js create "lanzamiento" --variation Graficas/ai-generadas/cosmos-001.webp --format instagram-story
node cli.js create "lanzamiento" --variation Graficas/ai-generadas/cosmos-001.webp --brightness 110 --contrast 120

# Generar banco de imágenes (10-15 en una tanda)
node cli.js generate instagram-carousel "geometria sagrada" --batch 12 --tags "geometria-sagrada,cosmos,fractal"
```

**Output:**
```
marketing-assets/
└── 2026-06-05_1441_instagram-carousel/
    ├── flux-raw/          ← imágenes FLUX originales
    │   ├── hero-*.png
    │   ├── body-*.png
    │   └── cta-*.png
    ├── slide-01.png       ← PNG final (listo para publicar)
    ├── slide-02.png
    ├── slide-03.png
    └── manifest.json      ← metadata + captions
```

### Agregar copy real (opcional):

```bash
node cli.js copy marketing-assets/2026-06-05_1441_instagram-carousel --topic "lanzamiento"
```

Genera títulos/subtítulos reales con Claude Haiku y re-renderiza.

---

## Alternativa: Flujo paso-a-paso (más control)

Si necesitas iterar sobre los prompts o usar solo FLUX sin diseño:

```bash
# 1. Generación solo (preview de prompts)
node cli.js generate instagram-carousel "tu tema" --dry-run

# 2. Generación real (crea carpeta con imágenes FLUX)
node cli.js generate instagram-carousel "tu tema"

# 3. Diseño final (renderiza PNG con design engine)
node cli.js design marketing-assets/FECHA_FORMATO --template full-bleed-image --scale 2

# 4. (Opcional) Agregar copy
node cli.js copy marketing-assets/FECHA_FORMATO --topic "tu tema"
```

**Comandos disponibles:**
`setup` · `create` · `analyze` · `generate` · `design` · `copy` · `list` · `test-flux` · `test-renderer` · `test-comfyui`

---

## STEP 1 — Interacción con Cowork

**Flujo conversacional y adaptativo.**

### 1A. Inferir tema del mensaje
Leer en orden hasta encontrar el tema:
1. Lo que el usuario dijo directamente en su mensaje ← **prioritario**
2. `README.md` o `package.json → description` del proyecto
3. Nombre de la carpeta del proyecto
4. Si nada aplica → preguntar: *"¿Sobre qué tema quieres crear el contenido?"*

### 1B. Mostrar opciones de formato y template
Cuando se detecte el tema, mostrar opciones interactivas:

```
📸 Listo para crear contenido sobre "[tema]"

¿Qué formato prefieres?
  A) Instagram Carousel — 1080×1350 (carrusel swipeable, 3-5 slides)
  B) Instagram Story — 1080×1920 (fullscreen, stories/reels)
  C) LinkedIn Post — 1200×627 (feed profesional)
  D) Otro formato... (mostrar los 13 completos)

¿Qué estilo visual?
  • full-bleed-image (default) — imagen FLUX a full con overlay y texto
  • editorial-dark — gradiente oscuro, tipografía dominante
  • minimal-centered — minimalista, contenido centrado
  • announcement — evento/fecha/lugar (para lanzamientos)
  • Otro template... (mostrar los 11 disponibles)
```

**Lógica:**
- Si el usuario dice "carousel" → asumir `instagram-carousel` + template default
- Si dice "story" → asumir `instagram-story`
- Si dice "post" → asumir `linkedin-post` o `twitter-post` según contexto
- Si dice "anuncio" o "lanzamiento" → sugerir template `announcement`
- Si no especifica → usar defaults (`instagram-carousel` + `full-bleed-image`)

### 1C. Confirmar y ejecutar
Una vez que se elige formato y template:

```
🎬 Vamos a crear [N] slides sobre "[tema]" en [formato] con estilo [template]

Generador: Replicate FLUX (rápido, $0.003/imagen)
Tiempo estimado: ~45 segundos para 3 slides

¿Continuamos? (sí/no/ajustar)
```

Si dice ajustar → volver a 1B.

### 1D. Información útil sobre formatos y templates

**Formatos (13 total):**
| Formato | Dimensión | Mejor para |
|---------|-----------|-----------|
| `instagram-carousel` | 1080×1350 | Carruseles, stories largas |
| `instagram-story` | 1080×1920 | Stories fullscreen |
| `instagram-square` | 1080×1080 | Feed cuadrado |
| `linkedin-post` | 1200×627 | Contenido profesional |
| `linkedin-square` | 1080×1080 | Feed LinkedIn |
| `twitter-post` | 1024×512 | Posts Twitter/X |
| `facebook-ad` | 1200×628 | Anuncios pagos |
| `facebook-story` | 1080×1920 | Stories Facebook |
| `youtube-thumbnail` | 1280×720 | Miniaturas video |
| `presentation-16-9` | 1920×1080 | Presentaciones |
| `poster-a4` | 2480×3508 | Impresión A4 300dpi |
| `poster-letter` | 2550×3300 | Impresión Letter |
| `email-banner` | 600×200 | Banners email |

**Templates (11 disponibles):**
- `full-bleed-image` ← default, funciona para todo
- `editorial-dark` ← tipografía dominante
- `editorial-light` ← fondo claro, marcas light
- `minimal-centered` ← minimalista puro
- `split-layout` ← imagen 50% / texto 50%
- `list-card` ← lista numerada
- `cta-bold` ← botón grande (último slide)
- `quote-card` ← cita con atribución
- `data-visual` ← número grande + descriptor
- `announcement` ← evento/fecha/lugar
- `presentation-slide` ← 16:9 para YouTube

---

## 🔧 INTEGRACIÓN COWORK — Instrucciones para el agente Claude

**Cuando se activa el skill en Cowork:**

### Activación
El usuario dice una de estas frases:
- "Haz un carousel sobre X"
- "Crea imágenes de marketing para Y"
- "Genera contenido para redes"
- "Quiero hacer un post sobre Z"

### Acciones del agente (en orden):

**PASO 1: Extraer tema**
```
1. Leer el mensaje del usuario
2. Buscar proyecto actual: README.md o package.json
3. Si tema está claro → ir a PASO 2
4. Si tema NO está claro → preguntar: "¿Sobre qué tema?"
```

**PASO 2: Preguntar formato**
```
Mostrar opciones (máximo 4):
  A) Instagram Carousel (1080×1350)
  B) Instagram Story (1080×1920)
  C) LinkedIn Post (1200×627)
  D) Otro formato

Esperar respuesta, mapear a comando:
  "A" o "carousel" → format = instagram-carousel
  "B" o "story" → format = instagram-story
  "C" o "linkedin" → format = linkedin-post
```

**PASO 3: Preguntar template (si no es obvio)**
```
Si el usuario no mencionó estilo, preguntar:

Mostrar opciones (máximo 4):
  • full-bleed-image (default)
  • announcement (para lanzamientos/eventos)
  • editorial-dark (para tipografía)
  • Otro

Esperar respuesta, mapear a comando:
  "announcement" o "evento" → template = announcement
  "editorial" o "dark" → template = editorial-dark
  "" o "default" → template = full-bleed-image
```

**PASO 4: Confirmar y ejecutar**
```
Mostrar resumen:
  "🎬 Vamos a crear 3 slides sobre '[TEMA]'
   Formato: [FORMAT]
   Estilo: [TEMPLATE]
   Generador: Replicate FLUX (~45s)
   
   ¿Continuamos?"

Si sí:
  REPLICATE_API_TOKEN="r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  node cli.js create "[TEMA]" --format [FORMAT] --template [TEMPLATE]

Esperar resultado.
```

**PASO 5: Mostrar resultado**
```
✅ [N] slides generados en marketing-assets/

slide-01.png
slide-02.png
slide-03.png

📝 ¿Quieres agregar copy real (títulos/subtítulos)?
   node cli.js copy "carpeta" --topic "[TEMA]"
```

### Variables del comando:
```
REPLICATE_API_TOKEN = r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (configurado)
[TEMA] = lo que extraíste en PASO 1
[FORMAT] = lo que elegimos en PASO 2 (default: instagram-carousel)
[TEMPLATE] = lo que elegimos en PASO 3 (default: full-bleed-image)
```

### Casos especiales:

**Si el usuario especifica formato Y template directamente:**
```
Usuario: "Quiero un poster A4 con estilo minimalista"
→ format = poster-a4, template = minimal-centered
→ Ir directo a PASO 4
```

**Si el usuario pide "solo preview" (HTML sin renderizar):**
```
Agregar flag: --preview
node cli.js design "[CARPETA]" --template [TEMPLATE] --preview
→ Devuelve HTML, no PNG
```

**Si el usuario pide ComfyUI (offline):**
```
Agregar flag: --local
node cli.js create "[TEMA]" --local --format [FORMAT]
→ Lento (90+ min) pero gratis
→ Confirmar primero: "¿Deseas modo offline? Tarda 90+ minutos"
```

---

## STEP 2 — Análisis de marca del proyecto

Analizar la carpeta del proyecto para extraer identidad visual real. Seguir el orden de prioridad.

### 2A. Archivos de marca explícitos (mayor confianza)
```bash
find [project_path] -maxdepth 3 \
  \( -name "brand.json" -o -name "brand.yml" -o -name "BRAND.md" \
     -o -name "tokens.json" -o -name "design-tokens.json" \
     -o -name "style-guide.md" -o -name "STYLE_GUIDE.md" \) \
  2>/dev/null
```
Leer y extraer: colores HEX, nombres de fuentes, tono, sector.

### 2B. Tailwind o CSS
```bash
find [project_path] -maxdepth 3 \
  \( -name "tailwind.config.*" -o -name "globals.css" -o -name "index.css" \) \
  2>/dev/null | head -5
```
Buscar: `--color-*`, `--primary`, `--accent`, `colors:` en Tailwind, `@font-face`.

### 2C. README y documentación
```bash
head -80 [project_path]/README.md 2>/dev/null
```
Inferir: tono (formal/casual/espiritual/energético/minimalista) y sector (música/finanzas/salud/etc.).

### 2D. Construir Brand Profile y mostrarlo al usuario
```
📊 Identidad encontrada en el proyecto:
   Colores:  #HEX1 (primario)  #HEX2 (secundario)  #HEX3 (acento)
   Fuentes:  [nombre] Bold — títulos  |  [nombre] Regular — cuerpo
   Tono:     [energético / minimalista / profesional / espiritual]
   Sector:   [música / finanzas / salud / etc.]
   Confianza: [alta / media / baja]

¿Es correcto? ¿Quieres ajustar algo antes de continuar?
```
**Esperar confirmación.** Si la confianza es baja, avisar:
> "No encontré archivos de marca definidos. Usaré valores neutros. Puedes mejorar los resultados agregando un `brand.json` al proyecto."

### 2E. Escanear banco de imágenes AI del proyecto

```bash
# Verificar banco de imágenes AI generadas
ls [project_path]/Graficas/ai-generadas/ 2>/dev/null | wc -l
cat [project_path]/Graficas/ai-generadas/manifest.json 2>/dev/null
```

Si existe, mostrar resumen:
```
🖼️  Banco de imágenes AI: [N] imágenes en Graficas/ai-generadas/
   Temas: cosmos (5), geometria-sagrada (4), angel (3), fractal (2)
   Última generación: 2026-05-15
   → Usa --reuse para aprovecharlas antes de generar nuevas
```

### 2F. Escanear imágenes del proyecto

```bash
find [project_path] -maxdepth 5 \
  \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \
     -o -name "*.webp" -o -name "*.gif" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/marketing-assets/*" \
  -not -path "*/Graficas/ai-generadas/*" \
  -not -path "*/public/icons/*" \
  -not -path "*/favicon*" \
  2>/dev/null | head -30
```

**Clasificar por carpeta:**
- `gallery/`, `fotos/`, `photos/`, `shows/` → **Performance** ⭐ (alta prioridad)
- `about/`, `profile/`, `team/`, `bio/` → **Identidad personal**
- `logo/`, `brand/`, `favicon` → **Marca** (no usar como fondo)
- `blog/`, `content/`, `posts/` → **Contenido editorial**
- `public/`, `assets/`, `images/` → **Genérico** (evaluar caso por caso)

**Si se encuentran imágenes de Performance o Identidad, mostrar:**
```
📸 Imágenes encontradas en el proyecto:

   ⭐ [performance]  public/gallery/foto-estudio.jpg
   ⭐ [performance]  public/gallery/concierto.jpg
   👤 [identity]     public/about/portrait.jpg
   📝 [editorial]    public/blog/musicvolution.jpg

¿Cómo quieres usar estas imágenes en el carrusel?
  A) Usar mis fotos como fondo de los slides (más personal, más conexión)
  B) Mezclar: mi foto en slide 1 (hero), FLUX en slides 2 y 3
  C) Solo FLUX para todo (más abstracto y conceptual)
```

**Según la respuesta:**
- **A** → Saltar Steps 3 y 4. Usar rutas locales directamente en Step 5.
- **B** → Generar FLUX solo para los slides sin foto. Construir lista mixta de imágenes.
- **C** → Continuar a Step 3 (flujo FLUX completo, con --reuse primero).

Si no se encuentran imágenes relevantes → continuar directamente a Step 3.

---

## STEP 3 — Buscar en banco de imágenes (--reuse) o generar prompts

### 3A. Verificar banco de imágenes (SIEMPRE antes de llamar a Replicate)

```bash
# Verificar si existe el banco de imágenes del proyecto
ls [project_path]/Graficas/ai-generadas/manifest.json 2>/dev/null && echo "banco:ok" || echo "banco:vacio"
```

Si existe el manifest, buscar imágenes compatibles por tag o tema:

```bash
# Buscar imágenes con tags relacionados al tema
node $SKILL_HOME/cli.js list-bank [project_path] --topic "[topic]" --tags "[tags]" 2>&1
```

**Mostrar al usuario si hay imágenes reutilizables:**
```
🖼️  Banco de imágenes: 14 imágenes disponibles

   Compatibles con "[topic]":
   ✓ cosmos-003.webp    (tags: cosmos, fractal, geometria-sagrada) — 2026-05-10
   ✓ cosmos-007.webp    (tags: cosmos, luz, espiritual)             — 2026-05-10
   ✓ angel-002.webp     (tags: angel, luz, cosmos)                  — 2026-05-15

¿Usar estas imágenes del banco? (sí / generar nuevas / combinar)
```

- **sí (--reuse)** → saltar Steps 3B y 4. Usar las imágenes del banco directamente.
- **combinar** → usar banco para algunos slides, generar con FLUX para otros.
- **generar nuevas** → continuar con prompts nuevos.

Si el banco está vacío o no hay compatibles → continuar con 3B.

### 3B. Generar prompts enriquecidos con la marca

*Solo si no se reutilizaron imágenes del banco.*

```bash
cd $SKILL_HOME && \
  node cli.js generate [format] "[topic]" --dry-run 2>&1
```

Enriquecer cada prompt con el Brand Profile:
- Agregar colores HEX reales: `"[color_name] palette, primary [#HEX1], accent [#HEX2]"`
- Agregar estilo del sector: música → ondas/frecuencias abstractas, finanzas → formas geométricas precisas, salud → orgánico/fluido
- Mantener restricciones de FLUX: sin manos, sin texto legible, sin caras, sin objetos reconocibles

**Mostrar al usuario antes de gastar créditos:**
```
📝 Prompts para FLUX (enriquecidos con tu marca):

   Slide 1 Hero:  [prompt completo — max 200 chars]
   Slide 2 Body:  [prompt completo]
   Slide 3 CTA:   [prompt completo]

¿Generamos las imágenes con estos prompts? (sí / ajustar)
```
Esperar confirmación. Si quiere ajustar, modificar el prompt antes de continuar.

---

## STEP 4 — Generar imágenes con FLUX via Replicate

*Solo si no se reutilizaron imágenes del banco (Step 3A).*

### 4A. Generar con Replicate

```bash
cd $SKILL_HOME && \
  node scripts/generate_flux_urls.js '[
    {"type":"hero","prompt":"[prompt_hero]"},
    {"type":"body","prompt":"[prompt_body]"},
    {"type":"cta","prompt":"[prompt_cta]"}
  ]' 2>&1
```

El script incluye delays de 12s entre requests (rate limit de cuentas nuevas).
Tiempo estimado: ~45 segundos para 3 imágenes. Para lotes de 10–15: ~8–12 minutos.

Capturar las URLs públicas del JSON de salida. Válidas por ~1 hora — descargar inmediatamente.

Si hay error 429: el script reintenta automáticamente.

### 4B. Registrar imágenes en el banco (SIEMPRE al generar)

Cada imagen generada con Replicate se registra en `Graficas/ai-generadas/manifest.json`:

```bash
BANK_DIR=[project_path]/Graficas/ai-generadas
mkdir -p $BANK_DIR

# Descargar imágenes al banco
curl -sL "[url_hero]" -o $BANK_DIR/[topic]-hero-$(date +%Y%m%d-%H%M%S).webp
curl -sL "[url_body]" -o $BANK_DIR/[topic]-body-$(date +%Y%m%d-%H%M%S).webp
curl -sL "[url_cta]"  -o $BANK_DIR/[topic]-cta-$(date +%Y%m%d-%H%M%S).webp
```

Actualizar `manifest.json` con cada imagen nueva:
```json
{
  "version": "1.0",
  "images": [
    {
      "file": "cosmos-hero-20260605-143022.webp",
      "path": "Graficas/ai-generadas/cosmos-hero-20260605-143022.webp",
      "prompt": "[prompt completo usado]",
      "fecha": "2026-06-05T14:30:22",
      "tags": ["cosmos", "fractal", "geometria-sagrada"],
      "dimensiones": { "width": 1080, "height": 1350 },
      "modelo": "flux-schnell",
      "uso": ["marketing-assets/2026-06-05_1430_instagram-carousel"]
    }
  ]
}
```

**Tags recomendados para este proyecto:** `geometria-sagrada`, `cosmos`, `angel`, `fractal`, `luz`, `espiritual`, `abstracto`, `naturaleza`, `oscuro`, `dorado`

Registrar siempre aunque sea para uso inmediato — construye el banco para reutilización futura.

### 4C. Estrategia de banco de imágenes (10–15 por tanda)

En lugar de generar 3 imágenes por carrusel (uso único), generar **10–15 imágenes temáticas** en una sola sesión. Esto amortiza el costo y el tiempo de espera:

```bash
# Ejemplo: tanda temática "cosmos y geometría sagrada" (12 variaciones)
node cli.js generate instagram-carousel "cosmos geometria sagrada" \
  --batch 12 \
  --tags "cosmos,geometria-sagrada,fractal,luz"
```

**Por qué 10–15 imágenes:**
- Una tanda de 12 = ~$0.036 (36 centavos de dólar)
- Alimenta 4–6 carruseles futuros sin nuevo gasto
- Permite seleccionar la mejor imagen para cada slide específico
- Construye una biblioteca visual coherente con la marca

**Frecuencia recomendada:** 1 tanda por tema visual, cada 2–4 semanas.

### 4D. Modo --variation (sin consumir Replicate)

Cuando se necesita una variación de una imagen ya generada (diferente formato, brillo, contraste):

```bash
# Cambiar formato (resize sin regenerar)
node cli.js create "[tema]" \
  --variation Graficas/ai-generadas/cosmos-001.webp \
  --format instagram-story

# Ajustar brillo y contraste
node cli.js create "[tema]" \
  --variation Graficas/ai-generadas/cosmos-001.webp \
  --brightness 110 --contrast 115

# Aplicar filtro
node cli.js create "[tema]" \
  --variation Graficas/ai-generadas/cosmos-001.webp \
  --filter "grayscale|sepia|blur(2px)|saturate(1.4)"
```

`--variation` usa ImageMagick o filtros CSS aplicados via Puppeteer. **No llama a Replicate.** Costo: $0.

---

## STEP 5 — Guardar imágenes localmente (SIEMPRE)

**Este paso se ejecuta siempre, sin importar el origen de las imágenes.**

```bash
OUT=[project_path]/marketing-assets/$(date +%Y-%m-%d_%H%M)_[format]
mkdir -p $OUT/flux-raw

# Origen FLUX → descargar
curl -sL "[url_hero]" -o $OUT/flux-raw/slide-1-hero.webp
curl -sL "[url_body]" -o $OUT/flux-raw/slide-2-body.webp
curl -sL "[url_cta]"  -o $OUT/flux-raw/slide-3-cta.webp

# Origen local (opción A o B) → copiar
cp [project_path]/public/gallery/foto.jpg $OUT/flux-raw/slide-1-hero.jpg

# Verificar (archivos < 5KB indican error)
ls -lh $OUT/flux-raw/
```

---

## STEP 6 — Componer el diseño final (Design Engine HTML + headless Chrome)

El motor de diseño es completamente local: genera HTML con la composición y Chrome lo renderiza a PNG. Sin dependencias externas.

```bash
node $SKILL_HOME/cli.js design [project_path]/marketing-assets/[carpeta] \
  --template full-bleed-image \
  --copy --topic "el tema del carousel" \
  --scale 2
```

**Templates disponibles (11)** — ver `DESIGN_SKILL.md` §7C para cuándo usar cada uno:
- `full-bleed-image` — imagen de fondo con texto sobre overlay ← **el más usado**
- `editorial-dark` — gradiente oscuro, tipografía dominante, burst SVG decorativo
- `editorial-light` — fondo claro, texto en colores de marca (LinkedIn, marcas light)
- `minimal-centered` — minimalista, contenido centrado, máximo 7 palabras en título
- `split-layout` — mitad imagen / mitad texto (formatos horizontales)
- `list-card` — lista numerada 2–5 items con pills de colores
- `cta-bold` — burst dorado + botón CTA grande (último slide solamente)
- `quote-card` — cita o frase con comillas decorativas (máx 25 palabras)
- `data-visual` — número XXL + descriptor (estadísticas, métricas)
- `announcement` — evento/fecha/lugar con textura topografía
- `presentation-slide` — layout 16:9 para YouTube y presentaciones

**Flags completos:**
| Flag | Descripción |
|---|---|
| `--template [nombre]` | Template a usar (default: `full-bleed-image`) |
| `--copy` | Generar títulos/subtítulos con Claude Haiku |
| `--topic "tema"` | Tema para el copywriter (requerido con `--copy`) |
| `--scale 2` | Renderizar en 2x retina (recomendado para producción) |
| `--preview` | Genera HTML sin Puppeteer (revisar antes de renderizar) |
| `--debug-html` | Guardar HTML además del PNG |
| `--reuse` | Buscar imágenes en Graficas/ai-generadas/ antes de generar |
| `--variation [ruta]` | Usar imagen existente con ajustes (sin Replicate) |
| `--brightness [n]` | Ajuste de brillo 0–200 (100=normal), con --variation |
| `--contrast [n]` | Ajuste de contraste 0–200 (100=normal), con --variation |
| `--filter [css]` | Filtro CSS: `grayscale\|sepia\|saturate(1.4)`, con --variation |

**Ventaja clave:** Cambiar texto, layout, colores o template **no requiere regenerar imágenes**. Solo se re-renderiza el HTML → nuevo PNG en segundos.

**Output:** `marketing-assets/[carpeta]/slide-01.png`, `slide-02.png`, `slide-03.png` + `manifest.json`

---

## STEP 7 — Generar captions, guardar manifest y presentar resultados

### 7A. Generar captions

Con el Brand Profile (tono, sector, colores) y el tema del carousel, generar una descripción concisa lista para publicar. **Generarla en la respuesta de Cowork antes de guardar el manifest.**

Criterios:
- `general`: 1-3 frases que describen el contenido. Usable en cualquier plataforma sin edición.
- `instagram`: versión con emojis, más emocional, termina con 5-8 hashtags relevantes
- `linkedin`: versión profesional, enfocada en valor o logro, sin emojis excesivos
- `twitter`: ≤ 240 chars, directo, con 2-3 hashtags máximo

Ejemplo de output para un músico lanzando un álbum:
```
📝 Captions listos para publicar:

General:
  "Religión del Espíritu ya disponible. Un álbum sobre transformación, 
   fe y búsqueda interior. Escúchalo donde escuchas música."

Instagram:
  "🎵 Ya llegó. Religión del Espíritu es un álbum que nació de 
   lo más profundo. Escúchalo ahora 🙏✨
   #ReligionDelEspiritu #NewMusic #RaffaelFigueroa #SpiritualMusic #NuevaMusica"

LinkedIn:
  "Presentando Religión del Espíritu: un proyecto musical sobre búsqueda 
   interior y transformación. Disponible en todas las plataformas."

Twitter/X:
  "Religión del Espíritu ya disponible. Un álbum sobre lo que importa.
   🎵 #ReligionDelEspiritu #NewMusic"
```

### 7B. Guardar manifest

```bash
cat > $OUT/manifest.json << 'EOF'
{
  "topic": "[topic]",
  "format": "[format]",
  "created": "[timestamp]",
  "project_path": "[project_path]",
  "brand_profile": {
    "colors": [],
    "fonts": [],
    "tone": "",
    "confidence": "high|medium|low"
  },
  "image_sources": ["flux|local|mixed"],
  "template": "[template_name]",
  "prompts": { "hero": "", "body": "", "cta": "" },
  "caption": {
    "general": "",
    "instagram": "",
    "linkedin": "",
    "twitter": ""
  }
}
EOF
```

### 7C. Presentar resultados

```
✅ [format] listo — [N] slides sobre "[topic]"

📁 Guardado en: marketing-assets/[fecha]_[format]/
   ├── flux-raw/slide-1-hero.webp
   ├── flux-raw/slide-2-body.webp
   ├── flux-raw/slide-3-cta.webp
   ├── slide-01.png    ← diseño final renderizado
   ├── slide-02.png
   ├── slide-03.png
   └── manifest.json   ← incluye captions

📝 Caption general:
   "[caption.general]"

Hashtags: [hashtags]
```

---

## Tipografía mínima por plataforma (legibilidad mobile)

| Elemento | Instagram (1080px) | LinkedIn (1200px) | Twitter (1024px) |
|----------|--------------------|-------------------|------------------|
| Título   | 64–80px            | 48–60px           | 40–52px          |
| Subtítulo | 28–36px           | 24–30px           | 20–26px          |
| Label/chip | 13–16px          | 12–14px           | 12–14px          |

---

## Formatos soportados (13 total)

| Formato | Dimensión | Uso principal |
|---------|-----------|---------------|
| `instagram-carousel` | 1080×1350 | Carruseles swipe (3-5 slides) |
| `instagram-story` | 1080×1920 | Stories / Reels cover |
| `instagram-square` | 1080×1080 | Feed cuadrado clásico |
| `linkedin-post` | 1200×627 | Contenido profesional horizontal |
| `linkedin-square` | 1080×1080 | Feed cuadrado LinkedIn |
| `twitter-post` | 1024×512 | Posts Twitter/X |
| `facebook-ad` | 1200×628 | Anuncios Facebook |
| `facebook-story` | 1080×1920 | Stories Facebook |
| `youtube-thumbnail` | 1280×720 | Thumbnails YouTube |
| `poster-a4` | 2480×3508 | Posters impresión A4 300dpi |
| `poster-letter` | 2550×3300 | Posters impresión Letter |
| `presentation-16-9` | 1920×1080 | Presentaciones / slides |
| `email-banner` | 600×200 | Banners para email |

---

## Troubleshooting — Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `REPLICATE_API_TOKEN not set` | Token no configurado | Step 0.4 — pedir en setup, guardar en .env |
| `npm install` falla | Permisos o versión Node | Verificar Node 18+: `node --version` |
| `test-renderer` falla / Chrome no detectado | Chrome no instalado o ruta incorrecta | `npx puppeteer browsers install chrome` o instalar desde App Store |
| `node cli.js create` no responde | Esperando generación FLUX (normal) | Los 3 slides tardan ~15-30s, esperar o `--dry-run` primero |
| Rate limit 429 (Replicate) | Cuenta sin créditos o límite excedido | El script reintenta automáticamente 12s; si persiste, usar `--local` (ComfyUI) |
| Imágenes FLUX < 5KB | Error en descarga desde Replicate | Re-generar solo ese slide o reintentarse automáticamente |
| `--copy` falla: ANTHROPIC_API_KEY | Token no configurado | Agregar a .env: `ANTHROPIC_API_KEY=sk-ant-...` (opcional, sin él usa placeholders "Slide 1") |
| Texto invisible en PNG | Overlay faltante entre imagen y texto | Usar template con overlay (ej: `full-bleed-image` tiene `gradient-bottom`) |
| Fuentes no aplican en PNG | Google Fonts nombre incorrecto | Verificar nombre en fonts.google.com y en brand.json |
| Design engine genera PNG vacío | Manifest sin prompts/imágenes | Verificar que `generate` completó exitosamente y guardó manifest.json |
| `--template unknown-name` | Template no existe | Listar válidos: `node cli.js` (ver help) |
| Colores muy oscuros / ilegibles | Contrast ratio bajo (WCAG fail) | Verificar `DESIGN_SKILL.md` §4 — contrast con fondo |
