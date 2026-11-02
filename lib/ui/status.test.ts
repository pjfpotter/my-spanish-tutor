import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Status, type StatusKind } from './Status';

const kinds: StatusKind[] = ['done', 'retry', 'locked'];

describe('Status: no state is shown by colour alone', () => {
  it.each(kinds)('%s renders a shape and its words', (kind) => {
    const html = renderToStaticMarkup(createElement(Status, { kind, label: 'Some words' }));
    expect(html).toContain('Some words');
    expect(html).toContain(`data-shape="${kind}"`);
    expect(html).toContain('aria-hidden="true"'); // the shape is decoration for the words beside it
  });

  it('gives each state a different shape', () => {
    const shapes = kinds.map((kind) => renderToStaticMarkup(createElement(Status, { kind, label: 'x' })).match(/<svg.*<\/svg>/)![0]);
    expect(new Set(shapes).size).toBe(kinds.length);
  });

  it('refuses a status with no label', () => {
    expect(() => renderToStaticMarkup(createElement(Status, { kind: 'done', label: '  ' }))).toThrow('text label');
  });
});
