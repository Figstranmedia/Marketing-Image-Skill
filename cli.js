#!/usr/bin/env node

import 'dotenv/config.js';
import { MarketingImageSkill } from './index.js';
import { render, preview, listFormats, listTemplates, fromTemplate, checkRenderer } from './lib/designEngine/index.js';
import { ProjectAnalyzer } from './lib/projectAnalyzer.js';
import { Copywriter } from './lib/copywriter.js';
import { ImageBank } from './lib/imageBank.js';
import { ImageVariations } from './lib/imageVariations.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Parsing inteligente de argumentos
  let projectPath = process.cwd();
  let format = 'instagram-carousel';
  let topic = 'brand story';
  let isDryRun = false;
  let useLocal = false;
  let isJson = false;

  // Detectar flags
  isDryRun = args.includes('--dry-run');
  useLocal = args.includes('--local');
  isJson = args.includes('--json');
  const useReuse = args.includes('--reuse');
  const variationIdx = args.indexOf('--variation');
  const variationPath = variationIdx >= 0 ? args[variationIdx + 1] : null;
  const batchIdx = args.indexOf('--batch');
  const batchNum = batchIdx >= 0 ? parseInt(args[batchIdx + 1], 10) : 3;
  const tagsIdx = args.indexOf('--tags');
  const tagsStr = tagsIdx >= 0 ? args[tagsIdx + 1] : '';
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()) : [];

  // Si el comando requiere argumentos adicionales
  if (['generate', 'analyze', 'init', 'list'].includes(command)) {
    // Detectar si args[1] es un path o un formato
    if (args[1]) {
      // Si empieza con / o ~, es un path
      if (args[1].startsWith('/') || args[1].startsWith('~')) {
        projectPath = args[1];
        if (args[2]) format = args[2];
        if (args[3]) topic = args[3];
      } else if (['instagram-carousel', 'linkedin-post', 'twitter-post', 'instagram-story', 'facebook-ad'].includes(args[1])) {
        // Si es un formato conocido, usar path por defecto
        format = args[1];
        if (args[2]) topic = args[2];
      } else {
        // Asumir que es un path
        projectPath = args[1];
        if (args[2]) format = args[2];
        if (args[3]) topic = args[3];
      }
    }
  }

  const skill = new MarketingImageSkill(projectPath, useLocal);

  // En modo JSON, redirigir logs a stderr para que stdout solo tenga el JSON final
  if (isJson) {
    console.log = (...args) => process.stderr.write(args.join(' ') + '\n');
  }

  try {
    switch (command) {
      case 'init':
        console.log('🎨 Inicializando skill...\n');
        const analysis = await skill.init();
        console.log('\n✅ Listo para generar assets');
        break;

      case 'analyze':
        console.log('📊 Analizando proyecto...\n');
        const style = await skill.analyzeProjectStyle();
        console.log('Color Palette:', style.colors);
        console.log('Tone:', style.tone);
        console.log('Aesthetic:', style.aesthetic);
        console.log(
          'Suggested Image Type:',
          style.suggestedImageType
        );
        break;

      case 'suggest':
        const suggestFormat = args[1] || 'instagram-carousel';
        const suggestion = await skill.suggestImageType(suggestFormat);
        console.log(`\n📸 Recomendación para ${suggestFormat}:\n`);
        console.log(`Tipo: ${suggestion.recommended}`);
        console.log(`Descripción: ${suggestion.description}`);
        console.log(`Elementos seguros: ${suggestion.suggestedImageType.join(', ')}`);
        break;

      case 'generate':
        const generatorType = useLocal ? '🖥️  ComfyUI local' : '☁️  Replicate cloud';
        const slideCount = batchNum || 3;
        console.log(`\n🚀 Generando ${format} (${generatorType})\n`);
        if (batchNum && batchNum > 3) {
          console.log(`📸 Modo banco: generando ${batchNum} imágenes`);
          if (tags.length > 0) console.log(`🏷️  Tags: ${tags.join(', ')}`);
        }
        const result = await skill.generateCarousel({
          format,
          topic,
          slides: slideCount,
          useExisting: false,
          dryRun: isDryRun,
          tags: tags,
        });

        if (isDryRun) {
          console.log('✅ Preview generado (no se crearon imágenes)');
          if (isJson) {
            process.stdout.write(JSON.stringify({
              success: true,
              dryRun: true,
              prompts: result.prompts?.map(p => ({ type: p.type, prompt: p.prompt })) || [],
            }, null, 2) + '\n');
          }
        } else {
          console.log('\n✅ Carrusel generado');
          console.log(`📁 Ruta: ${result.assetFolder}`);
          if (isJson) {
            process.stdout.write(JSON.stringify({
              success: true,
              assetFolder: result.assetFolder,
              images: result.images?.map(img => ({
                type: img.type,
                path: img.path,
                relative: img.relative,
                model: img.model,
                source: img.source,
                timestamp: img.timestamp,
              })) || [],
              prompts: result.prompts?.map(p => ({ type: p.type, prompt: p.prompt })) || [],
              caption: result.caption ?? null,
              timestamp: new Date().toISOString(),
            }, null, 2) + '\n');
          }
        }
        break;

      case 'test-comfyui':
        console.log('\n🖥️  Probando ComfyUI local...\n');
        const comfyuiTest = new (await import('./lib/comfyuiClient.js')).ComfyUIClient(
          process.env.COMFYUI_API_URL || 'http://localhost:8188'
        );
        const comfyuiAvailable = await comfyuiTest.isAvailable();
        if (!comfyuiAvailable) {
          console.log('❌ ComfyUI NO disponible en', process.env.COMFYUI_API_URL || 'http://localhost:8188');
          console.log('\nPara iniciar ComfyUI:');
          console.log('  cd ~/video-ai/ComfyUI');
          console.log('  python main.py');
        } else {
          const result = await comfyuiTest.testConnection();
          if (result.connected) {
            console.log('✅ ComfyUI conectado');
            console.log('   VRAM:', result.stats.system.ram_free / 1024 / 1024 / 1024, 'GB libre');
          } else {
            console.log('❌ Error:', result.error);
          }
        }
        break;

      case 'test-flux':
      case 'test-replicate':
        console.log('\n☁️  Probando FLUX en Replicate...\n');
        if (!skill.flux.isAvailable()) {
          console.log('❌ REPLICATE_API_TOKEN NO configurado');
          console.log('Necesitas:');
          console.log('  1. Sign up: https://replicate.com');
          console.log('  2. Copiar token API');
          console.log('  3. Crear .env con: REPLICATE_API_TOKEN=r8_xxxxx');
        } else {
          const fluxTest = await skill.flux.testConnection();
          if (fluxTest.connected) {
            console.log('✅ FLUX conectado y listo');
            console.log(`   Modelo: FLUX ${fluxTest.model}`);
            console.log(`   Costo: ${fluxTest.model === 'schnell' ? '$0.003' : '$0.04'} por imagen`);
          } else {
            console.log('❌ Error de conexión');
            console.log(`   ${fluxTest.error}`);
          }
        }
        break;

      case 'list':
        const assets = await skill.organizer.listAssets();
        if (assets.length === 0) {
          console.log('📭 No hay assets generados aún');
        } else {
          console.log('\n📁 Assets generados:\n');
          assets.forEach(asset => {
            console.log(`  ${asset.name}`);
          });
        }
        break;

      case 'design': {
        // node cli.js design [folder] [--template nombre] [--format formato]
        //                            [--scale 2] [--preview] [--debug-html]
        // args[0] = 'design', args[1] = folder (puede contener /), rest = flags
        const folder     = args[1];
        const templateIdx = args.indexOf('--template');
        const formatIdx   = args.indexOf('--format');
        const scaleIdx    = args.indexOf('--scale');
        const templateArg = templateIdx >= 0 ? args[templateIdx + 1] : null;
        const formatArg   = formatIdx   >= 0 ? args[formatIdx   + 1] : null;
        const scaleArg    = scaleIdx    >= 0 ? args[scaleIdx    + 1] : null;
        const isPreview   = args.includes('--preview');
        const debugHtml   = args.includes('--debug-html');
        const useCopy     = args.includes('--copy');
        const scale       = scaleArg ? parseInt(scaleArg, 10) : 1;
        const topicIdx    = args.indexOf('--topic');
        const topicArg    = topicIdx >= 0 ? args[topicIdx + 1] : null;

        if (!folder) {
          console.error('❌ Usa: node cli.js design <marketing-assets/fecha_formato> [--template nombre] [--scale 2] [--preview]');
          console.error('\nTemplates disponibles:');
          listTemplates().forEach(t => console.error(`  ${t.name.padEnd(20)} — ${t.desc}`));
          process.exit(1);
        }

        const outputFolder = path.resolve(projectPath, folder);

        // Leer manifest (opcional — fallback a 3 slides si no existe)
        const manifestPath = path.join(outputFolder, 'manifest.json');
        let manifest = null;
        try {
          manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
        } catch {
          console.log(`⚠️  Sin manifest.json — usando 3 slides por defecto (hero/body/cta)`);
        }

        const analyzer = new ProjectAnalyzer(projectPath);
        const brand = await analyzer.analyze();
        const slideFormat = formatArg || manifest?.format || 'instagram-carousel';
        const templateName = templateArg || 'full-bleed-image';

        console.log(`\n🎨 Design Engine — template: ${templateName}, formato: ${slideFormat}\n`);

        // Verificar renderer (salvo preview)
        if (!isPreview) {
          const rendInfo = await checkRenderer();
          if (!rendInfo.available) {
            console.error(`❌ ${rendInfo.message}`);
            console.error(`   Instalar: ${rendInfo.install}`);
            process.exit(1);
          }
          console.log(`   Renderer: ${rendInfo.message}\n`);
        }

        // Construir pages desde manifest: un DesignSpec por slide
        const slides = manifest?.prompts?.length ? manifest.prompts : [
          { type: 'hero', index: 0 },
          { type: 'body', index: 1 },
          { type: 'cta',  index: 2 },
        ];
        const slideTypes = slides.map(p => p.type || 'hero');

        // Generar copy real con Claude Haiku si se pidió --copy
        let copyData = null;
        if (useCopy) {
          const topic = topicArg || manifest?.topic || null;
          if (!topic) {
            console.error('❌ --copy requiere un tema. Usa --topic "tu tema" o asegúrate de que el manifest tenga "topic".');
            process.exit(1);
          }
          const cw = new Copywriter();
          if (!cw.isAvailable()) {
            console.error('❌ ANTHROPIC_API_KEY no configurado en .env');
            console.error('   Sin --copy el diseño usa placeholders. Agrega la clave para copy real.');
            process.exit(1);
          }
          console.log(`✍️  Generando copy para "${topic}"...\n`);
          copyData = await cw.generate(brand, topic, slideTypes, slideFormat);

          if (copyData.captions) {
            console.log('📝 Caption general:');
            console.log(`   "${copyData.captions.general}"\n`);
          }
        }

        const pages = [];
        for (let i = 0; i < slides.length; i++) {
          const p = slides[i];
          const slideType = p.type || 'hero';
          const copy = copyData?.slides?.[i];

          const contents = {
            title:           copy?.title    ?? `Slide ${i + 1}`,
            subtitle:        copy?.subtitle ?? '',
            label:           copy?.label    ?? `0${i + 1} / ${slideType.toUpperCase()}`,
            backgroundImage: `flux:${slideType}`,
            ctaText:         copy?.ctaText  ?? (slideType === 'cta' ? 'Comenzar ahora' : undefined),
          };
          const spec = fromTemplate(templateName, brand, contents, slideFormat);
          pages.push(...spec.pages);
        }

        const fullSpec = { format: slideFormat, brand, pages };

        if (isPreview) {
          const html = await preview(fullSpec, { outputFolder, projectPath });
          const previewPath = path.join(outputFolder, 'preview.html');
          await fs.writeFile(previewPath, html, 'utf-8');
          console.log(`✅ Preview guardado en: ${path.relative(projectPath, previewPath)}`);
          console.log(`   Abre en browser: open "${previewPath}"`);
          break;
        }

        const result = await render(fullSpec, outputFolder, {
          scale,
          saveHTML: debugHtml,
          projectPath,
          prefix: 'slide',
        });

        // Guardar captions en manifest si se generaron
        if (copyData?.captions) {
          const manifestPath2 = path.join(outputFolder, 'manifest.json');
          let mf = {};
          try { mf = JSON.parse(await fs.readFile(manifestPath2, 'utf-8')); } catch { /* no existe */ }
          mf.caption = copyData.captions;
          await fs.writeFile(manifestPath2, JSON.stringify(mf, null, 2));
        }

        console.log(`\n✅ ${result.pngs.length} slides renderizados`);
        result.pngs.forEach(p => console.log(`   📸 ${path.relative(projectPath, p)}`));
        if (result.htmls.length) result.htmls.forEach(h => console.log(`   📄 ${path.relative(projectPath, h)}`));

        if (copyData?.captions) {
          console.log('\n📝 Captions guardados en manifest.json:');
          console.log(`   Instagram: ${copyData.captions.instagram?.slice(0, 80)}...`);
          console.log(`   LinkedIn:  ${copyData.captions.linkedin?.slice(0, 80)}...`);
        }
        break;
      }

      case 'copy': {
        // node cli.js copy [folder] --topic "tema" [--template nombre] [--scale 2]
        const folder    = args[1];
        const topicIdx2  = args.indexOf('--topic');
        const topicArg2  = topicIdx2 >= 0 ? args[topicIdx2 + 1] : null;
        const tplIdx2    = args.indexOf('--template');
        const tplArg2    = tplIdx2 >= 0 ? args[tplIdx2 + 1] : null;
        const scaleIdx2  = args.indexOf('--scale');
        const scale2     = scaleIdx2 >= 0 ? parseInt(args[scaleIdx2 + 1], 10) : 1;

        if (!folder) {
          console.error('❌ Usa: node cli.js copy <marketing-assets/fecha_formato> --topic "tema"');
          process.exit(1);
        }

        const outputFolder2 = path.resolve(projectPath, folder);
        const manifestPath3 = path.join(outputFolder2, 'manifest.json');
        let manifest2 = null;
        try { manifest2 = JSON.parse(await fs.readFile(manifestPath3, 'utf-8')); } catch { /* ok */ }

        const topic2 = topicArg2 || manifest2?.topic;
        if (!topic2) {
          console.error('❌ Especifica el tema con --topic "texto del tema"');
          process.exit(1);
        }

        const cw2 = new Copywriter();
        if (!cw2.isAvailable()) {
          console.error('❌ ANTHROPIC_API_KEY no configurado en .env');
          process.exit(1);
        }

        const analyzer2 = new ProjectAnalyzer(projectPath);
        const brand2     = await analyzer2.analyze();
        const format2    = manifest2?.format || 'instagram-carousel';
        const template2  = tplArg2 || 'full-bleed-image';

        const slideTypes2 = manifest2?.prompts?.map(p => p.type) || ['hero', 'body', 'cta'];

        console.log(`\n✍️  Generando copy para "${topic2}"...\n`);
        const copyData2 = await cw2.generate(brand2, topic2, slideTypes2, format2);

        console.log('📝 Slides generados:');
        copyData2.slides.forEach((s, i) => {
          console.log(`   Slide ${i + 1} (${s.type}): "${s.title}"`);
          console.log(`            ${s.subtitle}`);
        });
        console.log('\n📣 Caption general:');
        console.log(`   "${copyData2.captions.general}"\n`);

        // Verificar renderer
        const rendInfo2 = await checkRenderer();
        if (!rendInfo2.available) {
          console.error(`❌ ${rendInfo2.message}`);
          process.exit(1);
        }

        // Construir y renderizar
        const pages2 = copyData2.slides.map((s, i) =>
          fromTemplate(template2, brand2, {
            title:           s.title,
            subtitle:        s.subtitle,
            label:           s.label,
            backgroundImage: `flux:${s.type}`,
            ctaText:         s.ctaText,
          }, format2).pages[0]
        );

        const result2 = await render(
          { format: format2, brand: brand2, pages: pages2 },
          outputFolder2,
          { scale: scale2, projectPath, prefix: 'slide' }
        );

        // Actualizar manifest
        const mf2 = manifest2 ?? {};
        mf2.caption = copyData2.captions;
        await fs.writeFile(manifestPath3, JSON.stringify(mf2, null, 2));

        console.log(`\n✅ ${result2.pngs.length} slides con copy real renderizados`);
        result2.pngs.forEach(p => console.log(`   📸 ${path.relative(projectPath, p)}`));
        console.log('\n📝 Captions guardados en manifest.json');
        break;
      }

      case 'variation': {
        // node cli.js variation [image-path] --brightness 110 --contrast 120 --filter "grayscale"
        const imagePath = args[1];
        const brightnessIdx = args.indexOf('--brightness');
        const contrastIdx = args.indexOf('--contrast');
        const filterIdx = args.indexOf('--filter');
        const outputIdx = args.indexOf('--output');

        const brightness = brightnessIdx >= 0 ? parseInt(args[brightnessIdx + 1], 10) : 100;
        const contrast = contrastIdx >= 0 ? parseInt(args[contrastIdx + 1], 10) : 100;
        const filter = filterIdx >= 0 ? args[filterIdx + 1] : null;
        const outputPath = outputIdx >= 0 ? args[outputIdx + 1] : imagePath.replace(/\.[^.]+$/, `-var-${Date.now()}.webp`);

        if (!imagePath) {
          console.error('❌ Uso: node cli.js variation [image-path] [--brightness N] [--contrast N] [--filter "type"] [--output path]');
          console.error('\nEjemplos:');
          console.error('  node cli.js variation Graficas/ai-generadas/cosmos-001.webp --brightness 110');
          console.error('  node cli.js variation cosmos.webp --brightness 110 --contrast 120 --filter "grayscale"');
          process.exit(1);
        }

        console.log(`\n🎨 Aplicando variaciones a imagen...`);
        console.log(`   Entrada: ${imagePath}`);
        console.log(`   Brightness: ${brightness}% | Contrast: ${contrast}%`);
        if (filter) console.log(`   Filtro: ${filter}`);

        try {
          const result = await ImageVariations.applyAdjustments(imagePath, { brightness, contrast, filter }, outputPath);
          console.log(`✅ Variación guardada: ${result}`);
          console.log(`   Costo: $0 (sin Replicate)`);
        } catch (err) {
          console.error(`❌ Error: ${err.message}`);
          process.exit(1);
        }
        break;
      }

      case 'test-renderer': {
        console.log('\n🖥️  Verificando HTML renderer...\n');
        const info = await checkRenderer();
        if (info.available) {
          console.log(`✅ ${info.message} (${info.renderer})`);
        } else {
          console.log(`❌ ${info.message}`);
          console.log(`   Para instalar: ${info.install}`);
        }
        break;
      }

      case 'create': {
        // node cli.js create "tema" [--format instagram-carousel] [--template full-bleed-image] [--local] [--scale 2]
        // End-to-end: analyze → generate FLUX → design
        const tema = args[1];
        const fmt = args[args.indexOf('--format') + 1] || 'instagram-carousel';
        const tpl = args[args.indexOf('--template') + 1] || 'full-bleed-image';
        const sc = args[args.indexOf('--scale') + 1] ? parseInt(args[args.indexOf('--scale') + 1], 10) : 1;
        const local = args.includes('--local');

        if (!tema) {
          console.error('❌ Uso: node cli.js create "tu tema aquí" [--format fmt] [--template tpl] [--local] [--scale 2]');
          console.error('\nEjemplos:');
          console.error('  node cli.js create "lanzamiento de álbum"');
          console.error('  node cli.js create "tour 2026" --format instagram-story');
          console.error('  node cli.js create "taller online" --format linkedin-post --template announcement');
          process.exit(1);
        }

        console.log(`\n🎬 Pipeline completo: analyze → generate → design\n`);

        // 1. Analizar
        console.log('📊 Step 1/3: Analizando proyecto...');
        const analyzer = new ProjectAnalyzer(projectPath);
        const brand = await analyzer.analyze();
        console.log(`✅ Brand encontrado: ${brand.tone || 'neutral'} / ${brand.sector || 'general'}\n`);

        // 2. Buscar en banco o generar FLUX
        let genResult;
        const bank = new ImageBank(projectPath);

        if (useReuse) {
          console.log(`🔍 Buscando imágenes reutilizables en el banco...`);
          const compatible = await bank.search(tema, tags);
          if (compatible.length >= 3) {
            console.log(`✅ Encontradas ${compatible.length} imágenes compatibles en el banco`);
            console.log(`   Usando: ${compatible.slice(0, 3).map(i => i.file).join(', ')}`);
            // Usar imágenes del banco (skip generación)
            genResult = { assetFolder: projectPath, bankImages: compatible.slice(0, 3), usedBank: true };
          } else {
            console.log(`⚠️  Solo ${compatible.length} imágenes en banco, generando ${3 - compatible.length} nuevas...`);
            // Generar lo que falte
            genResult = await skill.generateCarousel({
              format: fmt,
              topic: tema,
              slides: 3,
              useExisting: false,
              dryRun: false,
            });
          }
        } else {
          console.log(`🚀 Step 2/3: Generando imágenes FLUX para "${tema}"...`);
          genResult = await skill.generateCarousel({
            format: fmt,
            topic: tema,
            slides: 3,
            useExisting: false,
            dryRun: false,
          });
          // Registrar en banco
          console.log(`📸 Registrando imágenes en el banco de reutilización...`);
          // (Este paso requiere integración con fluxClient para obtener URLs)
        }

        if (!genResult.assetFolder) {
          throw new Error('No se pudo generar las imágenes');
        }
        const assetFolder = genResult.assetFolder;
        console.log(`✅ Imágenes generadas en: ${path.relative(projectPath, assetFolder)}\n`);

        // 3. Diseñar
        console.log(`🎨 Step 3/3: Diseñando slides con template "${tpl}"...`);
        const rendInfo3 = await checkRenderer();
        if (!rendInfo3.available) {
          console.error(`❌ ${rendInfo3.message}`);
          console.error(`   Opción: usar --preview para generar HTML sin renderizar`);
          throw new Error('Renderer no disponible');
        }

        // Leer manifest para obtener prompts
        const manifestPath4 = path.join(assetFolder, 'manifest.json');
        let manifest4 = {};
        try { manifest4 = JSON.parse(await fs.readFile(manifestPath4, 'utf-8')); } catch { /* ok */ }

        const slides4 = manifest4.prompts?.length ? manifest4.prompts : [
          { type: 'hero' },
          { type: 'body' },
          { type: 'cta' },
        ];
        const slideTypes4 = slides4.map(p => p.type || 'hero');

        // Construir pages
        const pages4 = [];
        for (let i = 0; i < slides4.length; i++) {
          const slideType = slideTypes4[i];
          const contents = {
            title:           `Slide ${i + 1}`,
            subtitle:        '',
            label:           `0${i + 1} / ${slideType.toUpperCase()}`,
            backgroundImage: `flux:${slideType}`,
            ctaText:         slideType === 'cta' ? 'Comenzar ahora' : undefined,
          };
          const spec = fromTemplate(tpl, brand, contents, fmt);
          pages4.push(...spec.pages);
        }

        // Renderizar
        const result4 = await render(
          { format: fmt, brand, pages: pages4 },
          assetFolder,
          { scale: sc, projectPath, prefix: 'slide' }
        );

        console.log(`✅ ${result4.pngs.length} slides renderizados:\n`);
        result4.pngs.forEach(p => {
          console.log(`   📸 ${path.relative(projectPath, p)}`);
        });

        console.log(`\n🎉 Pipeline completado en ${assetFolder}`);
        console.log('\n📝 Próximos pasos:');
        console.log(`   • Ver en browser: open "${assetFolder}"`);
        console.log(`   • Agregar copy: node cli.js copy "${path.relative(projectPath, assetFolder)}" --topic "${tema}"`);
        break;
      }

      case 'setup': {
        // Verificación completa del entorno. Claude lo corre automáticamente en el onboarding.
        console.log('\n🔧 Verificando entorno...\n');
        const issues = [];

        // 1. Tokens
        const hasReplicate = !!process.env.REPLICATE_API_TOKEN;
        const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
        console.log(`   Replicate API token: ${hasReplicate ? '✅' : '❌ falta REPLICATE_API_TOKEN en .env'}`);
        console.log(`   Anthropic API key:   ${hasAnthropic ? '✅' : '⚠️  opcional (copy con voz de marca)'}`);
        if (!hasReplicate) issues.push('REPLICATE_API_TOKEN');

        // 2. Dependencias
        const { default: fsSync } = await import('fs');
        const depsOk = fsSync.existsSync(path.join(__dirname, 'node_modules', 'puppeteer'));
        console.log(`   Node dependencies:   ${depsOk ? '✅' : '❌ correr: npm install'}`);
        if (!depsOk) issues.push('npm install pendiente');

        // 3. Renderer
        const rendInfo = await checkRenderer();
        console.log(`   HTML renderer:       ${rendInfo.available ? `✅ ${rendInfo.message}` : `❌ ${rendInfo.message}`}`);
        if (!rendInfo.available) issues.push(rendInfo.install);

        // 4. Templates
        const tpls = listTemplates();
        console.log(`   Templates:           ✅ ${tpls.length} disponibles`);

        // 5. Formatos
        const fmts = listFormats();
        console.log(`   Formatos:            ✅ ${fmts.length} disponibles`);

        console.log('');
        if (issues.length === 0) {
          console.log('✅ Todo listo. El skill está configurado y puede generar diseños.\n');
          console.log('Próximo paso:');
          console.log('  node cli.js analyze "mi tema"  — analizar un proyecto');
          console.log('  node cli.js create "mi tema"   — crear carrusel completo');
        } else {
          console.log(`⚠️  ${issues.length} punto(s) pendiente(s):`);
          issues.forEach(i => console.log(`   → ${i}`));
        }
        break;
      }

      default:
        showHelp();
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  const help = `
🎨 Marketing Image Skill — AI-powered carousel & ad generation

USAGE:
  node cli.js <command> [project-path] [format] [topic] [options]

COMANDOS PRINCIPALES:

  ⭐ create "tema" [--format fmt] [--template tpl] [--local] [--scale 2]
    End-to-end: genera imágenes FLUX + diseña automáticamente.
    Devuelve PNGs listos para publicar.

    Ejemplos:
      node cli.js create "lanzamiento de álbum"
      node cli.js create "tour 2026" --format instagram-story
      node cli.js create "anuncio de evento" --template announcement --scale 2

  analyze [project-path]
    Mostrar análisis de marca (colores, tipografía, tono)

  generate [format] "tema" [--dry-run] [--local] [--json]
    Generar solo las imágenes FLUX (sin diseñar)
    --dry-run: mostrar prompts sin generar
    --local:   usar ComfyUI local en lugar de Replicate
    --json:    output JSON en stdout

  design <folder> [--template nombre] [--scale 2] [--preview] [--copy] [--topic "tema"]
    Renderizar slides ya generados con el Design Engine
    --template:  full-bleed-image | editorial-dark | editorial-light | split-layout | etc.
    --copy:      generar copy con Claude Haiku (requiere ANTHROPIC_API_KEY)
    --topic:     tema para el copywriter
    --scale 2:   renderizar en 2x retina
    --preview:   HTML solamente (sin Chrome)
    --debug-html: guardar HTML además del PNG

  copy <folder> --topic "tema" [--template nombre] [--scale 2]
    Generar copy real y re-renderizar una carpeta existente
    Útil para actualizar slides después de generar FLUX

  list [project-path]
    Listar assets generados

  test-flux, test-comfyui, test-renderer
    Verificar que cada componente está listo

  setup
    Diagnóstico completo del entorno

MODO OFFLINE (para agentes como Cowork):

  En Cowork, Claude ya está presente — no necesitas un token de ANTHROPIC_API_KEY.
  El copywriter tiene un modo offline donde inyectas el contenido directamente:

    const cw = new Copywriter();
    const content = {
      slides: [
        { type: "hero", title: "...", subtitle: "...", label: "01 / ..." },
        { type: "body", title: "...", subtitle: "...", label: "02 / ..." },
        { type: "cta",  title: "...", subtitle: "...", label: "03 / ...", ctaText: "..." }
      ],
      captions: {
        general: "...",
        instagram: "...",
        linkedin: "...",
        twitter: "..."
      }
    };
    await cw.generateOffline(content);

EJEMPLOS:

  # End-to-end en 1 comando
  node cli.js create "lanzamiento de producto"

  # Paso a paso
  node cli.js generate instagram-carousel "mi tema" --dry-run
  node cli.js generate instagram-carousel "mi tema"
  node cli.js design marketing-assets/2026-06-04_1800_instagram-carousel --template full-bleed-image

  # Con copy real
  node cli.js create "tour 2026" --format instagram-story
  node cli.js copy marketing-assets/2026-06-04_1800_instagram-story --topic "tour 2026"

CONFIGURACIÓN:

  REPLICATE (requerido):
  1. Sign up: https://replicate.com
  2. REPLICATE_API_TOKEN=r8_xxxxx en .env

  ANTHROPIC (opcional — solo para copy con API):
  - ANTHROPIC_API_KEY=sk-ant-... en .env
  - En Cowork, el copywriter funciona en modo offline sin este token

  COMFYUI (alternativa gratuita):
  - Iniciar: cd ~/video-ai/ComfyUI && python main.py
  - Usar: node cli.js create "tema" --local
`;

  console.log(help);
}

main().catch(console.error);
