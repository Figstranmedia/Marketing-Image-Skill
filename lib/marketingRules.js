export class MarketingRules {
  constructor() {
    this.formats = {
      'instagram-carousel': {
        aspectRatio: '1080x1350',
        slides: 3,

        // Safe areas (espacios donde el contenido no se corta)
        safeArea: {
          top: 60, // Status bar + notch
          bottom: 100, // Home indicator + reply stickers
          left: 20,
          right: 20,
        },

        slideRules: [
          {
            index: 0,
            type: 'hero',
            imagePercent: 80,
            textPercent: 20,
            imageStrategy: 'aspirational-lifestyle',
            focus: 'hook emocional',
            maxTextLines: 2,
            cta: 'none',
            typography: {
              fontSize: '48-56px',
              lineHeight: 1.1,
              fontWeight: 'bold',
              padding: 20,
            },
          },
          {
            index: 1,
            type: 'body',
            imagePercent: 50,
            textPercent: 50,
            imageStrategy: 'benefit-focused',
            focus: 'valor propuesto',
            maxTextLines: 4,
            cta: 'none',
            typography: {
              fontSize: '32-40px',
              lineHeight: 1.3,
              fontWeight: '500',
              padding: 24,
            },
          },
          {
            index: 2,
            type: 'cta',
            imagePercent: 30,
            textPercent: 70,
            imageStrategy: 'reinforcement',
            focus: 'llamada a acción',
            maxTextLines: 2,
            cta: 'strong',
            typography: {
              fontSize: '40-48px',
              lineHeight: 1.2,
              fontWeight: 'bold',
              padding: 32,
            },
            ctaButton: {
              height: 56,
              minWidth: 160,
              padding: '14px 28px',
              marginTop: 20,
              borderRadius: 12,
              safeDistanceFromEdge: 40,
            },
          },
        ],

        spacing: 16,
        typography: '1.2x line-height',
        contrastRatio: 'WCAG AA',
        primaryAction: 'swipe',
        imageAvoidList: [
          'detailed hands',
          'readable text',
          'intricate objects',
          'complex faces',
        ],
        recommendedStyles: [
          'abstract-luminous',
          'architectural-silhouette',
          'geometric-dynamic',
        ],
      },

      'linkedin-post': {
        aspectRatio: '1200x627',
        slides: 1,

        // Safe area para LinkedIn (less aggressive)
        safeArea: {
          top: 20,
          bottom: 20,
          left: 30,
          right: 30,
        },

        slideRules: [
          {
            index: 0,
            type: 'single',
            imagePercent: 50,
            textPercent: 50,
            imageStrategy: 'professional-insight',
            focus: 'credibilidad',
            maxTextLines: 3,
            cta: 'soft',
            typography: {
              fontSize: '28-36px',
              lineHeight: 1.4,
              fontWeight: '600',
              padding: 30,
            },
          },
        ],

        spacing: 24,
        typography: 'clean, legible',
        contrastRatio: 'WCAG AAA',
        primaryAction: 'click',
        imageAvoidList: [
          'too colorful',
          'unprofessional',
          'meme-like',
          'low contrast',
        ],
        recommendedStyles: [
          'abstract-professional',
          'minimal-architectural',
          'conceptual-clean',
        ],
      },

      'twitter-post': {
        aspectRatio: '1024x512',
        slides: 1,

        // Safe area mínima para Twitter
        safeArea: {
          top: 16,
          bottom: 16,
          left: 20,
          right: 20,
        },

        slideRules: [
          {
            index: 0,
            type: 'single',
            imagePercent: 100,
            textPercent: 0,
            imageStrategy: 'bold-statement',
            focus: 'atención',
            maxTextLines: 0,
            cta: 'none',
          },
        ],

        spacing: 0,
        typography: 'n/a',
        contrastRatio: 'high (dark mode)',
        primaryAction: 'retweet',
        imageAvoidList: [
          'text heavy',
          'low contrast',
          'small details',
        ],
        recommendedStyles: [
          'bold-geometric',
          'high-contrast',
          'minimalist-striking',
        ],
      },

      'instagram-story': {
        aspectRatio: '1080x1920',
        slides: 1,

        // Safe areas más agresivas para Stories
        safeArea: {
          top: 100, // Status bar + aggressive top
          bottom: 120, // Reply/sticker buttons
          left: 40,
          right: 40,
        },

        slideRules: [
          {
            index: 0,
            type: 'fullscreen',
            imagePercent: 100,
            textPercent: 0,
            imageStrategy: 'immersive',
            focus: 'engagement',
            maxTextLines: 0,
            cta: 'sticker',
            typography: {
              fontSize: '48-64px',
              lineHeight: 1.1,
              fontWeight: 'bold',
              maxWidth: '80%',
            },
          },
        ],

        spacing: 60,
        typography: 'large, bold',
        contrastRatio: 'WCAG AA',
        primaryAction: 'tap',
        imageAvoidList: [
          'busy background',
          'small details',
          'readable text edge-to-edge',
        ],
        recommendedStyles: [
          'full-screen-immersive',
          'bold-architecture',
          'luminous-abstract',
        ],
      },

      'facebook-ad': {
        aspectRatio: '1200x628',
        slides: 1,

        // Safe area para Facebook
        safeArea: {
          top: 24,
          bottom: 24,
          left: 32,
          right: 32,
        },

        slideRules: [
          {
            index: 0,
            type: 'single',
            imagePercent: 60,
            textPercent: 40,
            imageStrategy: 'conversion-focused',
            focus: 'urgencia',
            maxTextLines: 2,
            cta: 'strong',
            typography: {
              fontSize: '32-40px',
              lineHeight: 1.3,
              fontWeight: 'bold',
              padding: 28,
            },
            ctaButton: {
              height: 48,
              minWidth: 140,
              padding: '12px 24px',
              marginTop: 16,
              text: 'Learn More / Shop Now / Sign Up',
            },
          },
        ],

        spacing: 20,
        typography: 'clear headline + subheading',
        contrastRatio: 'WCAG AA',
        primaryAction: 'click',
        imageAvoidList: [
          'stock photo obvious',
          'blurry details',
          'unrelated aesthetic',
        ],
        recommendedStyles: [
          'lifestyle',
          'conceptual-product',
          'benefit-focused',
        ],
      },
    };
  }

  getFormat(formatName) {
    return (
      this.formats[formatName] || {
        error: `Format "${formatName}" not found`,
      }
    );
  }

  getAllFormats() {
    return Object.keys(this.formats);
  }

  getImagePromptTemplate(format, slideIndex) {
    const fmt = this.getFormat(format);
    if (fmt.error) return null;

    const slide = fmt.slideRules[slideIndex];
    if (!slide) return null;

    return {
      aspectRatio: fmt.aspectRatio,
      strategy: slide.imageStrategy,
      avoidList: fmt.imageAvoidList,
      recommendedStyles: fmt.recommendedStyles,
      tone: slide.focus,
    };
  }

  validatePromptForFormat(prompt, format, slideIndex) {
    const template = this.getImagePromptTemplate(format, slideIndex);
    if (!template) return { valid: false, reason: 'Invalid format/slide' };

    const avoidWords = template.avoidList.map(w => w.toLowerCase());
    const promptLower = prompt.toLowerCase();

    const foundAvoid = avoidWords.filter(word => promptLower.includes(word));
    if (foundAvoid.length > 0) {
      return {
        valid: false,
        reason: `Prompt contains problematic elements: ${foundAvoid.join(', ')}`,
        suggestions: `Use: ${template.recommendedStyles.join(', ')}`,
      };
    }

    return { valid: true };
  }

  getTextPlacementRules(format, slideIndex) {
    const fmt = this.getFormat(format);
    if (fmt.error) return null;

    const slide = fmt.slideRules[slideIndex];
    return {
      imagePercent: slide.imagePercent,
      textPercent: slide.textPercent,
      position: this.inferTextPosition(slide.imagePercent),
      maxLines: slide.maxTextLines,
      fontSize: this.inferFontSize(slide.imagePercent),
      alignment: 'center',
      padding: fmt.spacing,
    };
  }

  inferTextPosition(imagePercent) {
    if (imagePercent >= 80) return 'bottom-overlay';
    if (imagePercent >= 50) return 'right-side';
    return 'right-side-large';
  }

  inferFontSize(imagePercent) {
    if (imagePercent >= 80) return 'large (32-48px)';
    if (imagePercent >= 50) return 'medium (24-32px)';
    return 'large (32-48px)';
  }
}
