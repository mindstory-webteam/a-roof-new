'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FAQ } from '@/lib/content';

function Item({ q, a, open, onToggle, id }) {
  const panel = useRef(null);

  const first = useRef(true);

  // animate whenever this item opens or closes (including when another item takes over)
  useEffect(() => {
    const el = panel.current;
    if (first.current) {
      first.current = false;
      gsap.set(el, { height: open ? 'auto' : 0 });
      return;
    }
    if (open) gsap.fromTo(el, { height: 0 }, { height: 'auto', duration: 0.6, ease: 'power3.out', onComplete: () => ScrollTrigger.refresh() });
    else gsap.to(el, { height: 0, duration: 0.5, ease: 'power3.inOut', onComplete: () => ScrollTrigger.refresh() });
  }, [open]);

  return (
    <div className={`faq-item ${open ? 'is-open' : ''}`}>
      <h3>
        <button aria-expanded={open} aria-controls={id} onClick={onToggle}>
          <span>{q}</span>
          <i aria-hidden="true" />
        </button>
      </h3>
      <div id={id} ref={panel} className="faq-panel">
        <p>{a}</p>
      </div>
    </div>
  );
}

export default function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="faq section">
      <div className="wrap faq-grid">
        <div className="faq-side">
          <h2 className="h2">Roofing questions, answered.</h2>
          <p className="lede">
            Still deciding? Tell us your span and location and we&apos;ll suggest a profile.
          </p>
        </div>
        <div className="faq-list">
          {FAQ.map((f, i) => (
            <Item
              key={f.q}
              id={`faq-${i}`}
              {...f}
              open={open === i}
              onToggle={() => setOpen(open === i ? -1 : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
