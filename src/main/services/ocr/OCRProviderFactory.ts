/**
 * OCR Provider Factory
 * Manages OCR provider selection and initialization
 */

import type { OCRProvider, OCRMode, OCRResult } from './types';
import { TesseractProvider } from './TesseractProvider';
import { GPT4VisionProvider } from './GPT4VisionProvider';

class OCRProviderFactory {
  private provider: OCRProvider | null = null;
  private currentMode: OCRMode | null = null;

  /**
   * Get the current OCR mode from environment or default to 'local'
   */
  private getOCRMode(): OCRMode {
    const mode = process.env.OCR_MODE?.toLowerCase() as OCRMode;
    return mode === 'llm' ? 'llm' : 'local';
  }

  /**
   * Get the active OCR provider
   * Creates and initializes the provider if needed
   */
  async getProvider(): Promise<OCRProvider> {
    const mode = this.getOCRMode();

    // Return cached provider if mode hasn't changed
    if (this.provider && this.currentMode === mode) {
      return this.provider;
    }

    console.log(`🔄 Switching OCR mode to: ${mode.toUpperCase()}`);

    // Create new provider based on mode
    switch (mode) {
      case 'llm':
        this.provider = new GPT4VisionProvider();
        break;
      case 'local':
      default:
        this.provider = new TesseractProvider();
        break;
    }

    this.currentMode = mode;
    console.log(`✅ Using OCR provider: ${this.provider.getName()}`);

    // Initialize provider if it has an initialize method
    if (this.provider.initialize) {
      await this.provider.initialize();
    }

    return this.provider;
  }

  /**
   * Process OCR using the active provider
   */
  async processOCR(imageData: string): Promise<OCRResult> {
    const provider = await this.getProvider();
    return provider.processOCR(imageData);
  }

  /**
   * Process OCR on a specific region
   */
  async processOCRRegion(
    imageData: string,
    region: { x: number; y: number; width: number; height: number }
  ): Promise<OCRResult> {
    const provider = await this.getProvider();
    if (provider.processOCRRegion) {
      return provider.processOCRRegion(imageData, region);
    }
    return provider.processOCR(imageData);
  }

  /**
   * Check if the current provider is configured
   */
  async isConfigured(): Promise<boolean> {
    const provider = await this.getProvider();
    return provider.isConfigured();
  }

  /**
   * Get information about the current provider
   */
  async getProviderInfo(): Promise<{ name: string; mode: OCRMode; configured: boolean }> {
    const provider = await this.getProvider();
    return {
      name: provider.getName(),
      mode: this.getOCRMode(),
      configured: provider.isConfigured(),
    };
  }

  /**
   * Reset the provider (useful for switching modes)
   */
  reset(): void {
    this.provider = null;
    this.currentMode = null;
  }
}

// Export singleton instance
export const ocrProvider = new OCRProviderFactory();
