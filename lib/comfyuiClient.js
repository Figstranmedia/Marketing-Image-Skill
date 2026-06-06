import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Cliente ComfyUI local para FLUX Schnell.
 *
 * Construye el workflow directamente en formato API (objeto {nodeId: {class_type, inputs}})
 * y recupera la imagen leyendo /history/:promptId → /view, en lugar de buscar archivos
 * por fecha en el filesystem del proyecto (ComfyUI guarda en su propio directorio).
 *
 * Nombres de modelo configurables por env para portabilidad; los defaults son los de
 * una instalación FLUX Schnell estándar.
 */
export class ComfyUIClient {
  constructor(apiUrl = 'http://localhost:8188') {
    this.apiUrl = apiUrl;
    this.client = axios.create({
      baseURL: apiUrl,
      timeout: 120000,
    });

    this.models = {
      unet: process.env.COMFYUI_FLUX_UNET || 'flux1-schnell-fp8.safetensors',
      clip1: process.env.COMFYUI_CLIP1 || 'clip_l.safetensors',
      clip2: process.env.COMFYUI_CLIP2 || 't5xxl_fp8_e4m3fn.safetensors',
      vae: process.env.COMFYUI_VAE || 'ae.safetensors',
    };

    this.width = 1080;
    this.height = 1350;
    this.pollInterval = 2000;
    // FLUX fp8 en CPU/MPS (Mac) puede tardar varios minutos por imagen, más la
    // carga inicial del modelo. Configurable por env para hardware lento/rápido.
    this.maxWait = Number(process.env.COMFYUI_MAX_WAIT) || 600000; // 10 min
  }

  async isAvailable() {
    try {
      const response = await this.client.get('/system_stats');
      return !!response.data;
    } catch {
      return false;
    }
  }

  async generateImages(prompts, outputFolder) {
    const available = await this.isAvailable();
    if (!available) {
      console.error('❌ ComfyUI no disponible en', this.apiUrl);
      console.error('   Usa: cd ~/video-ai/ComfyUI && python main.py');
      throw new Error('ComfyUI API unavailable');
    }

    const images = [];

    for (const promptData of prompts) {
      console.log(
        `⏳ Generando slide ${promptData.index + 1}/${prompts.length}...`
      );

      const imageData = await this.generateImage(
        promptData.prompt,
        promptData.type,
        outputFolder
      );

      images.push({
        index: promptData.index,
        type: promptData.type,
        path: imageData.path,
        relative: imageData.relative,
        prompt: promptData.prompt,
        timestamp: new Date().toISOString(),
        source: 'comfyui-local',
        model: 'schnell',
      });

      console.log(`   ✅ Slide ${promptData.index + 1} generada`);
    }

    return images;
  }

  async generateImage(prompt, slideType, outputFolder) {
    const workflow = this.buildFluxWorkflow(prompt);

    // Enviar workflow. La API espera el body envuelto en { prompt: <workflow> }.
    let promptId;
    try {
      const { data } = await this.client.post('/prompt', { prompt: workflow });
      if (data.error) {
        const nodeErr = data.node_errors ? ` · node_errors: ${JSON.stringify(data.node_errors)}` : '';
        throw new Error(`${data.error.message || JSON.stringify(data.error)}${nodeErr}`);
      }
      promptId = data.prompt_id;
    } catch (error) {
      const detail = error.response?.data?.error?.message || error.message;
      throw new Error(`ComfyUI rechazó el workflow (${slideType}): ${detail}`);
    }

    // Esperar a que termine y obtener la referencia de la imagen
    const imageInfo = await this.waitForCompletion(promptId);

    // Descargar la imagen desde ComfyUI a la carpeta del proyecto
    const filePath = await this.downloadImage(imageInfo, outputFolder, slideType);

    return {
      path: filePath,
      relative: path.relative(outputFolder, filePath),
    };
  }

  /**
   * Workflow FLUX Schnell en formato API de ComfyUI.
   * Las conexiones se expresan como ["nodeId", slotIndex].
   */
  buildFluxWorkflow(prompt) {
    const seed = Math.floor(Math.random() * 1_000_000_000);
    const m = this.models;

    return {
      // 1. UNETLoader — modelo FLUX Schnell
      1: {
        class_type: 'UNETLoader',
        inputs: { unet_name: m.unet, weight_dtype: 'default' },
      },
      // 2. DualCLIPLoader — CLIP-L + T5XXL (inputs reales: clip_name1/clip_name2/type)
      2: {
        class_type: 'DualCLIPLoader',
        inputs: { clip_name1: m.clip1, clip_name2: m.clip2, type: 'flux' },
      },
      // 3. VAELoader
      3: {
        class_type: 'VAELoader',
        inputs: { vae_name: m.vae },
      },
      // 4. CLIPTextEncode (positivo)
      4: {
        class_type: 'CLIPTextEncode',
        inputs: { clip: ['2', 0], text: prompt },
      },
      // 5. CLIPTextEncode (negativo)
      5: {
        class_type: 'CLIPTextEncode',
        inputs: { clip: ['2', 0], text: 'blurry, low quality, distorted, artifacts, hands, faces, text' },
      },
      // 6. EmptyLatentImage
      6: {
        class_type: 'EmptyLatentImage',
        inputs: { width: this.width, height: this.height, batch_size: 1 },
      },
      // 7. KSampler — FLUX: 4 steps, cfg 1.0
      7: {
        class_type: 'KSampler',
        inputs: {
          seed,
          steps: 4,
          cfg: 1.0,
          sampler_name: 'euler',
          scheduler: 'simple',
          denoise: 1.0,
          model: ['1', 0],
          positive: ['4', 0],
          negative: ['5', 0],
          latent_image: ['6', 0],
        },
      },
      // 8. VAEDecode
      8: {
        class_type: 'VAEDecode',
        inputs: { samples: ['7', 0], vae: ['3', 0] },
      },
      // 9. SaveImage
      9: {
        class_type: 'SaveImage',
        inputs: { filename_prefix: 'marketing-carousel', images: ['8', 0] },
      },
    };
  }

  /**
   * Hace polling a /history/:promptId hasta que el prompt aparece (terminado)
   * y devuelve la referencia { filename, subfolder, type } de la primera imagen.
   */
  async waitForCompletion(promptId) {
    const startTime = Date.now();

    while (Date.now() - startTime < this.maxWait) {
      const { data } = await this.client.get(`/history/${promptId}`);
      const entry = data[promptId];

      if (entry) {
        if (entry.status?.status_str === 'error') {
          const lastMsg = entry.status.messages?.slice(-1)?.[0];
          throw new Error(`ComfyUI falló: ${JSON.stringify(lastMsg)}`);
        }

        const image = this.extractFirstImage(entry.outputs);
        if (image) return image;

        throw new Error('ComfyUI terminó sin imágenes de salida');
      }

      await new Promise(resolve => setTimeout(resolve, this.pollInterval));
    }

    throw new Error(`Timeout esperando ComfyUI (${promptId})`);
  }

  /**
   * Recorre los outputs de cualquier nodo SaveImage y devuelve la primera imagen.
   */
  extractFirstImage(outputs = {}) {
    for (const nodeId of Object.keys(outputs)) {
      const imgs = outputs[nodeId]?.images;
      if (Array.isArray(imgs) && imgs.length > 0) {
        return imgs[0]; // { filename, subfolder, type }
      }
    }
    return null;
  }

  /**
   * Descarga la imagen desde ComfyUI (/view) y la guarda en outputFolder.
   */
  async downloadImage({ filename, subfolder, type }, outputFolder, slideType) {
    const response = await this.client.get('/view', {
      params: { filename, subfolder: subfolder || '', type: type || 'output' },
      responseType: 'arraybuffer',
    });

    const fileName = `${slideType}-comfyui-${Date.now()}.png`;
    const filePath = path.join(outputFolder, fileName);
    await fs.writeFile(filePath, response.data);

    return filePath;
  }

  async testConnection() {
    try {
      const stats = await this.client.get('/system_stats');
      return {
        connected: true,
        stats: stats.data,
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        url: this.apiUrl,
      };
    }
  }
}
