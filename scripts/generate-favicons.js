const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Design the brand favicon SVG
// An elegant deep obsidian circle with gold border, containing a luminous golden 4-point compass star / AI intelligence spark (✦)
function getSvg(size) {
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0E1A2E" />
        <stop offset="100%" stop-color="#050B14" />
      </linearGradient>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF" />
        <stop offset="25%" stop-color="#F5E6C4" />
        <stop offset="60%" stop-color="#C9A96E" />
        <stop offset="100%" stop-color="#B89758" />
      </linearGradient>
      <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#DFC182" stop-opacity="0.6" />
        <stop offset="100%" stop-color="#C9A96E" stop-opacity="0.2" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- Dark rounded squircle background -->
    <rect x="4" y="4" width="92" height="92" rx="26" fill="url(#bgGrad)" stroke="url(#ringGrad)" stroke-width="2.5" />

    <!-- Subtle inner orbit ring -->
    <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(201, 169, 110, 0.22)" stroke-width="1.2" stroke-dasharray="3,3" />

    <!-- Radiant AI Travel Compass Star (✦) -->
    <!-- Stylized 4-point diamond star representing Voyage / AI navigation -->
    <path d="M 50 18 Q 50 44 24 50 Q 50 56 50 82 Q 50 56 76 50 Q 50 44 50 18 Z" 
          fill="url(#goldGrad)" 
          filter="url(#glow)" />

    <!-- Center core spark -->
    <circle cx="50" cy="50" r="4.5" fill="#FFFFFF" />
    <circle cx="50" cy="50" r="2" fill="#0B1D3A" />
  </svg>
  `;
}

async function run() {
  const publicDir = path.join(__dirname, '..', 'public');

  // 1. Save favicon.svg
  const svgContent = getSvg(100);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf8');
  console.log('Created favicon.svg');

  // 2. Generate PNG sizes
  const sizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-48x48.png', size: 48 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 }
  ];

  for (const s of sizes) {
    const svg = getSvg(s.size);
    await sharp(Buffer.from(svg))
      .resize(s.size, s.size)
      .png()
      .toFile(path.join(publicDir, s.name));
    console.log(`Created ${s.name}`);
  }

  // 3. Create a valid multi-image ICO file for favicon.ico (containing 16x16, 32x32, 48x48)
  const icoSizes = [16, 32, 48];
  const pngBuffers = [];
  for (const size of icoSizes) {
    const buf = await sharp(Buffer.from(getSvg(size)))
      .resize(size, size)
      .png()
      .toBuffer();
    pngBuffers.push({ size, buf });
  }

  // Construct standard ICO binary
  const numImages = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + (dirEntrySize * numImages);

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(numImages, 4);

  const dirEntries = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(item.size === 256 ? 0 : item.size, 0); // width
    entry.writeUInt8(item.size === 256 ? 0 : item.size, 1); // height
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(item.buf.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset of image data
    dirEntries.push(entry);
    offset += item.buf.length;
  }

  const icoBuffer = Buffer.concat([
    header,
    ...dirEntries,
    ...pngBuffers.map(p => p.buf)
  ]);

  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('Created multi-resolution favicon.ico');

  // 4. Create site.webmanifest
  const manifest = {
    name: "Youssef Abady — AI Engineer Portfolio",
    short_name: "Youssef Abady",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ],
    theme_color: "#0B1D3A",
    background_color: "#060B14",
    display: "standalone"
  };
  fs.writeFileSync(path.join(publicDir, 'site.webmanifest'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Created site.webmanifest');
}

run().catch(console.error);
