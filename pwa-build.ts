import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';
// Keep worker and foreground validation identical without a second worker bundle.
function workerTemplate() {
  const protocol = readFileSync(
    new URL('./src/lib/public-cache.js', import.meta.url),
    'utf8',
  ).replace(/^export /gm, '');
  return readFileSync(
    new URL('./src/service-worker.js', import.meta.url),
    'utf8',
  ).replace('/* __CAMPUS_PUBLIC_CACHE__ */', protocol);
}
export function renderServiceWorker(build: string, assets: string[]) {
  return workerTemplate()
    .replaceAll('__CAMPUS_BUILD__', JSON.stringify(build))
    .replaceAll('__CAMPUS_ASSETS__', JSON.stringify(assets));
}
export function campusPwa(): Plugin {
  return {
    name: 'campus-pwa',
    apply: 'build',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const publicAssets = [
          '/theme.js',
          '/manifest.webmanifest',
          '/fonts/InterVariable.woff2',
          '/fonts/Inter-LICENSE.txt',
          '/licenses/unlikely-ui-LICENSE.txt',
          '/assets/mascot-mint-head-v1.webp',
          '/assets/mascot-m2-thinking-v1.webp',
          '/assets/planet.webp',
          '/favicon-mint-v1.png',
          '/icons/icon-mint-v1-192.png',
          '/icons/icon-mint-v1-512.png',
          '/icons/apple-touch-icon-mint-v1.png',
        ];
        const assets = [
          '/',
          ...publicAssets,
          ...Object.keys(bundle)
            .filter((name) => /\.(js|css)$/.test(name))
            .map((name) => '/' + name),
        ];
        const hash = createHash('sha256');
        for (const item of Object.values(bundle))
          hash.update(item.type === 'chunk' ? item.code : item.source);
        for (const path of publicAssets)
          hash.update(
            readFileSync(new URL('./public' + path, import.meta.url)),
          );
        hash.update(workerTemplate());
        const source = renderServiceWorker(
          hash.digest('hex').slice(0, 12),
          assets,
        );
        this.emitFile({ type: 'asset', fileName: 'sw.js', source });
      },
    },
  };
}
