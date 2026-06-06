import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif'];

/**
 * Resuelve la ruta/URL real de una imagen para usar en el diseño.
 *
 * Aliases soportados:
 *   'flux:hero'     → busca en outputFolder/flux-raw/slide-*-hero.webp
 *   'flux:body'     → busca en outputFolder/flux-raw/slide-*-body.webp
 *   'flux:cta'      → busca en outputFolder/flux-raw/slide-*-cta.webp
 *   'project:path'  → busca en projectPath/path
 *   'url:https://…' → URL externa (usada directamente)
 *   './path'        → ruta relativa al outputFolder
 *   '/absolute'     → ruta absoluta
 */
export async function resolveImageSrc(src, { projectPath = '', outputFolder = '' } = {}) {
  if (!src) return '';

  // URL externa
  if (src.startsWith('url:')) return src.slice(4);
  if (src.startsWith('http://') || src.startsWith('https://')) return src;

  // Alias de FLUX
  if (src.startsWith('flux:')) {
    const type = src.slice(5); // 'hero' | 'body' | 'cta'
    return findFluxImage(outputFolder, type);
  }

  // Alias de proyecto
  if (src.startsWith('project:')) {
    const rel = src.slice(8);
    return path.resolve(projectPath, rel);
  }

  // Ruta relativa al outputFolder
  if (src.startsWith('./') || src.startsWith('../')) {
    return path.resolve(outputFolder, src);
  }

  // Ruta absoluta
  if (path.isAbsolute(src)) return src;

  // Fallback: relativo al outputFolder
  return path.resolve(outputFolder, src);
}

/**
 * Busca el archivo de imagen FLUX en flux-raw/ por tipo de slide.
 */
async function findFluxImage(outputFolder, type) {
  if (!outputFolder) return '';
  const rawDir = path.join(outputFolder, 'flux-raw');

  try {
    const files = await fs.readdir(rawDir);
    // Buscar: slide-*-{type}.*
    const match = files.find(f => {
      const lower = f.toLowerCase();
      return lower.includes(`-${type}.`) || lower.includes(`-${type}-`);
    });
    if (match) return path.join(rawDir, match);

    // Fallback: primer archivo del tipo en orden numérico
    const typeIndex = { hero: 0, body: 1, cta: 2 };
    const idx = typeIndex[type] ?? 0;
    const sorted = files
      .filter(f => IMAGE_EXTS.includes(path.extname(f).toLowerCase()))
      .sort();
    if (sorted[idx]) return path.join(rawDir, sorted[idx]);
  } catch {
    // rawDir no existe
  }

  return '';
}

/**
 * Escanea flux-raw/ y devuelve las imágenes disponibles con sus tipos inferidos.
 */
export async function listFluxImages(outputFolder) {
  const rawDir = path.join(outputFolder, 'flux-raw');
  try {
    const files = await fs.readdir(rawDir);
    return files
      .filter(f => IMAGE_EXTS.includes(path.extname(f).toLowerCase()))
      .map(f => {
        const lower = f.toLowerCase();
        let type = 'unknown';
        if (lower.includes('hero') || lower.includes('slide-1')) type = 'hero';
        else if (lower.includes('body') || lower.includes('slide-2')) type = 'body';
        else if (lower.includes('cta') || lower.includes('slide-3')) type = 'cta';
        return { file: f, path: path.join(rawDir, f), type };
      });
  } catch {
    return [];
  }
}

/**
 * Escanea el proyecto y devuelve imágenes clasificadas por tipo de contenido.
 */
export async function listProjectImages(projectPath) {
  const dirs = ['public', 'assets', 'images', 'img', 'static', 'src/assets', 'public/images'];
  const results = [];

  for (const dir of dirs) {
    const dirPath = path.join(projectPath, dir);
    try {
      const files = await glob(path.join(dirPath, '**/*'), {
        nodir: true,
        ignore: ['**/node_modules/**', '**/.git/**', '**/marketing-assets/**'],
      });

      for (const file of files) {
        if (!IMAGE_EXTS.includes(path.extname(file).toLowerCase())) continue;
        const relative = path.relative(projectPath, file);
        results.push({
          path: file,
          relative,
          type: classifyImage(relative),
        });
      }
    } catch {
      continue;
    }
  }

  return results;
}

function classifyImage(relativePath) {
  const lower = relativePath.toLowerCase();
  if (/gallery|fotos|photos|shows|concierto|performance/.test(lower)) return 'performance';
  if (/about|profile|team|bio|portrait/.test(lower)) return 'identity';
  if (/logo|brand|favicon|icon|mark/.test(lower)) return 'brand';
  if (/blog|content|posts|editorial/.test(lower)) return 'editorial';
  return 'generic';
}
