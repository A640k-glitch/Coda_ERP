const sharp = require('sharp');
const fs = require('fs');

async function processIcon() {
  const inputPath = 'public/apple-touch-icon.png';
  const backupPath = 'public/apple-touch-icon-original.png';
  
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(inputPath, backupPath);
  }

  // Load the original image
  const image = sharp(backupPath);
  const metadata = await image.metadata();

  // Resize the logo to be smaller so it acts as an inner image
  // Assuming target is 180x180, we resize inner to 120x120 and pad 30 on each side
  await image
    .resize(120, 120, { 
      fit: 'contain', 
      background: { r: 255, g: 255, b: 255, alpha: 0 } 
    })
    .extend({
      top: 30,
      bottom: 30,
      left: 30,
      right: 30,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .toFile(inputPath);
    
  console.log('Successfully padded apple-touch-icon.png with a white background.');
}

processIcon().catch(console.error);
