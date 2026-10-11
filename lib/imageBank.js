import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export const DEFAULT_BANK_DIR = 'Graficas/ai-generadas';

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif)$/i;

/**
 * Extrae la carpeta del banco de `assets.generados` de un brand.json.
 * Acepta una ruta ("Graficas/ai-generadas/"), un objeto { banco | ruta | dir }, o un array
 * en el que la ruta convive con los registros de imágenes que anota editor-pro-max
 * (las entradas que son archivos de imagen u objetos sin ruta de carpeta se ignoran).
 */
export function bankDirFromBrand(brand) {
  const gen = brand?.assets?.generados;
  const fromEntry = e => {
    if (typeof e === 'string') return IMAGE_EXT.test(e) ? null : e;
    if (e && typeof e === 'object') return e.banco ?? e.ruta ?? e.dir ?? null;
    return null;
  };
  if (Array.isArray(gen)) return gen.map(fromEntry).find(Boolean) ?? null;
  return fromEntry(gen);
}

/**
 * Gestiona el banco único de imágenes reutilizables del proyecto.
 * Por defecto Graficas/ai-generadas/; brand.json puede declararlo en assets.generados.
 * Lo comparten marketing-image (carruseles) y editor-pro-max (tipo 2, explainers).
 */
export class ImageBank {
  constructor(projectPath, bankDir = DEFAULT_BANK_DIR) {
    this.projectPath = projectPath;
    this.bankDir = path.resolve(projectPath, bankDir);
    this.manifestPath = path.join(this.bankDir, 'manifest.json');
  }

  /** Crea el banco usando la ruta declarada en brand.json, si la hay. */
  static async forProject(projectPath) {
    for (const file of ['brand.json', 'src/brand.json']) {
      try {
        const brand = JSON.parse(await fs.readFile(path.join(projectPath, file), 'utf-8'));
        const dir = bankDirFromBrand(brand);
        if (dir) return new ImageBank(projectPath, dir);
      } catch { /* sin brand.json o JSON inválido */ }
    }
    return new ImageBank(projectPath);
  }

  /**
   * Buscar imágenes compatibles en el banco por tema y tags
   * @param {string} topic — tema a buscar (ej: "cosmos", "geometria sagrada")
   * @param {string[]} tags — tags opcionales para filtrar
   * @returns {Promise<object[]>} array de imágenes que coinciden
   */
  async search(topic, tags = []) {
    try {
      const manifest = await this._loadManifest();
      if (!manifest.images || manifest.images.length === 0) return [];

      const topicLower = topic.toLowerCase();
      const tagSet = new Set(tags.map(t => t.toLowerCase()));

      return manifest.images.filter(img => {
        // Coincidencia por nombre de archivo o tema en metadata
        const nameMatch = img.file.toLowerCase().includes(topicLower);

        // Si se especificaron tags, filtrar por ellos
        if (tags.length > 0) {
          const imgTags = (img.tags || []).map(t => t.toLowerCase());
          const hasTag = imgTags.some(t => tagSet.has(t));
          return nameMatch || hasTag;
        }

        return nameMatch;
      });
    } catch (err) {
      return [];
    }
  }

  /**
   * Registrar una imagen generada en el banco
   * @param {object} imageData — { url, prompt, tags, tipo (hero/body/cta) }
   * @returns {Promise<object>} imagen registrada
   */
  async register(imageData) {
    const {
      url, prompt, tags = [], tipo = 'hero', tema = 'unlabeled',
      width = 1080, height = 1350, modelo = 'flux-schnell',
    } = imageData;

    // Crear directorio si no existe
    await fs.mkdir(this.bankDir, { recursive: true });

    // Descargar imagen y guardar localmente
    const filename = `${tema}-${tipo}-${Date.now()}.webp`;
    const filepath = path.join(this.bankDir, filename);

    // Fetch y guardar (simulado aquí — en producción usar curl)
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    await fs.writeFile(filepath, Buffer.from(buffer));

    // Crear entry para manifest
    const entry = {
      file: filename,
      path: path.relative(this.projectPath, filepath),
      prompt,
      fecha: new Date().toISOString(),
      tags: tags || [],
      dimensiones: { width, height },
      modelo,
      checksum: crypto.createHash('md5').update(buffer).digest('hex'),
      url,
      uso: []
    };

    // Agregar al manifest
    const manifest = await this._loadManifest();
    if (!manifest.images) manifest.images = [];
    manifest.images.push(entry);
    await this._saveManifest(manifest);

    return entry;
  }

  /**
   * Registrar uso de una imagen (vinculación a un carrusel generado)
   */
  async recordUsage(imageFile, usageContext) {
    const manifest = await this._loadManifest();
    const img = manifest.images?.find(i => i.file === imageFile);
    if (img) {
      if (!img.uso) img.uso = [];
      img.uso.push(usageContext);
      await this._saveManifest(manifest);
    }
  }

  /**
   * Obtener estadísticas del banco
   */
  async getStats() {
    const manifest = await this._loadManifest();
    const images = manifest.images || [];
    const tags = new Map();
    const temas = new Map();

    images.forEach(img => {
      (img.tags || []).forEach(tag => {
        tags.set(tag, (tags.get(tag) || 0) + 1);
      });
      const tema = img.file.split('-')[0];
      temas.set(tema, (temas.get(tema) || 0) + 1);
    });

    return {
      totalImages: images.length,
      tags: Object.fromEntries(tags),
      temas: Object.fromEntries(temas),
      lastUpdate: manifest.lastUpdate,
      estimatedCost: images.length * 0.003
    };
  }

  /**
   * Cargar manifest.json
   */
  async _loadManifest() {
    try {
      const content = await fs.readFile(this.manifestPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {
        version: '1.0',
        images: [],
        created: new Date().toISOString(),
        lastUpdate: new Date().toISOString()
      };
    }
  }

  /**
   * Guardar manifest.json
   */
  async _saveManifest(manifest) {
    manifest.lastUpdate = new Date().toISOString();
    await fs.mkdir(this.bankDir, { recursive: true });
    await fs.writeFile(
      this.manifestPath,
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );
  }
}
