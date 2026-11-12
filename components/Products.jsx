'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import RoofScene from './RoofScene';
import Spin360Button from './Spin360Button';
import { STORY_ID, HANDOFF_MEDIA } from './handoff';
import { PRODUCTS } from '@/lib/content';

gsap.registerPlugin(ScrollTrigger);

/**
 * Products — the sheet drops into the stage from the top as you scroll in.
 *
 * Scrubbed to scroll (scroll back up and it lifts out again):
 *   - the sheet falls in from above the stage, tilted back, and straightens
 *   - it lands just past its spot and settles back up (a small bounce)
 *   - a soft shadow grows under it as it lands
 *   - the caption and the info column follow it in
 *
 * Product sinks into the story (desktop):
 *   - once the stage is centred on screen, only the 3D sheet lifts out of
 *     the card; the card, caption and info column scroll away as normal
 *   - the sheet moves down, growing and tipping forward
 *   - SheetStory rises over it, then drops its own sheet in from the top,
 *     so it reads as one sheet falling through into the story
 *
 * 360°: the button on the stage turns on drag-to-rotate.
 */

/* ── Drop tuning ─────────────────────────────────────────────────────── */
const DROP_FROM = -120; // % of the stage height above its spot
const DROP_TILT = 38; // deg tipped back at the start
const DROP_TWIST = -7; // deg turned at the start
const DROP_BOUNCE = 3; // % it overshoots before settling

/* ── Sink tuning (product moving down into SheetStory) ──────────────── */
const SINK_GROW = 1.35; // how much bigger the sheet gets on the way down
const SINK_DOWN = 0.55; // how far down it travels, as a share of the screen height
const SINK_TILT = -28; // deg it tips forward as it goes down
const SINK_TWIST = 6; // deg it turns as it goes down
const ZOOM_MODEL_TURN = 0.5; // how far the 3D sheet itself turns (RoofScene progress)

export default function Products() {
  const root = useRef(null);
  const info = useRef(null);
  const flyRef = useRef(null);
  const stageRef = useRef(null);
  const zoom = useRef({ p: 0 });
  const [key, setKey] = useState('tile');
  const [colourIdx, setColourIdx] = useState(0);
  const [spin, setSpin] = useState(false);
  const product = PRODUCTS[key];
  const colour = product.colours[colourIdx];

  const choose = (k) => {
    if (k === key) return;
    setKey(k);
    setColourIdx(0);
  };

  // swap copy with a short stagger whenever the profile changes
  useEffect(() => {
    const items = info.current.querySelectorAll('.swap');
    gsap.fromTo(
      items,
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, stagger: 0.05, ease: 'power3.out' }
    );
  }, [key]);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(
      { motion: '(prefers-reduced-motion: no-preference)', wide: HANDOFF_MEDIA },
      (ctx) => {
        const { motion, wide } = ctx.conditions;
        if (!motion) return;

        // the stage frame opens
        gsap.from('.stage', {
          clipPath: 'inset(12% 8% 12% 8% round 28px)',
          duration: 1.4,
          ease: 'expo.out',
          clearProps: 'clipPath', // a leftover clip-path would also clip the flying product

          scrollTrigger: { trigger: '.stage', start: 'top 80%' },
        });

        // the sheet drops in from the top, scrubbed to scroll
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: '.stage', start: 'top 95%', end: 'top 25%', scrub: 0.8 },
        });
        tl.fromTo(
          '.drop',
          {
            yPercent: DROP_FROM,
            rotateX: DROP_TILT,
            rotateZ: DROP_TWIST,
            scale: 0.86,
            transformPerspective: 1200,
          },
          { yPercent: DROP_BOUNCE, rotateX: -3, rotateZ: 0, scale: 1, ease: 'power2.in', duration: 0.75 },
          0
        )
          .fromTo('.drop', { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0)
          .to('.drop', { yPercent: 0, rotateX: 0, ease: 'power2.out', duration: 0.25 }, 0.75)
          .fromTo(
            '.drop-shadow',
            { scaleX: 0.3, opacity: 0 },
            { scaleX: 1, opacity: 1, ease: 'power2.in', duration: 0.75 },
            0
          )
          .fromTo('.stage-caption', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.2 }, 0.75)
          .fromTo(info.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, ease: 'power2.out', duration: 0.5 }, 0.4);

        /* ── fly the product into the story (desktop only) ──
           Only .fly (the transparent 3D canvas) moves. The stage card,
           caption, 360° button and info column stay and scroll away normally. */
        const story = document.getElementById(STORY_ID);
        if (!wide || !story) return;

        const stage = stageRef.current;
        const fly = flyRef.current;
        const shadow = stage.querySelector('.drop-shadow');

        // natural size / position of the stage, re-read on every refresh
        const box = { w: 0, h: 0, left: 0 };
        const measure = () => {
          gsap.set(fly, { clearProps: 'width,height' });
          box.w = stage.offsetWidth;
          box.h = stage.offsetHeight;
          box.left = stage.getBoundingClientRect().left;
        };
        measure();
        ScrollTrigger.addEventListener('refreshInit', measure);

        // lift the product out of the card: fixed to the screen at the spot the card is
        // in when it's centred, so it stops scrolling with the card and can grow freely
        let flying = false;
        const setFly = (on) => {
          if (on === flying) return;
          flying = on;
          if (on) {
            gsap.set(fly, {
              position: 'fixed',
              top: (window.innerHeight - box.h) / 2,
              left: box.left,
            });
          } else {
            gsap.set(fly, { clearProps: 'position,top,left' });
          }
        };

        // sink down out of the card, growing and tipping forward, until SheetStory
        // rises over it; SheetStory then drops its own sheet in from its top edge
        const sinkTl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: stage,
            start: 'center center',
            endTrigger: story,
            end: 'top top',
            scrub: true,
            invalidateOnRefresh: true,
            // stay lifted while sinking and after (hidden by then); back in the card when scrolled above
            onToggle: (self) => setFly(self.isActive || self.progress >= 1),
          },
        });
        sinkTl
          .fromTo(
            fly,
            { width: () => box.w, height: () => box.h, x: 0, y: 0 },
            {
              width: () => box.w * SINK_GROW,
              height: () => box.h * SINK_GROW,
              // drift to the middle of the screen and down toward the bottom edge
              x: () => window.innerWidth / 2 - box.left - (box.w * SINK_GROW) / 2,
              y: () => window.innerHeight * SINK_DOWN - (box.h * (SINK_GROW - 1)) / 2,
              ease: 'power2.in',
              duration: 1,
            },
            0
          )
          .fromTo(
            fly,
            { rotationX: 0, rotationZ: 0, transformPerspective: 1400 },
            { rotationX: SINK_TILT, rotationZ: SINK_TWIST, ease: 'power1.in', duration: 1 },
            0
          )
          .to(zoom.current, { p: ZOOM_MODEL_TURN, ease: 'power1.inOut', duration: 1 }, 0)
          .to(shadow, { autoAlpha: 0, duration: 0.25 }, 0)
          // gone once SheetStory has covered it, so it can't show behind later sections
          .to(fly, { autoAlpha: 0, duration: 0.08 }, 0.92);

        return () => {
          ScrollTrigger.removeEventListener('refreshInit', measure);
          setFly(false);
        };
      },
      root
    );
    return () => mm.revert();
  }, []);

  return (
    <section id="products" ref={root} className="products section">
      <div className="wrap">
        <div className="section-head">
          <h2 className="h2">Two profiles, four colours each.</h2>
          <p className="lede">
            Pick a profile and a colour. The sheet on the left is drawn live, so you see how the
            light sits on every rib.
          </p>
        </div>

        <div className="products-grid">
          <div className="stage" ref={stageRef}>
            <span className="drop-shadow" aria-hidden="true" />
            <div className="fly" ref={flyRef}>
              <div className="drop">
                <RoofScene
                  colour={colour.hex}
                  profile={product.profile}
                  weather="none"
                  distance={11}
                  offset={[0, 0.15]}
                  progress={zoom}
                  spin360={spin}
                />
              </div>
            </div>
            <p className="stage-caption">
              {product.name}, {colour.name}
            </p>
            <Spin360Button on={spin} onToggle={() => setSpin((v) => !v)} />
          </div>

          <div className="product-info" ref={info}>
            <div className="tabs" role="tablist" aria-label="Sheet profile">
              {Object.entries(PRODUCTS).map(([k, p]) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={key === k}
                  className={key === k ? 'is-on' : ''}
                  onClick={() => choose(k)}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <p className="product-blurb swap">{product.blurb}</p>

            <ul className="spec-list">
              {product.specs.map((s) => (
                <li key={s} className="swap">
                  {s}
                </li>
              ))}
            </ul>

            <div className="swatches swap">
              <p className="swatch-label">
                Colour <strong>{colour.name}</strong>
              </p>
              <div className="swatch-row" role="radiogroup" aria-label="Sheet colour">
                {product.colours.map((c, i) => (
                  <button
                    key={c.name}
                    role="radio"
                    aria-checked={i === colourIdx}
                    aria-label={c.name}
                    className={`swatch ${i === colourIdx ? 'is-on' : ''}`}
                    style={{ '--c': c.hex }}
                    onClick={() => setColourIdx(i)}
                  />
                ))}
              </div>
            </div>

            <ul className="tag-row swap">
              {product.tags.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* sit BELOW SheetStory, so the story rises over the sinking product */
        .products {
          position: relative;
          z-index: 1;
        }
        .stage {
          position: relative;
          overflow: hidden; /* the sheet appears from the stage's top edge */
        }
        /* the product layer: the only thing that leaves the card.
           pointer-events off so the full-screen layer never blocks clicks;
           360° mode turns them back on for the canvas itself. */
        .fly {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          will-change: transform;
        }
        /* fills the stage the same way RoofScene did on its own */
        .drop {
          position: relative;
          width: 100%;
          height: 100%;
          transform-origin: 50% 0%;
          will-change: transform, opacity;
        }
        .drop-shadow {
          position: absolute;
          left: 18%;
          right: 18%;
          bottom: 14%;
          height: 12%;
          border-radius: 50%;
          background: radial-gradient(closest-side, rgba(27, 38, 49, 0.22), rgba(27, 38, 49, 0));
          filter: blur(6px);
          pointer-events: none;
        }
        .stage :global(.spin360) {
          position: absolute;
          top: 16px;
          right: 16px;
          z-index: 3;
        }
      `}</style>
    </section>
  );
}