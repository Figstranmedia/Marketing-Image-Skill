# Changelog

## v0.3.0 (FLUX via Replicate Official SDK) — 2026-06-03

### ✨ Cambios Principales

**Refactorización a Replicate SDK Oficial**
- Removido: fallback chain ComfyUI → Replicate → Placeholders
- Nuevo: **FluxClient** usando SDK oficial de Replicate (`replicate` npm package)
- Ventajas:
  - ✅ Directo a Replicate API (sin wrapper manual)
  - ✅ Mejor mantenimiento (Replicate mantiene el SDK)
  - ✅ Soporte para FLUX Pro (50 steps, máxima calidad)
  - ✅ Menos código, menos bugs

**Modelos FLUX**
- `schnell`: 4 steps, $0.003/imagen — rápido para prototipos
- `pro`: 50 steps, $0.04/imagen — alta calidad para producción

**Cambios en Configuración**
```bash
# Antes (con fallback):
COMFYUI_API_URL=http://localhost:8188
REPLICATE_API_KEY=...

# Ahora (solo Replicate):
REPLICATE_API_TOKEN=r8_xxxxx
FLUX_MODEL=schnell
```

**Cambios en CLI**
- `test-comfyui` → removido
- `test-replicate` → `test-flux` (más específico)
- Nuevo mensaje: muestra modelo FLUX actual y costo por imagen

### 📁 Cambios de Archivos

**Nuevos:**
- `lib/fluxClient.js` — Cliente oficial de Replicate con FLUX

**Removidos (→ `.deprecated/`):**
- `lib/comfyuiClient.js` — Ya no necesario
- `lib/replicateClient.js` — Reemplazado por SDK oficial

**Actualizados:**
- `index.js` — Usa `FluxClient` en lugar de ComfyUI/Replicate dual
- `cli.js` — Comando `test-flux`, removido `test-comfyui`
- `README.md` — Documentación actualizada solo para Replicate
- `QUICK_START.md` — Setup simplificado (solo Replicate)
- `.env.example` — Config actualizada

### ✅ Verificado

- CLI funciona sin errores
- `test-flux` detecta falta de token (comportamiento esperado)
- Documentación actualizada y coherente
- Fallback automático a placeholders removido (opcional en futuro)

## v0.2.0 (Fixes & Cloud Fallback) — 2026-06-02

### 🔧 Bugs Corregidos

**ComfyUI Workflow**
- Corregido workflow de Flux Schnell: ahora usa nodos reales (`CheckpointLoaderSimple`, `CLIPTextEncode`, `KSampler`, `VAEDecode`, `SaveImage`)
- El workflow anterior usaba nodos inexistentes (`KSampler_Flux`, `CheckpointSaveImage`)

**Race Condition en `findGeneratedImage`**
- Antes: tomaba el archivo más reciente del folder (podía mezclar imágenes en generaciones paralelas)
- Ahora: filtra por timestamp posterior al inicio de la generación

**Placeholder Generator**
- Antes: escribía buffer vacío (`Buffer.alloc(1024)`) sin generar imagen real
- Ahora: genera PNG válido con canvas o PNG mínimo si canvas no está disponible

### ✨ Nuevas Características

**Cloud Fallback (Replicate)**
- Si ComfyUI no está disponible, la skill usa automáticamente Replicate API
- Workflow: ComfyUI local → Replicate cloud → Placeholders
- Setup: `REPLICATE_API_KEY` en `.env`

**Análisis Robusto Multilingüe**
- `analyzeTone()` ahora detecta keywords en inglés Y español
- Requiere 2+ matches para clasificar (menos falsos positivos)
- Ejemplos: "enérgico", "espiritual", "dinámica", "mystical"

**Safe Areas & Responsive Typography**
Todas las plataformas ahora tienen reglas específicas:

| Formato | Top | Bottom | Typography |
|---------|-----|--------|------------|
| Instagram Carousel | 60px | 100px | 48-56px (hero) → 40-48px (cta) |
| Instagram Story | 100px | 120px | 48-64px, bold |
| LinkedIn | 20px | 20px | 28-36px, semibold |
| Facebook Ads | 24px | 24px | 32-40px + CTA 48px |
| Twitter | 16px | 16px | Image only |

Cada slide tiene:
- `safeArea`: márgenes para evitar cortes
- `typography`: font size responsive + line-height
- `ctaButton`: altura mínima (48-56px) + safe distance

### 📚 Documentación Mejorada

- README actualizado con safe areas y cloud fallback
- `.env.example` ahora incluye `REPLICATE_API_KEY`
- Nuevo comando: `node cli.js test-replicate`

### 🔍 Internals

**lib/replicateClient.js** (nuevo)
- Cliente HTTP para Replicate API
- Compatible con mismo prompt format que ComfyUI
- Auto-download de imágenes generadas

**lib/projectAnalyzer.js**
- `analyzeTone()` ahora multilingüe
- `inferAesthetic()` con keywords en español

**lib/marketingRules.js**
- Safe areas por formato
- Responsive typography config
- CTA button specifications

---

## v0.1.0 (MVP) — Initial Release

Skill funcional con:
- Análisis de proyecto (colores, tipografías, tone)
- Detección de imágenes existentes
- Generación de prompts "seguros para Flux"
- Integración ComfyUI
- Organización automática de assets
- Soporte 5 formatos (Instagram, LinkedIn, Twitter, Facebook, Stories)
