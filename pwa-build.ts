import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';
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
          '/assets/marvin-logo-v3.webp',
          '/assets/marvin.webp',
          '/assets/planet.webp',
          '/favicon-v3.png',
          '/icons/icon-dark-v2-192.png',
          '/icons/icon-dark-v2-512.png',
          '/icons/apple-touch-icon-dark-v2.png',
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
        const worker = readFileSync(
          new URL('./src/service-worker.js', import.meta.url),
          'utf8',
        );
        hash.update(worker);
        const source = worker
          .replaceAll(
            '__CAMPUS_BUILD__',
            JSON.stringify(hash.digest('hex').slice(0, 12)),
          )
          .replaceAll('__CAMPUS_ASSETS__', JSON.stringify(assets));
        this.emitFile({ type: 'asset', fileName: 'sw.js', source });
      },
    },
  };
}
