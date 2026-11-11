# A-Roof — home page

Next.js 16 (App Router) + GSAP/ScrollTrigger + Three.js + Lenis smooth scroll. White theme.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Structure

```
app/
  layout.js        fonts + metadata
  page.js          assembles the sections
  globals.css      all styles and design tokens (top of file)
components/
  RoofScene.jsx    Three.js roof sheet: tile/trafford morph, colour tween, rain
  SmoothScroll.jsx Lenis wired into GSAP's ticker + anchor links
  Preloader.jsx    counter + wordmark, then wipes away
  Nav.jsx          hides on scroll down, blurs after 40px, mobile menu
  Hero.jsx         headline reveal, Monsoon/Summer toggle, scroll-linked 3D
  Marquee.jsx      speeds up / reverses with scroll velocity
  About.jsx        word-by-word scroll reveal, counting stats
  Showreel.jsx     pinned video that grows from a framed card to full screen
  Products.jsx     profile tabs + colour swatches drive a live 3D sheet
  Gallery.jsx      project photos: filter (All/Homes/Commercial), parallax, lightbox
  VideoStories.jsx video cards: hover to preview, click for full-screen player
  MediaModal.jsx   shared lightbox / video player (Esc, arrow keys)
  Tests.jsx        pinned horizontal scroll (vertical stack under 900px)
  Faq.jsx          GSAP accordion
  Cta.jsx          roof line that draws on scroll
  Footer.jsx       large wordmark
lib/content.js     all copy, colours and test figures — edit here
```

## Photos and videos

Everything in `public/media/` is a **placeholder rendered from the 3D sheet**. Replace the files
with your real photos and videos, keeping the same names, or edit the paths in `lib/content.js`
(`SHOWREEL`, `PROJECTS`, `VIDEOS`).

| File | Used in | Recommended |
| --- | --- | --- |
| `showreel.mp4` + `showreel.jpg` (poster) | Showreel | 1920×1080, 10–40 s loop, under 8 MB, no audio needed for the loop |
| `project-1.jpg` … `project-6.jpg` | Projects gallery | 2000 px wide JPG/WebP, landscape |
| `clip-rain.mp4`, `clip-trafford.mp4`, `clip-coast.mp4` + `.jpg` posters | Video cards | 1280×720, 8–20 s, under 4 MB |

To add more projects, add rows to `PROJECTS` with `kind: 'Homes'` or `'Commercial'`.
The project names and places in `PROJECTS` are samples, so replace them with real jobs.

To compress a video: `ffmpeg -i in.mov -vf scale=1920:-2 -c:v libx264 -crf 26 -preset veryfast -an -movflags +faststart showreel.mp4`

## Editing

- Colours / fonts: CSS variables at the top of `app/globals.css`.
- Sheet colours and specs: `PRODUCTS` in `lib/content.js` (hex values feed the 3D sheet).
- Test figures: `TESTS` in `lib/content.js`. 35%, 30 dB and 150 kg were marked as placeholders on the reference site — confirm before launch.
- Contact phone/email are placeholders in `Cta.jsx` and `Footer.jsx`.
- Reduced-motion users get no rain, no pinning and no scroll scrubbing.
