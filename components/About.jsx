'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const STATEMENT =
  'A roof is the one part of a house nobody looks at until the night it matters.';

const STATS = [
  { to: 42, dec: 0, suffix: '', label: 'years rolling sheet' },
  { to: 0.47, dec: 2, suffix: 'mm', label: 'base gauge, minimum' },
  { to: 14, dec: 0, suffix: '', label: 'districts fitted' },
];

export default function About() {
  const root = useRef(null);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // words light up as you read down the page
      gsap.fromTo(
        '.statement .sw',
        { opacity: 0.14 },
        {
          opacity: 1,
          stagger: 0.1,
          ease: 'none',
          scrollTrigger: {
            trigger: '.statement',
            start: 'top 80%',
            end: 'bottom 45%',
            scrub: true,
          },
        }
      );

      // stats count up once
      root.current.querySelectorAll('.stat-num').forEach((el) => {
        const to = parseFloat(el.dataset.to);
        const dec = parseInt(el.dataset.dec, 10);
        const o = { v: 0 };
        gsap.to(o, {
          v: to,
          duration: 1.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          onUpdate: () => (el.textContent = o.v.toFixed(dec)),
        });
      });

      gsap.from('.about-rule', {
        scaleX: 0,
        transformOrigin: 'left',
        duration: 1.4,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.stats', start: 'top 85%' },
      });
    }, root);
    return () => mm.revert();
  }, []);

  return (
    <section id="about" ref={root} className="about section">
      <div className="wrap">
        <div className="about-head">
          <h2 className="kicker">About us</h2>
          <p className="kicker-note">Since 1984</p>
        </div>

        <p className="statement">
          {STATEMENT.split(' ').map((w, i) => (
            <span className="sw" key={i}>
              {w}{' '}
            </span>
          ))}
        </p>

        <div className="about-body">
          <p>
            We started with a single pressing line and a promise that a roof should outlive the
            person who paid for it. Four decades on, the sheets we roll still go onto homes in the
            same districts, fitted by families we have known across three generations of their
            trade.
          </p>
          <p>
            Every coil is pulled off the line and tested for salt, sun and monsoon before it earns
            our mark. Nothing ships on a batch average. If a sheet will not hold up on the coast,
            it does not leave the floor.
          </p>
        </div>

        <div className="about-rule" />
        <dl className="stats">
          {STATS.map((s) => (
            <div key={s.label} className="stat">
              <dt>{s.label}</dt>
              <dd>
                <span className="stat-num" data-to={s.to} data-dec={s.dec}>
                  {s.to.toFixed(s.dec)}
                </span>
                {s.suffix && <span className="stat-unit">{s.suffix}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
