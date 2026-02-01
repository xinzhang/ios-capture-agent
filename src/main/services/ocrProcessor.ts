import Tesseract from 'tesseract.js';
import sharp from 'sharp';

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

let worker: Tesseract.Worker | null = null;

/**
 * Initialize Tesseract worker (lazy initialization)
 */
async function getWorker(): Promise<Tesseract.Worker> {
  if (!worker) {
    console.log('Initializing Tesseract worker...');
    worker = await Tesseract.createWorker('eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`🔍 OCR Progress: ${(m.progress * 100).toFixed(0)}%`);
        }
      },
    });
    console.log('✅ Tesseract worker initialized');
  }
  return worker;
}

/**
 * Process OCR on an image
 * @param imageData - Base64 encoded image (data:image/png;base64,...)
 * @returns OCR result with text, blocks, confidence, and timing
 */
export async function processOCR(imageData: string): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    // Remove data URL prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Preprocess image for better OCR results
    const processedImage = await preprocessImage(buffer);

    // Get worker and perform OCR
    const tessWorker = await getWorker();

    const { data } = await tessWorker.recognize(processedImage);

    const processingTime = Date.now() - startTime;

    // Convert Tesseract results to our format
    const textBlocks: TextBlock[] = data.words.map((word: any) => ({
      text: word.text,
      bbox: {
        x0: word.bbox.x0,
        y0: word.bbox.y0,
        x1: word.bbox.x1,
        y1: word.bbox.y1,
      },
      confidence: word.confidence,
    }));

    console.log(`✅ OCR completed in ${processingTime}ms`);
    console.log(`   Confidence: ${data.confidence.toFixed(1)}%`);
    console.log(`   Text length: ${data.text.length} characters`);

    return {
      rawText: data.text,
      textBlocks: textBlocks,
      confidence: data.confidence,
      processingTime: processingTime,
    };
  } catch (error) {
    console.error('❌ OCR processing failed:', error);
    throw error;
  }
}

/**
 * Preprocess image to improve OCR accuracy
 */
async function preprocessImage(imageBuffer: Buffer): Promise<string> {
  try {
    // Use sharp to enhance the image for OCR
    const processed = await sharp(imageBuffer)
      // Convert to grayscale
      .grayscale()
      // Increase contrast
      .normalize()
      // Resize if too large (Tesseract works best with medium-sized images)
      .resize({
        width: 2000,
        fit: 'inside',
        withoutEnlargement: true,
      })
      // Apply slight sharpening
      .sharpen()
      .toBuffer();

    // Convert to base64
    return `data:image/png;base64,${processed.toString('base64')}`;
  } catch (error) {
    console.error('Error preprocessing image:', error);
    // Return original if preprocessing fails
    return `data:image/png;base64,${imageBuffer.toString('base64')}`;
  }
}

/**
 * Terminate the Tesseract worker (for cleanup)
 */
export async function terminateWorker(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
    console.log('Tesseract worker terminated');
  }
}

/**
 * Extract text from specific region of image (future enhancement)
 */
export async function processOCRRegion(
  imageData: string,
  region: { x: number; y: number; width: number; height: number }
): Promise<OCRResult> {
  // Remove data URL prefix
  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  // Extract region using sharp
  const regionBuffer = await sharp(buffer)
    .extract({
      left: region.x,
      top: region.y,
      width: region.width,
      height: region.height,
    })
    .toBuffer();

  const regionBase64 = `data:image/png;base64,${regionBuffer.toString('base64')}`;
  return processOCR(regionBase64);
}
