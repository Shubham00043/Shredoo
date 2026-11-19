import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SHREDoo – Private Collaborative Listening Lounge',
    short_name: 'SHREDoo',
    description:
      'Listen collaboratively with real-time synchronized music, LiveKit HD voice, and per-user audio mixer.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0c0e12',
    theme_color: '#d97706',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
