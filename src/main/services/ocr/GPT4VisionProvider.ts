/**
 * GPT-4 Vision OCR Provider
 * Cloud OCR processing using OpenAI's GPT-4 Vision API
 */

import OpenAI from 'openai';
import type { OCRProvider, OCRResult, TextBlock } from './types';

export class GPT4VisionProvider implements OCRProvider {
  private client: OpenAI | null = null;
  private readonly maxRetries = 2;

  getName(): string {
    return 'GPT-4 Vision (OpenAI)';
  }

  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  async initialize(): Promise<void> {
    if (this.client) {
      return;
    }

    if (!this.isConfigured()) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    console.log('🔧 Initializing OpenAI client for Electron environment...');

    // Create a custom HTTPS agent for Electron to work around networking issues
    const { httpsAgent } = require('../electronAgent');

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 60000, // 60 second timeout
      maxRetries: this.maxRetries,
      httpAgent: httpsAgent,
    });

    console.log('✅ OpenAI client initialized successfully');
  }

  async processOCR(imageData: string): Promise<OCRResult> {
    const startTime = Date.now();
    let attempt = 0;

    // Initialize client if needed
    if (!this.client) {
      await this.initialize();
    }

    while (attempt < this.maxRetries) {
      try {
        console.log(`🔍 Starting GPT-4 Vision OCR... (attempt ${attempt + 1}/${this.maxRetries})`);
        console.log('   Mode: Cloud (online)');
        console.log('   API Key configured:', this.isConfigured());

        // Remove data URL prefix if present
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

        console.log('📤 Sending image to GPT-4 Vision API...');

        // Call GPT-4 Vision API
        const response = await this.client!.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Please extract ALL text from this iOS screenshot.

Rules:
1. Extract every single word you can see
2. Preserve the layout and structure
3. Include button labels, status text, notifications, everything
4. Maintain reading order (top to bottom, left to right)
5. Use line breaks to separate sections
6. Don't summarize or paraphrase - get the exact text

Return ONLY the extracted text, nothing else.`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${base64Data}`,
                    detail: 'high',
                  },
                },
              ],
            },
          ],
          max_tokens: 4000,
        });

        const extractedText = response.choices[0]?.message?.content || '';
        const processingTime = Date.now() - startTime;

        console.log(`✅ GPT-4 Vision OCR completed in ${processingTime}ms`);
        console.log(`   Text length: ${extractedText.length} characters`);
        console.log(`   Tokens used: ${response.usage?.total_tokens || 'N/A'}`);
        console.log(`   First 100 chars: ${extractedText.substring(0, 100)}...`);

        // Calculate confidence based on text length and model quality
        const confidence = extractedText.length > 0 ? 95 : 0;

        // Create a simple text block (GPT-4 doesn't give us bounding boxes)
        const textBlocks: TextBlock[] = extractedText
          .split('\n')
          .filter((line) => line.trim().length > 0)
          .map((line) => ({
            text: line.trim(),
            bbox: { x0: 0, y0: 0, x1: 100, y1: 10 },
            confidence: 95,
          }));

        return {
          rawText: extractedText,
          textBlocks: textBlocks,
          confidence: confidence,
          processingTime: processingTime,
        };
      } catch (error: any) {
        attempt++;
        console.error(`❌ GPT-4 Vision OCR failed (attempt ${attempt}/${this.maxRetries}):`, error.message);

        // Check if this is a connection error that might be retriable
        const isRetriable =
          error.message?.includes('EPIPE') ||
          error.message?.includes('ECONNRESET') ||
          error.message?.includes('timeout') ||
          error.message?.includes('fetch') ||
          error.code === 'EPIPE' ||
          error.code === 'ECONNRESET';

        // If API key is missing, don't retry
        if (error.message?.includes('API key') || error.message?.includes('401')) {
          console.error('💡 ERROR: OPENAI_API_KEY is not set or is invalid!');
          console.error('   Please add your API key to the .env file:');
          console.error('   OPENAI_API_KEY=sk-your-key-here');
          break;
        }

        // If it's retriable and we haven't exhausted retries, wait and retry
        if (isRetriable && attempt < this.maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s
          console.log(`⏳ Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        // If we get here, we've exhausted retries or it's not retriable
        console.error('   Full error:', error);

        // Return empty result on error
        return {
          rawText: '',
          textBlocks: [],
          confidence: 0,
          processingTime: Date.now() - startTime,
        };
      }
    }

    // Shouldn't reach here, but TypeScript needs it
    return {
      rawText: '',
      textBlocks: [],
      confidence: 0,
      processingTime: Date.now() - startTime,
    };
  }

  async processOCRRegion(
    imageData: string,
    region: { x: number; y: number; width: number; height: number }
  ): Promise<OCRResult> {
    // GPT-4 Vision doesn't support region-specific OCR
    // It will OCR the entire image. If you need region-specific OCR,
    // crop the image first using sharp before calling this function.
    console.warn('⚠️  GPT-4 Vision does not support region-specific OCR, processing full image');
    return this.processOCR(imageData);
  }
}
