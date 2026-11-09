# Flippity Randomizer: how it works

Reference note added 9 Nov 2026. Source: the owner's description of `flippity.net/v2/ra.php`. It is background for the writing-flow options in `docs/writing-flow-options.md` (question Q1).

## What it is

A browser-based randomizer that works like a slot machine. It has four vertical "wheels", each a list of text items. Spinning picks one item from each wheel, and the four picks combine into a random prompt.

## The four wheels (this instance)

| Wheel | Colour | Items |
|---|---|---|
| Who | red | an accountant, a quick gray fox, Luke Skywalker, a brilliant physicist, a honey bee, Goldilocks, a small child, your 4th grade teacher, a U.S. senator |
| What | green | personality conflict, a fight over the last doughnut, launching a nuclear missile, hurrying to get to a meeting, a big misunderstanding, an alien invasion, struggling to finish homework, a severe drought, running out of money, a skateboarding accident |
| When | cyan | two years from now, tomorrow, yesterday, twenty years ago, at 3:30pm this afternoon, this very instant, three months from now |
| Where | purple | an enchanted forest, in a laboratory, onboard an aircraft carrier, the ice planet Hoth, in a gingerbread house, the top of a tall mountain, Washington D.C., in a school hallway, the moon, in a submarine, La Paz Bolivia, in a large office building, at the kitchen table, a desert |

## UI and interaction

- Each wheel scrolls vertically. A black arrow on the left marks the selected row, which is enlarged in the centre, with neighbouring items shrinking and fading above and below.
- Every wheel has its own controls: a Spin Wheel button, Move Up 1 and Move Down 1 arrows that step the wheel one item at a time, and a small ✕ under the heading (Remove Item from Wheel) that drops the currently selected item from that wheel.
- Spinning one wheel leaves the others alone. You can re-roll just "Where" and keep the rest.
- The page is wider than a small viewport, so the Where wheel may need a horizontal scroll to reach.

## Data and configuration

- The wheels are not hard-coded. The URL carries a key parameter (`?k=...`) pointing at a Google Sheet that holds the headings and items, and `d=y` appears to be a display flag. This follows Flippity's usual pattern of Google Sheets-driven templates.
- To change the content, edit the source sheet (one column per wheel, heading in the top cell, items beneath) and republish it. The "Want to Make Your Own Randomizer?" link at the top leads to the template.
- Removing items with the ✕ only affects the current page view. It does not change the sheet.

## How to drive it as an agent

- Read the page text to get the full item lists, since the wheel visuals only show a few rows at a time.
- To randomize, click Spin Wheel under each column, or under just the ones you want to re-roll.
- To read the result, take a screenshot and read the enlarged centre row of each wheel, or use the page text, which does not reliably show the selected item.
- For a deterministic result, use Move Up or Move Down to step to a specific item.

## Typical use

Generating story or writing prompts (for example "a honey bee / a fight over the last doughnut / yesterday / the moon"), classroom warm-ups, and improv or ideation exercises.
