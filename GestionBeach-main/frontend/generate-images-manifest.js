const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, 'public', 'images');
const manifest = {};

// Leer todas las carpetas en /public/images
const folders = fs.readdirSync(imagesDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

console.log('📂 Carpetas encontradas:', folders);

folders.forEach(folder => {
  const folderPath = path.join(imagesDir, folder);
  const files = fs.readdirSync(folderPath)
    .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
    .map(file => `/images/${folder}/${file}`);

  manifest[folder] = files;
  console.log(`✅ ${folder}: ${files.length} imágenes`);
});

// Guardar el manifest
const outputPath = path.join(__dirname, 'public', 'images-manifest.json');
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf8');

console.log('✅ Manifest generado en:', outputPath);
console.log('📊 Total de carpetas:', Object.keys(manifest).length);
console.log('📸 Total de imágenes:', Object.values(manifest).reduce((sum, arr) => sum + arr.length, 0));
