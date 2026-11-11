'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Full-screen viewer for photos and videos.
 * items: [{ type: 'image' | 'video', src, poster?, title, note? }]
 * index: open item, or -1 when closed
 */
export default function MediaModal({ items, index, onClose, onIndex }) {
  const root = useRef(null);
  const open = index > -1;
  const item = open ? items[index] : null;
  const many = items.length > 1;

  // open animation + scroll lock
  useEffect(() => {
    if (!open) return;
    window.__lenis?.stop();
    document.documentElement.style.overflow = 'hidden';
    const el = root.current;
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
    gsap.fromTo(
      el.querySelector('.modal-media'),
      { scale: 0.92, y: 30 },
      { scale: 1, y: 0, duration: 0.7, ease: 'expo.out' }
    );
    el.querySelector('.modal-close').focus();
    return () => {
      window.__lenis?.start();
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  // swap animation between items
  useEffect(() => {
    if (!open) return;
    gsap.fromTo(
      root.current.querySelector('.modal-media > *'),
      { opacity: 0, x: 24 },
      { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out' }
    );
  }, [index, open]);

  // keyboard
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (many && e.key === 'ArrowRight') onIndex((index + 1) % items.length);
      if (many && e.key === 'ArrowLeft') onIndex((index - 1 + items.length) % items.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const close = () => {
    gsap.to(root.current, { opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: onClose });
  };

  if (!open) return null;

  return (
    <div
      ref={root}
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <button className="modal-close" onClick={close} aria-label="Close">
        <span />
        <span />
      </button>

      <div className="modal-media">
        {item.type === 'video' ? (
          <video key={item.src} src={item.src} poster={item.poster} controls autoPlay playsInline />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={item.src} src={item.src} alt={item.title} />
        )}
      </div>

      <div className="modal-bar">
        <p>
          <strong>{item.title}</strong>
          {item.note && <span>{item.note}</span>}
        </p>
        {many && (
          <div className="modal-nav">
            <button
              onClick={() => onIndex((index - 1 + items.length) % items.length)}
              aria-label="Previous"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" /></svg>
            </button>
            <span>
              {index + 1} of {items.length}
            </span>
            <button onClick={() => onIndex((index + 1) % items.length)} aria-label="Next">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
