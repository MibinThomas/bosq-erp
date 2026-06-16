const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function convert() {
  const logoSvgPath = path.join(__dirname, 'public', 'assets', 'logo', 'BOSQ R LOGO.svg');
  const logoPngPath = path.join(__dirname, 'public', 'assets', 'logo', 'BOSQ_R_LOGO.png');
  const watermarkSvgPath = path.join(__dirname, 'public', 'assets', 'logo', 'Watermark.svg');
  const watermarkPngPath = path.join(__dirname, 'public', 'assets', 'logo', 'Watermark.png');

  try {
    if (fs.existsSync(logoSvgPath)) {
      console.log('Converting logo SVG to PNG...');
      await sharp(logoSvgPath).png().toBuffer().then(buf => {
        fs.writeFileSync(logoPngPath, buf);
        console.log('Saved logo to', logoPngPath);
      });
    } else {
      console.log('Logo SVG not found at', logoSvgPath);
    }

    if (fs.existsSync(watermarkSvgPath)) {
      console.log('Converting watermark SVG to PNG...');
      await sharp(watermarkSvgPath).png().toBuffer().then(buf => {
        fs.writeFileSync(watermarkPngPath, buf);
        console.log('Saved watermark to', watermarkPngPath);
      });
    } else {
      console.log('Watermark SVG not found at', watermarkSvgPath);
    }
  } catch (err) {
    console.error('Error during conversion:', err);
  }
}

convert();
