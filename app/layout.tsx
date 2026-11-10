import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible, Fredoka, Pixelify_Sans, VT323 } from 'next/font/google';
import { CalmSwitch } from './components/CalmSwitch';
import { SoundSwitch } from './components/SoundSwitch';
import './globals.css';

const atkinson = Atkinson_Hyperlegible({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-atkinson' });
const fredoka = Fredoka({ weight: ['500', '700'], subsets: ['latin'], variable: '--font-fredoka' });
const pixelify = Pixelify_Sans({ weight: ['400', '600'], subsets: ['latin'], variable: '--font-pixelify' });
const vt323 = VT323({ weight: '400', subsets: ['latin'], variable: '--font-vt323' });

export const metadata: Metadata = {
  title: 'My Spanish Tutor',
  description: 'Practise your Spanish speaking test, one answer at a time.',
  appleWebApp: { capable: true, title: 'Spanish Tutor', statusBarStyle: 'default' },
  icons: { apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#4fa9f0',
};

// Applies the saved calm choice before first paint so effects never flash on for a student who turned them off.
const CALM_BOOTSTRAP = `try{if(localStorage.getItem('calm')==='on')document.documentElement.dataset.calm='on'}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fonts = [atkinson, fredoka, pixelify, vt323].map((f) => f.variable).join(' ');
  return (
    <html lang="en" className={fonts} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: CALM_BOOTSTRAP }} />
      </head>
      <body>
        <div className="switches">
          <SoundSwitch />
          <CalmSwitch />
        </div>
        {children}
      </body>
    </html>
  );
}
