import axios from 'axios';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

/**
 * Genera copy para slides de marketing usando Claude Haiku.
 * Una llamada produce: título/subtítulo/label para cada slide + captions para redes.
 *
 * Uso:
 *   // Modo API (requiere ANTHROPIC_API_KEY):
 *   const cw = new Copywriter();
 *   const { slides, captions } = await cw.generate(brand, 'Religión del Espíritu', ['hero','body','cta'], 'instagram-carousel');
 *
 *   // Modo offline (inyectar contenido directo, sin token):
 *   const content = { slides: [...], captions: {...} };
 *   const result = await cw.generateOffline(content);
 */
export class Copywriter {
  constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
    this.apiKey = apiKey;
    this.api = apiKey
      ? axios.create({
          baseURL: 'https://api.anthropic.com/v1',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          timeout: 30000,
        })
      : null;
  }

  isAvailable() {
    return !!this.apiKey;
  }

  /**
   * Modo offline: inyecta contenido directamente sin llamar a la API.
   * Útil en Cowork donde Claude ya está presente y puede generar el copy en contexto.
   *
   * @param {object} content { slides: [...], captions: {...} }
   * @returns {Promise<object>} mismo formato que generate()
   */
  async generateOffline(content) {
    if (!content || !content.slides || !content.captions) {
      throw new Error('generateOffline requiere: { slides: [...], captions: {...} }');
    }
    return Promise.resolve(content);
  }

  /**
   * Genera contenido completo para un set de slides.
   *
   * @param {object}   brand      Brand Profile de projectAnalyzer
   * @param {string}   topic      Tema del carousel
   * @param {string[]} slideTypes ['hero','body','cta'] o combinación
   * @param {string}   format     'instagram-carousel' etc.
   * @returns {Promise<{ slides: SlideContent[], captions: Captions }>}
   */
  async generate(brand, topic, slideTypes, format = 'instagram-carousel') {
    if (!this.isAvailable()) {
      throw new Error(
        'ANTHROPIC_API_KEY no configurado.\n' +
        'Agregar a .env: ANTHROPIC_API_KEY=sk-ant-...\n' +
        'O usar: node cli.js design [folder] --template [name] (sin --copy)'
      );
    }

    const tone    = brand.tone ?? brand.aesthetic ?? 'profesional';
    const sector  = brand.sector ?? brand.category ?? inferSector(brand);
    const accent  = brand.palette?.accent ?? brand.colors?.accent ?? '#f97316';
    const primary = brand.palette?.primary ?? brand.colors?.primary ?? '#0f0f0f';
    const headingFont = brand.fonts?.heading ?? 'Space Grotesk';

    const slideDescriptions = slideTypes.map((type, i) => {
      const defaultLabels = { hero: '01 / HOOK', body: '02 / STORY', cta: '03 / ACCIÓN' };
      return `  - slide ${i + 1} (${type}): label base "${defaultLabels[type] ?? `0${i + 1} / ${type.toUpperCase()}`}"`;
    }).join('\n');

    const prompt = buildPrompt({ topic, format, tone, sector, accent, primary, headingFont, slideDescriptions, slideTypes });

    const response = await this.api.post('/messages', {
      model: HAIKU_MODEL,
      max_tokens: 900,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.data.content?.[0]?.text ?? '';
    return parseJSON(raw);
  }

  /**
   * Genera solo captions para un topic y brand (sin slides).
   * Útil para posts de imagen única.
   */
  async generateCaptions(brand, topic, format = 'instagram-carousel') {
    if (!this.isAvailable()) {
      throw new Error('ANTHROPIC_API_KEY no configurado');
    }

    const tone   = brand.tone ?? 'profesional';
    const sector = brand.sector ?? inferSector(brand);

    const prompt = `Genera captions listos para publicar para un post de ${format} sobre: "${topic}".

Tono de marca: ${tone}
Sector: ${sector}

Devuelve solo JSON válido:
{
  "general": "1-2 frases descriptivas del contenido, usable en cualquier plataforma",
  "instagram": "Caption emocional con emojis, termina con 5-8 hashtags relevantes al sector",
  "linkedin": "Caption profesional sin emojis excesivos, enfocado en valor o logro",
  "twitter": "Máximo 240 chars con 2-3 hashtags"
}`;

    const response = await this.api.post('/messages', {
      model: HAIKU_MODEL,
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    return parseJSON(response.data.content?.[0]?.text ?? '');
  }
}

// ─── helpers ────────────────────────────────────────────────────────────────

function buildPrompt({ topic, format, tone, sector, accent, primary, headingFont, slideDescriptions, slideTypes }) {
  const hasCTA = slideTypes.includes('cta');

  return `Eres copywriter de marketing digital. Genera contenido conciso para slides de ${format}.

TEMA: "${topic}"
TONO DE MARCA: ${tone}
SECTOR: ${sector}
COLORES: primario ${primary}, acento ${accent}
TIPOGRAFÍA: ${headingFont}

SLIDES A GENERAR:
${slideDescriptions}

REGLAS DE COPY:
- title: 3-7 palabras. Impactante. Puede ser poético si el tono lo pide.
- subtitle: 10-20 palabras. Complementa y expande el título.
- label: formato "01 / TEMA" (uppercase, 2-4 palabras después del número).
- ctaText: solo para slide tipo "cta". 3-5 palabras de acción directa.
- Idioma: detectar del tema — si el tema está en español, generar en español; si en inglés, en inglés.

CAPTIONS PARA PUBLICAR:
- general: 1-3 frases descriptivas, usable en cualquier plataforma sin edición.
- instagram: emocional, con emojis, termina con 5-8 hashtags relevantes.
- linkedin: profesional, enfocado en valor o logro, sin emojis excesivos.
- twitter: máximo 240 chars, directo, 2-3 hashtags.

Devuelve únicamente JSON válido con esta estructura exacta:
{
  "slides": [
    { "type": "hero", "title": "...", "subtitle": "...", "label": "01 / ..." },
    { "type": "body", "title": "...", "subtitle": "...", "label": "02 / ..." }${hasCTA ? ',\n    { "type": "cta",  "title": "...", "subtitle": "...", "label": "03 / ...", "ctaText": "..." }' : ''}
  ],
  "captions": {
    "general": "...",
    "instagram": "...",
    "linkedin": "...",
    "twitter": "..."
  }
}`;
}

function parseJSON(text) {
  // Quitar bloques markdown si vienen envueltos
  const clean = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    // Intentar extraer el JSON del texto si hay texto adicional
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`Copywriter retornó respuesta inválida:\n${text.slice(0, 200)}`);
  }
}

function inferSector(brand) {
  const tone = (brand.tone ?? '').toLowerCase();
  if (/espiritual|spiritual|music|música|artis/.test(tone)) return 'música';
  if (/finance|finanza|invest/.test(tone)) return 'finanzas';
  if (/health|salud|wellness/.test(tone)) return 'salud';
  if (/tech|software|dev/.test(tone)) return 'tecnología';
  return 'creativo';
}
