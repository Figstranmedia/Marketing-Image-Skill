#!/usr/bin/env node

/**
 * Genera imágenes FLUX y devuelve sus URLs públicas como JSON.
 *
 * Punto de entrada que usa Cowork (ver SKILL.md, Step 4). Delega toda la
 * lógica de Replicate en FluxClient (lib/fluxClient.js) — una sola fuente de
 * verdad REST, compartida con el flujo del CLI.
 *
 * Uso:
 *   node scripts/generate_flux_urls.js '[{"type":"hero","prompt":"..."}]'
 *
 *   Cada item acepta width/height (default 1080x1350). Para 9:16: 1080x1920.
 *
 *   --bank <project_path> [--tema nombre] [--tags a,b]
 *     Descarga cada imagen al banco único del proyecto (brand.json → assets.generados,
 *     o Graficas/ai-generadas/) y la registra en su manifest.json. Lo usa también
 *     editor-pro-max (tipo 2) para no tener un segundo cliente de Replicate.
 */

import 'dotenv/config.js';
import { FluxClient } from '../lib/fluxClient.js';
import { ImageBank } from '../lib/imageBank.js';

const DELAY_BETWEEN_REQUESTS = 12000; // 12s — evita rate limit en cuentas < $5

async function main() {
  const args = process.argv.slice(2);
  const flag = name => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : null;
  };
  const bankPath = flag('--bank');
  const tema = flag('--tema') || 'unlabeled';
  const tags = (flag('--tags') || '').split(',').map(s => s.trim()).filter(Boolean);

  if (args.length === 0) {
    console.error('❌ Uso: node scripts/generate_flux_urls.js \'[{"type":"hero","prompt":"..."}]\'');
    process.exit(1);
  }

  let promptsData;
  try {
    promptsData = JSON.parse(args[0]);
  } catch (e) {
    console.error('❌ JSON inválido:', e.message);
    process.exit(1);
  }

  if (!Array.isArray(promptsData) || promptsData.length === 0) {
    console.error('❌ Debe ser un array con al menos un objeto {type, prompt}');
    process.exit(1);
  }

  const flux = new FluxClient();
  if (!flux.isAvailable()) {
    console.error('❌ REPLICATE_API_TOKEN no configurado en .env');
    process.exit(1);
  }

  const bank = bankPath ? await ImageBank.forProject(bankPath) : null;

  console.log(`\n🎨 Generando ${promptsData.length} imágenes con FLUX ${flux.model}...\n`);

  const images = [];

  try {
    for (let i = 0; i < promptsData.length; i++) {
      const { type, prompt, width = 1080, height = 1350 } = promptsData[i];

      if (i > 0) {
        console.log(`   ⏳ Esperando ${DELAY_BETWEEN_REQUESTS / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
      }

      console.log(`⏳ Slide ${i + 1}/${promptsData.length} (${type}): Generando con FLUX ${flux.model}...`);
      const url = await flux.generateImage(prompt, width, height);
      console.log(`   ✅ Imagen generada: ${type}`);

      const image = {
        type,
        url,
        width,
        height,
        timestamp: new Date().toISOString(),
        model: flux.model,
      };

      if (bank) {
        const entry = await bank.register({
          url, prompt, tags, tipo: type, tema, width, height, modelo: `flux-${flux.model}`,
        });
        image.bankPath = entry.path;
        console.log(`   💾 Banco: ${entry.path}`);
      }

      images.push(image);
    }

    console.log(`\n✅ ${images.length} imágenes generadas exitosamente\n`);

    console.log(JSON.stringify({
      success: true,
      model: flux.model,
      generated: images.length,
      images,
      timestamp: new Date().toISOString(),
    }, null, 2));
  } catch (error) {
    console.error('\n❌ Error durante generación:', error.message);
    process.exit(1);
  }
}

main();
