# HANDOFF — Marketing Image Skill

Fecha: 2026-06-03

---

## GOAL

Construir un skill de generación de imágenes de marketing para redes sociales que:
1. Analiza la identidad visual de un proyecto (colores, tipografías, tono) desde archivos reales
2. Genera prompts enriquecidos con esa identidad para FLUX via Replicate
3. Crea carruseles/posts con imágenes reales para Instagram, LinkedIn, Twitter, Facebook
4. Opcionalmente: diseña el layout final en Figma o Canva
5. Funciona desde Cowork como skill conversacional (SKILL.md)

**Visión a largo plazo:** Publicar como repo open source con security-first. El concepto central — usar el codebase como fuente de verdad de identidad visual — no tiene equivalente en el mercado.

---

## CURRENT STATE

**✅ Funcional end-to-end:**
- Análisis de marca desde tailwind.config, CSS variables, README
- Generación de prompts enriquecidos con colores HEX reales del proyecto
- Generación de imágenes FLUX via Replicate (API REST, sin SDK)
- Organización en carpetas `marketing-assets/` (visible, no oculta)
- Delays automáticos (3s) para evitar rate limit de Replicate
- Cowork puede ejecutar el skill completo con SKILL.md actualizado

**✅ También funcional (resuelto post-handoff):**
- ComfyUI local: funcional end-to-end con FLUX Schnell. Ver sección FAILED ATTEMPTS (bug resuelto).
- Análisis de tone: detecta keywords pero puede devolver `professional` por defecto si no hay matches claros
- Step 2F (reutilizar imágenes existentes del proyecto): documentado en SKILL.md, NO implementado en código

**❌ No implementado aún:**
- Copywriting / voz de marca (texto del carousel)
- Portabilidad (hardcodeado a ~/Desktop/marketing-image-skill/)
- Tests automatizados
- Estructura repo para publicación (security, .gitignore completo)

---

## FILES IN FLIGHT

### Modificados en esta sesión:

| Archivo | Estado | Qué cambió |
|---------|--------|------------|
| `lib/projectAnalyzer.js` | ✅ Refactorizado | Lee archivos REALES: brand.json, tailwind.config, CSS variables. Extrae HEX reales, clasifica colores por luminosidad, construye paleta inteligente. Antes: solo keywords en README. |
| `lib/promptGenerator.js` | ✅ Mejorado | `selectAccentColor()` ahora usa `brandData.palette.forPrompt` con colores HEX reales. Antes: devolvía strings genéricos. |
| `lib/fluxClient.js` | ✅ Refactorizado | URL de imagen retorna `{}` vacio (bug del SDK). Pendiente migrar completamente a API REST. |
| `scripts/generate_flux_urls.js` | ✅ Nuevo | Script standalone que llama Replicate via API REST (no SDK). Maneja delays, retorna JSON con URLs. **ES EL SCRIPT QUE REALMENTE FUNCIONA.** |
| `SKILL.md` | ✅ Actualizado | Flujo completo con Step 0-7. Step 2F agregado: detecta imágenes existentes del proyecto, ofrece opciones A/B/C. |
| `cli.js` | ✅ Actualizado | Flag `--local` para usar ComfyUI. `test-flux` y `test-comfyui` como comandos separados. dotenv cargado al inicio. |
| `index.js` | ✅ Actualizado | Usa `FluxClient` o `ComfyUIClient` según flag `--local`. |
| `lib/assetOrganizer.js` | ✅ Fixed | Carpeta `marketing-assets/` (sin punto) para que sea visible en Finder. |
| `.env` | ✅ Configurado | `REPLICATE_API_TOKEN` real configurado. `FLUX_MODEL=schnell`. |
| `.env.example` | ✅ Actualizado | Template limpio con documentación de modelos. |
| `README.md` | ✅ Actualizado | Documentación para Replicate (sin ComfyUI como primario). |
| `QUICK_START.md` | ✅ Actualizado | Setup en 5 pasos, solo Replicate. |
| `~/.claude/settings.json` | ✅ Actualizado | Registrado `blueprint-refactor-plugin` como marketplace local. |

### Archivos a considerar:
- `lib/comfyuiClient.js`: Código correcto, workflow válido, pero no funciona porque ComfyUI rechaza el workflow con "Prompt has no outputs". Movido a `.deprecated/` en algún momento y restaurado — actualmente en `lib/`.
- `lib/imageDetector.js`: Existe pero `getImageDimensions()` devuelve hardcoded. No integrado al flow principal.
- `demo/`: Carpeta de pruebas borrada por el usuario. No recrear automáticamente.

---

## WHAT CHANGED (esta sesión)

1. **projectAnalyzer.js completamente reescrito** — Lee archivos reales en prioridad: brand.json → tailwind.config → CSS variables → README. Extrae HEX reales. Clasifica por luminosidad (backgrounds vs acentos). Convierte HSL a HEX. Campo `confidence` (high/medium/low) indica qué tan sólido fue el análisis. Campo `sources` lista qué archivos alimentaron el resultado.

2. **Paleta inteligente** — `buildPalette()` usa luminancia para separar colores de fondo (muy oscuros) de colores de acento (gold, spirit, amber). Resultado: prompts con paleta correcta, no solo los primeros 4 colores del tailwind.

3. **generate_flux_urls.js** — Script independiente que usa API REST de Replicate directamente (no SDK). Soluciona el problema de que el SDK devolvía `url: {}` vacío. Es el punto de entrada que Cowork usa para generar imágenes.

4. **SKILL.md con Step 2F** — Lógica para detectar imágenes existentes en el proyecto, clasificarlas por contexto (gallery → performance, about → identidad), y ofrecer tres estrategias: fotos propias / mezclar / solo FLUX.

5. **Plugin blueprint-refactor registrado** en `~/.claude/settings.json` como marketplace local. Requiere reinicio de Claude Code para activarse.

---

## FAILED ATTEMPTS

### ComfyUI Workflow — RESUELTO (sesión 2026-06-04)
- **Error original:** `invalid prompt: {'type': 'prompt_no_outputs', 'message': 'Prompt has no outputs'}`
- **4 bugs corregidos:**
  1. `POST /prompt` ahora envuelve en `{prompt: workflow}` (antes mandaba el workflow directo)
  2. Ya no convierte config UI a API — construye el workflow API directamente
  3. `DualCLIPLoader` usa `clip_name1`/`clip_name2`/`type: 'flux'` (no `clip_l`/`clip_t5xxl`)
  4. Recolecta imagen vía `/history/:id` → `/view`, no por mtime del filesystem
- **Status:** Funcional end-to-end. FLUX fp8 en CPU/MPS tarda ~3-8 min/imagen. `maxWait=10min`.

### SDK de Replicate (output vacío)
- **Error:** `url: {}` — el SDK devuelve objeto vacío en lugar de URL string
- **Causa:** FLUX Schnell via `replicate.run()` retorna un objeto `FileOutput` no un string
- **Solución:** Migrar a API REST (`/v1/predictions` + polling)
- **Status:** Resuelto con `generate_flux_urls.js`

### Rate limiting Replicate (error 429)
- **Error:** "Your rate limit is reduced to 6 req/min with less than $5.0 in credit"
- **Confuso:** La cuenta tenía $9.96 de crédito pero seguía limitando
- **Solución temporal:** Delays de 15s (SDK) → 3s (API REST)
- **Status:** Resuelto con API REST. El SDK era más agresivo con requests.

---

## NEXT STEPS (en orden de prioridad)

### 1. Usar /refactor (ahora que el plugin está registrado)
Usar el skill `/refactor` de `blueprint-refactor-plugin` para refactorizar los módulos problemáticos. Específicamente:
- `lib/imageDetector.js` — conectar al flow principal, quitar hardcoded dimensions
- `lib/promptGenerator.js` — mejorar detección de tone para proyectos sin keywords explícitas

### 2. Implementar Step 2F en código
Crear `lib/imageScanner.js`:
```javascript
// Escanear proyecto buscando imágenes
// Clasificar por contexto (gallery, about, logo, etc.)
// Retornar lista con tipo y path
// Integrar en cli.js como pregunta antes de generar
```

### 3. Portabilidad
El skill asume que está en `~/Desktop/marketing-image-skill/`. Cowork llama a los scripts con path absoluto hardcodeado. Resolver para que funcione desde cualquier ubicación:
```bash
# Actual (frágil):
cd ~/Desktop/marketing-image-skill && node scripts/generate_flux_urls.js

# Ideal:
npx marketing-image-skill generate '[...]'
# O variable de entorno:
SKILL_PATH=... node generate_flux_urls.js
```

### 4. Copywriting / Voz de marca
Step 2.5 pendiente: extraer tono de comunicación del proyecto (ejemplos de CTAs, longitud de textos, vocabulario). Alimentar a Claude para que genere el texto del carousel coherente con la marca.

### 5. Estructura repo para publicación
- `.gitignore` agresivo (nunca subir `.env`, `node_modules`, `*.key`)
- `SECURITY.md` con instrucciones claras
- Limpiar `demo/` y carpetas de prueba
- `package.json` con `bin` para CLI global
- Tests básicos de integración

---

## CONTEXTO TÉCNICO IMPORTANTE

**Token de Replicate:** Configurado en `.env`. NO mostrar en logs. Cuentas con < $5 tienen rate limit estricto — pero $9.96 disponibles deberían ser suficientes.

**Modelos FLUX:**
- `schnell`: 4 steps, $0.003/img, ~5-10 segundos. API: `black-forest-labs/flux-schnell`
- `pro`: 50 steps, $0.04/img, ~30 segundos. API: `black-forest-labs/flux-pro`

**Paleta de raffaelfigueroamusic.com:** No está local en Desktop. El proyecto web está en Hostinger (WordPress). Para probar el analyzer con datos reales usar `~/Desktop/Religion del Espiritu/sitio-web/` que tiene `tailwind.config.ts` con colores `void #020408`, `gold #c9a84c`, `amber #e8c97e`, `spirit #a78bfa`.

**Cowork** llama a `generate_flux_urls.js` con JSON de prompts. El output es JSON con URLs de imágenes. Luego descarga con `curl -sL [url]` a la carpeta del proyecto.

---

## ESTADO DEL PLUGIN /refactor

- **Plugin:** `blueprint-refactor-plugin`
- **Ubicación:** `/Users/rafafigueroa/blueprint-refactor-plugin/`
- **Registrado en:** `~/.claude/settings.json` como marketplace `blueprint-refactor`
- **Requiere:** Reinicio de Claude Code para activarse
- **Skill disponible:** `/refactor` — multiagente con Ollama + Claude Haiku
