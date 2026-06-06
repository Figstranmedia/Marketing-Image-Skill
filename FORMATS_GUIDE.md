# Guía de Formatos — Marketing Image Skill

El skill soporta **13 formatos de marketing** listos para usar. Cada uno está optimizado para su plataforma específica.

---

## Redes Sociales

### Instagram Carousel (1080×1350)
Carrusel swipeable con 3-5 slides. El formato más popular.

```bash
node cli.js create "tema" --format instagram-carousel --template full-bleed-image
```

**Casos de uso:**
- Storytelling visual (3 slides mínimo, 5 máximo)
- Anuncios de producto
- Turoriales paso-a-paso

**Tips:**
- Usa `full-bleed-image` para máxima cobertura visual
- Colores saturados funcionan mejor en mobile

---

### Instagram Story (1080×1920)
Fullscreen vertical, content top/bottom safe areas.

```bash
node cli.js create "tema" --format instagram-story --template full-bleed-image --scale 2
```

**Casos de uso:**
- Stories con duración (24 horas)
- Reels cover
- Teasers urgentes

**Tips:**
- Genera con `--scale 2` para mejor calidad en Stories
- Deja espacio arriba (hora/battery) y abajo (acciones)

---

### Instagram Square (1080×1080)
Feed cuadrado clásico.

```bash
node cli.js create "tema" --format instagram-square
```

**Casos de uso:**
- Feed consistente (1 imagen por post)
- Tiles coherentes en el profile
- Mejor engagement en feed tradicional

---

### LinkedIn Post (1200×627)
Horizontal profesional.

```bash
node cli.js create "tema" --format linkedin-post --template editorial-dark
```

**Casos de uso:**
- Artículos de industria
- Insights de negocio
- Anuncios profesionales

**Tips:**
- `editorial-dark` transmite profesionalismo
- Tipografía dominante, sin mucho ruido visual

---

### LinkedIn Square (1080×1080)
Feed cuadrado de LinkedIn.

```bash
node cli.js create "tema" --format linkedin-square --template announcement
```

---

### Twitter/X Post (1024×512)
Horizontal comprimido.

```bash
node cli.js create "tema" --format twitter-post --template minimal-centered
```

**Casos de uso:**
- Threads visuales (múltiples tweets)
- Noticias con impacto
- Conversaciones con soporte visual

**Tips:**
- Mantén texto corto — Twitter/X lo trunca
- `minimal-centered` enfatiza el mensaje

---

### Facebook Ad (1200×628)
Publicidad en feed de Facebook.

```bash
node cli.js create "tema" --format facebook-ad --template cta-bold
```

**Casos de uso:**
- Anuncios pagos
- Conversión (ventas, suscripción)
- Lead generation

**Tips:**
- `cta-bold` es perfecto para ads (botón prominente)
- Prueba A/B con 2-3 variantes: `node cli.js variation imagen.webp --brightness 110`

---

### Facebook Story (1080×1920)
Stories fullscreen en Facebook.

```bash
node cli.js create "tema" --format facebook-story --template full-bleed-image
```

---

## Video

### YouTube Thumbnail (1280×720)
Miniatura de video. El factor CRÍTICO para click-through.

```bash
node cli.js create "tema" --format youtube-thumbnail --template cta-bold --scale 2
```

**Casos de uso:**
- Miniaturas de videos (canales gaming, educación, vlogs)
- Máxima información en 16:9

**Tips:**
- Genera con `--scale 2` para nitidez en pequeño
- `cta-bold` funciona bien: contraste alto, botón central
- Título debe ser legible a 100×56px (resolución en YouTube)
- Evita mucho texto: máx 3-4 palabras

**Ejemplo flujo completo:**
```bash
# Generar banco de thumbnails
node cli.js generate youtube-thumbnail "gaming" --batch 15 --tags "gaming,tutorial,viral"

# Reutilizar para videos variados
node cli.js create "nuevo video" --format youtube-thumbnail --reuse

# Variar colores sin regenerar
node cli.js variation banner.webp --brightness 110 --contrast 115 --output "bright-version.webp"
```

---

## Presentación

### Presentación 16:9 (1920×1080)
Slides para Keynote, PowerPoint, Google Slides.

```bash
node cli.js create "tema" --format presentation-16-9 --template presentation-slide --scale 2
```

**Casos de uso:**
- Conferencias y talks
- Pitch decks
- Webinars

**Tips:**
- `presentation-slide` tiene layout 16:9 nativo
- Genera con `--scale 2` para proyectar en 4K
- Rápido iterar con `--variation` para diferentes secciones

---

## Print

### Poster A4 (2480×3508, 300dpi)
Impresión profesional tamaño A4.

```bash
node cli.js create "tema" --format poster-a4 --template announcement --scale 2
```

**Casos de uso:**
- Eventos (conciertos, exposiciones)
- Lanzamientos de producto
- Decoración de oficina

**Especificaciones:**
- 300 DPI: calidad profesional
- Generar con `--scale 2` para máxima nitidez
- Márgenes respetados automáticamente

**Ejemplo: Cartel de concierto**
```bash
node cli.js create "concierto 2026" --format poster-a4 --template announcement
# → 2480×3508 listo para imprenta
```

---

### Poster Letter (2550×3300, 300dpi)
Impresión tamaño carta (US/LATAM).

```bash
node cli.js create "tema" --format poster-letter --template announcement --scale 2
```

---

## Email

### Email Banner (600×200)
Banner para emails.

```bash
node cli.js create "tema" --format email-banner --template cta-bold
```

**Casos de uso:**
- Header de newsletter
- CTA en email campaigns
- Promotional banners

**Tips:**
- Ancho 600px es estándar para emails desktop
- `cta-bold` con botón es ideal para conversión
- Texto debe ser escaneable en 5 segundos

---

## Flujo completo: Ejemplo multi-formato

Generar el mismo contenido para múltiples plataformas:

```bash
# 1. Generar banco de imágenes (una sola vez)
node cli.js generate instagram-carousel "lanzamiento producto" \
  --batch 15 \
  --tags "producto,lanzamiento,ecommerce"
# Costo: $0.045 (15 × $0.003)

# 2. Usar para múltiples formatos
node cli.js create "lanzamiento producto" --format instagram-carousel --reuse
node cli.js create "lanzamiento producto" --format instagram-story --reuse
node cli.js create "lanzamiento producto" --format youtube-thumbnail --reuse
node cli.js create "lanzamiento producto" --format poster-a4 --reuse
node cli.js create "lanzamiento producto" --format facebook-ad --reuse
node cli.js create "lanzamiento producto" --format email-banner --reuse

# Total: 6 campañas, costo único de $0.045
# Sin usar --reuse: habría costado $0.27 (9 imágenes × 6 plataformas)
# Ahorrado: 80% en API calls
```

---

## Matriz de Decisión: Qué formato usar

| Objetivo | Formato | Template |
|----------|---------|----------|
| Storytelling visual | instagram-carousel | full-bleed-image |
| Story/Reel | instagram-story | full-bleed-image |
| Anuncio pagado | facebook-ad | cta-bold |
| Post profesional | linkedin-post | editorial-dark |
| Miniatura video | youtube-thumbnail | cta-bold |
| Presentación | presentation-16-9 | presentation-slide |
| Evento/Concierto | poster-a4 | announcement |
| Newsletter | email-banner | cta-bold |

---

## Casos de uso avanzados

### Generar variantes sin regenerar imágenes

```bash
# Original
node cli.js create "producto" --format youtube-thumbnail

# Variante 1: Más brillante
node cli.js variation marketing-assets/*/slide-01.png \
  --brightness 120 --contrast 110 \
  --output "bright-version.webp"

# Variante 2: Blanco y negro (para AB test)
node cli.js variation marketing-assets/*/slide-01.png \
  --filter "grayscale" \
  --output "bw-version.webp"

# Variante 3: Saturada
node cli.js variation marketing-assets/*/slide-01.png \
  --filter "saturate(1.5)" \
  --output "saturated-version.webp"
```

Costo: $0 (sin Replicate).

---

## Optimización de costos por plataforma

| Estrategia | Costo | Tiempo |
|-----------|-------|--------|
| Generar por separado (cada formato) | $0.27 | 9 min |
| Usar --reuse (banco compartido) | $0.045 | 1.5 min + reutilización |
| Usar --variation (filtros) | $0 | 30s por variante |
| Combinación (banco + variaciones) | $0.045 | Óptimo |

---

## Flujo recomendado para equipos

1. **Lunes**: Generar banco semanal
   ```bash
   node cli.js generate instagram-carousel "tema semanal" --batch 10 --tags "semana-1"
   ```
   Costo: ~$0.03 | Tiempo: 3 min | Reutilizable toda la semana

2. **Martes-Viernes**: Crear múltiples campañas
   ```bash
   node cli.js create "campaña X" --format youtube-thumbnail --reuse
   node cli.js create "campaña Y" --format facebook-ad --reuse
   ```
   Costo: $0 (reutilización) | Tiempo: <1 min por campaña

3. **Sábado**: AB testing con variaciones
   ```bash
   node cli.js variation imagen.webp --brightness 105 --output "v1.webp"
   node cli.js variation imagen.webp --brightness 95 --output "v2.webp"
   ```
   Costo: $0 | Tiempo: 1 min para 10 variantes

---

## Comandos rápidos por formato

```bash
# Instagram
node cli.js create "tema" --format instagram-carousel

# Stories
node cli.js create "tema" --format instagram-story --scale 2

# YouTube
node cli.js create "tema" --format youtube-thumbnail --template cta-bold --scale 2

# Posters (impresión)
node cli.js create "tema" --format poster-a4 --scale 2
node cli.js create "tema" --format poster-letter --scale 2

# Presentación
node cli.js create "tema" --format presentation-16-9 --scale 2

# Ads
node cli.js create "tema" --format facebook-ad --template cta-bold
node cli.js create "tema" --format email-banner --template cta-bold

# Profesional
node cli.js create "tema" --format linkedin-post --template editorial-dark
```

---

## Notas técnicas

- Todos los formatos soportan `--reuse`, `--variation`, `--batch`, `--tags`
- `--scale 2` recomendado para print (poster) y video (YouTube)
- `--template` se autoselecciona si no se especifica, pero recomendamos explícito
- Los formatos respetan safe areas automáticamente (no crops inesperados)
- Las fuentes se escalan proporcionalmente por formato
