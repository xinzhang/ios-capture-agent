import OpenAI from 'openai';

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

// Initialize OpenAI client
let openaiClient: OpenAI | null = null;

/**
 * Get OpenAI client (lazy initialization)
 */
function getClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({ apiKey });
    console.log('✅ OpenAI client initialized');
  }
  return openaiClient;
}

/**
 * Process OCR using GPT-4 Vision
 * @param imageData - Base64 encoded image (data:image/png;base64,...)
 * @returns OCR result with text and confidence
 */
export async function processOCR(imageData: string): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    console.log('🔍 Starting GPT-4 Vision OCR...');
    console.log('   API Key configured:', isConfigured());

    const client = getClient();

    // Remove data URL prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

    console.log('📤 Sending image to GPT-4 Vision API...');

    // Call GPT-4 Vision API
    const response = await client.chat.completions.create({
      model: 'gpt-4o', // GPT-4 Vision is most capable
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
                detail: 'high', // Use high detail for better OCR
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
    // GPT-4 Vision is very accurate, so we give high confidence
    const confidence = extractedText.length > 0 ? 95 : 0;

    // Create a simple text block (GPT-4 doesn't give us bounding boxes like Tesseract)
    const textBlocks: TextBlock[] = extractedText
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => ({
        text: line.trim(),
        bbox: { x0: 0, y0: 0, x1: 100, y1: 10 }, // Dummy bbox since GPT-4 doesn't provide this
        confidence: 95,
      }));

    return {
      rawText: extractedText,
      textBlocks: textBlocks,
      confidence: confidence,
      processingTime: processingTime,
    };
  } catch (error: any) {
    console.error('❌ GPT-4 Vision OCR failed:', error.message);
    console.error('   Full error:', error);

    // If API key is missing, provide helpful error
    if (error.message?.includes('API key') || error.message?.includes('401')) {
      console.error('💡 ERROR: OPENAI_API_KEY is not set or is invalid!');
      console.error('   Please add your API key to the .env file:');
      console.error('   OPENAI_API_KEY=sk-your-key-here');
    }

    // Return empty result on error
    return {
      rawText: '',
      textBlocks: [],
      confidence: 0,
      processingTime: Date.now() - startTime,
    };
  }
}

/**
 * Extract text from specific region (not supported by GPT-4 Vision, returns full OCR)
 */
export async function processOCRRegion(
  imageData: string,
  region: { x: number; y: number; width: number; height: number }
): Promise<OCRResult> {
  // Note: GPT-4 Vision doesn't support region extraction like Tesseract
  // It will OCR the entire image. If you need region-specific OCR,
  // crop the image first using sharp before calling this function.

  console.warn('⚠️  GPT-4 Vision does not support region-specific OCR, processing full image');
  return processOCR(imageData);
}

/**
 * Check if OpenAI API key is configured
 */
export function isConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Get model info
 */
export function getModelInfo(): { model: string; configured: boolean } {
  return {
    model: 'gpt-4o',
    configured: isConfigured(),
  };
}
