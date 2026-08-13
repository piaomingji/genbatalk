import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ゲンバトーク - AI音声通訳インカム',
    short_name: 'ゲンバトーク',
    description: '現場で働く外国人労働者・警察・行政向けAIリアルタイム同時通訳インカムアプリ',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#6366f1',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
