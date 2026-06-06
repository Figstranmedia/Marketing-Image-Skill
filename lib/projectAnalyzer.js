import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ProjectAnalyzer {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.confidence = 'low'; // 'high', 'medium', 'low'
  }

  async analyze() {
    const analysis = {
      colors: {},
      fonts: {},
      tone: 'professional',
      aesthetic: 'modern',
      contrast: 'high',
      targetAudience: 'general',
      sector: 'general',
      confidence: 'low',
      sources: [], // qué archivos alimentaron el análisis
    };

    // Prioridad 1: brand.json / tokens.json (mayor confianza)
    const brandJson = await this.readBrandJson();
    if (brandJson) {
      Object.assign(analysis, brandJson);
      analysis.sources.push('brand.json');
      analysis.confidence = 'high';
    }

    // Prioridad 2: tailwind.config (confianza media-alta)
    if (Object.keys(analysis.colors).length === 0) {
      const tailwind = await this.parseTailwindConfig();
      if (tailwind) {
        Object.assign(analysis.colors, tailwind.colors);
        Object.assign(analysis.fonts, tailwind.fonts);
        analysis.sources.push('tailwind.config');
        if (analysis.confidence === 'low') analysis.confidence = 'medium';
      }
    }

    // Prioridad 3: CSS variables
    if (Object.keys(analysis.colors).length === 0) {
      const cssVars = await this.parseCssVariables();
      if (cssVars && Object.keys(cssVars.colors).length > 0) {
        Object.assign(analysis.colors, cssVars.colors);
        Object.assign(analysis.fonts, cssVars.fonts);
        analysis.sources.push('CSS variables');
        if (analysis.confidence === 'low') analysis.confidence = 'medium';
      }
    }

    // Prioridad 4: README / BRAND.md / package.json para tone y sector
    const docs = await this.readProjectDocs();
    if (docs) {
      analysis.tone = this.analyzeTone(docs);
      analysis.aesthetic = this.inferAesthetic(docs);
      analysis.sector = this.inferSector(docs);
      analysis.sources.push('README/docs');
    }

    // Inferir tipo de imagen recomendado
    analysis.recommendedImageType = this.inferImageType(analysis);

    // Construir paleta limpia de colores HEX para usar en prompts
    analysis.palette = this.buildPalette(analysis.colors);

    return analysis;
  }

  /**
   * Leer brand.json, tokens.json, design-tokens.json, etc.
   */
  async readBrandJson() {
    const brandFiles = [
      'brand.json',
      'brand.yml',
      '.brandrc.json',
      'tokens.json',
      'design-tokens.json',
      'src/tokens.json',
      'src/brand.json',
    ];

    for (const file of brandFiles) {
      try {
        const filePath = path.join(this.projectPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        // YAML para .yml/.yaml; JSON para el resto. (js-yaml también parsea JSON.)
        const data = /\.ya?ml$/.test(file) ? yaml.load(content) : JSON.parse(content);
        if (!data || typeof data !== 'object') continue;

        const colors = {};
        const fonts = {};

        // Estructura plana: { primary: '#HEX', ... }
        if (data.colors && typeof data.colors === 'object') {
          for (const [key, val] of Object.entries(data.colors)) {
            const hex = typeof val === 'string' ? val : val.DEFAULT || val[500];
            if (hex && /^#[0-9a-fA-F]{3,6}$/.test(hex)) {
              colors[key] = hex;
            }
          }
        }

        // Estructura design tokens: { color: { primary: { value: '#HEX' } } }
        if (data.color && typeof data.color === 'object') {
          for (const [key, val] of Object.entries(data.color)) {
            const hex = typeof val === 'string' ? val : val.value;
            if (hex && /^#[0-9a-fA-F]{3,6}$/.test(hex)) {
              colors[key] = hex;
            }
          }
        }

        if (data.fonts || data.typography) {
          const fontData = data.fonts || data.typography;
          if (fontData.heading) fonts.heading = fontData.heading;
          if (fontData.body) fonts.body = fontData.body;
          if (fontData.main) fonts.main = fontData.main;
        }

        if (Object.keys(colors).length > 0 || Object.keys(fonts).length > 0) {
          return {
            colors,
            fonts,
            tone: data.tone || 'professional',
            sector: data.sector || null,
          };
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Parsear tailwind.config.js/ts para extraer colores reales
   */
  async parseTailwindConfig() {
    const tailwindFiles = [
      'tailwind.config.js',
      'tailwind.config.ts',
      'tailwind.config.cjs',
    ];

    for (const file of tailwindFiles) {
      try {
        const filePath = path.join(this.projectPath, file);
        const content = await fs.readFile(filePath, 'utf-8');

        const colors = {};
        const fonts = {};

        // Extraer colores: { primary: '#HEX' } o { primary: { DEFAULT: '#HEX' } }
        // Pattern 1: nombre: '#HEX'
        const simplePattern = /['"]?([\w-]+)['"]?\s*:\s*['"]?(#[0-9a-fA-F]{3,6})['"]?/g;
        let match;
        while ((match = simplePattern.exec(content)) !== null) {
          const key = match[1];
          const hex = match[2];
          // Filtrar keys que son números (tonos de color 100-900)
          if (!/^\d+$/.test(key) && hex) {
            colors[key] = hex;
          }
        }

        // Extraer fuentes: fontFamily: { sans: ['Fuente', ...] }
        const fontPattern = /fontFamily\s*:\s*\{([^}]+)\}/s;
        const fontMatch = content.match(fontPattern);
        if (fontMatch) {
          const sansMatch = fontMatch[1].match(/sans\s*:\s*\[['"]([^'"]+)['"]/);
          const serifMatch = fontMatch[1].match(/serif\s*:\s*\[['"]([^'"]+)['"]/);
          if (sansMatch) fonts.body = sansMatch[1];
          if (serifMatch) fonts.heading = serifMatch[1];
        }

        if (Object.keys(colors).length > 0) {
          return { colors, fonts };
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Parsear variables CSS (--color-primary, --primary, etc.)
   */
  async parseCssVariables() {
    const cssSearchPaths = [
      'styles/globals.css',
      'styles/global.css',
      'styles/index.css',
      'styles/main.css',
      'src/styles/globals.css',
      'src/styles/global.css',
      'src/index.css',
      'index.css',
      'global.css',
      'app/globals.css',
      'app/global.css',
    ];

    const colors = {};
    const fonts = {};

    for (const file of cssSearchPaths) {
      try {
        const filePath = path.join(this.projectPath, file);
        const content = await fs.readFile(filePath, 'utf-8');

        // Variables HEX: --primary: #HEX o --color-primary: #HEX
        const hexPattern = /--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\s*;/g;
        let match;
        while ((match = hexPattern.exec(content)) !== null) {
          const varName = match[1].replace(/^color-/, ''); // normalizar
          colors[varName] = match[2];
        }

        // Variables HSL: --primary: H S% L%
        const hslPattern = /--([\w-]+)\s*:\s*(\d+)\s+(\d+)%\s+(\d+)%\s*;/g;
        while ((match = hslPattern.exec(content)) !== null) {
          const varName = match[1].replace(/^color-/, '');
          const hex = this.hslToHex(
            parseInt(match[2]),
            parseInt(match[3]),
            parseInt(match[4])
          );
          if (!colors[varName]) colors[varName] = hex;
        }

        // Fuentes: --font-main o font-family en :root
        const fontVarPattern = /--(font[\w-]*)\s*:\s*['"]?([^;'"]+)['"]?\s*;/g;
        while ((match = fontVarPattern.exec(content)) !== null) {
          const varName = match[1].replace(/^font-?/, '').trim();
          const fontName = match[2].trim().replace(/,.*$/, '').replace(/['"]/g, '');
          if (fontName && !fontName.includes('var(')) {
            fonts[varName || 'main'] = fontName;
          }
        }

        if (Object.keys(colors).length > 0) break; // Usar el primer CSS con resultados
      } catch {
        continue;
      }
    }

    return Object.keys(colors).length > 0 ? { colors, fonts } : null;
  }

  /**
   * Leer README, BRAND.md y package.json para contexto
   */
  async readProjectDocs() {
    const docFiles = [
      'README.md',
      'BRAND.md',
      'STYLE_GUIDE.md',
      'docs/brand.md',
    ];

    const texts = [];

    for (const file of docFiles) {
      try {
        const filePath = path.join(this.projectPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        texts.push(content.substring(0, 3000)); // Primeros 3000 chars
      } catch {
        continue;
      }
    }

    // También leer descripción de package.json
    try {
      const pkg = JSON.parse(
        await fs.readFile(path.join(this.projectPath, 'package.json'), 'utf-8')
      );
      if (pkg.description) texts.push(pkg.description);
    } catch {
      // Sin package.json, ignorar
    }

    return texts.length > 0 ? texts.join('\n') : null;
  }

  analyzeTone(text) {
    const lowerText = text.toLowerCase();

    const tonePatterns = {
      energetic: {
        en: ['energetic', 'dynamic', 'vibrant', 'bold', 'powerful', 'active', 'lively'],
        es: ['enérgico', 'dinámic', 'vibrante', 'audaz', 'potente', 'activo', 'vivaz'],
      },
      spiritual: {
        en: ['spiritual', 'sacred', 'mystical', 'transcendent', 'divine', 'ethereal'],
        es: ['espiritual', 'sagrado', 'místic', 'trascendent', 'divino', 'ethereal'],
      },
      casual: {
        en: ['playful', 'fun', 'casual', 'friendly', 'approachable', 'light'],
        es: ['lúdic', 'divertid', 'casual', 'amistoso', 'accesible', 'ligero'],
      },
      minimalist: {
        en: ['minimal', 'clean', 'simple', 'zen', 'stark'],
        es: ['minimalista', 'limpio', 'simple', 'zen', 'austera'],
      },
      professional: {
        en: ['professional', 'corporate', 'business', 'formal', 'serious'],
        es: ['profesional', 'corporativ', 'empresarial', 'formal', 'serio'],
      },
    };

    const scores = {};
    for (const [tone, keywords] of Object.entries(tonePatterns)) {
      const allKeywords = [...keywords.en, ...keywords.es];
      scores[tone] = allKeywords.filter(kw => lowerText.includes(kw)).length;
    }

    const topTone = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .find(([, score]) => score >= 1);

    return topTone ? topTone[0] : 'professional';
  }

  inferAesthetic(text) {
    const lowerText = text.toLowerCase();

    const aestheticPatterns = {
      musical: {
        en: ['music', 'audio', 'sound', 'melody', 'rhythm', 'song', 'album', 'artist'],
        es: ['música', 'audio', 'sonido', 'melodía', 'ritmo', 'canción', 'álbum', 'artista'],
      },
      abstract: {
        en: ['abstract', 'geometric', 'shape', 'form', 'pattern'],
        es: ['abstracto', 'geométric', 'forma', 'patrón'],
      },
      digital: {
        en: ['tech', 'digital', 'cyber', 'code', 'software', 'app'],
        es: ['tecnología', 'digital', 'código', 'software', 'aplicación'],
      },
      organic: {
        en: ['nature', 'organic', 'natural', 'ecological', 'bio'],
        es: ['naturaleza', 'orgánico', 'natural', 'ecológic', 'bio'],
      },
    };

    const scores = {};
    for (const [aesthetic, keywords] of Object.entries(aestheticPatterns)) {
      const allKeywords = [...keywords.en, ...keywords.es];
      scores[aesthetic] = allKeywords.filter(kw => lowerText.includes(kw)).length;
    }

    const topAesthetic = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .find(([, score]) => score >= 1);

    return topAesthetic ? topAesthetic[0] : 'modern';
  }

  inferSector(text) {
    const lowerText = text.toLowerCase();

    const sectors = {
      music: ['music', 'musician', 'artist', 'album', 'song', 'band', 'música', 'músico', 'artista'],
      finance: ['finance', 'invest', 'money', 'trading', 'finanzas', 'inversión', 'dinero'],
      health: ['health', 'wellness', 'fitness', 'medical', 'salud', 'bienestar'],
      education: ['education', 'learning', 'course', 'teach', 'educación', 'aprendizaje'],
      tech: ['software', 'app', 'development', 'code', 'tech', 'startup'],
      creative: ['design', 'art', 'creative', 'photography', 'diseño', 'arte'],
    };

    for (const [sector, keywords] of Object.entries(sectors)) {
      const matches = keywords.filter(kw => lowerText.includes(kw)).length;
      if (matches >= 2) return sector;
    }

    return 'general';
  }

  /**
   * Construir paleta limpia de colores HEX para los prompts
   */
  buildPalette(colors) {
    const hexColors = Object.entries(colors)
      .filter(([, val]) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(val));

    if (hexColors.length === 0) return null;

    // Clasificar colores por luminosidad
    const withLuminance = hexColors.map(([name, hex]) => ({
      name, hex,
      luminance: this.hexLuminance(hex),
    }));

    // Separar backgrounds (muy oscuros) de colores de acento
    const backgrounds = withLuminance.filter(c => c.luminance < 0.05);
    const midtones = withLuminance.filter(c => c.luminance >= 0.05 && c.luminance < 0.5);
    const highlights = withLuminance.filter(c => c.luminance >= 0.5);

    // Paleta ideal: 1 background + 1-2 acentos, sin repetir el mismo color
    const seen = new Set();
    const palette = [
      backgrounds[0] || midtones[0],
      midtones[0] || highlights[0],
      highlights[0] || midtones[1] || backgrounds[1],
    ].filter(c => c && !seen.has(c.hex) && seen.add(c.hex)).slice(0, 3);

    return {
      primary: palette[0]?.hex || null,
      secondary: palette[1]?.hex || null,
      accent: palette[2]?.hex || null,
      names: palette.map(c => c.name),
      forPrompt: palette.map(c => `${c.name} ${c.hex}`).join(', '),
      all: hexColors.slice(0, 6).map(([name, hex]) => ({ name, hex })),
    };
  }

  /**
   * Expande HEX de 3 dígitos (#abc) a 6 (#aabbcc) para poder hacer slice fiable.
   */
  normalizeHex(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    return `#${h}`;
  }

  hexLuminance(hex) {
    const h = this.normalizeHex(hex);
    const r = parseInt(h.slice(1, 3), 16) / 255;
    const g = parseInt(h.slice(3, 5), 16) / 255;
    const b = parseInt(h.slice(5, 7), 16) / 255;
    const toLinear = c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }

  inferImageType(analysis) {
    if (analysis.aesthetic === 'musical' || analysis.sector === 'music') {
      return 'abstract-sonic-visualization';
    }
    if (analysis.tone === 'spiritual') {
      return 'spiritual-abstract-light';
    }
    if (analysis.tone === 'energetic') {
      return 'geometric-dynamic';
    }
    if (analysis.tone === 'minimalist') {
      return 'minimal-silhouette-architecture';
    }
    if (analysis.aesthetic === 'abstract') {
      return 'abstract-luminous-architecture';
    }

    return 'conceptual-clean';
  }

  /**
   * Convertir HSL a HEX
   */
  hslToHex(h, s, l) {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }
}
