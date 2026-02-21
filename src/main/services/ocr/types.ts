/**
 * OCR Provider Interface
 * Defines the contract for all OCR providers
 */

export interface TextBlock {
  text: string;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  confidence: number;
}

export interface OCRResult {
  rawText: string;
  textBlocks: TextBlock[];
  confidence: number;
  processingTime: number;
}

export interface OCRProvider {
  /**
   * Get the name of this provider
   */
  getName(): string;

  /**
   * Check if this provider is properly configured
   */
  isConfigured(): boolean;

  /**
   * Initialize the provider (if needed)
   */
  initialize?(): Promise<void>;

  /**
   * Process OCR on an image
   * @param imageData - Base64 encoded image (data:image/png;base64,...)
   * @returns OCR result with text and confidence
   */
  processOCR(imageData: string): Promise<OCRResult>;

  /**
   * Process OCR on a specific region of an image
   * @param imageData - Base64 encoded image
   * @param region - Region to extract text from
   * @returns OCR result
   */
  processOCRRegion?(imageData: string, region: { x: number; y: number; width: number; height: number }): Promise<OCRResult>;
}

export type OCRMode = 'local' | 'llm';
