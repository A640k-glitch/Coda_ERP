const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="20 20 54 58">
  <rect x="38" y="22" width="34" height="14" rx="3" fill="#0d9488"/>
  <rect x="22" y="32" width="18" height="38" rx="3.5" fill="#0f172a"/>
  <rect x="34" y="62" width="38" height="14" rx="3" fill="#0f172a"/>
</svg>`;

const PUBLIC = path.join(__dirname, '..', 'public');

const sizes = [
  { name: 'favicon-16x16.png', width: 16 },
  { name: 'favicon-32x32.png', width: 32 },
  { name: 'apple-touch-icon.png', width: 180 },
];

// og:image needs 1200x630 landscape with logo centered
const OG_W = 1200, OG_H = 630;
const LOGO_W = 260, LOGO_H = Math.round(LOGO_W * (58 / 54));
const PAD = 48;

async function main() {
  for (const { name, width } of sizes) {
    const height = Math.round(width * (58 / 54));
    await sharp(Buffer.from(SVG)).resize(width, height).png().toFile(path.join(PUBLIC, name));
    console.log(`Generated ${name} (${width}x${height})`);
  }

  // og:image — render logo on a white canvas
  const logoPng = await sharp(Buffer.from(SVG)).resize(LOGO_W, LOGO_H).png().toBuffer();
  const canvas = await sharp({
    create: { width: OG_W, height: OG_H, channels: 4, background: { r: 15, g: 23, b: 42, alpha: 1 } },
  })
    .composite([
      {
        input: logoPng,
        top: Math.round((OG_H - LOGO_H) / 2),
        left: Math.round((OG_W - LOGO_W) / 2),
      },
    ])
    .png()
    .toFile(path.join(PUBLIC, 'og-image.png'));
  console.log(`Generated og-image.png (${OG_W}x${OG_H})`);

  console.log('Done');
}

main().catch(console.error);
