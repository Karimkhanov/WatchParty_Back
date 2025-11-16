const { queues } = require('../config/queue');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../config/logger');

// Image processing configurations
const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150 },
  small: { width: 300, height: 300 },
  medium: { width: 600, height: 600 },
  large: { width: 1200, height: 1200 },
};

const QUALITY = {
  jpeg: 85,
  png: 90,
  webp: 85,
};

/**
 * Process image: resize, optimize, and create multiple sizes
 */
const processImage = async (inputPath, outputDir, filename, sizes = ['thumbnail', 'medium']) => {
  const results = {};

  try {
    // Read original image
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    logger.info(`Processing image: ${filename} (${metadata.width}x${metadata.height})`);

    // Process each requested size
    for (const sizeName of sizes) {
      const size = IMAGE_SIZES[sizeName];
      if (!size) {
        logger.warn(`Unknown size: ${sizeName}`);
        continue;
      }

      const ext = path.extname(filename);
      const baseName = path.basename(filename, ext);
      const outputFilename = `${baseName}-${sizeName}${ext}`;
      const outputPath = path.join(outputDir, outputFilename);

      // Resize and optimize
      await image
        .clone()
        .resize(size.width, size.height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: QUALITY.jpeg, progressive: true })
        .toFile(outputPath);

      results[sizeName] = {
        path: outputPath,
        filename: outputFilename,
        size: sizeName,
      };

      logger.info(`✅ Created ${sizeName} version: ${outputFilename}`);
    }

    // Also create WebP version for modern browsers
    const webpFilename = `${path.basename(filename, path.extname(filename))}.webp`;
    const webpPath = path.join(outputDir, webpFilename);

    await image
      .clone()
      .resize(IMAGE_SIZES.medium.width, IMAGE_SIZES.medium.height, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: QUALITY.webp })
      .toFile(webpPath);

    results.webp = {
      path: webpPath,
      filename: webpFilename,
      size: 'webp',
    };

    logger.info(`✅ Created WebP version: ${webpFilename}`);

    return results;
  } catch (error) {
    logger.error('Error processing image:', error);
    throw error;
  }
};

/**
 * Optimize existing image without resizing
 */
const optimizeImage = async (inputPath, outputPath) => {
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    logger.info(`Optimizing image: ${path.basename(inputPath)}`);

    // Optimize based on format
    if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
      await image.jpeg({ quality: QUALITY.jpeg, progressive: true }).toFile(outputPath);
    } else if (metadata.format === 'png') {
      await image.png({ quality: QUALITY.png, compressionLevel: 9 }).toFile(outputPath);
    } else if (metadata.format === 'webp') {
      await image.webp({ quality: QUALITY.webp }).toFile(outputPath);
    } else {
      // For other formats, just copy
      await fs.copyFile(inputPath, outputPath);
    }

    // Get file sizes
    const inputStats = await fs.stat(inputPath);
    const outputStats = await fs.stat(outputPath);
    const savedBytes = inputStats.size - outputStats.size;
    const savedPercent = ((savedBytes / inputStats.size) * 100).toFixed(2);

    logger.info(
      `✅ Image optimized: saved ${savedBytes} bytes (${savedPercent}%)`
    );

    return {
      originalSize: inputStats.size,
      optimizedSize: outputStats.size,
      savedBytes,
      savedPercent,
    };
  } catch (error) {
    logger.error('Error optimizing image:', error);
    throw error;
  }
};

/**
 * Delete old profile picture files
 */
const deleteOldProfilePicture = async (oldFilePath) => {
  try {
    if (!oldFilePath) return;

    const uploadsDir = path.join(__dirname, '../../uploads');
    const fullPath = path.join(uploadsDir, oldFilePath);

    // Check if file exists
    try {
      await fs.access(fullPath);
      await fs.unlink(fullPath);
      logger.info(`🗑️ Deleted old profile picture: ${oldFilePath}`);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
      // File doesn't exist, skip
    }

    // Also delete resized versions if they exist
    const ext = path.extname(oldFilePath);
    const baseName = path.basename(oldFilePath, ext);

    for (const sizeName of Object.keys(IMAGE_SIZES)) {
      const sizedFilename = `${baseName}-${sizeName}${ext}`;
      const sizedPath = path.join(uploadsDir, sizedFilename);

      try {
        await fs.unlink(sizedPath);
        logger.info(`🗑️ Deleted old resized image: ${sizedFilename}`);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          logger.warn(`Could not delete ${sizedFilename}:`, err.message);
        }
      }
    }

    // Delete WebP version
    const webpFilename = `${baseName}.webp`;
    const webpPath = path.join(uploadsDir, webpFilename);
    try {
      await fs.unlink(webpPath);
      logger.info(`🗑️ Deleted old WebP image: ${webpFilename}`);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        logger.warn(`Could not delete ${webpFilename}:`, err.message);
      }
    }
  } catch (error) {
    logger.error('Error deleting old profile picture:', error);
    // Don't throw - this is not critical
  }
};

// Image processing worker
queues.imageProcessing.process(async (job) => {
  const { action, data } = job.data;

  logger.info(`🖼️ Processing image job: ${action}`);

  try {
    switch (action) {
      case 'processProfilePicture': {
        const { inputPath, outputDir, filename, sizes } = data;
        const results = await processImage(inputPath, outputDir, filename, sizes);
        return { success: true, results };
      }

      case 'optimizeImage': {
        const { inputPath, outputPath } = data;
        const stats = await optimizeImage(inputPath, outputPath);
        return { success: true, stats };
      }

      case 'deleteOldProfilePicture': {
        const { filePath } = data;
        await deleteOldProfilePicture(filePath);
        return { success: true };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    logger.error('❌ Image processing failed:', error);
    throw error;
  }
});

logger.info('🖼️ Image processing worker initialized');

module.exports = {
  processImage,
  optimizeImage,
  deleteOldProfilePicture,
};
