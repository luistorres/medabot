#!/usr/bin/env node

/**
 * Copy PDF.js worker file to public directory
 * This ensures the worker is available locally instead of loading from CDN
 */

import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = join(__dirname, '..');
// Copy from react-pdf's bundled pdfjs-dist instead of top-level
const workerSource = join(projectRoot, 'node_modules/react-pdf/node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const publicDir = join(projectRoot, 'public');
const workerDest = join(publicDir, 'pdf.worker.min.mjs');

try {
  // Create public directory if it doesn't exist
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
    console.log('✓ Created public directory');
  }

  // Check if source file exists
  if (!existsSync(workerSource)) {
    console.error('✗ PDF.js worker source file not found:', workerSource);
    console.error('  Make sure pdfjs-dist is installed: npm install pdfjs-dist');
    process.exit(1);
  }

  // Copy the worker file
  copyFileSync(workerSource, workerDest);
  console.log('✓ Copied PDF.js worker to public/pdf.worker.min.mjs');
  console.log('  This ensures the worker loads locally instead of from CDN');

} catch (error) {
  console.error('✗ Error copying PDF.js worker:', error.message);
  process.exit(1);
}
