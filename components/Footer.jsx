'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Footer() {
  const root = useRef(null);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.wordmark span', {
        yPercent: 100,
        duration: 1.2,
        stagger: 0.06,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.wordmark', start: 'top 95%' },
      });
    }, root);
    return () => mm.revert();
  }, []);

  return (
    <footer ref={root} className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-about">
            <p>
              UPVC roofing sheets for homes, shops and sheds. Tile and Trafford profiles, four
              colours each.
            </p>
          </div>
          <div>
            <h3>Products</h3>
            <ul>
              <li><a href="#products">Tile sheet</a></li>
              <li><a href="#products">Trafford sheet</a></li>
              <li><a href="#technology">Test results</a></li>
            </ul>
          </div>
          <div>
            <h3>Help</h3>
            <ul>
              <li><a href="#faq">Questions and answers</a></li>
              <li><a href="#contact">Get a quote</a></li>
            </ul>
          </div>
          <div>
            <h3>Contact</h3>
            <ul>
              <li><a href="tel:+910000000000">+91 00000 00000</a></li>
              <li><a href="mailto:hello@example.com">hello@example.com</a></li>
              <li>Street address, City, State PIN</li>
            </ul>
          </div>
        </div>

        <p className="wordmark" aria-label="A-Roof">
          {'A-ROOF'.split('').map((c, i) => (
            <span key={i} aria-hidden="true">
              {c}
            </span>
          ))}
        </p>

        <div className="footer-base">
          <p>© 2026 A-Roof UPVC Roofing</p>
          <ul>
            <li><a href="/privacy">Privacy</a></li>
            <li><a href="/terms">Terms</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
