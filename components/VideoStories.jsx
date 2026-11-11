'use client';

import { useEffect, useRef, useState } from 'react';
import MediaModal from './MediaModal';
import { VIDEOS } from '@/lib/content';

function Card({ v, onOpen, big }) {
  const ref = useRef(null);

  // phones and touch screens: play while on screen. Mouse: play on hover.
  useEffect(() => {
    const vid = ref.current;
    const hover = window.matchMedia('(hover: hover)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (hover || reduce) return;
    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? vid.play().catch(() => {}) : vid.pause()),
      { threshold: 0.6 }
    );
    io.observe(vid);
    return () => io.disconnect();
  }, []);

  const play = () => ref.current.play().catch(() => {});
  const stop = () => ref.current.pause();

  return (
    <li className={`v-card ${big ? 'is-big' : ''}`}>
      <button
        className="v-open"
        onClick={onOpen}
        onMouseEnter={play}
        onMouseLeave={stop}
        onFocus={play}
        onBlur={stop}
        aria-label={`Play video: ${v.title}`}
      >
        <span className="v-media">
          <video ref={ref} src={v.src} poster={v.poster} muted loop playsInline preload="none" />
          <span className="v-play" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </span>
        </span>
        <span className="v-cap">
          <span className="g-title">{v.title}</span>
          <span className="g-meta">{v.note}</span>
        </span>
      </button>
    </li>
  );
}

export default function VideoStories() {
  const [modal, setModal] = useState(-1);
  const items = VIDEOS.map((v) => ({ ...v, type: 'video' }));

  return (
    <section id="videos" className="videos section">
      <div className="wrap">
        <div className="section-head">
          <h2 className="h2">Watch the sheet at work.</h2>
          <p className="lede">
            Short clips from the test floor and from finished jobs. Hover to preview, select one
            to watch it full screen.
          </p>
        </div>
        <ul className="v-grid">
          {VIDEOS.map((v, i) => (
            <Card key={v.src} v={v} big={i === 0} onOpen={() => setModal(i)} />
          ))}
        </ul>
      </div>
      <MediaModal items={items} index={modal} onIndex={setModal} onClose={() => setModal(-1)} />
    </section>
  );
}
