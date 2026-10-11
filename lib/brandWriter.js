import fs from 'fs/promises';
import path from 'path';
import { ImageScanner } from './imageScanner.js';
import { DEFAULT_BANK_DIR } from './imageBank.js';
import { isHex, normalizeHex } from './colorUtils.js';

/**
 * Escribe brand.json con el schema de editor-pro-max a partir del análisis del proyecto
 * y del escaneo de imágenes. No sobrescribe uno existente salvo con `force`; en ese caso
 * conserva lo que el escaneo no puede inferir (estilo, formato, reglas_aprendidas).
 */
export async function writeBrandJson(projectPath, analysis, { force = false } = {}) {
  const target = path.join(projectPath, 'brand.json');
  let existing = null;
  try {
    existing = JSON.parse(await fs.readFile(target, 'utf-8'));
  } catch (err) {
    if (err.code !== 'ENOENT') existing = {}; // existe pero no es JSON válido
  }
  if (existing && !force) {
    return { written: false, path: target, reason: 'brand.json ya existe (usa --force para sobrescribir)' };
  }

  const scan = await new ImageScanner(projectPath).scan();
  const roles = ImageScanner.assignRoles(scan.colors);

  // Sin colores medibles: usar los del análisis (tailwind / CSS) si los hay
  const fromAnalysis = key => (isHex(analysis.colors?.[key]) ? normalizeHex(analysis.colors[key]) : null);
  const colores = {
    fondo: scan.colors.length ? roles.fondo : (fromAnalysis('background') ?? '#FFFFFF'),
    tinta: scan.colors.length ? roles.tinta : (fromAnalysis('primary') ?? '#1A1A1A'),
    acento: roles.acento ?? fromAnalysis('accent') ?? '',
    acento_claro: roles.acento_claro ?? fromAnalysis('secondary') ?? '',
  };

  const toneFromDocs = analysis.sources?.includes('README/docs') || analysis.sources?.includes('brand.json');
  const brand = {
    marca: {
      nombre: existing?.marca?.nombre ?? path.basename(path.resolve(projectPath)),
      tagline: existing?.marca?.tagline ?? '',
      colores,
      tipografia: {
        titulo: analysis.fonts?.heading ?? analysis.fonts?.main ?? '',
        texto: analysis.fonts?.body ?? analysis.fonts?.main ?? '',
      },
      tono: toneFromDocs ? analysis.tone : '',
      logo: scan.logo ?? '',
      logo_vector: scan.logoVector ?? '',
    },
    assets: {
      imagenes: scan.images.slice(0, 50),
      generados: existing?.assets?.generados ?? `${DEFAULT_BANK_DIR}/`,
    },
    formato: existing?.formato ?? { principal: '9:16', tambien: ['16:9', '4:5'], duracion_tipica: '30-45s' },
    estilo: existing?.estilo ?? {
      nombre: '',
      familia_easing: 'ease-in-out',
      desfase_capas_s: 0.2,
      cadencia: 'fluido',
      marca_de_agua: { mostrar: true, posicion: 'arriba-izq', opacidad: 0.58 },
      scrim: true,
      remate_fijo_s: 0.6,
    },
    reglas_aprendidas: existing?.reglas_aprendidas ?? [],
    actualizado: new Date().toISOString().slice(0, 10),
  };

  await fs.writeFile(target, JSON.stringify(brand, null, 2) + '\n', 'utf-8');
  return { written: true, path: target, brand, scan };
}
