'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const PHRASES = ['Weatherproof every roof', 'Built for storms', 'Trusted family shelter'];

export default function Marquee() {
  const track = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = track.current;
    // loop the track; scroll velocity speeds it up and flips direction
    const loop = gsap.to(el, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
    let dir = 1;
    const st = ScrollTrigger.create({
      onUpdate: (self) => {
        if (self.direction !== dir) {
          dir = self.direction;
        }
        const boost = Math.min(Math.abs(self.getVelocity()) / 250, 6);
        gsap.to(loop, {
          timeScale: dir * (1 + boost),
          duration: 0.25,
          overwrite: true,
          onComplete: () => gsap.to(loop, { timeScale: dir, duration: 1.4, ease: 'power2.out' }),
        });
      },
    });
    return () => {
      st.kill();
      loop.kill();
    };
  }, []);

  const row = [...PHRASES, ...PHRASES];
  return (
    <div className="marquee" aria-label={PHRASES.join(', ')}>
      <div ref={track} className="marquee-track" aria-hidden="true">
        {[...row, ...row].map((p, i) => (
          <span key={i} className="marquee-item">
            {p}
            <svg viewBox="0 0 40 24" aria-hidden="true">
              <path d="M2 22 L20 4 L38 22" fill="none" stroke="currentColor" strokeWidth="3" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}
