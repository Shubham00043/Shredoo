import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve(process.cwd(), 'public');

function createSvg(size) {
  const radius = size * 0.22;
  const strokeWidth = size * 0.055;
  const cx = size / 2;
  const cy = size / 2;

  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#181a20" />
        <stop offset="100%" stop-color="#0c0e12" />
      </linearGradient>
      <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fbbf24" />
        <stop offset="50%" stop-color="#f59e0b" />
        <stop offset="100%" stop-color="#d97706" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="${size * 0.02}" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <!-- Background Squircle -->
    <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bgGrad)" />
    <rect width="${size - 4}" height="${size - 4}" x="2" y="2" rx="${radius}" fill="none" stroke="rgba(245, 158, 11, 0.2)" stroke-width="2" />
    
    <!-- Central Sound Waves & Radio Broadcast symbol -->
    <g transform="translate(${cx}, ${cy})" filter="url(#glow)">
      <!-- Left waves -->
      <path d="M -${size * 0.22} -${size * 0.18} A ${size * 0.28} ${size * 0.28} 0 0 0 -${size * 0.22} ${size * 0.18}" fill="none" stroke="url(#amberGrad)" stroke-width="${strokeWidth}" stroke-linecap="round" />
      <path d="M -${size * 0.12} -${size * 0.10} A ${size * 0.15} ${size * 0.15} 0 0 0 -${size * 0.12} ${size * 0.10}" fill="none" stroke="url(#amberGrad)" stroke-width="${strokeWidth}" stroke-linecap="round" />
      
      <!-- Center Core dot -->
      <circle cx="0" cy="0" r="${size * 0.06}" fill="url(#amberGrad)" />
      
      <!-- Right waves -->
      <path d="M ${size * 0.12} -${size * 0.10} A ${size * 0.15} ${size * 0.15} 0 0 1 ${size * 0.12} ${size * 0.10}" fill="none" stroke="url(#amberGrad)" stroke-width="${strokeWidth}" stroke-linecap="round" />
      <path d="M ${size * 0.22} -${size * 0.18} A ${size * 0.28} ${size * 0.28} 0 0 1 ${size * 0.22} ${size * 0.18}" fill="none" stroke="url(#amberGrad)" stroke-width="${strokeWidth}" stroke-linecap="round" />
    </g>
  </svg>
  `;
}

async function run() {
  const sizes = [
    { size: 192, name: 'icon-192.png' },
    { size: 512, name: 'icon-512.png' },
    { size: 180, name: 'apple-touch-icon.png' },
    { size: 48, name: 'favicon.ico' },
  ];

  for (const { size, name } of sizes) {
    const svg = createSvg(size);
    const dest = path.join(publicDir, name);
    await sharp(Buffer.from(svg))
      .png()
      .toFile(dest);
    console.log(`Generated: ${name} (${size}x${size})`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
