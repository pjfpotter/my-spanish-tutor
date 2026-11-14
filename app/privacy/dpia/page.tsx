import { readFileSync } from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { Win } from '../../components/Win';
import '../../components/screens.css';

export const dynamic = 'force-static';

/** The DPIA is written in docs/dpia.md and shown here as is: headings, paragraphs and bullets only. */
export default function Dpia() {
  const md = readFileSync(path.join(process.cwd(), 'docs', 'dpia.md'), 'utf8').replace(/\r\n/g, '\n'); // a Windows checkout has CRLF line ends
  const inline = (t: string) => t.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((p, i) => (p.startsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p.startsWith('`') ? <code key={i}>{p.slice(1, -1)}</code> : p));
  const blocks = md.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  return (
    <main className="screen">
      <h1>Impact assessment</h1>
      <Win title="dpia.txt" label="Data protection impact assessment">
        <div className="stack" data-testid="dpia">
          {blocks.map((b, i) => {
            if (b.startsWith('# ')) return null;
            if (b.startsWith('## ')) return <h2 key={i}>{b.slice(3)}</h2>;
            if (b.startsWith('- ')) return <ul key={i}>{b.split('\n').map((l, j) => <li key={j}>{inline(l.replace(/^- /, ''))}</li>)}</ul>;
            return <p key={i}>{inline(b)}</p>;
          })}
        </div>
      </Win>
      <p><Link href="/privacy">Back to the privacy notice</Link></p>
    </main>
  );
}
