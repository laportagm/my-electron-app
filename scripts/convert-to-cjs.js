import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source and destination directories
const srcDir = path.join(__dirname, '../dist/main-es');
const destDir = path.join(__dirname, '../dist/main');

// Ensure destination directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Recursively copy files, converting .js files to .cjs
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.js')) {
        // Convert JS files to CommonJS format
        const content = fs.readFileSync(srcPath, 'utf8');
        const cjsContent = `"use strict";\n${content}`;

        // Write with .cjs extension for main file, otherwise keep .js
        const finalDestPath = entry.name === 'main.js' 
          ? path.join(dest, 'main.cjs')
          : destPath;
          
        fs.writeFileSync(finalDestPath, cjsContent);
      } else {
        // Just copy other files
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

// Execute the conversion
console.log('Converting ES modules to CommonJS...');
copyDirectory(srcDir, destDir);
console.log('Conversion complete!');