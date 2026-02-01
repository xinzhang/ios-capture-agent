import sharp from 'sharp';

/**
 * Detect if two images are significantly different
 * @param image1 - First image buffer (null for first capture)
 * @param image2 - Second image buffer
 * @param threshold - Percentage of pixels that must differ (0-1)
 * @returns true if images differ by more than threshold
 */
export async function detectChange(
  image1: Buffer | null,
  image2: Buffer,
  threshold: number = 0.05
): Promise<boolean> {
  // If this is the first capture, always return true
  if (!image1 || !image2) {
    return true;
  }

  try {
    // Get metadata for both images
    const meta1 = await sharp(image1).metadata();
    const meta2 = await sharp(image2).metadata();

    // If dimensions differ significantly, consider it a change
    if (meta1.width !== meta2.width || meta1.height !== meta2.height) {
      return true;
    }

    // Resize to smaller size for faster comparison
    const compareSize = 100;
    const img1Resized = await sharp(image1)
      .resize(compareSize, compareSize, { fit: 'fill' })
      .raw()
      .toBuffer();

    const img2Resized = await sharp(image2)
      .resize(compareSize, compareSize, { fit: 'fill' })
      .raw()
      .toBuffer();

    // Calculate pixel differences
    let differentPixels = 0;
    const totalPixels = compareSize * compareSize;

    for (let i = 0; i < img1Resized.length; i += 3) {
      const r1 = img1Resized[i];
      const g1 = img1Resized[i + 1];
      const b1 = img1Resized[i + 2];

      const r2 = img2Resized[i];
      const g2 = img2Resized[i + 1];
      const b2 = img2Resized[i + 2];

      // Calculate Euclidean distance between colors
      const distance = Math.sqrt(
        Math.pow(r2 - r1, 2) + Math.pow(g2 - g1, 2) + Math.pow(b2 - b1, 2)
      );

      // If color difference is significant, count as different pixel
      if (distance > 50) {
        differentPixels++;
      }
    }

    const differenceRatio = differentPixels / totalPixels;
    const hasChanged = differenceRatio > threshold;

    console.log(`📊 Image difference: ${(differenceRatio * 100).toFixed(2)}% (${differentPixels}/${totalPixels} pixels)`);

    return hasChanged;
  } catch (error) {
    console.error('Error detecting change:', error);
    // On error, assume images are different to be safe
    return true;
  }
}

/**
 * Calculate perceptual hash of an image for faster comparison
 * This is an alternative method that can be more efficient for many comparisons
 */
export async function calculatePerceptualHash(imageBuffer: Buffer): Promise<string> {
  try {
    // Resize to small size and convert to grayscale
    const hashSize = 8;
    const grayscale = await sharp(imageBuffer)
      .resize(hashSize, hashSize, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    // Calculate average pixel value
    let sum = 0;
    for (let i = 0; i < grayscale.length; i++) {
      sum += grayscale[i];
    }
    const average = sum / grayscale.length;

    // Generate hash based on whether each pixel is above or below average
    let hash = '';
    for (let i = 0; i < grayscale.length; i++) {
      hash += grayscale[i] > average ? '1' : '0';
    }

    return hash;
  } catch (error) {
    console.error('Error calculating perceptual hash:', error);
    return '';
  }
}

/**
 * Compare two perceptual hashes and return Hamming distance
 */
export function compareHashes(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    return hash1.length; // Maximum distance
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }

  return distance;
}
