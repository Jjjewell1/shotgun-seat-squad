const sharp = require('./server/node_modules/sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, 'client', 'public');
const svgPath = path.join(publicDir, 'favicon.svg');

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8B5CF6"/>
      <stop offset="100%" style="stop-color:#6D28D9"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <text x="256" y="320" font-size="280" text-anchor="middle" fill="white">🚗</text>
</svg>`;

async function generate() {
  const buffer = Buffer.from(svgContent);

  await sharp(buffer).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
  await sharp(buffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
  await sharp(buffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(buffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32.png'));
  await sharp(buffer).resize(16, 16).png().toFile(path.join(publicDir, 'favicon-16.png'));

  console.log('Generated: icon-192.png, icon-512.png, apple-touch-icon.png, favicon-32.png, favicon-16.png');
}

generate().catch(console.error);
