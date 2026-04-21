# Vugg Simulator — Title Screen Proposal

## Overview
A proper title screen for the web UI (`web/index.html`). The first thing users see. Sets the tone before any simulation runs.

## Layout (top to bottom)

### 1. Title
```
VUGG SIMULATOR
```
Large, bold, centered. Clean font. No fancy effects — let the weight of the words carry it. Could use a serif or monospace font for geological gravitas.

### 2. ASCII Art Image
Below the title, render the cave image (provided separately as `title-art.png`) as ASCII art using `<pre>` or a monospace block. The image shows crystals reaching upward toward stalactites in a dark cave — black and white, high contrast, dramatic lighting.

Implementation options:
- **Static ASCII art** — pre-render the image as ASCII text and embed it directly in the HTML. Simplest, fastest, no dependencies.
- **Canvas-to-ASCII** — load the PNG, sample brightness, render characters. More flexible but unnecessary complexity for a title screen.
- **CSS filter on the image** — keep it as an actual image but style it with CSS to look integrated with the text UI.

**Recommendation:** Pre-rendered static ASCII art embedded in `<pre>` tags. It matches the text-adventure aesthetic, loads instantly, and works everywhere. No framework needed.

### 3. Tagline
```
an adventure in crystal growing
millions of years in the making
```
Centered, smaller font, muted color. Two lines. The period is intentional — it's a complete thought.

### 4. Buttons
Four buttons, centered, stacked or in a 2x2 grid:

| Button | Action |
|--------|--------|
| **New Game** | Opens scenario selection (pick archetype, customize fluid chemistry, set temperature) |
| **Load Game** | Loads a saved simulation state from localStorage |
| **Quick Play** | Jumps directly to simulation mode — picks a random archetype and runs with procedural chemistry (the existing `random` scenario) |
| **Library** | Opens Library Mode — browse and learn about all 19 mineral species |

Buttons should be styled simply — monospace, bordered, hover effect. No gradients or rounded corners. The aesthetic is terminal/text-adventure, not modern web app.

## Visual Style
- **Background:** Dark (#0a0a0a or similar)
- **Text:** Light gray / off-white
- **ASCII art:** Slightly dimmer than the text to create depth
- **Accent color:** Amber or warm white — like lantern light in a cave
- **No images except the ASCII art** — everything else is text and CSS
- **Font:** Monospace throughout (system monospace or a web-safe equivalent)

## File to Modify
`web/index.html` — add a title screen section that shows on load. The current simulator UI hides behind it until a button is clicked.

## Reference Image
The cave photograph to convert to ASCII art is at:
`/home/professor/.openclaw/media/inbound/image_2026-04-18_20-59-47---90b0bc2a-fca1-495a-b73a-5fb748f23bdc.png`

Convert this to ASCII art and embed it. Aim for roughly 60-80 characters wide to fit comfortably on screen. Use characters like `@#$%&*+=-:. ` mapped from dark to light.

## After Completion
Commit. Do NOT push — I'll review and merge.
