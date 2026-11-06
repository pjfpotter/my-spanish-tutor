import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NothingToPractise } from '../../app/components/NothingToPractise';

describe('memorise and automate with no answer to practise', () => {
  it.each([['Memorizar', 'memorizar.exe'], ['Automatizar', 'automatizar.exe']])('%s says what to do instead of "all done" or crashing', (heading, windowTitle) => {
    const html = renderToStaticMarkup(createElement(NothingToPractise, { heading, windowTitle }));
    expect(html).toContain(heading);
    expect(html).toContain('nothing to practise yet');
    expect(html).toContain('href="/phases/write"');
    expect(html).toContain('href="/"');
    expect(html).not.toMatch(/memorised|All done/i);
  });
});
