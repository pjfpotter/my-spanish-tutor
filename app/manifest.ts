import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'My Spanish Tutor',
    short_name: 'Spanish Tutor',
    description: 'Practise your Spanish speaking test, one answer at a time.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fff7ed',
    theme_color: '#fff7ed',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
