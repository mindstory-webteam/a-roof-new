'use client';

/**
 * Spin360Button — toggles 360° drag-to-rotate mode.
 * Position it from the parent with `.parent :global(.spin360) { … }`.
 */
export default function Spin360Button({ on, onToggle, className = '' }) {
  return (
    <button
      type="button"
      className={`spin360${on ? ' is-on' : ''}${className ? ` ${className}` : ''}`}
      aria-pressed={on}
      aria-label="360° view"
      title={on ? 'Drag the sheet to rotate it. Click to turn off.' : 'Rotate the sheet 360°'}
      onClick={onToggle}
    >
      <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
        <ellipse cx="12" cy="12" rx="9.5" ry="4" />
        <path className="axis" d="M12 4.5v15" />
        <path d="M15.4 6.4 18.3 8.3 15.8 10.5" />
      </svg>
      <span>{on ? 'Drag to rotate' : '360°'}</span>

      <style jsx>{`
        .spin360 {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px 9px 11px;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.9);
          color: var(--ink, #1b2631);
          font: inherit;
          font-size: 0.88rem;
          font-weight: 600;
          line-height: 1;
          cursor: pointer;
          pointer-events: auto;
          backdrop-filter: blur(10px);
          box-shadow: 0 10px 30px -14px rgba(27, 38, 49, 0.35);
          transition: background 0.3s ease, color 0.3s ease;
        }
        .spin360:hover {
          background: #ffffff;
        }
        .spin360.is-on {
          background: var(--ink, #1b2631);
          color: var(--paper, #ffffff);
        }
        .spin360:focus-visible {
          outline: 2px solid var(--ink, #1b2631);
          outline-offset: 3px;
        }
        .ico {
          width: 18px;
          height: 18px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .axis {
          opacity: 0.45;
        }
        .is-on .ico {
          animation: turn 2.8s linear infinite;
        }
        @keyframes turn {
          to {
            transform: rotateY(360deg);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .is-on .ico {
            animation: none;
          }
        }
      `}</style>
    </button>
  );
}