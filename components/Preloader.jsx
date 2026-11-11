'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function Preloader({ onDone }) {
  const root = useRef(null);

  useEffect(() => {
    const el = root.current;
    const count = el.querySelector('.pre-count');
    const bar = el.querySelector('.pre-bar span');
    const letters = el.querySelectorAll('.pre-word span');
    const state = { v: 0 };
    document.documentElement.classList.add('is-loading');

    const tl = gsap.timeline({
      onComplete: () => {
        document.documentElement.classList.remove('is-loading');
      },
    });

    tl.fromTo(letters, { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.05, ease: 'expo.out' })
      .to(
        state,
        {
          v: 100,
          duration: 1.8,
          ease: 'power2.inOut',
          onUpdate: () => {
            count.textContent = Math.round(state.v);
            bar.style.transform = `scaleX(${state.v / 100})`;
          },
        },
        0.1
      )
      .to(letters, { yPercent: -110, duration: 0.6, stagger: 0.03, ease: 'expo.in' }, '+=0.1')
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
      <div className="pre-word" aria-hidden="true">
        {'A-ROOF'.split('').map((c, i) => (
          <span key={i}>{c}</span>
        ))}
      </div>
      <div className="pre-meta">
        <p>UPVC roofing sheets</p>
        <p>
          <span className="pre-count">0</span>%
        </p>
      </div>
      <div className="pre-bar">
        <span />
      </div>
    </div>
  );
}
