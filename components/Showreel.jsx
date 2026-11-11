'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import MediaModal from './MediaModal';

gsap.registerPlugin(ScrollTrigger);

/**
 * Showreel — scroll-scrubbed image sequence
 *
 * The section pins while you scroll. The frame grows from a rounded card to
 * full screen, and the roofing-sheet film plays frame by frame with the
 * scroll position, forwards and backwards. Three captions follow the story.
 *
 * Frames are drawn on a <canvas> (sharper and smoother than seeking a
 * <video>). They live in /public/frames/roof/frame_0001.webp … _0190.webp.
 * To use a different film, export new frames with:
 *   ffmpeg -i film.mp4 -an -c:v libwebp -quality 72 public/frames/roof/frame_%04d.webp
 * and update FRAME_COUNT.
 */

/* ── Settings ─────────────────────────────────────────────────────── */
const FRAME_COUNT = 190;
const framePath = (i) => `/frames/roof/frame_${String(i + 1).padStart(4, '0')}.webp`;
const SCROLL_LENGTH = '+=320%'; // how long the section stays pinned
const STILL_FRAME = 84; // frame shown when reduced motion is on
const BACKDROP = '#c3cad3'; // matches the film's background, fills around it on phones

const FILM = {
  type: 'video',
  src: '/media/roof-layers.mp4',
  poster: '/media/roof-layers.jpg',
  title: 'Inside the sheet, layer by layer',
};

// captions, each shown for a share of the scroll (0 → 1)
const STEPS = [
  { from: 0, to: 0.28, title: 'One sheet, as it leaves the line.', body: 'From the outside it looks like a single profile.' },
  { from: 0.28, to: 0.74, title: 'Every layer has a job.', body: 'Top coat for colour, core for strength, underside against moisture.' },
  { from: 0.74, to: 1.01, title: 'Bonded back into one.', body: 'Co-extruded so the layers never part on the roof.' },
];

export default function Showreel() {
  const root = useRef(null);
  const canvas = useRef(null);
  const [loaded, setLoaded] = useState(0);
  const [modal, setModal] = useState(-1);

  useEffect(() => {
    const el = root.current;
    const cv = canvas.current;
    const ctx = cv.getContext('2d');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const images = new Array(FRAME_COUNT);
    const state = { frame: 0, drawn: -1, step: -1 };
    let count = 0;
    let alive = true;

    /* draw a frame, scaled to cover the canvas like object-fit: cover */
    const draw = (index) => {
      // fall back to the nearest earlier frame that has loaded
      let i = Math.round(index);
      while (i > 0 && !images[i]?.complete) i--;
      const img = images[i];
      if (!img?.complete || !img.naturalWidth) return;
      if (i === state.drawn && !draw.force) return;
      draw.force = false;
      state.drawn = i;
      const { width: w, height: h } = cv;
      // wide screens: cover. Tall screens: fit the whole frame so the labels
      // in the film aren't cropped, and sit it a little above centre.
      const tall = w / h < 1;
      const s = tall
        ? Math.min(w / img.naturalWidth, h / img.naturalHeight)
        : Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * s;
      const dh = img.naturalHeight * s;
      if (tall) {
        ctx.fillStyle = BACKDROP;
        ctx.fillRect(0, 0, w, h);
      }
      const dy = (h - dh) * (tall ? 0.36 : 0.5);
      ctx.drawImage(img, (w - dw) / 2, dy, dw, dh);
      if (tall) {
        // soften the top and bottom edges of the frame into the backdrop
        const f = dh * 0.14;
        let g = ctx.createLinearGradient(0, dy, 0, dy + f);
        g.addColorStop(0, BACKDROP);
        g.addColorStop(1, 'rgba(195, 202, 211, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, dy - 1, w, f + 1);
        g = ctx.createLinearGradient(0, dy + dh - f, 0, dy + dh);
        g.addColorStop(0, 'rgba(195, 202, 211, 0)');
        g.addColorStop(1, BACKDROP);
        ctx.fillStyle = g;
        ctx.fillRect(0, dy + dh - f, w, f + 1);
      }
    };

    const resize = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      draw.force = true;
      draw(reduce ? STILL_FRAME : state.frame);
    };

    /* captions follow progress */
    const setStep = (p) => {
      const n = STEPS.findIndex((s) => p >= s.from && p < s.to);
      if (n === state.step) return;
      state.step = n;
      el.querySelectorAll('.seq-step').forEach((s, i) => s.classList.toggle('is-on', i === n));
    };

    /* load frames: first one right away, the rest in order */
    const load = (i) =>
      new Promise((res) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = img.onerror = () => {
          if (!alive) return;
          count++;
          setLoaded(count);
          if (i === 0 || Math.abs(i - state.frame) < 2) {
            draw.force = true;
            draw(reduce ? STILL_FRAME : state.frame);
          }
          res();
        };
        img.src = framePath(i);
        images[i] = img;
      });

    (async () => {
      await load(reduce ? STILL_FRAME : 0);
      // load in batches so early frames arrive first
      for (let b = 0; b < FRAME_COUNT && alive; b += 24) {
        const batch = [];
        for (let i = b; i < Math.min(b + 24, FRAME_COUNT); i++) if (!images[i]) batch.push(load(i));
        await Promise.all(batch);
      }
    })();

    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    if (reduce) {
      setStep(0.5);
      return () => {
        alive = false;
        ro.disconnect();
      };
    }

    /* pinned scroll timeline */
    const mm = gsap.matchMedia();
    mm.add(
      { desktop: '(min-width: 900px)', mobile: '(max-width: 899px)' },
      ({ conditions }) => {
        const startClip = conditions.desktop
          ? 'inset(34% 22% 6% 22% round 28px)'
          : 'inset(32% 4% 18% 4% round 20px)';

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: el,
            start: 'top top',
            end: SCROLL_LENGTH,
            pin: true,
            scrub: 0.6,
            onUpdate: (self) => {
              el.style.setProperty('--seq-p', self.progress.toFixed(4));
            },
          },
        });

        // frames run across the whole pin
        tl.to(
          state,
          {
            frame: FRAME_COUNT - 1,
            duration: 1,
            onUpdate: () => {
              draw(state.frame);
              setStep(state.frame / (FRAME_COUNT - 1));
            },
          },
          0
        )
          // stage grows to full screen in the first part
          .fromTo('.seq-stage', { clipPath: startClip }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 0.22, ease: 'power2.inOut' }, 0)
          .to('.seq-head', { yPercent: -50, opacity: 0, duration: 0.14 }, 0)
          .fromTo('.seq-ui', { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0.16)
          .fromTo('.seq-end', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.08 }, 0.9);

        return () => tl.scrollTrigger?.kill();
      }
    );

    return () => {
      alive = false;
      ro.disconnect();
      mm.revert();
    };
  }, []);

  const pct = Math.round((loaded / FRAME_COUNT) * 100);

  return (
    <section ref={root} className="seq" aria-label="Inside the sheet">
      <div className="seq-head wrap">
        <h2 className="h2">See what&apos;s inside the sheet.</h2>
        <p className="lede">Keep scrolling to take a roofing sheet apart, layer by layer.</p>
      </div>

      <div className="seq-stage">
        <canvas ref={canvas} role="img" aria-label="A roofing sheet separating into its layers and joining back together" />

        <div className="seq-ui wrap">
          <div className="seq-steps" aria-live="polite">
            {STEPS.map((s, i) => (
              <div className={`seq-step ${i === 0 ? 'is-on' : ''}`} key={s.title}>
                <p className="seq-title">{s.title}</p>
                <p className="seq-body">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="seq-end">
            <button className="btn btn-ink" onClick={() => setModal(0)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
              Watch the film
            </button>
          </div>

          <div className="seq-bar" aria-hidden="true">
            <span />
          </div>
        </div>

        {pct < 100 && (
          <p className="seq-loading" aria-live="polite">
            Loading frames {pct}%
          </p>
        )}
      </div>

      <MediaModal items={[FILM]} index={modal} onIndex={setModal} onClose={() => setModal(-1)} />

      <style jsx>{`
        .seq {
          --seq-p: 0;
          position: relative;
          height: 100svh;
          overflow: hidden;
          background: var(--paper);
        }
        .seq-head {
          position: absolute;
          top: clamp(90px, 11vh, 130px);
          left: 0;
          right: 0;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          flex-wrap: wrap;
        }
        .seq-stage {
          position: absolute;
          inset: 0;
          z-index: 2;
          background: #c3cad3;
          clip-path: inset(34% 22% 6% 22% round 28px);
        }
        .seq-stage canvas {
          display: block;
          width: 100%;
          height: 100%;
        }

        .seq-ui {
          position: absolute;
          inset: auto 0 0 0;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          padding-bottom: clamp(40px, 7vh, 72px);
          opacity: 0;
          pointer-events: none;
        }
        .seq-steps {
          position: relative;
          width: min(440px, 100%);
          min-height: 120px;
        }
        .seq-step {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 20px 22px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(12px);
          opacity: 0;
          transform: translateY(14px);
          transition: opacity 0.5s var(--ease), transform 0.6s var(--ease);
        }
        .seq-step.is-on {
          opacity: 1;
          transform: none;
        }
        .seq-title {
          font-stretch: 110%;
          font-weight: 640;
          font-size: clamp(1.2rem, 1.8vw, 1.6rem);
          line-height: 1.15;
          letter-spacing: -0.02em;
        }
        .seq-body {
          margin-top: 6px;
          color: var(--stone);
          font-size: 0.96rem;
        }
        .seq-end {
          pointer-events: auto;
        }
        .seq-end :global(.btn) {
          gap: 10px;
        }
        .seq-end svg {
          width: 16px;
          height: 16px;
          fill: currentColor;
        }
        .seq-bar {
          position: absolute;
          left: var(--gutter);
          right: var(--gutter);
          bottom: 20px;
          height: 2px;
          background: rgba(27, 38, 49, 0.12);
        }
        .seq-bar span {
          display: block;
          height: 100%;
          background: var(--ink);
          transform-origin: left;
          transform: scaleX(var(--seq-p));
        }
        .seq-loading {
          position: absolute;
          right: 20px;
          top: 20px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.85);
          color: var(--stone);
          font-size: 0.85rem;
          font-variant-numeric: tabular-nums;
        }

        @media (max-width: 899px) {
          .seq-stage {
            clip-path: inset(32% 4% 18% 4% round 20px);
          }
          .seq-ui {
            flex-direction: column;
            align-items: stretch;
          }
          .seq-end {
            align-self: flex-start;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .seq-stage {
            clip-path: inset(30% 4% 4% 4% round 20px);
          }
          .seq-ui {
            opacity: 1;
          }
          .seq-end {
            opacity: 1;
          }
        }
      `}</style>
    </section>
  );
}