'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TESTS } from '@/lib/content';

gsap.registerPlugin(ScrollTrigger);

// cross-section lines of the two sheet profiles, drawn in each card
const TILE_PATH = (() => {
  let d = 'M0 50';
  for (let x = 0; x < 400; x += 50) d += ` C${x + 6} 8 ${x + 44} 8 ${x + 50} 50`;
  return d;
})();
const TRAFFORD_PATH = (() => {
  let d = 'M0 50';
  for (let x = 0; x < 400; x += 80) d += ` L${x + 18} 50 L${x + 28} 14 L${x + 52} 14 L${x + 62} 50 L${x + 80} 50`;
  return d;
})();

export default function Tests() {
  const root = useRef(null);
  const track = useRef(null);

  useEffect(() => {
    const mm = gsap.matchMedia();

    // desktop: pin the section and travel sideways through the tests
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      const el = track.current;
      const distance = () => el.scrollWidth - window.innerWidth;
      const tween = gsap.to(el, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });
      gsap.to('.tests-progress span', {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: () => `+=${distance()}`,
          scrub: true,
        },
      });
      // each figure rises as its panel slides into view
      gsap.utils.toArray('.test-card').forEach((card) => {
        const path = card.querySelector('.test-profile path');
        const len = path.getTotalLength();
        gsap.fromTo(
          path,
          { strokeDasharray: len, strokeDashoffset: len },
          {
            strokeDashoffset: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: card,
              containerAnimation: tween,
              start: 'left 95%',
              end: 'left 40%',
              scrub: true,
            },
          }
        );
        gsap.from(card.querySelector('.test-figure'), {
          yPercent: 40,
          opacity: 0,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            containerAnimation: tween,
            start: 'left 90%',
            end: 'left 55%',
            scrub: true,
          },
        });
      });
    });

    return () => mm.revert();
  }, []);

  return (
    <section id="technology" ref={root} className="tests">
      <div ref={track} className="tests-track">
        <div className="tests-intro">
          <h2 className="h2">Seven tests every sheet passes.</h2>
          <p className="lede">
            Each figure here is something somebody can hold us to, not a claim. Keep scrolling for
            the test behind each one.
          </p>
        </div>

        {TESTS.map((t, i) => (
          <article key={t.area} className="test-card">
            <p className="test-area">{t.area}</p>
            <svg className="test-profile" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true">
              <path d={i % 2 ? TRAFFORD_PATH : TILE_PATH} />
            </svg>
            <p className="test-figure">
              {t.unit === 'UL' && <span className="test-unit pre">UL</span>}
              <span className="test-value">{t.value}</span>
              {t.unit !== 'UL' && <span className="test-unit">{t.unit}</span>}
            </p>
            <p className="test-caption">{t.caption}</p>
            <h3 className="test-title">{t.title}</h3>
            <p className="test-body">{t.body}</p>
          </article>
        ))}
      </div>
      <div className="tests-progress" aria-hidden="true">
        <span />
      </div>
    </section>
  );
}
