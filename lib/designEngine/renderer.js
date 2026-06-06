import fs from 'fs/promises';
import { existsSync, readdirSync } from 'fs';
import path from 'path';
import os from 'os';

/**
 * Detecta el ejecutable de Chrome disponible en el sistema.
 * Prioridad: CHROME_PATH env → Chrome del sistema → Puppeteer bundled
 */
function findPlaywrightChromium() {
  const home = os.homedir();
  const base = process.platform === 'darwin'
    ? path.join(home, 'Library', 'Caches', 'ms-playwright')
    : path.join(home, '.cache', 'ms-playwright');

  if (!existsSync(base)) return undefined;

  try {
    const dirs = readdirSync(base).filter(d => d.startsWith('chromium-'));
    for (const dir of dirs) {
      const arch = process.arch === 'arm64' ? 'arm64' : '';
      const candidates = process.platform === 'darwin'
        ? [
            path.join(base, dir, `chrome-mac${arch ? `-${arch}` : ''}`, 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
            path.join(base, dir, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
          ]
        : [path.join(base, dir, 'chrome-linux', 'chrome')];
      const found = candidates.find(p => existsSync(p));
      if (found) return found;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function detectChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;

  if (process.platform === 'darwin') {
    const macPaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    ];
    return macPaths.find(p => existsSync(p)) || findPlaywrightChromium() || undefined;
  }

  if (process.platform === 'linux') {
    const linuxPaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ];
    return linuxPaths.find(p => existsSync(p)) || findPlaywrightChromium() || undefined;
  }

  return findPlaywrightChromium() || undefined;
}

/**
 * Renderiza HTML → PNG usando Puppeteer.
 *
 * @param {string} htmlContent  HTML completo del slide
 * @param {object} opts
 *   @param {number} opts.width
 *   @param {number} opts.height
 *   @param {string} opts.outputPath
 *   @param {number} [opts.scale=1]    1 = normal, 2 = retina/2x
 *   @param {number} [opts.fontWait=1500]
 * @returns {Promise<string>} ruta al PNG generado
 */
export async function renderSlide(htmlContent, opts = {}) {
  const {
    width = 1080,
    height = 1350,
    outputPath,
    scale = 1,
    fontWait = 1500,
  } = opts;

  if (!outputPath) throw new Error('outputPath requerido');

  const puppeteer = await tryImportPuppeteer();
  if (!puppeteer) {
    throw new Error(
      'Puppeteer no instalado. Corre: npm install puppeteer --ignore-scripts\n' +
      'O instala solo el ejecutable: npm install puppeteer-core y configura CHROME_PATH'
    );
  }

  return renderWithPuppeteer(puppeteer, htmlContent, { width, height, outputPath, scale, fontWait });
}

async function renderWithPuppeteer(puppeteer, htmlContent, { width, height, outputPath, scale, fontWait }) {
  const tmpHtml = path.join(os.tmpdir(), `design-engine-${Date.now()}.html`);
  await fs.writeFile(tmpHtml, htmlContent, 'utf-8');

  let browser;
  try {
    const executablePath = detectChrome();
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        `--window-size=${width * scale},${height * scale}`,
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({
      width: width * scale,
      height: height * scale,
      deviceScaleFactor: scale > 1 ? scale : 1,
    });

    await page.goto(`file://${tmpHtml}`, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    if (fontWait > 0) await new Promise(r => setTimeout(r, fontWait));

    await page.screenshot({
      path: outputPath,
      type: 'png',
      clip: { x: 0, y: 0, width: width * scale, height: height * scale },
    });

    return outputPath;
  } finally {
    if (browser) await browser.close();
    await fs.unlink(tmpHtml).catch(() => {});
  }
}

async function tryImportPuppeteer() {
  try {
    const mod = await import('puppeteer');
    return mod.default || mod;
  } catch {
    try {
      const mod = await import('puppeteer-core');
      return mod.default || mod;
    } catch {
      return null;
    }
  }
}

export async function checkRenderer() {
  const puppeteer = await tryImportPuppeteer();
  if (!puppeteer) {
    return {
      available: false,
      renderer: null,
      install: 'npm install puppeteer --ignore-scripts',
      message: 'Puppeteer no instalado',
    };
  }

  const chromePath = detectChrome();
  return {
    available: true,
    renderer: 'puppeteer',
    chromePath: chromePath ?? 'bundled',
    message: chromePath
      ? `Chrome detectado en: ${chromePath}`
      : 'Usando Chrome bundled de Puppeteer',
  };
}
