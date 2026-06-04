#!/usr/bin/env node
// Re-saves PNG files via sharp to strip metadata and ensure clean encoding for Android builds.
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const dirs = [
  path.join(__dirname, '..', 'assets', 'images', 'salah'),
  path.join(__dirname, '..', 'assets', 'images', 'wudu'),
];

async function processPngs() {
  let processed = 0;
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.png'));
    for (const file of files) {
      const filePath = path.join(dir, file);
      const tmp = filePath + '.tmp';
      await sharp(filePath)
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toFile(tmp);
      fs.renameSync(tmp, filePath);
      console.log(`Processed: ${path.relative(process.cwd(), filePath)}`);
      processed++;
    }
  }
  console.log(`\nDone. ${processed} PNG(s) re-saved.`);
}

processPngs().catch(err => { console.error(err); process.exit(1); });
