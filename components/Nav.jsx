'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { NAV } from '@/lib/content';

gsap.registerPlugin(ScrollTrigger);

export default function Nav() {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    const st = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        el.classList.toggle('is-solid', self.scroll() > 40);
        const hide = self.direction === 1 && self.scroll() > 400;
        gsap.to(el, { yPercent: hide ? -110 : 0, duration: 0.45, ease: 'power3.out', overwrite: true });
      },
    });
    return () => st.kill();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', open);
  }, [open]);

  return (
    <header ref={ref} className="nav">
      <a href="#top" className="brand" aria-label="A-Roof home">
        <svg viewBox="0 0 40 24" width="40" height="24" aria-hidden="true">
          <path d="M2 22 L20 4 L38 22" fill="none" stroke="currentColor" strokeWidth="3.2" />
          <path d="M11 22 L20 13 L29 22" fill="none" stroke="currentColor" strokeWidth="3.2" />
        </svg>
        <span>A-Roof</span>
      </a>

      <nav className={`nav-links ${open ? 'is-open' : ''}`} aria-label="Main">
        {NAV.map((n) => (
          <a key={n.href} href={n.href} onClick={() => setOpen(false)}>
            {n.label}
          </a>
        ))}
      </nav>

      <a href="#contact" className="btn btn-ink nav-cta">
        Get a quote
      </a>

      <button
        className="nav-toggle"
        aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((o) => !o)}
      >
        <span />
        <span />
      </button>
    </header>
  );
}
