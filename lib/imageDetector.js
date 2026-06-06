import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

export class ImageDetector {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];
    this.imageDirectories = [
      'public',
      'assets',
      'images',
      'img',
      'static',
      'dist',
      'build',
      'src/assets',
      'public/images',
    ];
  }

  async findProjectImages() {
    const images = [];

    // Buscar en directorios comunes
    for (const dir of this.imageDirectories) {
      const dirPath = path.join(this.projectPath, dir);
      try {
        const pattern = path.join(dirPath, '**/*');
        const files = await glob(pattern, {
          nodir: true,
          ignore: ['**/node_modules/**', '**/.git/**'],
        });

        for (const file of files) {
          if (this.isImageFile(file)) {
            const relative = path.relative(this.projectPath, file);
            const stats = await fs.stat(file);

            images.push({
              path: file,
              relative,
              size: stats.size,
              modified: stats.mtime,
              ext: path.extname(file),
            });
          }
        }
      } catch {
        continue;
      }
    }

    // Deduplicar y ordenar por reciente
    const unique = new Map();
    images.forEach(img => {
      if (!unique.has(img.path)) {
        unique.set(img.path, img);
      }
    });

    return Array.from(unique.values())
      .sort((a, b) => b.modified - a.modified)
      .slice(0, 50); // Máximo 50 imágenes
  }

  async findBrandAssets() {
    // Buscar logo, icono, o assets específicos
    const patterns = [
      '**/logo*',
      '**/brand*',
      '**/icon*',
      '**/mark*',
      '**/favicon*',
    ];

    const assets = [];

    for (const pattern of patterns) {
      try {
        const files = await glob(path.join(this.projectPath, pattern), {
          nodir: true,
          ignore: ['**/node_modules/**'],
        });

        for (const file of files) {
          if (this.isImageFile(file)) {
            assets.push({
              type: this.classifyAsset(file),
              path: file,
              relative: path.relative(this.projectPath, file),
            });
          }
        }
      } catch {
        continue;
      }
    }

    return assets;
  }

  async getImageDimensions(imagePath) {
    // Placeholder: podría usar sharp para obtener dimensiones reales
    return { width: 1080, height: 1080 };
  }

  isImageFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.imageExtensions.includes(ext);
  }

  classifyAsset(filePath) {
    const fileName = path.basename(filePath).toLowerCase();

    if (fileName.includes('logo')) return 'logo';
    if (fileName.includes('icon')) return 'icon';
    if (fileName.includes('brand')) return 'brand';
    if (fileName.includes('mark')) return 'mark';

    return 'other';
  }

  async suggestImageForSlide(slideIndex, brandAnalysis) {
    // Sugerir si usar imagen existente o generar
    const existingImages = await this.findProjectImages();

    if (existingImages.length === 0) {
      return {
        recommendation: 'generate',
        reason: 'No existing images found',
      };
    }

    // Preferencia: usar imagen existente para slide de presentación si existe
    if (slideIndex === 0 && existingImages.length > 0) {
      return {
        recommendation: 'use-existing',
        image: existingImages[0],
        reason: 'High-quality hero image available',
      };
    }

    return {
      recommendation: 'generate',
      reason: 'Better fit for marketing rules',
    };
  }
}
