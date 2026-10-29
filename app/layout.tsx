import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'My Spanish Tutor',
  description: 'Practise your Spanish speaking test, one answer at a time.',
  appleWebApp: { capable: true, title: 'Spanish Tutor', statusBarStyle: 'default' },
  icons: { apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fff7ed' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1410' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
