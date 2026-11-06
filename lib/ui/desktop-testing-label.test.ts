import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NO_PROGRESS, phaseStates } from '../phases/gate';
import { Desktop } from '../../app/components/Desktop';

const render = (unlockAll: boolean) =>
  renderToStaticMarkup(createElement(Desktop, { states: phaseStates(NO_PROGRESS, { unlockAll }), unlockAll, daysToTest: 10 }));

describe('the testing label on the desktop (course-unlock-testing)', () => {
  it('says in words that every step is open, for a testing course', () => {
    const html = render(true);
    expect(html).toContain('data-testid="testing-label"');
    expect(html).toContain('Testing course:');
    expect(html).toContain('every step is open');
  });

  it('shows no label for a gated course, and its steps stay locked', () => {
    const html = render(false);
    expect(html).not.toContain('testing-label');
    expect(html).not.toContain('Testing course');
    expect(html).toContain('data-state="locked"');
  });

  it('opens all four step links in a testing course', () => {
    const html = render(true);
    expect(html).not.toContain('data-state="locked"');
    expect((html.match(/data-state="open"/g) ?? []).length).toBe(4);
  });
});
