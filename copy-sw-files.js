const fs = require('fs');
const path = require('path');

// Direktori sumber dan tujuan
const srcDir = path.join(__dirname, 'src');
const destDir = path.join(__dirname, 'www');

// Pastikan direktori tujuan ada
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// File-file yang akan disalin
const filesToCopy = [
  'firebase-messaging-sw.js',
  'manifest.webmanifest'
];

// Salin file-file
filesToCopy.forEach(file => {
  const srcPath = path.join(srcDir, file);
  const destPath = path.join(destDir, file);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${file} to www directory`);
  } else {
    console.error(`Source file ${file} not found`);
  }
});

console.log('Service worker and manifest files copied successfully.'); 