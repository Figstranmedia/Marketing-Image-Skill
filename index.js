import { ProjectAnalyzer } from './lib/projectAnalyzer.js';
import { ImageDetector } from './lib/imageDetector.js';
import { PromptGenerator } from './lib/promptGenerator.js';
import { FluxClient } from './lib/fluxClient.js';
import { ComfyUIClient } from './lib/comfyuiClient.js';
import { MarketingRules } from './lib/marketingRules.js';
import { AssetOrganizer } from './lib/assetOrganizer.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class MarketingImageSkill {
  constructor(projectPath, useLocal = false) {
    this.projectPath = projectPath;
    this.analyzer = new ProjectAnalyzer(projectPath);
    this.detector = new ImageDetector(projectPath);
    this.promptGen = new PromptGenerator();
    this.useLocal = useLocal; // true = ComfyUI local, false = Replicate cloud

    if (useLocal) {
      this.comfyui = new ComfyUIClient(process.env.COMFYUI_API_URL || 'http://localhost:8188');
    } else {
      this.flux = new FluxClient();
    }

    this.rules = new MarketingRules();
    this.organizer = new AssetOrganizer(projectPath);
  }

  async init() {
    console.log(`🎨 Inicializando skill para: ${this.projectPath}`);

    // 1. Analizar proyecto
    console.log('📊 Analizando proyecto...');
    const brandAnalysis = await this.analyzer.analyze();
    console.log('✅ Análisis completado');
    console.log(`   - Colores: ${Object.keys(brandAnalysis.colors).length}`);
    console.log(`   - Tipografías: ${Object.keys(brandAnalysis.fonts).length}`);
    console.log(`   - Tone: ${brandAnalysis.tone}`);

    // 2. Detectar imágenes existentes
    console.log('\n🖼️  Buscando imágenes existentes...');
    const existingImages = await this.detector.findProjectImages();
    if (existingImages.length > 0) {
      console.log(`✅ Encontradas ${existingImages.length} imágenes`);
      existingImages.slice(0, 5).forEach(img => console.log(`   - ${img.relative}`));
    } else {
      console.log('ℹ️  No hay imágenes previas');
    }

    return {
      brandAnalysis,
      existingImages,
    };
  }

  async suggestImageType(format = 'instagram-carousel') {
    const brandData = await this.analyzer.analyze();
    return this.promptGen.suggestImageType(brandData, format);
  }

  async generateCarousel(options = {}) {
    const {
      format = 'instagram-carousel',
      topic = 'brand story',
      slides = 3,
      useExisting = false,
      dryRun = false,
    } = options;

    console.log(`\n🚀 Generando ${format} (${slides} slides)`);

    const brandData = await this.analyzer.analyze();
    const marketingRules = this.rules.getFormat(format);

    // Si prefiere imágenes existentes
    if (useExisting) {
      const existing = await this.detector.findProjectImages();
      if (existing.length >= slides) {
        console.log(`✅ Usando ${slides} imágenes existentes`);
        return existing.slice(0, slides);
      }
      console.log('ℹ️  No hay suficientes imágenes existentes, generando...');
    }

    // Generar prompts inteligentes
    const rawPrompts = this.promptGen.generateCarouselPrompts(
      brandData,
      topic,
      slides,
      marketingRules
    );

    const [imgWidth, imgHeight] = (marketingRules.aspectRatio || '1080x1350')
      .split('x')
      .map(Number);
    const prompts = rawPrompts.map(p => ({ ...p, width: imgWidth, height: imgHeight }));

    if (dryRun) {
      console.log('\n📋 Preview de prompts (dry-run):');
      prompts.forEach((p, i) => {
        console.log(`\nSlide ${i + 1}: ${p.type}`);
        console.log(`  ${p.prompt.substring(0, 100)}...`);
      });
      return { dryRun: true, prompts };
    }

    // Crear carpeta de assets
    const assetFolder = await this.organizer.createAssetFolder(format);
    const rawFolder = path.join(assetFolder, 'flux-raw');
    console.log(`📁 Assets → ${assetFolder}`);

    // Generar imágenes: ComfyUI local o Replicate cloud
    console.log('\n⏳ Generando imágenes...');

    let images;

    if (this.useLocal) {
      // ComfyUI local
      const comfyuiAvailable = await this.comfyui.isAvailable();
      if (!comfyuiAvailable) {
        throw new Error(
          'ComfyUI no disponible en ' + (process.env.COMFYUI_API_URL || 'http://localhost:8188') +
          '\nInicia: cd ~/video-ai/ComfyUI && python main.py'
        );
      }
      console.log('🖥️  Usando ComfyUI local\n');
      images = await this.comfyui.generateImages(prompts, rawFolder);
    } else {
      // Replicate cloud (default)
      if (!this.flux.isAvailable()) {
        throw new Error(
          'REPLICATE_API_TOKEN no configurado. Agrega a .env: REPLICATE_API_TOKEN=r8_xxxx'
        );
      }
      const fluxModel = process.env.FLUX_MODEL || 'schnell';
      console.log(`☁️  Usando Replicate FLUX ${fluxModel}\n`);
      images = await this.flux.generateImages(prompts, rawFolder);
    }

    // Guardar metadata
    await this.organizer.saveManifest(assetFolder, {
      format,
      topic,
      slides,
      brandData,
      prompts,
      images,
      timestamp: new Date().toISOString(),
    });

    console.log(`✅ Carrusel generado en ${assetFolder}`);
    return { assetFolder, images, prompts };
  }

  async analyzeProjectStyle() {
    const brand = await this.analyzer.analyze();
    return {
      colors: brand.colors,
      fonts: brand.fonts,
      tone: brand.tone,
      suggestedImageType: this.promptGen.recommendImageStyle(brand),
      contrast: brand.contrast,
      aesthetic: brand.aesthetic,
    };
  }
}

export default MarketingImageSkill;
