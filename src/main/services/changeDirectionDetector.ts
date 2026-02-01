import sharp from 'sharp';

export type ChangeDirection = 'vertical' | 'horizontal' | 'none' | 'major';

export interface DirectionDetectionResult {
  direction: ChangeDirection;
  confidence: number;
  scrollDirection?: 'up' | 'down';
}

interface RegionComparison {
  top: number;
  middle: number;
  bottom: number;
}

/**
 * Detect the direction of change between two screenshots
 * - vertical: Content scrolled up/down
 * - horizontal: New screen (swipe or navigation)
 * - none: Minor change, ignore
 * - major: Completely different screen
 */
export async function detectChangeDirection(
  prevImage: Buffer,
  currImage: Buffer
): Promise<DirectionDetectionResult> {
  try {
    // Get image metadata
    const prevMeta = await sharp(prevImage).metadata();
    const currMeta = await sharp(currImage).metadata();

    const width = prevMeta.width || 1920;
    const height = prevMeta.height || 1080;

    // Define band heights (each band is 1/3 of screen)
    const bandHeight = Math.floor(height / 3);

    // Extract and compare bands
    const prevBands = await extractBands(prevImage, width, height, bandHeight);
    const currBands = await extractBands(currImage, width, height, bandHeight);

    // Calculate similarities
    const similarities = {
      top: calculateSimilarity(prevBands.top, currBands.top),
      middle: calculateSimilarity(prevBands.middle, currBands.middle),
      bottom: calculateSimilarity(prevBands.bottom, currBands.bottom),
    };

    console.log('📊 Band similarities:', similarities);

    // Overall similarity (average of all bands)
    const overallSimilarity = (similarities.top + similarities.middle + similarities.bottom) / 3;

    // Detect direction based on band patterns
    return determineDirection(similarities, overallSimilarity);

  } catch (error) {
    console.error('Error detecting change direction:', error);
    return { direction: 'none', confidence: 0 };
  }
}

/**
 * Extract top, middle, and bottom bands from image
 */
async function extractBands(
  image: Buffer,
  width: number,
  height: number,
  bandHeight: number
): Promise<{ top: Buffer; middle: Buffer; bottom: Buffer }> {
  const img = sharp(image);

  const [top, middle, bottom] = await Promise.all([
    img.extract({ left: 0, top: 0, width, height: bandHeight }).png().toBuffer(),
    img.extract({ left: 0, top: bandHeight, width, height: bandHeight }).png().toBuffer(),
    img.extract({ left: 0, top: bandHeight * 2, width, height: bandHeight }).png().toBuffer(),
  ]);

  return { top, middle, bottom };
}

/**
 * Calculate percentage similarity between two image buffers
 * Uses pixel comparison with tolerance
 */
function calculateSimilarity(img1: Buffer, img2: Buffer): number {
  if (img1.length !== img2.length) {
    return 0;
  }

  let similarPixels = 0;
  const sampleRate = 4; // Check every 4th pixel for performance

  for (let i = 0; i < img1.length; i += sampleRate) {
    const diff = Math.abs(img1[i] - img2[i]);
    if (diff < 10) { // Tolerance for minor differences
      similarPixels++;
    }
  }

  const totalPixels = img1.length / sampleRate;
  return (similarPixels / totalPixels) * 100;
}

/**
 * Determine direction based on band patterns
 */
function determineDirection(
  similarities: RegionComparison,
  overallSimilarity: number
): DirectionDetectionResult {
  const { top, middle, bottom } = similarities;

  console.log('📊 Analyzing band similarities:', { top, middle, bottom, overall: overallSimilarity });

  // Major change - completely different screen (lowered threshold for better swipe detection)
  if (overallSimilarity < 45) {
    console.log('🔄 Major change detected - new screen/swipe');
    return { direction: 'major', confidence: 0.9 };
  }

  // Check for horizontal swipe pattern:
  // When swiping, all bands change similarly (uniform change across screen)
  const bandVariance = Math.max(top, middle, bottom) - Math.min(top, middle, bottom);
  const uniformChange = bandVariance < 20; // All bands changed by similar amount

  if (uniformChange && overallSimilarity < 65) {
    console.log('↔️ Horizontal swipe detected (uniform change across screen)');
    return { direction: 'horizontal', confidence: 0.85 };
  }

  // Vertical scroll - check middle band stability
  if (middle > 65) {
    // Middle band is stable, content shifted vertically
    const scrollDown = top > bottom; // Top changed more than bottom = scrolled down
    const scrollDirection: 'up' | 'down' = scrollDown ? 'down' : 'up';

    console.log('↕️ Vertical scroll detected, direction:', scrollDirection);
    return {
      direction: 'vertical',
      confidence: 0.85,
      scrollDirection,
    };
  }

  // Minor changes - ignore
  if (overallSimilarity > 85) {
    console.log('⏭️ Minor change, ignoring');
    return { direction: 'none', confidence: 0.95 };
  }

  // Default to major change for anything significant but not clearly vertical
  if (overallSimilarity < 75) {
    console.log('🔄 Significant change detected - likely new screen');
    return { direction: 'major', confidence: 0.7 };
  }

  // Default to none for ambiguous cases
  console.log('❓ Ambiguous change, treating as none');
  return { direction: 'none', confidence: 0.5 };
}

/**
 * Detect scroll direction (up or down) by comparing content flow
 */
export async function detectScrollDirection(
  prevImage: Buffer,
  currImage: Buffer
): Promise<'up' | 'down'> {
  const result = await detectChangeDirection(prevImage, currImage);

  if (result.direction === 'vertical' && result.scrollDirection) {
    return result.scrollDirection;
  }

  // Default to down if we can't determine
  return 'down';
}
