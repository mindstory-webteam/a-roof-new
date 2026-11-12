'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Preloader — a small roof line that comes alive.
 *
 *   1. The roof line draws from the ridge out to both eaves.
 *   2. A second line draws in under it (the two-line logo).
 *   3. A few raindrops fall onto the roof, run down the slope and drip off
 *      the eaves.
 *   4. The roof gives a small lift, then rises out; the preloader wipes up
 *      and the page starts.
 */

/* ── The roof (SVG units) ────────────────────────────────────────────── */
const VB_W = 120;
const VB_H = 92;
const STROKE = 5; // line thickness
const CX = VB_W / 2;
const RIDGE_Y = 34; // the peak of the top line
const EAVES_Y = 64; // the ends of the top line
const GAP = 12; // space down to the second line
const LEFT = STROKE;
const RIGHT = VB_W - STROKE;
const chevron = (o) => [`M${CX} ${RIDGE_Y + o} L${LEFT} ${EAVES_Y + o}`, `M${CX} ${RIDGE_Y + o} L${RIGHT} ${EAVES_Y + o}`];
const TOP = chevron(0);
const UNDER = chevron(GAP);
const SIZE = 'clamp(60px, 7.5vw, 96px)'; // width on screen

/* ── Rain ────────────────────────────────────────────────────────────── */
const DROPS = [38, 82, 52, 70, 26, 94]; // where each drop lands along the roof (x)
const DROP_R = 2.2;
// height of the top line's upper edge at x
const roofY = (x) => RIDGE_Y + (Math.abs(x - CX) / (CX - LEFT)) * (EAVES_Y - RIDGE_Y) - STROKE / 2 - DROP_R;

export default function Preloader({ onDone }) {
  const root = useRef(null);

  useEffect(() => {
    const el = root.current;
    const roof = el.querySelector('.pre-roof');
    const top = el.querySelectorAll('.pre-top');
    const under = el.querySelectorAll('.pre-under');
    const drops = el.querySelectorAll('.pre-drop');
    document.documentElement.classList.add('is-loading');

    // undrawn to start (pathLength=1, so a dash of 1 is the whole line)
    gsap.set([top, under], { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set(drops, { opacity: 0 });

    // one drop: fall onto the roof, run down to the nearer eave, drip off
    const rain = gsap.timeline();
    drops.forEach((d, i) => {
      const x = DROPS[i];
      const endX = x < CX ? LEFT : RIGHT;
      const run = Math.abs(endX - x) / (CX - LEFT);
      rain.add(
        gsap
          .timeline()
          .set(d, { attr: { cx: x, cy: 0 }, opacity: 0 })
          .to(d, { opacity: 1, duration: 0.08 })
          .to(d, { attr: { cy: roofY(x) }, duration: 0.32, ease: 'power2.in' }, 0)
          .to(d, { attr: { cx: endX, cy: roofY(endX) }, duration: 0.15 + run * 0.35, ease: 'power1.in' })
          .to(d, { attr: { cy: `+=${VB_H - EAVES_Y}` }, opacity: 0, duration: 0.3, ease: 'power1.in' }),
        i * 0.17
      );
    });

    const tl = gsap.timeline({
      onComplete: () => {
        document.documentElement.classList.remove('is-loading');
      },
    });

    tl.to(top, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut' }, 0.2)
      .to(under, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' }, 0.65)
      .add(rain, 1.0)
      // a small lift once the rain has run off
      .to(roof, { y: -6, duration: 0.25, ease: 'power2.out', yoyo: true, repeat: 1 }, '-=0.2')
      // out
      .to(roof, { y: -40, opacity: 0, duration: 0.6, ease: 'expo.in' }, '+=0.1')
      .call(() => onDone?.(), null, '-=0.25')
      .to(el, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' }, '<')
      .set(el, { display: 'none' });

    return () => {
      tl.kill();
      document.documentElement.classList.remove('is-loading');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={root} className="preloader" role="status" aria-label="Loading">
      <svg className="pre-roof" viewBox={`0 0 ${VB_W} ${VB_H}`} aria-hidden="true">
        {DROPS.map((x) => (
          <circle key={x} className="pre-drop" cx={x} cy="0" r={DROP_R} />
        ))}
        {TOP.map((d) => (
          <path key={d} className="pre-line pre-top" d={d} pathLength="1" />
        ))}
        {UNDER.map((d) => (
          <path key={d} className="pre-line pre-under" d={d} pathLength="1" />
        ))}
      </svg>

      <style jsx>{`
        .preloader {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pre-roof {
          display: block;
          width: ${SIZE};
          height: auto;
          overflow: visible;
        }
        .pre-line {
          fill: none;
          stroke: currentColor;
          stroke-width: ${STROKE};
          stroke-linecap: round;
        }
        .pre-under {
          opacity: 0.55;
        }
        .pre-drop {
          fill: currentColor;
        }
      `}</style>
    </div>
  );
}