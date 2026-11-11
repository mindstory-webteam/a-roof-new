'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* Background video. Put your files in /public/media with these names,
   or change the paths here. */
const VIDEO = { src: '/video/cta-1.mp4', poster: '/media/cta.jpg' };

export default function Cta() {
  const root = useRef(null);
  const video = useRef(null);

  // only play the video while the section is on screen
  useEffect(() => {
    const v = video.current;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(([e]) =>
      e.isIntersecting ? v.play().catch(() => {}) : v.pause()
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // the roof line draws itself as the section scrolls in
      root.current.querySelectorAll('.cta-roof path').forEach((p) => {
        const len = p.getTotalLength();
        gsap.fromTo(
          p,
          { strokeDasharray: len, strokeDashoffset: len },
          {
            strokeDashoffset: 0,
            ease: 'none',
            scrollTrigger: { trigger: root.current, start: 'top 85%', end: 'center 55%', scrub: true },
          }
        );
      });

      // background video drifts slower than the page
      gsap.fromTo(
        '.cta-bg',
        { yPercent: -12, scale: 1.15 },
        {
          yPercent: 12,
          scale: 1.05,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true },
        }
      );
    }, root);
    return () => mm.revert();
  }, []);

  return (
    <section id="contact" ref={root} className="cta section">
      <div className="cta-bg" aria-hidden="true">
        <video
          ref={video}
          src={VIDEO.src}
          poster={VIDEO.poster}
          muted
          loop
          playsInline
          preload="metadata"
        />
      </div>
      <div className="cta-wash" aria-hidden="true" />

      <div className="wrap cta-inner">
        <svg className="cta-roof" viewBox="0 0 1200 260" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 250 L600 12 L1200 250" />
          <path d="M140 250 L600 68 L1060 250" />
        </svg>
        <h2 className="cta-title">Get the roof right first time.</h2>
        <p className="lede">
          Send us your span and location and we&apos;ll suggest a profile and send a quote.
        </p>
        <div className="hero-actions">
          <a href="mailto:hello@example.com?subject=Roofing%20quote" className="btn btn-ink">
            Get a quote
          </a>
          <a href="tel:+910000000000" className="btn btn-line">
            Call +91 00000 00000
          </a>
        </div>
      </div>

      <style jsx>{`
        .cta {
          position: relative;
          isolation: isolate;
        }
        .cta-bg {
          position: absolute;
          inset: 0;
          z-index: -2;
        }
        .cta-bg video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        /* white wash: strongest behind the text, lighter at the edges */
        .cta-wash {
          position: absolute;
          inset: 0;
          z-index: -1;
          background:
            radial-gradient(60% 70% at 50% 55%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.72) 55%, rgba(255, 255, 255, 0.4) 100%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0) 18%, rgba(255, 255, 255, 0) 82%, rgba(255, 255, 255, 0.85) 100%);
        }
        .cta-inner {
          position: relative;
        }
        .cta-inner :global(.lede) {
          color: var(--ink);
          opacity: 0.78;
        }
      `}</style>
    </section>
  );
}