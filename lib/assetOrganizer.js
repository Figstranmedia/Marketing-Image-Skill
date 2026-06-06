import fs from 'fs/promises';
import path from 'path';

export class AssetOrganizer {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.assetsFolder = path.join(projectPath, 'marketing-assets');
  }

  async createAssetFolder(format, customName = null) {
    // Crear carpeta base si no existe
    await this.ensureFolder(this.assetsFolder);

    // Crear carpeta con fecha y formato
    const timestamp = this.getFormattedDate();
    const folderName = customName || `${timestamp}_${format}`;
    const folderPath = path.join(this.assetsFolder, folderName);

    await this.ensureFolder(folderPath);

    // Subcarpeta para las imágenes crudas (FLUX o copiadas), igual que el flujo de SKILL.md
    await this.ensureFolder(path.join(folderPath, 'flux-raw'));

    console.log(`📁 Asset folder creada: ${path.relative(this.projectPath, folderPath)}`);

    return folderPath;
  }

  async saveManifest(assetFolder, metadata) {
    // Derivar los parámetros reales de generación del modelo usado, no hardcodear.
    // Debe mantenerse en sincronía con lib/fluxClient.js (createPrediction).
    const model = metadata.images?.[0]?.model || process.env.FLUX_MODEL || 'schnell';
    const generation = {
      model: `flux-${model}`,
      steps: model === 'schnell' ? 4 : 50,
      guidance_scale: model === 'schnell' ? 1.0 : 3.5,
      width: 1080,
      height: 1350,
    };

    const manifest = {
      created: new Date().toISOString(),
      format: metadata.format,
      topic: metadata.topic,
      slides: metadata.slides,
      caption: metadata.caption ?? null,

      brand_analysis: {
        colors: metadata.brandData?.colors || {},
        fonts: metadata.brandData?.fonts || {},
        tone: metadata.brandData?.tone || 'professional',
        aesthetic: metadata.brandData?.aesthetic || 'modern',
        recommended_image_type: metadata.brandData?.recommendedImageType,
      },

      generation,

      prompts: metadata.prompts?.map(p => ({
        index: p.index,
        type: p.type,
        strategy: p.strategy,
        prompt: p.prompt,
        guidelines: p.guidelines,
      })) || [],

      images: metadata.images?.map(img => ({
        index: img.index,
        type: img.type,
        path: path.relative(assetFolder, img.path),
        timestamp: img.timestamp,
      })) || [],

      performance_metrics: {
        estimated_ctr: this.estimateCTR(metadata.format),
        primary_action: this.getPrimaryAction(metadata.format),
        accessibility: 'WCAG AA',
      },
    };

    const manifestPath = path.join(assetFolder, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`📋 Manifest guardado: ${path.relative(this.projectPath, manifestPath)}`);

    return manifest;
  }

  async saveGenerationLog(assetFolder, log) {
    const logPath = path.join(assetFolder, 'GENERATION_LOG.md');

    const logContent = `# Generation Log

Generated: ${new Date().toISOString()}

## Format
${log.format}

## Topic
${log.topic}

## Prompts Used
${log.prompts
  ?.map(
    (p, i) => `
### Slide ${i + 1} (${p.type})
\`\`\`
${p.prompt}
\`\`\`
`
  )
  .join('\n')}

## Generated Images
${log.images
  ?.map(
    (img, i) => `
- Slide ${i + 1}: \`${img.path}\`
  - Type: ${img.type}
  - Generated: ${img.timestamp}
`
  )
  .join('\n')}

## Notes
${log.notes || 'N/A'}

---
Generated with Marketing Image Skill for Claude Code
`;

    await fs.writeFile(logPath, logContent);

    return logPath;
  }

  async ensureFolder(folderPath) {
    try {
      await fs.mkdir(folderPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  getFormattedDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}_${hours}${minutes}`;
  }

  estimateCTR(format) {
    const ctrEstimates = {
      'instagram-carousel': '3-5%',
      'linkedin-post': '2-4%',
      'twitter-post': '1-3%',
      'instagram-story': '5-10%',
      'facebook-ad': '2-5%',
    };

    return ctrEstimates[format] || '2-4%';
  }

  getPrimaryAction(format) {
    const actions = {
      'instagram-carousel': 'swipe',
      'linkedin-post': 'click',
      'twitter-post': 'retweet',
      'instagram-story': 'tap',
      'facebook-ad': 'click',
    };

    return actions[format] || 'click';
  }

  async listAssets() {
    try {
      const items = await fs.readdir(this.assetsFolder, { withFileTypes: true });

      const assets = items
        .filter(item => item.isDirectory())
        .map(item => ({
          name: item.name,
          path: path.join(this.assetsFolder, item.name),
        }))
        .sort((a, b) => b.name.localeCompare(a.name));

      return assets;
    } catch {
      return [];
    }
  }

  async getAssetDetails(assetFolderName) {
    const assetPath = path.join(this.assetsFolder, assetFolderName);

    try {
      const manifestPath = path.join(assetPath, 'manifest.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

      return manifest;
    } catch {
      return null;
    }
  }
}
