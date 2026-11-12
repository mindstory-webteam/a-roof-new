'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createSpin } from './spin360';
import Spin360Button from './Spin360Button';

gsap.registerPlugin(ScrollTrigger);

/**
 * InstallStory — a pinned, scroll-driven 3D roof being put together
 *
 *   1. The frame builds: rafters rise from the eave, purlins run across.
 *   2. The first sheet slides down the slope onto the purlins.
 *   3. The next sheets slide in from the side, each lapping the last by one barrel.
 *   4. Screws with sealing washers drop onto the crowns, row by row.
 *   5. The ridge cap lands on top.
 *   6. Rain: the finished roof in the wet.
 * The camera moves around the roof for each step; the roof slides to the
 * side opposite the caption. Same look and controls as SheetStory,
 * including the 360° drag-to-rotate button.
 *
 * Copy is generic roofing practice. Check it against your own fixing guide.
 */

/* ── Content ───────────────────────────────────────────────────────── */
const STEPS = [
  { at: 0, rail: 'Frame', side: 'left', title: 'It starts with the frame.', body: 'Rafters and purlins, square and level, ready to take the sheet.' },
  { at: 0.18, rail: 'First sheet', side: 'right', title: 'Lay the first sheet.', body: 'Start at the eave, lined up square to the purlins.' },
  { at: 0.34, rail: 'Overlap', side: 'left', title: 'Each sheet laps the last.', body: 'One barrel of overlap, so water can’t find its way between them.' },
  { at: 0.54, rail: 'Fixing', side: 'right', title: 'Fixed on the crown.', body: 'Screws with sealing washers go through the top of the profile, never the channel where water runs.' },
  { at: 0.72, rail: 'Ridge', side: 'left', title: 'Close it with the ridge.', body: 'A matching ridge cap seals the top of the roof.' },
  { at: 0.86, rail: 'Rain', side: 'right', title: 'Then let it rain.', body: 'Water runs straight down the channels and off the eave.' },
];

const TAGS = [
  { key: 'lap', title: 'One-barrel side lap', note: 'Sheets never butt-join' },
  { key: 'fix', title: 'Crown fixing', note: 'Screw + sealing washer' },
];

const SHEET_COLOUR = '#a3452f';
const TIMBER_COLOUR = '#b8875a';

/* ── Scroll ────────────────────────────────────────────────────────── */
const PIN_LENGTH = '+=520%';

/* ── Roof build (slope-local units: x across, y up the slope, z off the face) ── */
const PITCH = 0.42; // rad, about 24°
const SLOPE_LEN = 3.5;
const SHEET_W = 2.5; // 5 barrels; laid at 2.0 centres, so they lap by one barrel (0.5)
const SHEET_H = 3.3;
const SHEET_X = [-3, -1, 1, 3];
const SPAN = 8.7;
const RAFTER_X = [-4.1, -2, 0, 2, 4.1];
const PURLIN_Y = [-1.35, -0.45, 0.45, 1.35];
const SCREW_LOCAL_X = [-0.75, 0.25]; // crowns; -0.75 on a later sheet is the lap crown

/* ── Profile (same Roman tile as the other sections) ───────────────── */
const frac = (v) => ((v % 1) + 1) % 1;
const tileZ = (x, y) => {
  const barrel = Math.pow(Math.sin(Math.PI * frac(x / 0.5)), 0.75) * 0.11;
  const r = frac(y / 0.42);
  const course = (r < 0.88 ? r / 0.88 : 1 - (r - 0.88) / 0.12) * 0.05;
  return barrel + course;
};

/* ── Helpers ───────────────────────────────────────────────────────── */
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// item i of n gets its own 0→1, starts spread over the first `spread` of p
const stagger = (p, i, n, spread = 0.6) =>
  clamp01((p - (n > 1 ? (i / (n - 1)) * spread : 0)) / (1 - spread));

// every screw: which sheet it belongs to and where it sits on the slope
const SCREWS = [];
PURLIN_Y.forEach((y) =>
  SHEET_X.forEach((sx, i) =>
    SCREW_LOCAL_X.forEach((lx) => SCREWS.push({ x: sx + lx, y, z: tileZ(lx, y) + i * 0.012 + 0.012 }))
  )
);
// drop from the eave up, left to right
SCREWS.sort((a, b) => a.y - b.y || a.x - b.x);

export default function InstallStory() {
  const root = useRef(null);
  const mount = useRef(null);
  const tags = useRef([]);
  const spinRef = useRef(null);
  const [spin, setSpin] = useState(false);

  useEffect(() => {
    spinRef.current?.setEnabled(spin);
  }, [spin]);

  useEffect(() => {
    const el = root.current;
    const host = mount.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- renderer, scene, camera ---------- */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.45;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

    const hemi = new THREE.HemisphereLight(0xffffff, 0xd9e0e4, 1.1);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.position.set(-4, 8, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 30 });
    scene.add(sun);

    /* ---------- materials ---------- */
    const sheetMat = new THREE.MeshPhysicalMaterial({
      color: SHEET_COLOUR,
      roughness: 0.45,
      clearcoat: 0.55,
      clearcoatRoughness: 0.3,
      side: THREE.DoubleSide,
    });
    const timberMat = new THREE.MeshStandardMaterial({ color: TIMBER_COLOUR, roughness: 0.85 });
    const steelMat = new THREE.MeshStandardMaterial({ color: '#c7ccd1', metalness: 0.85, roughness: 0.3 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: '#25282c', roughness: 0.7 });

    /* ---------- shared geometry ---------- */
    const rafterGeo = new THREE.BoxGeometry(0.12, SLOPE_LEN, 0.2).translate(0, SLOPE_LEN / 2, 0); // grows from the eave
    const purlinGeo = new THREE.BoxGeometry(SPAN, 0.1, 0.1).translate(SPAN / 2, 0, 0); // grows from the left
    const sheetGeo = new THREE.PlaneGeometry(SHEET_W, SHEET_H, 140, 90);
    {
      const pos = sheetGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, tileZ(pos.getX(i), pos.getY(i)));
      sheetGeo.computeVertexNormals();
    }
    const washerGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.014, 20).rotateX(Math.PI / 2);
    const headGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.035, 6).rotateX(Math.PI / 2).translate(0, 0, 0.024);
    // half pipe along x, open side down
    const ridgeGeo = new THREE.CylinderGeometry(0.3, 0.3, SPAN + 0.2, 32, 1, true, 0, Math.PI).rotateZ(Math.PI / 2);

    /* ---------- one roof slope (built twice for a gable) ---------- */
    const makeSlope = () => {
      // slope-local coords: y runs -SLOPE_LEN/2 (eave) … +SLOPE_LEN/2 (top);
      // shifted down so the top edge sits on the ridge line
      const inner = new THREE.Group();
      inner.position.y = -SLOPE_LEN / 2;
      const add = (m, x, y, z) => {
        m.position.set(x, y, z);
        m.castShadow = true;
        m.receiveShadow = true;
        inner.add(m);
        return m;
      };
      const rafters = RAFTER_X.map((x) => add(new THREE.Mesh(rafterGeo, timberMat), x, -SLOPE_LEN / 2, -0.2));
      const purlins = PURLIN_Y.map((y) => add(new THREE.Mesh(purlinGeo, timberMat), -SPAN / 2, y, -0.05));
      const sheets = SHEET_X.map((x, i) => add(new THREE.Mesh(sheetGeo, sheetMat), x, 0, i * 0.012));
      const washers = new THREE.InstancedMesh(washerGeo, rubberMat, SCREWS.length);
      const heads = new THREE.InstancedMesh(headGeo, steelMat, SCREWS.length);
      [washers, heads].forEach((m) => {
        m.castShadow = true;
        m.frustumCulled = false;
        inner.add(m);
      });

      // pitch the slope: up-slope runs away from the viewer, top edge at the ridge
      const tilt = new THREE.Group();
      tilt.rotation.x = -(Math.PI / 2 - PITCH);
      tilt.add(inner);
      const side = new THREE.Group();
      side.add(tilt);
      return { side, inner, rafters, purlins, sheets, washers, heads };
    };

    const roof = new THREE.Group();
    roof.position.y = (SLOPE_LEN * Math.sin(PITCH)) / 2; // centre the roof on the origin
    scene.add(roof);
    const slopes = [makeSlope(), makeSlope()];
    slopes[1].side.rotation.y = Math.PI; // the other side of the gable
    slopes.forEach((s) => roof.add(s.side));

    const ridge = new THREE.Mesh(ridgeGeo, sheetMat);
    ridge.castShadow = true;
    roof.add(ridge);

    /* soft shadow on an invisible ground */
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ opacity: 0.12 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.4;
    ground.receiveShadow = true;
    scene.add(ground);

    /* ---------- rain ---------- */
    const DROPS = reduce ? 0 : 1600;
    const rainPos = new Float32Array(DROPS * 6);
    const speed = new Float32Array(DROPS);
    const spawn = (i, anyY) => {
      const x = (Math.random() - 0.5) * 16;
      const y = anyY ? Math.random() * 10 - 4 : 6 + Math.random() * 2;
      const z = (Math.random() - 0.5) * 12;
      const len = 0.18 + Math.random() * 0.24;
      rainPos.set([x, y, z, x + len * 0.15, y + len, z], i * 6);
      speed[i] = 8 + Math.random() * 5;
    };
    for (let i = 0; i < DROPS; i++) spawn(i, true);
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.LineBasicMaterial({ color: 0x7f97aa, transparent: true, opacity: 0, depthWrite: false });
    scene.add(new THREE.LineSegments(rainGeo, rainMat));

    /* ---------- state the scroll timeline animates ---------- */
    const state = {
      frame: 0,
      s0: 0,
      s1: 0,
      s2: 0,
      s3: 0,
      screws: 0,
      ridge: 0,
      rain: 0,
      az: 0.75, // camera angle round the roof
      el: 0.55, // camera height angle
      dist: 24,
      fx: 0, // point the camera looks at (world x / z)
      fz: 0,
      side: 0, // -1 roof right of centre (caption left), 1 roof left
      tagLap: 0,
      tagFix: 0,
    };
    if (reduce) Object.assign(state, { frame: 1, s0: 1, s1: 1, s2: 1, s3: 1, screws: 1, ridge: 1, az: 0.6, el: 0.45, dist: 19 });

    /* ---------- 360° drag-to-rotate ---------- */
    const spin360 = createSpin(host, { autoSpeed: reduce ? 0 : 0.3, maxPitch: 0.7 });
    spinRef.current = spin360;

    /* ---------- sizing ---------- */
    let distMul = 1;
    let sideAmt = 1.6;
    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const tall = w / h < 0.9;
      distMul = tall ? 1.55 : 1;
      sideAmt = tall ? 0 : w / h > 1.5 ? 1.9 : 1.3;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    /* ---------- pose everything from the state ---------- */
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const eul = new THREE.Euler();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();

    const poseSlope = (s) => {
      const rafterP = clamp01(state.frame / 0.55);
      const purlinP = clamp01((state.frame - 0.4) / 0.6);
      s.rafters.forEach((r, i) => {
        const k = easeOut(stagger(rafterP, i, RAFTER_X.length, 0.5));
        r.scale.y = Math.max(k, 1e-4);
        r.visible = k > 0.001;
      });
      s.purlins.forEach((p, i) => {
        const k = easeOut(stagger(purlinP, i, PURLIN_Y.length, 0.5));
        p.scale.x = Math.max(k, 1e-4);
        p.visible = k > 0.001;
      });

      const sp = [state.s0, state.s1, state.s2, state.s3];
      s.sheets.forEach((m, i) => {
        const k = easeInOut(clamp01(sp[i]));
        const out = 1 - k;
        m.visible = k > 0.001;
        if (i === 0) {
          // first sheet slides down the slope onto the purlins
          m.position.set(SHEET_X[0], out * 4.2, out * 1.6);
          m.rotation.set(out * 0.35, 0, 0);
        } else {
          // the rest come in from the side and settle over the lap
          m.position.set(SHEET_X[i] + out * 3.2, out * 0.4, i * 0.012 + out * 1.2);
          m.rotation.set(0, -out * 0.25, out * 0.12);
        }
      });

      SCREWS.forEach((sw, j) => {
        const k = stagger(state.screws, j, SCREWS.length, 0.75);
        const d = 1 - easeOut(k);
        v.set(sw.x, sw.y, sw.z + d * 1.4);
        eul.set(0, 0, d * 8);
        q.setFromEuler(eul);
        sc.setScalar(k > 0 ? 1 : 1e-4);
        m4.compose(v, q, sc);
        s.washers.setMatrixAt(j, m4);
        s.heads.setMatrixAt(j, m4);
      });
      s.washers.instanceMatrix.needsUpdate = true;
      s.heads.instanceMatrix.needsUpdate = true;
    };

    /* ---------- tags follow points on the near slope ---------- */
    const TAG_ANCHORS = [
      new THREE.Vector3(-2.0, -0.9, 0.2), // over the first lap
      new THREE.Vector3(SHEET_X[2] + SCREW_LOCAL_X[0], PURLIN_Y[1], 0.2), // a crown screw
    ];
    const anchor = new THREE.Vector3();
    const placeTags = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      const shows = [state.tagLap, state.tagFix];
      TAG_ANCHORS.forEach((a, i) => {
        const tag = tags.current[i];
        if (!tag) return;
        anchor.copy(a);
        slopes[0].inner.localToWorld(anchor);
        anchor.project(camera);
        const x = (anchor.x * 0.5 + 0.5) * w;
        const y = (-anchor.y * 0.5 + 0.5) * h;
        tag.style.transform = `translate(${x}px, ${y}px)`;
        tag.style.opacity = shows[i];
        tag.classList.toggle('flip', x > w * 0.62);
      });
    };

    const rainEl = el.querySelector('.rs-rain');
    const target = new THREE.Vector3();
    const right = new THREE.Vector3();

    /* ---------- render loop ---------- */
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '100px' });
    io.observe(host);

    const timer = new THREE.Timer();
    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      timer.update();
      const dt = Math.min(timer.getDelta(), 0.05);
      if (!visible) return;
      const t = timer.getElapsed();

      slopes.forEach(poseSlope);
      const rk = easeOut(clamp01(state.ridge));
      ridge.visible = state.ridge > 0.001;
      ridge.position.y = 0.05 + (1 - rk) * 2.5;
      ridge.rotation.x = (1 - rk) * 0.4;

      /* wet look */
      const wet = state.rain;
      sheetMat.roughness = 0.45 - wet * 0.3;
      sheetMat.clearcoat = 0.55 + wet * 0.4;
      sheetMat.clearcoatRoughness = 0.3 - wet * 0.24;
      sun.intensity = 2.4 - wet * 1.1;
      hemi.intensity = 1.1 - wet * 0.2;
      rainEl.style.opacity = (wet * 0.85).toFixed(3);

      /* camera: orbit + 360° drag on top, roof slid to the side opposite the caption */
      spin360.update(dt);
      const az = state.az + spin360.yaw + (reduce ? 0 : Math.sin(t * 0.3) * 0.02);
      const elv = Math.min(1.45, Math.max(0.06, state.el + spin360.pitch));
      const dist = state.dist * distMul;
      right.set(Math.cos(az), 0, -Math.sin(az));
      target.set(state.fx, 0, state.fz).addScaledVector(right, state.side * sideAmt);
      camera.position.set(
        target.x + dist * Math.cos(elv) * Math.sin(az),
        target.y + dist * Math.sin(elv),
        target.z + dist * Math.cos(elv) * Math.cos(az)
      );
      camera.lookAt(target);

      /* rain */
      rainMat.opacity = wet * 0.5;
      if (rainMat.opacity > 0.01) {
        for (let i = 0; i < DROPS; i++) {
          const o = i * 6;
          const d = speed[i] * dt;
          rainPos[o + 1] -= d;
          rainPos[o + 4] -= d;
          rainPos[o] -= d * 0.15;
          rainPos[o + 3] -= d * 0.15;
          if (rainPos[o + 1] < -4) spawn(i, false);
        }
        rainGeo.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
      placeTags();
    };
    tick();

    /* ---------- captions + progress ---------- */
    const stepEls = el.querySelectorAll('.rs-step');
    const railEls = el.querySelectorAll('.rs-rail li');
    let current = -1;
    const setStep = (p) => {
      let idx = 0;
      STEPS.forEach((s, i) => p >= s.at && (idx = i));
      if (idx === current) return;
      current = idx;
      stepEls.forEach((s, i) => s.classList.toggle('is-on', i === idx));
      railEls.forEach((s, i) => s.classList.toggle('is-on', i <= idx));
      el.classList.toggle('is-rain', idx === STEPS.length - 1);
    };

    /* ---------- the scroll timeline ---------- */
    let tl;
    if (reduce) {
      setStep(STEPS[STEPS.length - 2].at);
    } else {
      setStep(0);
      tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: PIN_LENGTH,
          pin: true,
          scrub: 0.8,
          onUpdate: (self) => {
            setStep(self.progress);
            el.style.setProperty('--rs-p', self.progress.toFixed(4));
          },
        },
      });

      tl
        // 1. frame builds while the camera settles
        .to(state, { frame: 1, duration: 0.14 }, 0.01)
        .to(state, { az: 0.55, el: 0.5, dist: 20, duration: 0.16, ease: 'power2.out' }, 0)
        // 2. first sheet
        .to(state, { s0: 1, duration: 0.1 }, 0.18)
        .to(state, { az: 0.35, el: 0.62, dist: 17.5, duration: 0.12, ease: 'power1.inOut' }, 0.17)
        // 3. the rest, lapping; camera comes in low and close on the first lap
        .to(state, { s1: 1, duration: 0.08 }, 0.34)
        .to(state, { s2: 1, duration: 0.08 }, 0.39)
        .to(state, { s3: 1, duration: 0.08 }, 0.44)
        .to(state, { az: 1.05, el: 0.42, dist: 13, fx: -1.6, fz: 1.0, duration: 0.1, ease: 'power2.inOut' }, 0.33)
        .to(state, { tagLap: 1, duration: 0.03 }, 0.4)
        .to(state, { tagLap: 0, duration: 0.03 }, 0.5)
        // 4. screws, seen from above
        .to(state, { az: 0.15, el: 0.95, dist: 14, fx: 0.3, fz: 0.7, duration: 0.1, ease: 'power2.inOut' }, 0.52)
        .to(state, { screws: 1, duration: 0.13 }, 0.55)
        .to(state, { tagFix: 1, duration: 0.03 }, 0.58)
        .to(state, { tagFix: 0, duration: 0.03 }, 0.69)
        // 5. ridge cap
        .to(state, { az: 0.6, el: 0.4, dist: 19, fx: 0, fz: 0, duration: 0.1, ease: 'power2.inOut' }, 0.7)
        .to(state, { ridge: 1, duration: 0.08 }, 0.74)
        // 6. rain
        .to(state, { rain: 1, duration: 0.06 }, 0.86)
        .to(state, { az: 0.85, el: 0.3, dist: 20, duration: 0.12, ease: 'power1.inOut' }, 0.84)
        .fromTo(el.querySelector('.rs-end'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.05 }, 0.93)
        .to(el.querySelector('.rs-intro'), { opacity: 0, yPercent: -40, duration: 0.06 }, 0.02);

      // slide the roof to the side opposite each caption
      STEPS.forEach((s) => {
        tl.to(state, { side: s.side === 'left' ? -1 : 1, duration: 0.05, ease: 'power2.inOut' }, Math.max(0, s.at - 0.03));
      });
    }

    return () => {
      tl?.scrollTrigger?.kill();
      tl?.kill();
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      timer.dispose();
      spin360.dispose();
      spinRef.current = null;
      slopes.forEach((s) => {
        s.washers.dispose();
        s.heads.dispose();
      });
      [rafterGeo, purlinGeo, sheetGeo, washerGeo, headGeo, ridgeGeo, ground.geometry, ground.material, rainGeo, rainMat,
        sheetMat, timberMat, steelMat, rubberMat].forEach((o) => o.dispose());
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  const lastSide = STEPS[STEPS.length - 1].side;

  return (
    <section id="install" ref={root} className="rs" aria-label="How the sheets go on the roof">
      <div className="rs-rain" aria-hidden="true" />
      <div ref={mount} className="rs-canvas" aria-hidden="true" />

      <div className="rs-tags" aria-hidden="true">
        {TAGS.map((tg, i) => (
          <div className="rs-tag" key={tg.key} ref={(e) => (tags.current[i] = e)}>
            <span className="rs-dot" />
            <span className="rs-pill">
              <strong>{tg.title}</strong>
              <em>{tg.note}</em>
            </span>
          </div>
        ))}
      </div>

      <div className="rs-intro wrap">
        <h2 className="h2">How it goes on the roof.</h2>
      </div>

      <div className="rs-ui wrap">
        <div className="rs-steps" aria-live="polite">
          {STEPS.map((s) => (
            <div className={`rs-step ${s.side}`} key={s.title}>
              <p className="rs-title">{s.title}</p>
              <p className="rs-body">{s.body}</p>
            </div>
          ))}
        </div>

        <div className={`rs-end ${lastSide}`}>
          <a href="#contact" className="btn btn-ink">
            Book a site visit
          </a>
          <a href="#products" className="btn btn-line">
            See the sheets
          </a>
        </div>
      </div>

      <Spin360Button on={spin} onToggle={() => setSpin((v) => !v)} />

      <ol className="rs-rail" aria-hidden="true">
        {STEPS.map((s) => (
          <li key={s.rail}>{s.rail}</li>
        ))}
      </ol>

      <div className="rs-bar" aria-hidden="true">
        <span />
      </div>

      <style jsx>{`
        .rs {
          --rs-p: 0;
          position: relative;
          height: 100svh;
          overflow: hidden;
          background: radial-gradient(110% 80% at 40% 35%, #ffffff 0%, var(--mist) 100%);
        }
        .rs-rain,
        .rs-canvas {
          position: absolute;
          inset: 0;
        }
        .rs-rain {
          opacity: 0;
          pointer-events: none;
          background: linear-gradient(180deg, #76889a 0%, #a6b4be 60%, #c9d1d6 100%);
        }
        .rs-canvas :global(canvas) {
          display: block;
          width: 100% !important;
          height: 100% !important;
        }

        .rs-intro {
          position: absolute;
          top: clamp(90px, 12vh, 130px);
          left: 0;
          right: 0;
          pointer-events: none;
        }

        .rs :global(.spin360) {
          position: absolute;
          top: clamp(96px, 14vh, 140px);
          right: var(--gutter, 24px);
          z-index: 3;
        }

        /* tags pinned to points on the roof */
        .rs-tags {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .rs-tag {
          position: absolute;
          left: 0;
          top: 0;
          opacity: 0;
          will-change: transform, opacity;
        }
        .rs-dot {
          position: absolute;
          left: -5px;
          top: -5px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--ink);
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.85);
        }
        .rs-pill {
          position: absolute;
          left: 18px;
          top: -22px;
          display: flex;
          flex-direction: column;
          padding: 8px 14px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
          white-space: nowrap;
          box-shadow: 0 10px 30px -14px rgba(27, 38, 49, 0.35);
        }
        .rs-tag.flip .rs-pill {
          left: auto;
          right: 18px;
        }
        .rs-pill strong {
          font-weight: 600;
          font-size: 0.95rem;
        }
        .rs-pill em {
          font-style: normal;
          color: var(--stone);
          font-size: 0.82rem;
        }

        /* captions, alternating sides */
        .rs-ui {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding-bottom: clamp(44px, 8vh, 80px);
          pointer-events: none;
        }
        .rs-steps {
          position: relative;
          width: 100%;
          min-height: 150px;
        }
        .rs-step {
          position: absolute;
          left: 0;
          bottom: 0;
          width: min(440px, 100%);
          padding: 20px 22px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(12px);
          opacity: 0;
          transform: translateX(-28px);
          transition: opacity 0.5s var(--ease), transform 0.6s var(--ease);
        }
        .rs-step.right {
          left: auto;
          right: 0;
          transform: translateX(28px);
        }
        .rs-step.is-on {
          opacity: 1;
          transform: none;
        }
        .rs-title {
          font-stretch: 110%;
          font-weight: 640;
          font-size: clamp(1.25rem, 1.9vw, 1.7rem);
          line-height: 1.15;
          letter-spacing: -0.02em;
        }
        .rs-body {
          margin-top: 6px;
          color: var(--stone);
        }
        .rs-end {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          opacity: 0;
          pointer-events: auto;
        }
        .rs-end.right {
          justify-content: flex-end;
        }

        /* progress */
        .rs-rail {
          position: absolute;
          right: var(--gutter);
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 0;
          padding: 0;
          list-style: none;
          font-size: 0.85rem;
          color: var(--stone);
        }
        .rs-rail li {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          opacity: 0.45;
          transition: opacity 0.4s var(--ease), color 0.4s var(--ease);
        }
        .rs-rail li::after {
          content: '';
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1.5px solid currentColor;
          transition: background 0.4s var(--ease);
        }
        .rs-rail li.is-on {
          opacity: 1;
          color: var(--ink);
        }
        .rs-rail li.is-on::after {
          background: currentColor;
        }
        .rs-bar {
          position: absolute;
          left: var(--gutter);
          right: var(--gutter);
          bottom: 22px;
          height: 2px;
          background: rgba(27, 38, 49, 0.1);
        }
        .rs-bar span {
          display: block;
          height: 100%;
          background: var(--ink);
          transform-origin: left;
          transform: scaleX(var(--rs-p));
        }

        @media (max-width: 899px) {
          .rs-rail {
            display: none;
          }
          .rs-step,
          .rs-step.right {
            left: 0;
            right: 0;
            width: auto;
            transform: translateY(14px);
          }
          .rs-step.is-on {
            transform: none;
          }
          .rs-end.right {
            justify-content: flex-start;
          }
          .rs-pill {
            padding: 6px 10px;
          }
          .rs-pill em {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .rs {
            height: auto;
            min-height: 100svh;
          }
          .rs-end {
            opacity: 1;
          }
          .rs-step {
            transition: none;
          }
        }
      `}</style>
    </section>
  );
}