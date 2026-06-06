import fs from 'fs/promises';
import path from 'path';

import { getDimensions, FORMATS } from './formats.js';
import { generatePageHTML } from './compositor.js';
import { renderSlide, checkRenderer } from './renderer.js';
import { fromTemplate, listTemplates, TEMPLATES } from './templates/index.js';

export { listTemplates, checkRenderer, fromTemplate };

/**
 * Renderiza un DesignSpec completo (todas sus pages) a PNG files.
 *
 * @param {object} spec          DesignSpec
 * @param {string} outputFolder  Carpeta donde guardar los PNG
 * @param {object} [opts]
 *   @param {number}  [opts.scale=1]      1 = normal, 2 = retina/2x
 *   @param {boolean} [opts.saveHTML]     Guardar HTML intermedio para debug
 *   @param {string}  [opts.projectPath]  Ruta del proyecto (para alias 'project:...')
 *   @param {string}  [opts.prefix]       Prefijo para nombres de archivo ('slide')
 * @returns {Promise<{ pngs: string[], htmls: string[] }>}
 */
export async function render(spec, outputFolder, opts = {}) {
  const {
    scale      = 1,
    saveHTML   = false,
    projectPath = '',
    prefix     = 'slide',
  } = opts;

  if (!outputFolder) throw new Error('outputFolder requerido');
  await fs.mkdir(outputFolder, { recursive: true });

  const rendererInfo = await checkRenderer();
  if (!rendererInfo.available) {
    throw new Error(`Renderer no disponible: ${rendererInfo.message}\nInstalar: ${rendererInfo.install}`);
  }

  const format = spec.format ?? 'instagram-carousel';
  const { width, height } = getDimensions(format);
  const brand = spec.brand ?? {};

  const overrideW = spec.width  ?? width;
  const overrideH = spec.height ?? height;

  const results = { pngs: [], htmls: [] };

  for (let i = 0; i < spec.pages.length; i++) {
    const page     = spec.pages[i];
    const pageNum  = String(i + 1).padStart(2, '0');
    const baseName = `${prefix}-${pageNum}`;

    console.log(`🎨 Renderizando página ${i + 1}/${spec.pages.length}...`);

    const html = await generatePageHTML(page, {
      width: overrideW,
      height: overrideH,
      brand,
      format,
      outputFolder,
      projectPath,
    });

    if (saveHTML) {
      const htmlPath = path.join(outputFolder, `${baseName}.html`);
      await fs.writeFile(htmlPath, html, 'utf-8');
      results.htmls.push(htmlPath);
      console.log(`   📄 HTML: ${baseName}.html`);
    }

    const pngPath = path.join(outputFolder, `${baseName}.png`);
    await renderSlide(html, {
      width:  overrideW * scale,
      height: overrideH * scale,
      outputPath: pngPath,
      scale,
    });

    results.pngs.push(pngPath);
    console.log(`   ✅ PNG: ${baseName}.png`);
  }

  return results;
}

/**
 * Genera HTML de preview sin renderizar (para abrir en browser).
 * Devuelve el HTML de la primera página.
 *
 * @param {object} spec         DesignSpec
 * @param {object} [opts]       { outputFolder, projectPath }
 * @returns {Promise<string>}   HTML string
 */
export async function preview(spec, opts = {}) {
  const format = spec.format ?? 'instagram-carousel';
  const { width, height } = getDimensions(format);
  const brand = spec.brand ?? {};
  const page  = spec.pages?.[0] ?? { background: { type: 'solid', color: '#0f0f0f' }, elements: [] };

  return generatePageHTML(page, {
    width:  spec.width  ?? width,
    height: spec.height ?? height,
    brand,
    format,
    outputFolder: opts.outputFolder ?? '',
    projectPath:  opts.projectPath  ?? '',
  });
}

/**
 * Devuelve la lista de formatos disponibles con dimensiones.
 */
export function listFormats() {
  return Object.entries(FORMATS).map(([name, { width, height, label }]) => ({
    name, width, height, label,
  }));
}
