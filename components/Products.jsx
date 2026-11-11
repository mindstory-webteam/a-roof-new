'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import RoofScene from './RoofScene';
import { PRODUCTS } from '@/lib/content';

gsap.registerPlugin(ScrollTrigger);

export default function Products() {
  const root = useRef(null);
  const info = useRef(null);
  const [key, setKey] = useState('tile');
  const [colourIdx, setColourIdx] = useState(0);
  const product = PRODUCTS[key];
  const colour = product.colours[colourIdx];

  const choose = (k) => {
    if (k === key) return;
    setKey(k);
    setColourIdx(0);
  };

  // swap copy with a short stagger whenever the profile changes
  useEffect(() => {
    const items = info.current.querySelectorAll('.swap');
    gsap.fromTo(
      items,
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, stagger: 0.05, ease: 'power3.out' }
    );
  }, [key]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.stage', {
        clipPath: 'inset(12% 8% 12% 8% round 28px)',
        duration: 1.4,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.stage', start: 'top 80%' },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="products" ref={root} className="products section">
      <div className="wrap">
        <div className="section-head">
          <h2 className="h2">Two profiles, four colours each.</h2>
          <p className="lede">
            Pick a profile and a colour. The sheet on the left is drawn live, so you see how the
            light sits on every rib.
          </p>
        </div>

        <div className="products-grid">
          <div className="stage">
            <RoofScene colour={colour.hex} profile={product.profile} weather="none" distance={11} offset={[0, 0.15]} />
            <p className="stage-caption">
              {product.name}, {colour.name}
            </p>
          </div>

          <div className="product-info" ref={info}>
            <div className="tabs" role="tablist" aria-label="Sheet profile">
              {Object.entries(PRODUCTS).map(([k, p]) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={key === k}
                  className={key === k ? 'is-on' : ''}
                  onClick={() => choose(k)}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <p className="product-blurb swap">{product.blurb}</p>

            <ul className="spec-list">
              {product.specs.map((s) => (
                <li key={s} className="swap">
                  {s}
                </li>
              ))}
            </ul>

            <div className="swatches swap">
              <p className="swatch-label">
                Colour <strong>{colour.name}</strong>
              </p>
              <div className="swatch-row" role="radiogroup" aria-label="Sheet colour">
                {product.colours.map((c, i) => (
                  <button
                    key={c.name}
                    role="radio"
                    aria-checked={i === colourIdx}
                    aria-label={c.name}
                    className={`swatch ${i === colourIdx ? 'is-on' : ''}`}
                    style={{ '--c': c.hex }}
                    onClick={() => setColourIdx(i)}
                  />
                ))}
              </div>
            </div>

            <ul className="tag-row swap">
              {product.tags.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
