const sharp = require('sharp');
const path = require('path');

const svgPath = path.join(__dirname, '../public/icon.svg');
const publicDir = path.join(__dirname, '../public');

async function generateIcons() {
  try {
    // Generate regular icons
    await sharp(svgPath)
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'icon-192x192.png'));
    console.log('✓ Created icon-192x192.png');

    await sharp(svgPath)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'icon-512x512.png'));
    console.log('✓ Created icon-512x512.png');

    // Generate maskable icons (with safe zone padding)
    // Maskable icons need content in center 80%, so we resize smaller and add padding
    const maskable192 = await sharp(svgPath)
      .resize(154, 154) // 80% of 192
      .extend({
        top: 19,
        bottom: 19,
        left: 19,
        right: 19,
        background: '#1152d4'
      })
      .png()
      .toFile(path.join(publicDir, 'icon-maskable-192x192.png'));
    console.log('✓ Created icon-maskable-192x192.png');

    const maskable512 = await sharp(svgPath)
      .resize(410, 410) // 80% of 512
      .extend({
        top: 51,
        bottom: 51,
        left: 51,
        right: 51,
        background: '#1152d4'
      })
      .png()
      .toFile(path.join(publicDir, 'icon-maskable-512x512.png'));
    console.log('✓ Created icon-maskable-512x512.png');

    // Also create apple-touch-icon
    await sharp(svgPath)
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    console.log('✓ Created apple-touch-icon.png');

    // Create favicon
    await sharp(svgPath)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon-32x32.png'));
    console.log('✓ Created favicon-32x32.png');

    await sharp(svgPath)
      .resize(16, 16)
      .png()
      .toFile(path.join(publicDir, 'favicon-16x16.png'));
    console.log('✓ Created favicon-16x16.png');

    console.log('\n✅ All PWA icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
