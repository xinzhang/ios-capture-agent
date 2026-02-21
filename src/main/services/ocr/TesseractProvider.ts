/**
 * Tesseract.js OCR Provider
 * Local OCR processing using Tesseract.js
 */

import Tesseract from 'tesseract.js';
import type { OCRProvider, OCRResult, TextBlock } from './types';

export class TesseractProvider implements OCRProvider {
  private worker: Tesseract.Worker | null = null;
  private initialized = false;

  getName(): string {
    return 'Tesseract.js (Local)';
  }

  isConfigured(): boolean {
    return true; // Tesseract.js works locally without configuration
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('🔧 Initializing Tesseract.js worker...');
    this.worker = await Tesseract.createWorker('eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`   Tesseract progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    // Set parameters for better iOS screenshot recognition
    await this.worker.setParameters({
      tessedit_pageseg_mode: '1' as any, // Automatic page segmentation
      tessedit_char_whitelist: '', // Allow all characters
    });

    this.initialized = true;
    console.log('✅ Tesseract.js worker initialized');
  }

  async processOCR(imageData: string): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      console.log('🔍 Starting Tesseract.js OCR...');
      console.log('   Mode: Local (offline)');

      // Initialize worker if not already done
      if (!this.initialized || !this.worker) {
        await this.initialize();
      }

      // Remove data URL prefix if present
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

      console.log('📤 Processing image with Tesseract...');
      console.log('   Input data length:', imageData.length, 'chars');
      console.log('   Base64 data length:', base64Data.length, 'chars');
      console.log('   Data URL prefix present:', imageData.startsWith('data:'));

      // Recognize text
      const result = await this.worker!.recognize(base64Data);

      const processingTime = Date.now() - startTime;

      console.log(`✅ Tesseract.js OCR completed in ${processingTime}ms`);
      console.log(`   Text length: ${result.data.text.length} characters`);
      console.log(`   Confidence: ${result.data.confidence}%`);
      console.log(`   First 100 chars: ${result.data.text.substring(0, 100)}...`);

      // Convert Tesseract result to our format
      const textBlocks: TextBlock[] = result.data.words.map((word: any) => ({
        text: word.text,
        bbox: {
          x0: word.bbox.x0,
          y0: word.bbox.y0,
          x1: word.bbox.x1,
          y1: word.bbox.y1,
        },
        confidence: word.confidence,
      }));

      return {
        rawText: result.data.text,
        textBlocks: textBlocks,
        confidence: result.data.confidence,
        processingTime: processingTime,
      };
    } catch (error: any) {
      console.error('❌ Tesseract.js OCR failed:', error.message);

      // Return empty result on error
      return {
        rawText: '',
        textBlocks: [],
        confidence: 0,
        processingTime: Date.now() - startTime,
      };
    }
  }

  async processOCRRegion(
    imageData: string,
    region: { x: number; y: number; width: number; height: number }
  ): Promise<OCRResult> {
    // Tesseract doesn't support region extraction directly
    // The caller should crop the image before passing to this function
    console.warn('⚠️  Tesseract.js does not support region-specific OCR, processing full image');
    return this.processOCR(imageData);
  }

  /**
   * Clean up resources
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.initialized = false;
      console.log('🧹 Tesseract.js worker terminated');
    }
  }
}
