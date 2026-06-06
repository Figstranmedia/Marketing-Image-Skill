import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

/**
 * Cliente FLUX sobre la API REST de Replicate.
 *
 * Usa POST /v1/predictions + polling GET /v1/predictions/:id en lugar del
 * SDK `replicate.run()`, que para FLUX Schnell devuelve un objeto FileOutput
 * vacío ({}) en lugar de una URL. Esta es la misma lógica que ya funciona en
 * scripts/generate_flux_urls.js, ahora unificada en la clase.
 */
export class FluxClient {
  constructor(apiToken = process.env.REPLICATE_API_TOKEN, model = process.env.FLUX_MODEL || 'schnell') {
    this.apiToken = apiToken;
    this.model = model; // 'schnell' o 'pro'

    // Mapeo de modelos a slugs de Replicate
    this.modelVersions = {
      'schnell': 'black-forest-labs/flux-schnell', // Rápido, $0.003/img
      'pro': 'black-forest-labs/flux-pro', // Mejor calidad, $0.04/img
    };

    // Cliente REST autenticado (solo si hay token)
    this.api = apiToken
      ? axios.create({
          baseURL: 'https://api.replicate.com/v1',
          headers: {
            'Authorization': `Token ${apiToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 300000, // 5 min
        })
      : null;

    this.pollInterval = 2000; // 2s entre polls
    this.maxWait = 600000; // 10 min máximo por imagen
  }

  isAvailable() {
    return !!this.apiToken;
  }

  async generateImages(prompts, outputFolder) {
    if (!this.isAvailable()) {
      throw new Error('REPLICATE_API_TOKEN not configured');
    }

    const images = [];

    for (const promptData of prompts) {
      console.log(
        `⚡ Generando slide ${promptData.index + 1}/${prompts.length} con FLUX ${this.model}...`
      );

      // Esperar entre predicciones para evitar rate limit (cuentas < $5)
      if (promptData.index > 0) {
        console.log(`   ⏳ Esperando 12s para evitar rate limit...`);
        await new Promise(resolve => setTimeout(resolve, 12000));
      }

      try {
        const imageUrl = await this.generateImage(promptData.prompt);

        // Descargar imagen
        const filePath = await this.downloadImage(
          imageUrl,
          outputFolder,
          promptData.type
        );

        images.push({
          index: promptData.index,
          type: promptData.type,
          path: filePath,
          relative: path.relative(outputFolder, filePath),
          prompt: promptData.prompt,
          timestamp: new Date().toISOString(),
          source: 'flux-replicate',
          model: this.model,
        });

        console.log(`   ✅ Slide ${promptData.index + 1} generada (${this.model})`);
      } catch (error) {
        console.error(`   ❌ Error en slide ${promptData.index + 1}:`, error.message);
        throw error;
      }
    }

    return images;
  }

  /**
   * Genera una imagen y devuelve su URL pública (válida ~1h).
   */
  async generateImage(prompt) {
    const modelVersion = this.modelVersions[this.model];

    if (!modelVersion) {
      throw new Error(`Unknown FLUX model: ${this.model}`);
    }

    console.log(`      Prompting FLUX ${this.model} (REST)...`);

    const prediction = await this.createPrediction(prompt, modelVersion);
    const completed = await this.waitForCompletion(prediction.id);

    // El output de FLUX es un array de URLs (o una URL suelta)
    const imageUrl = Array.isArray(completed.output)
      ? completed.output[0]
      : completed.output;

    if (!imageUrl) {
      throw new Error('No image URL returned from Replicate');
    }

    return imageUrl;
  }

  /**
   * Crea una predicción vía POST /v1/predictions.
   */
  async createPrediction(prompt, modelVersion, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.api.post('/predictions', {
          version: modelVersion,
          input: {
            prompt,
            num_inference_steps: this.model === 'schnell' ? 4 : 50,
            guidance_scale: this.model === 'schnell' ? 1.0 : 3.5,
            width: 1080,
            height: 1350,
          },
        });
        return response.data;
      } catch (error) {
        const status = error.response?.status;
        const detail = error.response?.data?.detail || error.message;
        const retryAfter = parseInt(error.response?.headers?.['retry-after'] || '15', 10);

        if (status === 429 && attempt < retries) {
          const wait = (retryAfter + 2) * 1000;
          console.log(`   ⏳ Rate limit (429) — esperando ${retryAfter + 2}s (intento ${attempt}/${retries})...`);
          await new Promise(resolve => setTimeout(resolve, wait));
          continue;
        }
        throw new Error(`Error creando predicción: ${detail}`);
      }
    }
  }

  /**
   * Hace polling hasta que la predicción termina (succeeded/failed/canceled).
   */
  async waitForCompletion(predictionId) {
    const startTime = Date.now();

    while (Date.now() - startTime < this.maxWait) {
      const response = await this.api.get(`/predictions/${predictionId}`);
      const prediction = response.data;

      if (prediction.status === 'succeeded') {
        return prediction;
      }
      if (prediction.status === 'failed') {
        throw new Error(`Predicción falló: ${prediction.error}`);
      }
      if (prediction.status === 'canceled') {
        throw new Error('Predicción cancelada');
      }

      // starting / processing
      await new Promise(resolve => setTimeout(resolve, this.pollInterval));
    }

    throw new Error(`Timeout esperando predicción ${predictionId}`);
  }

  async downloadImage(imageUrl, outputFolder, slideType) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });

      const fileName = `${slideType}-flux-${this.model}-${Date.now()}.png`;
      const filePath = path.join(outputFolder, fileName);

      await fs.writeFile(filePath, response.data);
      return filePath;
    } catch (error) {
      console.error('Error descargando imagen:', error.message);
      throw error;
    }
  }

  /**
   * Verifica que el token sea válido sin gastar créditos (GET /v1/account).
   */
  async testConnection() {
    if (!this.isAvailable()) {
      return {
        connected: false,
        error: 'REPLICATE_API_TOKEN not set',
      };
    }

    try {
      const response = await this.api.get('/account');
      return {
        connected: true,
        model: this.model,
        account: response.data?.username || response.data?.type || 'unknown',
        message: `Connected to Replicate (FLUX ${this.model})`,
      };
    } catch (error) {
      return {
        connected: false,
        error: error.response?.data?.detail || error.message,
        model: this.model,
      };
    }
  }
}
