'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import MediaModal from './MediaModal';
import { PROJECTS } from '@/lib/content';

gsap.registerPlugin(ScrollTrigger);

const FILTERS = ['All', 'Homes', 'Commercial'];
// column spans for visible items, in order — gives the grid its rhythm
const SPANS = [7, 5, 5, 7, 6, 6];

export default function Gallery() {
  const root = useRef(null);
  const changed = useRef(false);
  const [filter, setFilter] = useState('All');
  const [modal, setModal] = useState(-1);

  const visible = PROJECTS.map((p, i) => ({ ...p, i })).filter(
    (p) => filter === 'All' || p.kind === filter
  );
  const spanFor = (i) => {
    const pos = visible.findIndex((v) => v.i === i);
    if (pos === -1) return 6;
    // last odd item fills the row
    if (visible.length % 2 === 1 && pos === visible.length - 1) return 12;
    return SPANS[pos % SPANS.length];
  };

  const choose = (f) => {
    if (f === filter) return;
    // fade the current set out, swap, then bring the new set in
    gsap.to(root.current.querySelectorAll('.g-item:not(.is-hidden)'), {
      opacity: 0,
      y: 24,
      duration: 0.35,
      stagger: 0.04,
      ease: 'power2.in',
      onComplete: () => {
        changed.current = true;
        setFilter(f);
      },
    });
  };

  // bring the new set in after a filter change
  useLayoutEffect(() => {
    if (!changed.current) return;
    changed.current = false;
    const items = root.current.querySelectorAll('.g-item:not(.is-hidden)');
    gsap.fromTo(
      items,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'expo.out', onComplete: () => ScrollTrigger.refresh() }
    );
    gsap.set(root.current.querySelectorAll('.g-item.is-hidden'), { opacity: 1, y: 0 });
  }, [filter]);

  // reveal + inner parallax
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.utils.toArray('.g-media').forEach((m) => {
        gsap.fromTo(
          m,
          { clipPath: 'inset(100% 0% 0% 0%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 1.3,
            ease: 'expo.out',
            scrollTrigger: { trigger: m, start: 'top 88%', once: true },
          }
        );
        gsap.fromTo(
          m.querySelector('.g-img'),
          { yPercent: -7 },
          {
            yPercent: 7,
            ease: 'none',
            scrollTrigger: { trigger: m, start: 'top bottom', end: 'bottom top', scrub: true },
          }
        );
      });
    }, root);
    return () => mm.revert();
  }, []);

  const modalItems = visible.map((p) => ({
    type: 'image',
    src: p.src,
    title: `${p.title}, ${p.place}`,
    note: p.sheet,
  }));

  return (
    <section id="projects" ref={root} className="gallery section">
      <div className="wrap">
        <div className="section-head">
          <h2 className="h2">Roofs we&apos;ve fitted.</h2>
          <div className="tabs" role="group" aria-label="Filter projects">
            {FILTERS.map((f) => (
              <button
                key={f}
                className={filter === f ? 'is-on' : ''}
                aria-pressed={filter === f}
                onClick={() => choose(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <ul className="g-grid">
          {PROJECTS.map((p, i) => {
            const shown = visible.some((v) => v.i === i);
            return (
              <li
                key={p.src}
                className={`g-item ${shown ? '' : 'is-hidden'}`}
                style={{ gridColumn: `span ${spanFor(i)}` }}
              >
                <button
                  className="g-open"
                  onClick={() => setModal(visible.findIndex((v) => v.i === i))}
                  aria-label={`Open photo: ${p.title}, ${p.place}`}
                  tabIndex={shown ? 0 : -1}
                >
                  <div className="g-media">
                    <div className="g-img">
                      <Image
                        src={p.src}
                        alt={`${p.title} in ${p.place}, roofed with ${p.sheet}`}
                        fill
                        sizes="(max-width: 899px) 100vw, 60vw"
                      />
                    </div>
                    <span className="g-zoom" aria-hidden="true">
                      <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
                    </span>
                  </div>
                  <span className="g-cap">
                    <span className="g-title">{p.title}</span>
                    <span className="g-meta">
                      {p.place}, {p.sheet}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <MediaModal items={modalItems} index={modal} onIndex={setModal} onClose={() => setModal(-1)} />
    </section>
  );
}
