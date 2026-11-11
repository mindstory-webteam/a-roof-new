'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Hero — sky video, ghosted word, cut-out house, headline on a dark fade
 *
 *   ┌──────────────────────────── 100svh ────────────────────────────┐
 *   │                 (sky video behind everything)                   │
 *   │              R O O F I N G   ← frosted word in the sky          │
 *   │                   ╱‾‾‾‾‾‾‾‾╲    (the roof overlaps it)          │
 *   │          ╱‾‾‾‾‾‾‾╱  ▯▯  ▯▯  ╲‾‾‾‾‾‾╲   ← house PNG              │
 *   │  tagline        A ROOF THAT                                     │
 *   │  (bottom left)  OUTLASTS EVERY MONSOON   ← on a dark fade       │
 *   └────────────────────────────────────────────────────────────────┘
 *
 * Layers, bottom to top: sky video → ghost word → ground strip → house →
 * dark fade → copy.
 *
 * Motion
 *  - Entrance (after the preloader): ghost letters rise one by one, the house
 *    lifts into place, the headline pushes up out of its masks.
 *  - Scroll: the ghost word floats up and fades faster than the page, the
 *    house sinks slightly slower, the copy fades. This gives the scene depth.
 *  - Cursor (mouse only): the house drifts toward the pointer, the ghost word
 *    drifts the other way.
 *  - prefers-reduced-motion: everything renders in its final state, the video
 *    stays on its first frame.
 *
 * Each moving layer has its own wrapper per motion (cursor / scroll /
 * entrance) so the tweens never fight over one transform.
 */

/* ── Content ─────────────────────────────────────────────────────────── */
const GHOST_WORD = 'ROOFING';
const HEADLINE = ['A roof that', 'outlasts every monsoon'];
const TAGLINE =
  'UPVC roofing sheets that hold their colour and their shape, season after season.';
const IMAGE_ALT = 'A modern house under a dark tiled roof';

/* ── Assets (from /public) ───────────────────────────────────────────── */
const HERO_VIDEO = '/video/sky-1.mp4';
const HERO_VIDEO_POSTER = ''; // optional first-frame image
const HERO_IMAGE = '/image/home.png'; // transparent PNG

/* ── Palette ─────────────────────────────────────────────────────────── */
const SKY = '#3b78b5'; // shows until the video plays
const NIGHT = '4, 9, 15'; // r, g, b of the fade at the foot

/* ── Layout ──────────────────────────────────────────────────────────── */
const HOUSE_WIDTH = '104%'; // desktop: a little over 100% crops the PNG's edges
const HOUSE_WIDTH_MOBILE = '230%';
const HOUSE_LIFT = '-4%'; // negative pushes the house below the bottom edge
const GHOST_TOP = '9%';
const GHOST_TOP_MOBILE = '14%';

/* ── Cursor drift ────────────────────────────────────────────────────── */
const HOUSE_DRIFT = [16, 6]; // px x, y toward the cursor
const GHOST_DRIFT = [30, 10]; // px x, y away from the cursor

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Hero({ ready = true }) {
  const root = useRef(null);
  const video = useRef(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  /* Hide everything before first paint so nothing flashes before the entrance. */
  useIsoLayoutEffect(() => {
    if (prefersReduced()) return;
    const q = gsap.utils.selector(root);
    gsap.set(q('.ghost-letter'), { yPercent: 70, opacity: 0 });
    gsap.set(q('.roof-house'), { y: 90, opacity: 0 });
    gsap.set(q('.roof-line'), { yPercent: 106 });
    gsap.set(q('.roof-tag'), { y: 18, opacity: 0 });
  }, []);

  /* Entrance, once the preloader has cleared. */
  useEffect(() => {
    if (!ready || prefersReduced()) return;
    const q = gsap.utils.selector(root);
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to(q('.ghost-letter'), { yPercent: 0, opacity: 1, duration: 1.6, stagger: 0.06 }, 0)
      .to(q('.roof-house'), { y: 0, opacity: 1, duration: 1.6 }, 0.15)
      .to(q('.roof-line'), { yPercent: 0, duration: 1.15, ease: 'power4.out', stagger: 0.12 }, 0.7)
      .to(q('.roof-tag'), { y: 0, opacity: 1, duration: 0.95 }, 1.05);
    return () => tl.kill();
  }, [ready]);

  /* Scroll depth. */
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const st = { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true };
      gsap.to('.ghost-scroll', { yPercent: -45, opacity: 0.2, ease: 'none', scrollTrigger: st });
      gsap.to('.house-scroll', { yPercent: 10, scale: 1.04, ease: 'none', scrollTrigger: st });
      gsap.to('.roof-copy', {
        y: -60,
        opacity: 0,
        ease: 'none',
        scrollTrigger: { ...st, start: '20% top', end: '70% top' },
      });
    }, root);
    return () => mm.revert();
  }, []);

  /* Background video: `muted` must be a property before play(), and play()
     can reject on autoplay policy, so it's caught and retried once. Pauses
     when the hero is off screen. */
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    const reduce = prefersReduced();
    let visible = true;

    const tryPlay = () => !reduce && visible && v.play().catch(() => {});
    const onReady = () => {
      setVideoReady(true);
      tryPlay();
    };
    if (v.readyState >= 2) onReady();
    v.addEventListener('loadeddata', onReady);
    window.addEventListener('pointerdown', tryPlay, { once: true });

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      visible ? tryPlay() : v.pause();
    });
    io.observe(root.current);

    return () => {
      v.removeEventListener('loadeddata', onReady);
      window.removeEventListener('pointerdown', tryPlay);
      io.disconnect();
    };
  }, []);

  /* Cursor drift: house toward the pointer, ghost word away from it. */
  useEffect(() => {
    if (prefersReduced()) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const el = root.current;
    const opts = { duration: 1.1, ease: 'power3.out' };
    const hx = gsap.quickTo(el.querySelector('.house-drift'), 'x', opts);
    const hy = gsap.quickTo(el.querySelector('.house-drift'), 'y', opts);
    const gx = gsap.quickTo(el.querySelector('.ghost-drift'), 'x', opts);
    const gy = gsap.quickTo(el.querySelector('.ghost-drift'), 'y', opts);
    const clamp = (v) => Math.max(-1, Math.min(1, v));

    const apply = (nx, ny) => {
      hx(nx * HOUSE_DRIFT[0]);
      hy(ny * HOUSE_DRIFT[1]);
      gx(-nx * GHOST_DRIFT[0]);
      gy(-ny * GHOST_DRIFT[1]);
    };
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom) return apply(0, 0);
      apply(
        clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2)),
        clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2))
      );
    };
    const onLeave = () => apply(0, 0);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <section
      id="top"
      ref={root}
      className="roof"
      aria-label="Roofing that lasts"
      style={{
        '--sky': SKY,
        '--night': NIGHT,
        '--house-w': HOUSE_WIDTH,
        '--house-w-m': HOUSE_WIDTH_MOBILE,
        '--house-lift': HOUSE_LIFT,
        '--ghost-top': GHOST_TOP,
        '--ghost-top-m': GHOST_TOP_MOBILE,
      }}
    >
      {/* 1. sky video */}
      {!videoFailed && (
        <div className={`roof-sky ${videoReady ? 'is-ready' : ''}`} aria-hidden="true">
          <video
            ref={video}
            poster={HERO_VIDEO_POSTER || undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            onError={() => setVideoFailed(true)}
          >
            <source src={HERO_VIDEO} type="video/mp4" onError={() => setVideoFailed(true)} />
          </video>
        </div>
      )}

      {/* 2. ghost word */}
      <div className="ghost-drift" aria-hidden="true">
        <div className="ghost-scroll">
          <p className="roof-ghost">
            {GHOST_WORD.split('').map((ch, i) => (
              <span className="ghost-letter" key={i}>
                {ch}
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* ground strip: if the PNG's margin ever shows, it shows dark ground */}
      <div className="roof-ground" aria-hidden="true" />

      {/* 3. house */}
      <div className="house-drift">
        <div className="house-scroll">
          {!imageFailed && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="roof-house"
              src={HERO_IMAGE}
              alt={IMAGE_ALT}
              fetchPriority="high"
              onError={() => setImageFailed(true)}
            />
          )}
        </div>
      </div>

      {/* 4. dark fade into the ground */}
      <div className="roof-fade" aria-hidden="true" />

      {/* 5. copy */}
      <div className="roof-copy">
        <p className="roof-tag">{TAGLINE}</p>
        <h1 className="roof-head">
          {HEADLINE.map((line) => (
            <span className="roof-mask" key={line}>
              <span className="roof-line">{line}</span>
            </span>
          ))}
        </h1>
      </div>

      <style jsx>{`
        .roof {
          position: relative;
          width: 100%;
          height: 100vh;
          height: 100svh;
          min-height: 620px;
          overflow: hidden;
          isolation: isolate;
          background: var(--sky);
          color: #fff;
        }

        /* 1. sky video */
        .roof-sky {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          opacity: 0;
          transition: opacity 900ms ease;
        }
        .roof-sky.is-ready {
          opacity: 1;
        }
        .roof-sky video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* 2. ghost word: a gradient clipped to each letter, frosted at the
           top and almost gone at the bottom */
        .ghost-drift {
          position: absolute;
          left: 0;
          right: 0;
          top: var(--ghost-top);
          z-index: 1;
          pointer-events: none;
          will-change: transform;
        }
        .roof-ghost {
          margin: 0;
          display: flex;
          justify-content: center;
          font-family: var(--font);
          font-stretch: 62%;
          font-weight: 800;
          font-size: clamp(5rem, 27vw, 34rem);
          line-height: 0.86;
          letter-spacing: -0.01em;
          white-space: nowrap;
          user-select: none;
        }
        .ghost-letter {
          display: inline-block;
          color: transparent;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.62) 0%,
            rgba(255, 255, 255, 0.34) 55%,
            rgba(255, 255, 255, 0.08) 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          -webkit-text-stroke: 1px rgba(255, 255, 255, 0.28);
        }

        .roof-ground {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 16%;
          z-index: 1;
          background: rgb(var(--night));
        }

        /* 3. house: centred with a negative margin, not a transform, so the
           cursor drift owns the only transform on its wrapper */
        .house-drift {
          position: absolute;
          bottom: var(--house-lift);
          left: 50%;
          width: var(--house-w);
          margin-left: calc(var(--house-w) / -2);
          z-index: 2;
          pointer-events: none;
          will-change: transform;
        }
        .house-scroll {
          transform-origin: 50% 100%;
        }
        .roof-house {
          display: block;
          width: 100%;
          height: auto;
        }

        /* 4. fade */
        .roof-fade {
          position: absolute;
          inset: 0;
          z-index: 3;
          pointer-events: none;
          background: linear-gradient(
            to top,
            rgba(var(--night), 0.95) 0%,
            rgba(var(--night), 0.72) 15%,
            rgba(var(--night), 0) 42%
          );
        }

        /* 5. copy */
        .roof-copy {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 4;
          padding: 0 var(--gutter) clamp(28px, 4vw, 64px);
          display: flex;
          align-items: flex-end;
          gap: clamp(20px, 3.4vw, 64px);
        }
        .roof-tag {
          flex: 0 0 auto;
          max-width: 26ch;
          margin: 0 0 0.6em;
          font-size: clamp(0.88rem, 1.05vw, 1rem);
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.82);
        }
        .roof-head {
          margin: 0;
          font-family: var(--font);
          font-stretch: 62%;
          font-weight: 800;
          font-size: clamp(2.6rem, 6.2vw, 6.4rem);
          line-height: 0.94;
          letter-spacing: 0.005em;
          text-transform: uppercase;
        }
        .roof-mask {
          display: block;
          overflow: hidden;
          padding-bottom: 0.06em;
        }
        .roof-line {
          display: block;
        }

        @media (max-width: 900px) {
          .house-drift {
            width: var(--house-w-m);
            margin-left: calc(var(--house-w-m) / -2);
          }
          .ghost-drift {
            top: var(--ghost-top-m);
          }
          .roof-copy {
            flex-direction: column-reverse;
            align-items: flex-start;
            gap: 14px;
          }
          .roof-tag {
            max-width: 34ch;
            margin: 0;
          }
          .roof-fade {
            background: linear-gradient(
              to top,
              rgba(var(--night), 0.96) 0%,
              rgba(var(--night), 0.75) 26%,
              rgba(var(--night), 0) 58%
            );
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .roof-sky {
            transition: none;
          }
        }
      `}</style>
    </section>
  );
}