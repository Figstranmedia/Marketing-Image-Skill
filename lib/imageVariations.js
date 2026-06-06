import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

/**
 * Aplica variaciones a imágenes existentes sin consumir Replicate
 * Soporta: brightness, contrast, filtros CSS (via HTML/Puppeteer)
 */
export class ImageVariations {
  /**
   * Aplicar ajustes a una imagen existente
   * @param {string} inputPath — ruta a imagen original
   * @param {object} params — { brightness: 0-200, contrast: 0-200, filter: "grayscale|sepia|saturate(1.4)" }
   * @param {string} outputPath — dónde guardar la variación
   */
  static async applyAdjustments(inputPath, params, outputPath) {
    let image = sharp(inputPath);

    const { brightness = 100, contrast = 100, filter = null, format = 'webp' } = params;

    // Validar parámetros
    const b = Math.max(0, Math.min(200, brightness));
    const c = Math.max(0, Math.min(200, contrast));

    // Aplicar brightness y contrast via sharp
    if (b !== 100 || c !== 100) {
      // Normalizar a rango -1 a 1 para sharp
      const normalizedBrightness = (b - 100) / 100;
      const normalizedContrast = (c - 100) / 100;

      image = image
        .modulate({
          brightness: 1 + (normalizedBrightness * 0.5), // 0.5 - 1.5
          saturation: 1 + (normalizedContrast * 0.3)    // suavizar contraste
        });
    }

    // Aplicar filtros CSS-like
    if (filter) {
      image = this._applyFilter(image, filter);
    }

    // Guardar en formato especificado
    await image.toFile(outputPath);
    return outputPath;
  }

  /**
   * Aplicar filtro CSS-like
   */
  static _applyFilter(image, filterStr) {
    if (filterStr.includes('grayscale')) {
      image = image.grayscale();
    }
    if (filterStr.includes('sepia')) {
      // Sepia: escala de grises + tinte marrón
      image = image.tint({ r: 112, g: 66, b: 20 });
    }
    if (filterStr.includes('saturate')) {
      const match = filterStr.match(/saturate\(([\d.]+)\)/);
      if (match) {
        const saturation = parseFloat(match[1]);
        image = image.modulate({ saturation });
      }
    }
    if (filterStr.includes('blur')) {
      const match = filterStr.match(/blur\(([\d.]+)px\)/);
      if (match) {
        const sigma = parseFloat(match[1]);
        image = image.blur(sigma);
      }
    }
    return image;
  }

  /**
   * Generar HTML con la imagen aplicando filtros CSS directamente
   * (Más flexible que sharp para efectos complejos)
   */
  static generateHTML(imagePath, format, width, height, cssFilters = '') {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; }
    body { width: ${width}px; height: ${height}px; overflow: hidden; }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      ${cssFilters ? `filter: ${cssFilters};` : ''}
    }
  </style>
</head>
<body>
  <img src="file://${imagePath}" alt="variation">
</body>
</html>`;
  }
}
