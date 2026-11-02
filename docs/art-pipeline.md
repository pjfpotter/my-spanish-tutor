# Art assets and animation pipeline

Source: notes from a chat about the workflow for producing the final character and look (pasted 2026-11-01). Kept as written. How it applies to this project is in `docs/design-direction.md`.

## Problem

Claude Design is strong at layout and direction but weak at producing usable illustration assets. Claude handles the animation well, so the gap is the art assets.

## Tools

- Recraft (V4.1) generates native SVG with real paths and structured layers. Generated vectors can carry excess anchor points and redundant layers.
- LottieFiles AI Vector Generator makes layered SVGs that open in Lottie Creator.
- Always check the Layers panel (Inkscape or Illustrator) to confirm a file is real vector and not a wrapped raster.
- The Figma MCP can now write to the canvas, but it is built for UI layout, not character illustration. It is optional, for tidying and naming layers later.
- No tool reliably outputs a character already split into body parts with animation pivots.

## Workflow (low-effort version)

1. Use Claude Design for the brief only: style, palette, parts list (head, torso, arms, eyes, mouth).
2. Generate looks in Recraft with a style reference, and pick one.
3. Upload the image to Claude, which rebuilds it as clean SVG with named groups and pivot points. Flat, geometric styles work best, and fine texture and shading will be simplified.
4. Claude animates it (idle, talk, wave or blink) as code or Lottie.
5. Start with one character, one app, one animation, and ship that before touching anything else.

## Photography

Claude Design avoids photography, so treat photos as a later swap-in.

- Build mockups with named, fixed-aspect-ratio placeholder slots (e.g. `hero-old-modem-4x3`), then make a shot list and a 30-minute sourcing timebox.
- Sources for old tech: Wikimedia Commons, Smithsonian Open Access, Library of Congress, The Met Open Access, Internet Archive, Flickr Commons, Rawpixel public domain, and Unsplash/Pexels/Pixabay (thinner on old tech).
- Prefer CC0 or public domain. CC-BY needs attribution, and CC-BY-SA requires share-alike. Watch for brand logos and recognisable people.
- AI-generated images are fine for abstract or moody shots, but not for recognisable real hardware.

## Aesthetic vs accessibility (dreamcore)

- Put the atmosphere (haze, grain, surreal imagery, sound, characters, transitions, empty states) around the task, not on it. Reading and interaction surfaces stay clear and high-contrast.
- Non-negotiables: WCAG AA contrast (4.5:1 for text), no meaning carried by colour or blur alone, prefers-reduced-motion respected plus a calm switch, a legible body font with stylised fonts for titles only, and generous tap targets with predictable patterns.
- Structure the visuals as design tokens (colours, fonts, backgrounds, motion intensity), one set per aesthetic. Accessibility settings sit in a separate learner-controlled layer, and the accessibility floor is never a theme.
- Build dreamcore first, structured so that adding a second theme is cheap, and don't build theme-switching until the first theme ships.
- Test with two or three other 13-year-olds beyond Dolores.
