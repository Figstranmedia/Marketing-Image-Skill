import { MarketingRules } from './marketingRules.js';

export class PromptGenerator {
  constructor() {
    this.rules = new MarketingRules();

    // Estilos visuales seguros para Flux (evita manos, texto, objetos complejos)
    this.safeImageStyles = {
      'abstract-luminous-architecture': {
        description: 'Abstract architectural forms with luminous light',
        elements: [
          'geometric architectural silhouettes',
          'flowing luminous light rays',
          'abstract spatial composition',
          'deep atmospheric perspective',
        ],
        avoid: ['hands', 'faces', 'readable text', 'people'],
      },

      'geometric-dynamic': {
        description: 'Bold geometric patterns with dynamic energy',
        elements: [
          'sharp geometric forms',
          'dynamic diagonal lines',
          'vibrant color interactions',
          'layered depth',
        ],
        avoid: ['hands', 'faces', 'intricate details'],
      },

      'minimal-silhouette-architecture': {
        description: 'Minimalist architectural silhouettes',
        elements: [
          'clean silhouette forms',
          'negative space emphasis',
          'subtle gradients',
          'monochromatic + accent color',
        ],
        avoid: ['details', 'textures', 'complexity'],
      },

      'abstract-sonic-visualization': {
        description: 'Abstract visualization of sound and music',
        elements: [
          'wave-like flowing forms',
          'frequency patterns',
          'light frequency spectrum',
          'ethereal atmospheric',
        ],
        avoid: ['instruments', 'musicians', 'readable text'],
      },

      'spiritual-abstract-light': {
        description: 'Spiritual abstract forms with ethereal light',
        elements: [
          'luminous emanations',
          'sacred geometry patterns',
          'transcendent light quality',
          'ethereal atmospheric',
        ],
        avoid: ['religious iconography', 'people', 'text'],
      },

      'conceptual-clean': {
        description: 'Clean conceptual imagery',
        elements: [
          'single clear focal point',
          'ample negative space',
          'subtle color palette',
          'professional aesthetic',
        ],
        avoid: ['clutter', 'faces', 'hands'],
      },
    };

    // Templates de prompts por tipo de slide — SOLO VISUALES, sin tema específico
    this.slidePromptTemplates = {
      hero: {
        pattern:
          '{style}, {aesthetic_elements}, clean geometric composition, {color_accent}, no recognizable objects, no people, no text, abstract visual, 8K quality, professional, trending',
        focusOn: 'aspirational visual hook',
      },
      body: {
        pattern:
          'abstract visual composition, {aesthetic_elements}, sophisticated color palette, {style}, no figures, no objects, minimal recognizable elements, {detail_level}, professional design, 4K',
        focusOn: 'benefit communication',
      },
      cta: {
        pattern:
          'bold abstract {style}, {aesthetic_elements}, high contrast, {color_accent}, dynamic geometric forms, no recognizable objects, no people, no text, 4K quality',
        focusOn: 'conversion driving',
      },
    };
  }

  generateCarouselPrompts(brandData, topic, slideCount, marketingRules) {
    const prompts = [];
    const recommendedStyle = brandData.recommendedImageType;

    for (let i = 0; i < slideCount; i++) {
      const slideRule = marketingRules.slideRules[i];
      if (!slideRule) continue;

      const prompt = this.generateSlidePrompt({
        brandData,
        topic,
        slideIndex: i,
        slideType: slideRule.type,
        style: recommendedStyle,
        focus: slideRule.focus,
      });

      prompts.push({
        index: i,
        type: slideRule.type,
        prompt,
        strategy: slideRule.imageStrategy,
        guidelines: {
          imagePercent: slideRule.imagePercent,
          textPercent: slideRule.textPercent,
          maxTextLines: slideRule.maxTextLines,
        },
      });
    }

    return prompts;
  }

  generateSlidePrompt({ brandData, topic, slideIndex, slideType, style, focus }) {
    const styleConfig = this.safeImageStyles[style] || this.safeImageStyles['conceptual-clean'];
    const template = this.slidePromptTemplates[slideType] || this.slidePromptTemplates.body;

    // Construir prompt — SIN incluir el tema específico para evitar que FLUX lo literal
    // El estilo visual + colores + tone comunican el mensaje sin objetos específicos
    let prompt = template.pattern
      .replace('{style}', styleConfig.description)
      .replace(
        '{aesthetic_elements}',
        styleConfig.elements.slice(0, 2).join(', ')
      )
      .replace('{color_accent}', this.selectAccentColor(brandData))
      .replace('{detail_level}', slideIndex === 0 ? 'rich layered composition' : 'balanced composition')
      .replace('{concept}', 'abstract flow');

    // Agregar tone para comunicar el mensaje de forma visual abstracta
    if (brandData.tone === 'spiritual') {
      prompt += ', ethereal luminous quality, transcendent light, sacred geometry';
    } else if (brandData.tone === 'energetic') {
      prompt += ', dynamic kinetic energy, bold geometric forms, vibrant interaction';
    } else if (brandData.tone === 'minimalist') {
      prompt += ', clean simplicity, negative space emphasis, subtle sophistication';
    } else if (brandData.tone === 'professional') {
      prompt += ', professional sophistication, elegant composition, refined aesthetic';
    }

    // Refuerzos explícitos contra problemas de FLUX
    prompt += ', absolutely no hands, no faces, no people, no readable text, no recognizable objects, pure abstract visual';

    return prompt;
  }

  selectAccentColor(brandData) {
    // Usar paleta extraída del proyecto si existe
    if (brandData.palette?.forPrompt) {
      return brandData.palette.forPrompt;
    }

    // Si hay colores HEX directos, usarlos
    if (brandData.colors) {
      const hexColors = Object.entries(brandData.colors)
        .filter(([, val]) => /^#[0-9a-fA-F]{3,6}$/.test(val))
        .slice(0, 3)
        .map(([name, hex]) => `${name} ${hex}`);

      if (hexColors.length > 0) return hexColors.join(', ');
    }

    // Fallback por tone
    if (brandData.tone === 'spiritual') return 'ethereal violet and gold tones';
    if (brandData.tone === 'energetic') return 'vibrant dynamic complementary colors';
    if (brandData.tone === 'minimalist') return 'monochromatic subtle tones';
    if (brandData.sector === 'music') return 'deep navy and warm gold tones';

    return 'sophisticated neutral with accent color';
  }

  selectConcept(slideType, topic) {
    if (slideType === 'hero') return `${topic} essence`;
    if (slideType === 'body') return `${topic} benefit`;
    if (slideType === 'cta') return `${topic} transformation`;

    return topic;
  }

  suggestImageType(brandData, format) {
    const recommended = brandData.recommendedImageType;

    return {
      recommended,
      description: this.safeImageStyles[recommended]?.description || 'abstract concept',
      safeElements: this.safeImageStyles[recommended]?.elements || [],
      whyThisStyle: this.explainStyleChoice(brandData, recommended),
    };
  }

  recommendImageStyle(brandData) {
    // Basado en estética y tone
    if (brandData.aesthetic === 'spiritual') {
      return 'spiritual-abstract-light';
    }
    if (brandData.tone === 'energetic') {
      return 'geometric-dynamic';
    }
    if (brandData.tone === 'minimalist') {
      return 'minimal-silhouette-architecture';
    }
    if (brandData.aesthetic === 'musical') {
      return 'abstract-sonic-visualization';
    }

    return 'abstract-luminous-architecture';
  }

  explainStyleChoice(brandData, style) {
    const reasons = [];

    if (brandData.tone === 'spiritual') {
      reasons.push('Spiritual tone suggests ethereal, luminous visuals');
    }
    if (brandData.aesthetic === 'musical') {
      reasons.push('Musical aesthetic aligns with sonic/wave visualizations');
    }
    if (brandData.tone === 'minimalist') {
      reasons.push('Minimalist tone prefers clean silhouettes over detail');
    }

    return reasons.join('; ');
  }

  generateSingleImagePrompt(topic, style, colorPalette = {}) {
    const styleConfig =
      this.safeImageStyles[style] || this.safeImageStyles['conceptual-clean'];

    const accentColor = Object.values(colorPalette)[0] || 'sophisticated accent';

    return `${styleConfig.description} concept visualization about ${topic},
featuring ${styleConfig.elements.join(', ')},
${accentColor} color accent, professional 8K quality,
avoiding ${styleConfig.avoid.join(', ')},
clean composition, trending on artstation`;
  }

  // Para debugging: mostrar todos los estilos disponibles
  getAvailableStyles() {
    return Object.entries(this.safeImageStyles).map(([key, value]) => ({
      id: key,
      name: value.description,
      elements: value.elements,
      avoid: value.avoid,
    }));
  }
}
