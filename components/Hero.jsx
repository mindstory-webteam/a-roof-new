'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Hero — sky video, ghosted word, cut-out house, then a scroll-scrubbed
 * weather film of the same house.
 *
 * At rest it looks exactly like before. Scroll, and the section pins:
 *
 *   1. Match cut   The ghost word lifts away, the headline slides up out of
 *                  view, and the house PNG glides and scales onto the house in
 *                  frame 0 of the film. The film fades in underneath it, then
 *                  the PNG fades out. Because both line up, the swap is seamless.
 *   2. The film    Scroll scrubs the frames: clear sky → clouds → monsoon
 *                  downpour → sun again. A caption and a weather timeline
 *                  follow along.
 *   3. Outro       The closing headline rises in over the last frame, and the
 *                  page carries on.
 *
 * Scrolling back plays it all in reverse.
 *
 * Frames: /public/frames/hero/lg/000.webp … 094.webp (1280px, desktop)
 *         /public/frames/hero/sm/000.webp … 094.webp (854px, phones)
 *
 * prefers-reduced-motion: no pin, no film, the static hero only.
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

// one caption per stretch of the film; `at` is the frame it starts on
const BEATS = [
  { at: 0, label: 'Sun', title: 'Full sun', body: 'The ASA top coat keeps its colour in the hardest light.' },
  { at: 27, label: 'Clouds', title: 'The sky turns', body: 'The sheets are fixed at every crown, so they stay put when the wind picks up.' },
  { at: 46, label: 'Monsoon', title: 'Then the rain', body: 'Water runs straight off the channels. Nothing pools, nothing seeps.' },
  { at: 70, label: 'After', title: 'And the sun again', body: 'The same colour and the same shape, season after season.' },
];
const OUTRO = ['Rain or shine,', 'it still looks new'];

/* ── Assets (from /public) ───────────────────────────────────────────── */
const HERO_VIDEO = '/video/sky-1.mp4';
const HERO_VIDEO_POSTER = ''; // optional first-frame image
const HERO_IMAGE = '/image/home-4.png'; // transparent PNG

const FRAME_COUNT = 95;
const FRAME_W = 1280; // aspect of the frames (both sets share it)
const FRAME_H = 720;
const frameSrc = (set, i) => `/frames/hero/${set}/${String(i).padStart(3, '0')}.webp`;

// Where the house PNG sits on frame 0, as fractions of the frame.
// Measured by lining the PNG's roof ridge and eaves up with the film.
const MATCH = { x: 12 / 1280, y: 9 / 720, w: 1262 / 1280 };

// Which part of the frame stays in view when the screen crops it:
// 0.5 = centre, 0 = top. Top keeps the roof in on very wide screens.
const FOCUS_X = 0.5;
const FOCUS_Y = 0;

/* ── Scroll ──────────────────────────────────────────────────────────── */
const PIN_LENGTH = '+=380%'; // longer = slower film

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

/** Cover-fit a FRAME_W × FRAME_H frame into w × h, honouring the focus point. */
const coverFit = (w, h) => {
  const s = Math.max(w / FRAME_W, h / FRAME_H);
  const dw = FRAME_W * s;
  const dh = FRAME_H * s;
  return { s, dw, dh, ox: (w - dw) * FOCUS_X, oy: (h - dh) * FOCUS_Y };
};

export default function Hero({ ready = true }) {
  const root = useRef(null);
  const video = useRef(null);
  const canvas = useRef(null);
  const progress = useRef(0); // 0 … 1 through the pinned scroll
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
    gsap.set(q('.outro-line'), { yPercent: 106 });
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

  /* The pinned scroll: match cut → film → outro. */
  useEffect(() => {
    if (prefersReduced()) return;
    const el = root.current;
    const cv = canvas.current;
    const ctx = cv.getContext('2d');
    const q = gsap.utils.selector(el);

    /* ---------- frames ---------- */
    const set = window.innerWidth < 900 || navigator.connection?.saveData ? 'sm' : 'lg';
    const frames = new Array(FRAME_COUNT);
    const loaded = new Uint8Array(FRAME_COUNT);
    let current = 0;
    let dead = false;

    const nearest = (i) => {
      for (let d = 0; d < FRAME_COUNT; d++) {
        if (i - d >= 0 && loaded[i - d]) return frames[i - d];
        if (i + d < FRAME_COUNT && loaded[i + d]) return frames[i + d];
      }
      return null;
    };

    let cw = 0;
    let ch = 0;
    const draw = () => {
      const img = nearest(current);
      if (!img || !cw) return;
      const f = coverFit(cw, ch);
      ctx.drawImage(img, f.ox, f.oy, f.dw, f.dh);
    };

    const load = (i) =>
      new Promise((res) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          if (dead) return res();
          frames[i] = img;
          loaded[i] = 1;
          if (Math.abs(i - current) < 3) draw();
          res();
        };
        img.onerror = res;
        img.src = frameSrc(set, i);
      });

    // frame 0 right away (it's the match-cut target), the rest in the background
    load(0).then(() => {
      let next = 1;
      const worker = async () => {
        while (!dead && next < FRAME_COUNT) await load(next++);
      };
      const start = () => !dead && Array.from({ length: 6 }, worker);
      'requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 400);
    });

    /* ---------- canvas sizing ---------- */
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cw = el.clientWidth;
      ch = el.clientHeight;
      cv.width = Math.round(cw * dpr);
      cv.height = Math.round(ch * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingQuality = 'high';
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    /* ---------- where the house PNG has to go to sit on frame 0 ---------- */
    const drift = el.querySelector('.house-drift');
    const target = () => {
      const f = coverFit(el.clientWidth, el.clientHeight);
      const w = drift.offsetWidth || 1;
      return {
        x: f.ox + MATCH.x * f.dw - drift.offsetLeft,
        y: f.oy + MATCH.y * f.dh - drift.offsetTop,
        scale: (MATCH.w * f.dw) / w,
      };
    };

    /* ---------- captions follow the frame ---------- */
    const beatEls = q('.beat');
    const tickEls = q('.wx-step');
    let beatIdx = -1;
    const setBeat = (frame) => {
      let b = 0;
      BEATS.forEach((s, i) => frame >= s.at && (b = i));
      if (b === beatIdx) return;
      beatIdx = b;
      beatEls.forEach((n, i) => n.classList.toggle('is-on', i === b));
      tickEls.forEach((n, i) => {
        n.classList.toggle('is-on', i <= b);
        n.classList.toggle('is-now', i === b);
      });
    };
    setBeat(0);

    const film = { frame: 0 };
    const onFrame = () => {
      const f = Math.round(film.frame);
      if (f !== current) {
        current = f;
        draw();
      }
      setBeat(f);
      // fill of the weather timeline
      el.style.setProperty('--wx', (film.frame / (FRAME_COUNT - 1)).toFixed(4));
    };

    /* ---------- the timeline (total duration 1 = the whole pin) ---------- */
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: el,
        start: 'top top',
        end: PIN_LENGTH,
        pin: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          progress.current = self.progress;
          el.dispatchEvent(new CustomEvent('hero:progress'));
        },
      },
    });

    tl
      // 1. match cut — copy leaves, ghost lifts, house glides onto frame 0
      .to(q('.ghost-scroll'), { yPercent: -55, opacity: 0, filter: 'blur(10px)', duration: 0.12, ease: 'power1.in' }, 0)
      .to(q('.roof-mask'), { y: -70, opacity: 0, filter: 'blur(8px)', duration: 0.08, stagger: 0.025, ease: 'power2.in' }, 0)
      .to(q('.tag-move'), { y: -40, opacity: 0, duration: 0.07, ease: 'power2.in' }, 0)
      .to(q('.house-morph'), { x: () => target().x, y: () => target().y, scale: () => target().scale, duration: 0.15, ease: 'power2.inOut' }, 0.02)
      .to(q('.roof-fade'), { opacity: 0.35, duration: 0.12 }, 0.03)
      .to(cv, { opacity: 1, duration: 0.05 }, 0.12)
      .to(q('.house-morph'), { opacity: 0, duration: 0.03 }, 0.17)
      // 2. the film
      .to(q('.roof-fade'), { opacity: 0.8, duration: 0.05 }, 0.18)
      .fromTo(q('.roof-beats'), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.05, ease: 'power2.out' }, 0.18)
      .fromTo(q('.roof-wx'), { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.18)
      .to(film, { frame: FRAME_COUNT - 1, duration: 0.7, onUpdate: onFrame }, 0.2)
      // 3. outro
      .to(q('.roof-beats'), { opacity: 0, y: -30, duration: 0.04, ease: 'power2.in' }, 0.88)
      .to(q('.roof-wx'), { opacity: 0, duration: 0.04 }, 0.9)
      .to(q('.roof-fade'), { opacity: 1, duration: 0.06 }, 0.88)
      .to(q('.outro-line'), { yPercent: 0, duration: 0.07, stagger: 0.025, ease: 'power3.out' }, 0.91);

    return () => {
      dead = true;
      ro.disconnect();
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  /* Background video: `muted` must be a property before play(), and play()
     can reject on autoplay policy, so it's caught and retried once. Pauses
     when the hero is off screen or the film covers it. */
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    const el = root.current;
    const reduce = prefersReduced();
    let visible = true;
    const covered = () => progress.current > 0.2;

    const tryPlay = () => !reduce && visible && !covered() && v.paused && v.play().catch(() => {});
    const sync = () => (covered() ? !v.paused && v.pause() : tryPlay());
    const onReady = () => {
      setVideoReady(true);
      tryPlay();
    };
    if (v.readyState >= 2) onReady();
    v.addEventListener('loadeddata', onReady);
    window.addEventListener('pointerdown', tryPlay, { once: true });
    el.addEventListener('hero:progress', sync);

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      visible ? tryPlay() : v.pause();
    });
    io.observe(el);

    return () => {
      v.removeEventListener('loadeddata', onReady);
      window.removeEventListener('pointerdown', tryPlay);
      el.removeEventListener('hero:progress', sync);
      io.disconnect();
    };
  }, []);

  /* Cursor drift: house toward the pointer, ghost word away from it.
     Settles back to centre once the scroll story starts. */
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
      if (progress.current > 0.005) return apply(0, 0);
      const r = el.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom) return apply(0, 0);
      apply(
        clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2)),
        clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2))
      );
    };
    const onLeave = () => apply(0, 0);
    const onProgress = () => progress.current > 0.005 && apply(0, 0);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    el.addEventListener('hero:progress', onProgress);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('hero:progress', onProgress);
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

      {/* 3. the film, scrubbed frame by frame (fades in under the house) */}
      <canvas ref={canvas} className="roof-film" aria-hidden="true" />

      {/* 4. house: drift (cursor) → morph (scroll) → img (entrance) */}
      <div className="house-drift">
        <div className="house-morph">
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

      {/* 5. dark fade into the ground */}
      <div className="roof-fade" aria-hidden="true" />

      {/* 6. copy */}
      <div className="roof-copy">
        <div className="tag-move">
          <p className="roof-tag">{TAGLINE}</p>
        </div>
        <h1 className="roof-head">
          {HEADLINE.map((line) => (
            <span className="roof-mask" key={line}>
              <span className="roof-line">{line}</span>
            </span>
          ))}
        </h1>
      </div>

      {/* 7. film captions */}
      <div className="roof-beats" aria-live="polite">
        {BEATS.map((b, i) => (
          <div className="beat" key={b.label}>
            <p className="beat-count">
              {String(i + 1).padStart(2, '0')} <span>/ {String(BEATS.length).padStart(2, '0')}</span>
            </p>
            <p className="beat-title">{b.title}</p>
            <p className="beat-body">{b.body}</p>
          </div>
        ))}
      </div>

      {/* 8. weather timeline */}
      <ol className="roof-wx" aria-hidden="true">
        <span className="wx-fill" />
        {BEATS.map((b) => (
          <li
            className="wx-step"
            key={b.label}
            style={{ left: `${(b.at / (FRAME_COUNT - 1)) * 100}%` }}
          >
            {b.label}
          </li>
        ))}
      </ol>

      {/* 9. outro */}
      <div className="roof-outro" aria-hidden="true">
        <p className="roof-head">
          {OUTRO.map((line) => (
            <span className="outro-mask" key={line}>
              <span className="outro-line">{line}</span>
            </span>
          ))}
        </p>
      </div>

      <style jsx>{`
        .roof {
          --wx: 0;
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

        /* 3. film */
        .roof-film {
          position: absolute;
          inset: 0;
          z-index: 2;
          width: 100%;
          height: 100%;
          display: block;
          opacity: 0;
          pointer-events: none;
        }

        /* 4. house: centred with a negative margin, not a transform, so the
           cursor drift owns the only transform on its wrapper */
        .house-drift {
          position: absolute;
          bottom: var(--house-lift);
          left: 50%;
          width: var(--house-w);
          margin-left: calc(var(--house-w) / -2);
          z-index: 3;
          pointer-events: none;
          will-change: transform;
        }
        .house-morph {
          transform-origin: 0 0;
          will-change: transform, opacity;
          /* feathered foot: hidden at rest under the fade, and it stops the
             cut-off edge of the PNG showing as a line during the match cut */
          -webkit-mask-image: linear-gradient(to bottom, #000 86%, transparent 100%);
          mask-image: linear-gradient(to bottom, #000 86%, transparent 100%);
        }
        .roof-house {
          display: block;
          width: 100%;
          height: auto;
        }

        /* 5. fade */
        .roof-fade {
          position: absolute;
          inset: 0;
          z-index: 4;
          pointer-events: none;
          background: linear-gradient(
            to top,
            rgba(var(--night), 0.95) 0%,
            rgba(var(--night), 0.72) 15%,
            rgba(var(--night), 0) 42%
          );
        }

        /* 6. copy */
        .roof-copy {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 5;
          padding: 0 var(--gutter) clamp(28px, 4vw, 64px);
          display: flex;
          align-items: flex-end;
          gap: clamp(20px, 3.4vw, 64px);
        }
        .tag-move {
          flex: 0 0 auto;
        }
        .roof-tag {
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
        .roof-mask,
        .outro-mask {
          display: block;
          overflow: hidden;
          padding-bottom: 0.06em;
        }
        .roof-line,
        .outro-line {
          display: block;
        }

        /* 7. film captions */
        .roof-beats {
          position: absolute;
          left: var(--gutter);
          bottom: clamp(84px, 11vh, 120px);
          z-index: 5;
          width: min(460px, calc(100% - 2 * var(--gutter)));
          min-height: 180px;
          opacity: 0;
          pointer-events: none;
        }
        .beat {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          opacity: 0;
          transform: translateY(18px);
          filter: blur(6px);
          transition: opacity 0.5s ease, transform 0.6s cubic-bezier(0.2, 0.7, 0.2, 1), filter 0.5s ease;
        }
        .beat.is-on {
          opacity: 1;
          transform: none;
          filter: none;
        }
        .beat-count {
          margin: 0 0 10px;
          font-size: 0.82rem;
          letter-spacing: 0.14em;
          font-variant-numeric: tabular-nums;
        }
        .beat-count span {
          opacity: 0.55;
        }
        .beat-title {
          margin: 0;
          font-family: var(--font);
          font-stretch: 62%;
          font-weight: 800;
          font-size: clamp(2.4rem, 5vw, 4.6rem);
          line-height: 0.92;
          text-transform: uppercase;
        }
        .beat-body {
          margin: 12px 0 0;
          max-width: 34ch;
          font-size: clamp(0.92rem, 1.1vw, 1.05rem);
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.84);
        }

        /* 8. weather timeline */
        .roof-wx {
          position: absolute;
          left: var(--gutter);
          right: var(--gutter);
          bottom: clamp(30px, 5vh, 48px);
          z-index: 5;
          height: 2px;
          margin: 0;
          padding: 0;
          list-style: none;
          background: rgba(255, 255, 255, 0.22);
          opacity: 0;
          pointer-events: none;
        }
        .wx-fill {
          position: absolute;
          inset: 0;
          background: #fff;
          transform-origin: left;
          transform: scaleX(var(--wx));
        }
        .wx-step {
          position: absolute;
          top: -26px;
          font-size: 0.78rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          white-space: nowrap;
          opacity: 0.5;
          transition: opacity 0.4s ease;
        }
        .wx-step::after {
          content: '';
          position: absolute;
          left: 0;
          top: 22px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgb(var(--night));
          border: 1.5px solid #fff;
          transition: background 0.4s ease;
        }
        .wx-step.is-on {
          opacity: 1;
        }
        .wx-step.is-on::after {
          background: #fff;
        }

        /* 9. outro */
        .roof-outro {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 5;
          padding: 0 var(--gutter) clamp(28px, 4vw, 64px);
          pointer-events: none;
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
          .wx-step {
            font-size: 0.68rem;
            letter-spacing: 0.08em;
          }
          .wx-step:last-child {
            transform: translateX(-60%);
          }
        }
        @media (max-width: 600px) {
          /* narrow screens: dots for every stage, a label only for the current one */
          .wx-step {
            color: transparent;
          }
          .wx-step.is-now {
            color: #fff;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .roof-sky {
            transition: none;
          }
          .roof-film,
          .roof-beats,
          .roof-wx,
          .roof-outro {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}