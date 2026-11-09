/**
 * The student-facing privacy notice (student-identity-privacy: Plain-language privacy notice).
 * Written for a 13-year-old: short sentences, everyday words. A test checks the reading level.
 * Keep this true to what the app does; the DPIA (docs/dpia.md) is the longer version for adults.
 */
export interface NoticeSection {
  heading: string;
  lines: string[];
}

export const PRIVACY_NOTICE: NoticeSection[] = [
  {
    heading: 'What we keep',
    lines: [
      'A nickname you pick from a list. It is not your name.',
      'The answers you write, and how your practice goes. Keep private things out of your answers.',
      'Your coins and the things you buy with them.',
    ],
  },
  {
    heading: 'What we never keep',
    lines: [
      'Your name, your email or your phone number.',
      'Any recording of your voice.',
    ],
  },
  {
    heading: 'About your voice',
    lines: [
      'When you speak, your voice is turned into words so the app can check them.',
      'On some phones and Chromebooks your browser does this and sends your voice to its maker, like Google or Apple.',
      'If that does not work, the app may send a short clip to a speech service. The clip is thrown away as soon as it is turned into words.',
      'We only keep the words and the timing. We never keep the sound.',
    ],
  },
  {
    heading: 'Your recovery code',
    lines: [
      'You get a code when you start. It lets you carry on from another phone or computer.',
      'We cannot look it up for you. If you lose it, you can start again.',
    ],
  },
  {
    heading: 'How to delete everything',
    lines: [
      'Open this page and press Delete everything. It takes a moment.',
      'All of your progress is gone from our side straight away. This phone or computer goes back to how it was on day one.',
    ],
  },
];

export const NOTICE_TEXT = PRIVACY_NOTICE.flatMap((s) => [s.heading + '.', ...s.lines]).join(' ');
