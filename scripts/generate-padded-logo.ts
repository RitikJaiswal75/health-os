/**
 * Composites Logo.png smaller on a black square so adaptive icons and
 * Android 12 splash icons are not clipped by circular/squircle masks.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  compositeImagesAsync,
  generateImageAsync,
  generateImageBackgroundAsync,
} from '@expo/image-utils';

const ROOT = path.join(__dirname, '..');
const CANVAS = 1024;
/** ~58% of canvas — inside Android adaptive-icon safe zone (~66%). */
const LOGO_SCALE = 0.58;

async function main(): Promise<void> {
  const logoSize = Math.round(CANVAS * LOGO_SCALE);
  const src = path.join(ROOT, 'assets/images/Logo.png');
  const out = path.join(ROOT, 'assets/images/Logo-adaptive.png');

  const background = await generateImageBackgroundAsync({
    width: CANVAS,
    height: CANVAS,
    backgroundColor: '#000000',
    resizeMode: 'cover',
  });

  const { source: foreground } = await generateImageAsync(
    { projectRoot: ROOT, cacheType: 'logo-adaptive' },
    {
      src,
      resizeMode: 'contain',
      width: logoSize,
      height: logoSize,
    },
  );

  const composed = await compositeImagesAsync({
    background,
    foreground,
    x: (CANVAS - logoSize) / 2,
    y: (CANVAS - logoSize) / 2,
  });

  await fs.writeFile(out, composed);
  console.log(`Wrote ${out} (${CANVAS}x${CANVAS}, logo ${logoSize}px)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
