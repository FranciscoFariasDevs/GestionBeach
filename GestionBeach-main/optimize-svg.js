const fs = require('fs');
const path = require('path');

// Ruta al SVG
const svgPath = path.join(__dirname, 'frontend', 'public', 'CABANAS.svg');
const outputPath = path.join(__dirname, 'frontend', 'public', 'CABANAS-optimized.svg');

console.log('📄 Leyendo SVG...');
let svgContent = fs.readFileSync(svgPath, 'utf8');

console.log(`📊 Tamaño original: ${(svgContent.length / 1024 / 1024).toFixed(2)} MB`);

// Optimizaciones simples
console.log('🔧 Optimizando SVG...');

// 1. Eliminar comentarios
svgContent = svgContent.replace(/<!--[\s\S]*?-->/g, '');

// 2. Eliminar metadatos de Inkscape/Sodipodi
svgContent = svgContent.replace(/\s*(inkscape|sodipodi):[a-zA-Z-]+=["'][^"']*["']/g, '');
svgContent = svgContent.replace(/<metadata[\s\S]*?<\/metadata>/g, '');
svgContent = svgContent.replace(/<defs[\s\S]*?<\/defs>/g, '');

// 3. Eliminar namespaces innecesarios
svgContent = svgContent.replace(/\s*xmlns:(inkscape|sodipodi|dc|cc|rdf)=["'][^"']*["']/g, '');

// 4. Reducir decimales en números
svgContent = svgContent.replace(/(\d+\.\d{3,})/g, (match) => {
  return parseFloat(match).toFixed(2);
});

// 5. Eliminar espacios múltiples
svgContent = svgContent.replace(/\s+/g, ' ');

// 6. Eliminar espacios alrededor de signos
svgContent = svgContent.replace(/\s*=\s*/g, '=');
svgContent = svgContent.replace(/\s*>\s*/g, '>');
svgContent = svgContent.replace(/\s*<\s*/g, '<');

console.log(`✅ Tamaño optimizado: ${(svgContent.length / 1024 / 1024).toFixed(2)} MB`);
console.log(`💾 Reducción: ${((1 - svgContent.length / fs.readFileSync(svgPath, 'utf8').length) * 100).toFixed(1)}%`);

// Guardar archivo optimizado
fs.writeFileSync(outputPath, svgContent);
console.log(`✅ SVG optimizado guardado en: ${outputPath}`);
console.log('\n🔄 Para usar el SVG optimizado, reemplaza CABANAS.svg con CABANAS-optimized.svg');
