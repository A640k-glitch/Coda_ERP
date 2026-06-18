const sharp = require('sharp');
const fs = require('fs');

async function processIcon() {
  const inputPath = 'public/apple-touch-icon.png';
  const backupPath = 'public/apple-touch-icon-original.png';
  
  // Create a 180x180 solid white background (3 channels = absolutely no alpha channel)
  const background = sharp({
    create: {
      width: 180,
      height: 180,
      channels: 3,
      background: '#ffffff'
    }
  });

  // Load the original image and resize it to fit securely within 110x110
  // 'inside' resizes keeping aspect ratio, without adding any padding
  const foreground = await sharp(backupPath)
    .resize(110, 110, { 
      fit: 'inside' 
    })
    .toBuffer();

  // Composite the resized foreground perfectly in the center of the solid white background
  await background
    .composite([{ input: foreground, gravity: 'center' }])
    .png()
    .toFile(inputPath);
    
  console.log('Successfully composited apple-touch-icon.png over a solid white square.');
}

processIcon().catch(console.error);
