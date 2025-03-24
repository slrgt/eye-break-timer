const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Create directory if it doesn't exist
const buildDir = path.join(__dirname);
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Create a simple icon (blue circle with eye symbol)
function createIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background - dark blue gradient
  const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  gradient.addColorStop(0, '#1a365d');
  gradient.addColorStop(1, '#0a1a2a');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Draw outer circle
  ctx.strokeStyle = '#9be3ff';
  ctx.lineWidth = size * 0.05;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size * 0.4, 0, Math.PI * 2);
  ctx.stroke();
  
  // Draw eye
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(size/2, size/2, size * 0.25, size * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw pupil
  ctx.fillStyle = '#0a1a2a';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size * 0.08, 0, Math.PI * 2);
  ctx.fill();
  
  // Add highlight
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(size/2 - size * 0.03, size/2 - size * 0.03, size * 0.03, 0, Math.PI * 2);
  ctx.fill();
  
  return canvas.toBuffer('image/png');
}

// Sizes for different platforms
const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

// Generate PNG icons
sizes.forEach(size => {
  const iconData = createIcon(size);
  fs.writeFileSync(path.join(buildDir, `icon-${size}.png`), iconData);
  console.log(`Created icon-${size}.png`);
});

// Create icon.png (512x512) for Linux
fs.copyFileSync(
  path.join(buildDir, 'icon-512.png'),
  path.join(buildDir, 'icon.png')
);
console.log('Created icon.png for Linux');

console.log('Icon generation complete!');
console.log('Note: For Windows .ico and macOS .icns, you may need to use a conversion tool');
console.log('Suggested online converter: https://convertico.com/'); 