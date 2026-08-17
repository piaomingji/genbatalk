import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Talkie - Real-time voice translation',
    short_name: 'Talkie',
    description: 'Real-time voice translation between any two languages.',
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
