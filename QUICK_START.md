# Quick Start — Marketing Image Skill

De cero a primer PNG en 10 minutos.

---

## 1. Instalar

```bash
cd ~/Desktop/marketing-image-skill
npm install
cp .env.example .env
```

Editar `.env` y agregar el token de Replicate:
```
REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxx
```

Obtener token gratis en: https://replicate.com/account/api-tokens

---

## 2. Verificar

```bash
node cli.js test-flux       # debe mostrar: ✅ FLUX conectado y listo
node cli.js test-renderer   # debe mostrar: ✅ Chrome detectado
```

Si `test-renderer` falla → instalar Google Chrome en `/Applications/`.

---

## 3. Generar imágenes FLUX

```bash
# Preview primero (no gasta créditos):
node cli.js generate instagram-carousel "tu tema aquí" --dry-run

# Cuando los prompts se ven bien, generar:
node cli.js generate instagram-carousel "tu tema aquí"
```

Esto crea `marketing-assets/FECHA_instagram-carousel/flux-raw/` con 3 imágenes .webp.

Costo: ~$0.009 (3 imágenes × $0.003).

---

## 4. Diseñar los slides

```bash
# Ver qué carpetas se crearon:
node cli.js list

# Diseñar (reemplazar con la carpeta real):
node cli.js design marketing-assets/2026-06-04_1800_instagram-carousel \
  --template full-bleed-image --scale 2
```

Esto genera `slide-01.png`, `slide-02.png`, `slide-03.png` en la misma carpeta.

**¿No sabes qué template usar?**
- Con imágenes FLUX → `full-bleed-image`
- Sin imágenes → `editorial-dark`
- Evento/concierto → `announcement`
- Lista de items → `list-card`
- Llamada a acción → `cta-bold`

---

## 5. (Opcional) Agregar copy real

Requiere `ANTHROPIC_API_KEY` en `.env`:

```bash
echo "ANTHROPIC_API_KEY=sk-ant-api03-..." >> .env

node cli.js copy marketing-assets/2026-06-04_1800_instagram-carousel \
  --topic "tu tema aquí"
```

Genera títulos reales, subtítulos y captions para Instagram, LinkedIn y Twitter. Los slides se re-renderizan con ese contenido y los captions quedan en `manifest.json`.

---

## Flujo desde un proyecto específico

Si estás en la carpeta de tu proyecto (web, app, etc.):

```bash
# Exportar ruta de la skill (una vez)
export SKILL_HOME=~/Desktop/marketing-image-skill

# Analizar el brand del proyecto actual
node $SKILL_HOME/cli.js analyze .

# Generar imágenes
node $SKILL_HOME/cli.js generate instagram-carousel "tu tema"

# Diseñar
node $SKILL_HOME/cli.js design marketing-assets/FECHA_formato --template full-bleed-image
```

Los outputs van a `./marketing-assets/` dentro de tu proyecto.

---

## Resultado final

```
marketing-assets/
└── 2026-06-04_1800_instagram-carousel/
    ├── flux-raw/slide-1-hero.webp   ← imagen FLUX original
    ├── flux-raw/slide-2-body.webp
    ├── flux-raw/slide-3-cta.webp
    ├── slide-01.png                 ← diseño final listo para publicar
    ├── slide-02.png
    ├── slide-03.png
    └── manifest.json                ← brand, prompts y captions
```

---

## Problemas comunes

| Problema | Solución rápida |
|---|---|
| `REPLICATE_API_TOKEN not set` | Agregar al `.env` y repetir |
| Rate limit 429 | Esperar ~30s, el script reintenta solo |
| Chrome no encontrado | Instalar Google Chrome |
| Slides con "Slide 1" como título | Agregar `ANTHROPIC_API_KEY` y usar `--copy` |
| `npm install` falla | Asegúrate de estar en `~/Desktop/marketing-image-skill/` |
