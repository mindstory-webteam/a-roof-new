'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * About — a sheet flows in from the top, then explains itself, then the story
 *
 *   Entry   While the section scrolls up into view, a roofing sheet falls in
 *           from above, rippling like it's just come off the line, and settles.
 *   Pinned  Each stretch of scroll shows one thing about it:
 *             01 One sheet      — it turns into view
 *             02 Layers         — splits into its three labelled layers
 *             03 0.47 mm        — flat at eye level, thickness callout
 *             04 Sun            — warm light, a glint sweeping across the coat,
 *                                 sun glow and heat rising
 *             05 Wind and dust  — dust and wind streaks blow across; it stays put
 *             06 Monsoon        — pitched, rain falls, water runs down the channels
 *             07 Colours        — runs through the range, swatches follow
 *             08 Tested         — salt / sun / monsoon tags
 *           Then it falls away downward, rippling, as the pin releases.
 *           The caption alternates sides and the sheet moves opposite it.
 *   After   The pin releases into the statement, body copy and stats.
 *
 * prefers-reduced-motion: no pin; the sheet sits still and the points are
 * listed beside it.
 */

/* ── Content ─────────────────────────────────────────────────────────── */
const STATEMENT =
  'A roof is the one part of a house nobody looks at until the night it matters.';

const STATS = [
  { to: 42, dec: 0, suffix: '', label: 'years rolling sheet' },
  { to: 0.47, dec: 2, suffix: 'mm', label: 'base gauge, minimum' },
  { to: 14, dec: 0, suffix: '', label: 'districts fitted' },
];

// side = where the caption sits; the sheet moves to the other side
const FLOW_STEPS = [
  { at: 0, side: 'left', title: 'One sheet, start to finish.', body: 'Every sheet comes off our own line, pressed and profiled under one roof since 1984.' },
  { at: 0.11, side: 'right', title: 'Three layers, each with a job.', body: 'Bonded together on the line, so they never peel apart on the roof.' },
  { at: 0.24, side: 'left', title: '0.47 mm, never less.', body: 'The base gauge is the floor, not the average. Thinner stock never makes it onto the line.' },
  { at: 0.37, side: 'right', title: 'Sun bounces off.', body: 'The top coat reflects the heat and holds its colour under years of UV. No fading, no warping.' },
  { at: 0.5, side: 'left', title: 'Wind and dust slide past.', body: 'Fixed tight on every crown, it stays put in a gale. The smooth coat sheds dust with the first rain.' },
  { at: 0.63, side: 'right', title: 'Shaped to shed water.', body: 'Deep barrels and stepped courses carry the rain straight to the gutter, however hard it falls.' },
  { at: 0.76, side: 'left', title: 'Colour all the way through the coat.', body: 'Four shades, each one held against the sun.', swatches: true },
  { at: 0.88, side: 'right', title: 'Tested before it ships.', body: 'Every batch faces salt, sun and monsoon. If a sheet won’t last on the coast, it stays on the floor.' },
];

const LAYERS = [
  { name: 'ASA top coat', note: 'Colour and UV shield', colour: '#a3452f', t: 0.012, spread: 0.9, rough: 0.42, clear: 0.6 },
  { name: 'UPVC core', note: 'Strength and stiffness', colour: '#ece8e0', t: 0.02, spread: 0, rough: 0.6, clear: 0 },
  { name: 'Under layer', note: 'Moisture and heat barrier', colour: '#c9ced3', t: 0.008, spread: -0.9, rough: 0.7, clear: 0 },
];
const LABEL_X = [0.3, 0.06, -0.18]; // where each layer label pins along the front edge

const COLOURS = [
  { name: 'Terracotta', hex: '#a3452f' },
  { name: 'Charcoal', hex: '#3b3e42' },
  { name: 'Forest', hex: '#2f4c3c' },
  { name: 'Slate', hex: '#5d6873' },
];

const GAUGE_LABEL = '0.47 mm';
const TESTS = ['Salt', 'Sun', 'Monsoon'];

/* ── Scroll ──────────────────────────────────────────────────────────── */
const PIN_LENGTH = '+=840%';

/* ── Sheet shape ─────────────────────────────────────────────────────── */
const W = 4.2;
const H = 2.6;
const T_ALL = LAYERS.reduce((s, l) => s + l.t, 0);
const frac = (v) => ((v % 1) + 1) % 1;
const tileZ = (x, y) => {
  const barrel = Math.pow(Math.sin(Math.PI * frac(x / 0.5)), 0.75) * 0.11;
  const r = frac(y / 0.42);
  const course = (r < 0.88 ? r / 0.88 : 1 - (r - 0.88) / 0.12) * 0.05;
  return barrel + course;
};
// the low channels between barrels, where water runs
const LANES = Array.from({ length: 9 }, (_, k) => -2 + k * 0.5);

const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

const makeDot = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.5, 'rgba(255,255,255,0.6)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/* a cloud of points that respawns: used for dust, heat and water */
const makePoints = (count, opts) => {
  const pos = new Float32Array(count * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ transparent: true, opacity: 0, depthWrite: false, ...opts });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return { pos, geo, mat, pts };
};

export default function About() {
  const root = useRef(null);
  const flowRef = useRef(null);
  const mount = useRef(null);

  /* ---------- the flowing sheet ---------- */
  useEffect(() => {
    const el = flowRef.current;
    const host = mount.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.shadowMap.enabled = true;
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
    sun.position.set(-3, 6, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 4, bottom: -4 });
    scene.add(sun);
    const WHITE = new THREE.Color(0xffffff);
    const WARM = new THREE.Color('#ffc98a');
    const DUSTY = new THREE.Color('#f1dcc0');

    const dot = makeDot();

    /* ---------- the sheet: three layers, each a top face, under face and edge band ---------- */
    const SX = 160;
    const SY = 72;
    const plane = new THREE.PlaneGeometry(W, H, SX, SY);
    const n = plane.attributes.position.count;
    const px = new Float32Array(n);
    const py = new Float32Array(n);
    const base = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      px[i] = plane.attributes.position.getX(i);
      py[i] = plane.attributes.position.getY(i);
      base[i] = tileZ(px[i], py[i]);
    }

    // boundary loop (PlaneGeometry: rows top→bottom, cols left→right)
    const idx = (r, c) => r * (SX + 1) + c;
    const loop = [];
    for (let c = 0; c <= SX; c++) loop.push(idx(SY, c));
    for (let r = SY - 1; r >= 0; r--) loop.push(idx(r, SX));
    for (let c = SX - 1; c >= 0; c--) loop.push(idx(0, c));
    for (let r = 1; r < SY; r++) loop.push(idx(r, 0));
    const L = loop.length;
    const edgeIndex = [];
    for (let k = 0; k < L; k++) {
      const a = k * 2;
      const b = ((k + 1) % L) * 2;
      edgeIndex.push(a, a + 1, b, b, a + 1, b + 1);
    }

    const sheet = new THREE.Group();
    sheet.rotation.order = 'YXZ';
    scene.add(sheet);

    let stack = 0;
    const layers = LAYERS.map((d) => {
      const topGeo = plane.clone();
      const botGeo = plane.clone();
      const edgePos = new Float32Array(L * 6);
      const edgeGeo = new THREE.BufferGeometry();
      edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePos, 3));
      edgeGeo.setIndex(edgeIndex);
      const mat = new THREE.MeshPhysicalMaterial({
        color: d.colour,
        roughness: d.rough,
        clearcoat: d.clear,
        clearcoatRoughness: 0.3,
        side: THREE.DoubleSide,
      });
      const group = new THREE.Group();
      const meshes = [topGeo, botGeo, edgeGeo].map((g) => {
        const m = new THREE.Mesh(g, mat);
        m.castShadow = m.receiveShadow = true;
        group.add(m);
        return m;
      });
      sheet.add(group);
      const layer = { ...d, topGeo, botGeo, edgeGeo, edgePos, mat, group, face: meshes[0], bonded: -stack };
      stack += d.t;
      return layer;
    });
    plane.dispose();
    const top = layers[0];

    const z = new Float32Array(n);
    const writeGeometry = () => {
      for (const Ly of layers) {
        const tp = Ly.topGeo.attributes.position;
        const bp = Ly.botGeo.attributes.position;
        for (let i = 0; i < n; i++) {
          tp.setZ(i, z[i]);
          bp.setZ(i, z[i] - Ly.t);
        }
        tp.needsUpdate = bp.needsUpdate = true;
        Ly.topGeo.computeVertexNormals();
        Ly.botGeo.computeVertexNormals();
        for (let k = 0; k < L; k++) {
          const i = loop[k];
          Ly.edgePos.set([px[i], py[i], z[i], px[i], py[i], z[i] - Ly.t], k * 6);
        }
        Ly.edgeGeo.attributes.position.needsUpdate = true;
        Ly.edgeGeo.computeVertexNormals();
      }
    };

    /* ripple while it falls in; flat once landed */
    let lastFlow = -1;
    const shapeFor = (f) => {
      const e = 1 - smooth(f);
      for (let i = 0; i < n; i++) {
        const free = 0.35 + 0.65 * (0.5 - py[i] / H); // more movement toward the free end
        const wave = Math.sin(py[i] * 2.1 - f * 8 + px[i] * 0.35) * 0.42 * free;
        const curl = Math.pow(Math.max(0, -py[i] / (H / 2)), 3) * 0.9; // leading edge curls up
        z[i] = base[i] + e * (wave + curl);
      }
      writeGeometry();
    };
    shapeFor(reduce ? 1 : 0);

    /* ---------- water running down the channels ---------- */
    const STREAM = reduce ? 0 : 720;
    const stLane = new Uint8Array(STREAM);
    const stY = new Float32Array(STREAM);
    const stSpeed = new Float32Array(STREAM);
    for (let i = 0; i < STREAM; i++) {
      stLane[i] = i % LANES.length;
      stY[i] = (Math.random() - 0.5) * H;
      stSpeed[i] = 0.7 + Math.random() * 0.9;
    }
    const water = makePoints(STREAM, { color: 0xeaf4ff, size: 0.085, map: dot });
    top.face.add(water.pts);

    /* ---------- rain ---------- */
    const DROPS = reduce ? 0 : 1200;
    const rainPos = new Float32Array(DROPS * 6);
    const rainSpeed = new Float32Array(DROPS);
    const spawnDrop = (i, anyY) => {
      const x = (Math.random() - 0.5) * 12;
      const y = anyY ? Math.random() * 8 - 3 : 5 + Math.random() * 2;
      const zz = (Math.random() - 0.5) * 6;
      const len = 0.16 + Math.random() * 0.22;
      rainPos.set([x, y, zz, x + len * 0.18, y + len, zz], i * 6);
      rainSpeed[i] = 7 + Math.random() * 5;
    };
    for (let i = 0; i < DROPS; i++) spawnDrop(i, true);
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.LineBasicMaterial({ color: 0x7f97aa, transparent: true, opacity: 0, depthWrite: false });
    scene.add(new THREE.LineSegments(rainGeo, rainMat));

    /* ---------- dust blown across ---------- */
    const DUST = reduce ? 0 : 1100;
    const dust = makePoints(DUST, { color: 0xb8956a, size: 0.055, map: dot });
    const dustSpeed = new Float32Array(DUST);
    const dustSeed = new Float32Array(DUST);
    const spawnDust = (i, anyX) => {
      dust.pos[i * 3] = anyX ? Math.random() * 15 - 7.5 : -7.5 - Math.random();
      dust.pos[i * 3 + 1] = Math.random() * 5 - 2.2;
      dust.pos[i * 3 + 2] = Math.random() * 6 - 3;
      dustSpeed[i] = 2.2 + Math.random() * 3.2;
      dustSeed[i] = Math.random() * 100;
    };
    for (let i = 0; i < DUST; i++) spawnDust(i, true);
    scene.add(dust.pts);

    /* ---------- wind streaks ---------- */
    const GUSTS = reduce ? 0 : 150;
    const gustPos = new Float32Array(GUSTS * 6);
    const gustSpeed = new Float32Array(GUSTS);
    const spawnGust = (i, anyX) => {
      const x = anyX ? Math.random() * 15 - 7.5 : -8 - Math.random() * 2;
      const y = Math.random() * 4.5 - 1.8;
      const zz = Math.random() * 5 - 2.5;
      const len = 0.5 + Math.random() * 1.1;
      gustPos.set([x, y, zz, x + len, y + len * 0.04, zz], i * 6);
      gustSpeed[i] = 9 + Math.random() * 6;
    };
    for (let i = 0; i < GUSTS; i++) spawnGust(i, true);
    const gustGeo = new THREE.BufferGeometry();
    gustGeo.setAttribute('position', new THREE.BufferAttribute(gustPos, 3));
    const gustMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
    scene.add(new THREE.LineSegments(gustGeo, gustMat));

    /* ---------- heat rising in the sun ---------- */
    const MOTES = reduce ? 0 : 220;
    const heat = makePoints(MOTES, { color: 0xffb35c, size: 0.07, map: dot });
    const moteSpeed = new Float32Array(MOTES);
    const spawnMote = (i, anyY) => {
      heat.pos[i * 3] = (Math.random() - 0.5) * 5;
      heat.pos[i * 3 + 1] = anyY ? Math.random() * 3.5 - 0.5 : -0.5 + Math.random() * 0.4;
      heat.pos[i * 3 + 2] = (Math.random() - 0.5) * 3;
      moteSpeed[i] = 0.35 + Math.random() * 0.6;
    };
    for (let i = 0; i < MOTES; i++) spawnMote(i, true);
    scene.add(heat.pts);

    /* ---------- state the scroll drives ---------- */
    const state = {
      flow: 0, spin: 0.35, tilt: -0.55, x: 1, dolly: 0,
      explode: 0, measure: 0, sun: 0, wind: 0, water: 0, colour: 0, tests: 0,
      exit: 0, // 0 = in place, 1 = fallen out of view below
    };
    if (reduce) Object.assign(state, { flow: 1, x: 1 });

    /* sizing */
    let baseZ = 11;
    let dollyAmt = 4.2;
    let xAmt = 1.3;
    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const tall = w / h < 0.9;
      baseZ = tall ? 17 : 11;
      dollyAmt = tall ? 6 : 4.2;
      xAmt = tall ? 0 : w / h > 1.5 ? 1.5 : 1.05;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    /* ---------- DOM that follows the sheet ---------- */
    const gaugeEl = el.querySelector('.af-gauge');
    const testEls = [...el.querySelectorAll('.af-test')];
    const labelEls = [...el.querySelectorAll('.af-label')];
    const swatchEls = [...el.querySelectorAll('.af-swatch')];
    const sunEl = el.querySelector('.af-sun');
    const hazeEl = el.querySelector('.af-haze');
    const rainBgEl = el.querySelector('.af-rainsky');
    const v = new THREE.Vector3();
    const toScreen = (mesh, lx, ly, lz) => {
      v.set(lx, ly, lz);
      mesh.localToWorld(v);
      v.project(camera);
      return [(v.x * 0.5 + 0.5) * host.clientWidth, (-v.y * 0.5 + 0.5) * host.clientHeight];
    };
    const TEST_AT = [
      [-1.3, 0.7],
      [0.2, 0.9],
      [1.4, -0.2],
    ];
    const gaugeZ = base[idx(SY, Math.round(SX * 0.56))] - T_ALL / 2;
    let lastSwatch = -1;
    const placeDom = () => {
      const w = host.clientWidth;
      const [gx, gy] = toScreen(top.face, 0.25, -H / 2, gaugeZ);
      gaugeEl.style.transform = `translate(${gx}px, ${gy}px)`;
      gaugeEl.style.opacity = state.measure.toFixed(3);

      testEls.forEach((t, i) => {
        const [tx, ty] = toScreen(top.face, TEST_AT[i][0], TEST_AT[i][1], 0.2);
        const show = clamp01(state.tests * 3 - i) * clamp01(1 - state.exit * 3);
        t.style.transform = `translate(${tx}px, ${ty}px) scale(${0.8 + 0.2 * show})`;
        t.style.opacity = show.toFixed(3);
      });

      const showLabels = clamp01((state.explode - 0.35) / 0.5);
      layers.forEach((Ly, i) => {
        const tag = labelEls[i];
        const [lx, ly] = toScreen(Ly.face, LABEL_X[i] * W, -H * 0.42, 0.06);
        tag.style.transform = `translate(${lx}px, ${ly}px)`;
        tag.style.opacity = showLabels.toFixed(3);
        tag.classList.toggle('flip', lx > w * 0.62);
      });

      const sw = Math.round(state.colour) % COLOURS.length;
      if (sw !== lastSwatch) {
        lastSwatch = sw;
        swatchEls.forEach((s, i) => s.classList.toggle('is-on', i === sw));
      }

      sunEl.style.opacity = state.sun.toFixed(3);
      hazeEl.style.opacity = (state.wind * 0.85).toFixed(3);
      rainBgEl.style.opacity = (state.water * 0.9).toFixed(3);
    };

    /* ---------- render loop ---------- */
    let visible = false;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '200px' });
    io.observe(host);
    const cA = new THREE.Color();
    const cB = new THREE.Color();
    let lastColour = -1;
    const timer = new THREE.Timer();
    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      timer.update();
      const dt = Math.min(timer.getDelta(), 0.05);
      if (!visible) return;
      const t = timer.getElapsed();

      const ripple = Math.min(state.flow, 1 - state.exit * 0.75);
      if (Math.abs(ripple - lastFlow) > 0.001) {
        shapeFor(ripple);
        lastFlow = ripple;
      }

      /* sheet transform */
      const drop = 1 - smooth(state.flow);
      const fall = smooth(state.exit);
      const gust = reduce ? 0 : state.wind * (Math.sin(t * 9) * 0.5 + Math.sin(t * 13.7) * 0.5);
      sheet.position.y = drop * drop * 5.5 - fall * fall * 7 + (reduce ? 0 : Math.sin(t * 0.7) * 0.03 * state.flow);
      sheet.position.x = state.x * xAmt * (1 - state.dolly * 0.55);
      sheet.rotation.x = state.tilt - drop * 0.9 + fall * 0.7 + gust * 0.006;
      sheet.rotation.y = state.spin + drop * 0.6 + (reduce ? 0 : Math.sin(t * 0.4) * 0.03);
      sheet.rotation.z = drop * 0.25 - fall * 0.2 + gust * 0.004;
      layers.forEach((Ly) => (Ly.group.position.z = Ly.bonded + Ly.spread * state.explode));

      /* colour */
      if (state.colour !== lastColour) {
        const i = Math.floor(state.colour);
        const f = state.colour - i;
        cA.set(COLOURS[i % COLOURS.length].hex);
        cB.set(COLOURS[(i + 1) % COLOURS.length].hex);
        top.mat.color.lerpColors(cA, cB, f);
        lastColour = state.colour;
      }

      /* light: warm, bright and sweeping in the sun; flat and dusty in the wind */
      const s = state.sun;
      sun.color.copy(WHITE).lerp(WARM, s).lerp(DUSTY, state.wind * 0.6);
      sun.intensity = 2.4 + s * 2.2 - state.wind * 0.5 - state.water * 0.8;
      sun.position.set(-3 + (reduce ? 0 : Math.sin(t * 0.9) * 4.5 * s), 6 - s * 1.5, 4 + s * 2);
      hemi.intensity = 1.1 - state.water * 0.25;
      scene.environmentIntensity = 0.45 + s * 0.35;

      /* the top coat: glassy in the sun, wet in the rain */
      const wet = state.water;
      top.mat.roughness = top.rough - s * 0.22 - wet * 0.25;
      top.mat.clearcoat = Math.min(1, top.clear + s * 0.4 + wet * 0.4);
      top.mat.clearcoatRoughness = 0.3 - s * 0.24 - wet * 0.2;

      /* camera */
      camera.position.set(0, 0.3 + state.dolly * 0.45, baseZ - state.dolly * dollyAmt);
      camera.lookAt(sheet.position.x * state.dolly * 0.5, -state.dolly * 0.15, 0);

      /* rain */
      rainMat.opacity = state.water * 0.5;
      if (rainMat.opacity > 0.01) {
        for (let i = 0; i < DROPS; i++) {
          const o = i * 6;
          const d = rainSpeed[i] * dt;
          rainPos[o + 1] -= d;
          rainPos[o + 4] -= d;
          rainPos[o] -= d * 0.18;
          rainPos[o + 3] -= d * 0.18;
          if (rainPos[o + 1] < -3) spawnDrop(i, false);
        }
        rainGeo.attributes.position.needsUpdate = true;
      }

      /* water running down the channels */
      water.mat.opacity = state.water;
      if (water.mat.opacity > 0.01) {
        for (let i = 0; i < STREAM; i++) {
          stY[i] -= stSpeed[i] * dt;
          if (stY[i] < -H / 2) stY[i] = H / 2 - Math.random() * 0.2;
          const x = LANES[stLane[i]] + Math.sin(stY[i] * 9 + i) * 0.012;
          water.pos[i * 3] = x;
          water.pos[i * 3 + 1] = stY[i];
          water.pos[i * 3 + 2] = tileZ(x, stY[i]) + 0.02;
        }
        water.geo.attributes.position.needsUpdate = true;
      }

      /* dust */
      dust.mat.opacity = state.wind * 0.85;
      if (dust.mat.opacity > 0.01) {
        for (let i = 0; i < DUST; i++) {
          const o = i * 3;
          dust.pos[o] += dustSpeed[i] * dt;
          dust.pos[o + 1] += Math.sin(t * 2.3 + dustSeed[i]) * dt * 0.45;
          dust.pos[o + 2] += Math.cos(t * 1.7 + dustSeed[i]) * dt * 0.2;
          if (dust.pos[o] > 7.5) spawnDust(i, false);
        }
        dust.geo.attributes.position.needsUpdate = true;
      }

      /* wind streaks */
      gustMat.opacity = state.wind * 0.6;
      if (gustMat.opacity > 0.01) {
        for (let i = 0; i < GUSTS; i++) {
          const o = i * 6;
          const d = gustSpeed[i] * dt;
          gustPos[o] += d;
          gustPos[o + 3] += d;
          gustPos[o + 1] += Math.sin(t * 3 + i) * dt * 0.15;
          gustPos[o + 4] = gustPos[o + 1] + (gustPos[o + 3] - gustPos[o]) * 0.04;
          if (gustPos[o] > 8) spawnGust(i, false);
        }
        gustGeo.attributes.position.needsUpdate = true;
      }

      /* heat */
      heat.mat.opacity = s * 0.75;
      if (heat.mat.opacity > 0.01) {
        heat.pts.position.x = sheet.position.x;
        for (let i = 0; i < MOTES; i++) {
          heat.pos[i * 3 + 1] += moteSpeed[i] * dt;
          heat.pos[i * 3] += Math.sin(t * 1.5 + i) * dt * 0.08;
          if (heat.pos[i * 3 + 1] > 3) spawnMote(i, false);
        }
        heat.geo.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
      placeDom();
    };
    tick();

    /* ---------- captions ---------- */
    const stepEls = el.querySelectorAll('.af-step');
    const dotEls = el.querySelectorAll('.af-dots li');
    let current = -1;
    const setStep = (p) => {
      let k = 0;
      FLOW_STEPS.forEach((st, i) => p >= st.at && (k = i));
      if (k === current) return;
      current = k;
      stepEls.forEach((st, i) => st.classList.toggle('is-on', i === k));
      dotEls.forEach((st, i) => st.classList.toggle('is-on', i === k));
    };

    const tweens = [];
    if (!reduce) {
      setStep(0);
      // entry: the sheet flows down while the section rises into view
      tweens.push(
        gsap.fromTo(
          state,
          { flow: 0 },
          { flow: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top top', scrub: 0.8 } }
        ),
        gsap.fromTo(
          el.querySelector('.af-ui'),
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top 35%', end: 'top top', scrub: true } }
        )
      );

      const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: PIN_LENGTH,
          pin: true,
          scrub: 0.8,
          onUpdate: (self) => setStep(self.progress),
        },
      });
      const side = (i) => (FLOW_STEPS[i].side === 'left' ? 1 : -1);

      tl
        // 01 a slow turn
        .to(state, { spin: 0.6, tilt: -0.4, duration: 0.1, ease: 'none' }, 0)
        // 02 layers apart, labelled, then back together
        .to(state, { explode: 1, spin: 0.7, tilt: -0.32, x: side(1), duration: 0.06 }, 0.09)
        .to(state, { explode: 0, duration: 0.03 }, 0.21)
        // 03 flat at eye level, push in on the front edge, gauge callout
        .to(state, { spin: 0.08, tilt: -1.36, dolly: 1, x: side(2), duration: 0.05 }, 0.22)
        .to(state, { measure: 1, duration: 0.02, ease: 'none' }, 0.27)
        .to(state, { measure: 0, duration: 0.02, ease: 'none' }, 0.34)
        // 04 sun: warm light sweeping a glint over the coat, heat rising
        .to(state, { spin: 0.45, tilt: -0.8, dolly: 0, x: side(3), duration: 0.05 }, 0.35)
        .to(state, { sun: 1, duration: 0.04, ease: 'none' }, 0.37)
        .to(state, { sun: 0, duration: 0.03, ease: 'none' }, 0.47)
        // 05 wind and dust blow across; the sheet stays put
        .to(state, { spin: -0.25, tilt: -0.9, x: side(4), duration: 0.05 }, 0.48)
        .to(state, { wind: 1, duration: 0.04, ease: 'none' }, 0.5)
        .to(state, { wind: 0, duration: 0.03, ease: 'none' }, 0.6)
        // 06 pitched like a roof, rain, water runs
        .to(state, { spin: 0.3, tilt: -1.05, x: side(5), duration: 0.05 }, 0.61)
        .to(state, { water: 1, duration: 0.04, ease: 'none' }, 0.63)
        .to(state, { water: 0, duration: 0.03, ease: 'none' }, 0.73)
        // 07 colours, all the way round and back to terracotta
        .to(state, { spin: -0.3, tilt: -0.5, x: side(6), duration: 0.05 }, 0.74)
        .to(state, { colour: COLOURS.length, duration: 0.11, ease: 'none' }, 0.77)
        // 08 test tags
        .to(state, { spin: -0.35, x: side(7), duration: 0.04 }, 0.87)
        .to(state, { tests: 1, duration: 0.05, ease: 'none' }, 0.88)
        // then it falls away downward and the captions clear
        .to(state, { exit: 1, duration: 0.07, ease: 'power1.in' }, 0.93)
        .to([el.querySelector('.af-steps'), el.querySelector('.af-dots')], { opacity: 0, y: 24, duration: 0.04, ease: 'power1.in' }, 0.94);
      tweens.push(tl);
    }

    return () => {
      tweens.forEach((tw) => {
        tw.scrollTrigger?.kill();
        tw.kill();
      });
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      timer.dispose();
      layers.forEach((Ly) => [Ly.topGeo, Ly.botGeo, Ly.edgeGeo, Ly.mat].forEach((o) => o.dispose()));
      [water, dust, heat].forEach((p) => {
        p.geo.dispose();
        p.mat.dispose();
      });
      [rainGeo, rainMat, gustGeo, gustMat, dot].forEach((o) => o.dispose());
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  /* ---------- statement, stats (unchanged) ---------- */
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // words light up as you read down the page
      gsap.fromTo(
        '.statement .sw',
        { opacity: 0.14 },
        {
          opacity: 1,
          stagger: 0.1,
          ease: 'none',
          scrollTrigger: {
            trigger: '.statement',
            start: 'top 80%',
            end: 'bottom 45%',
            scrub: true,
          },
        }
      );

      // stats count up once
      root.current.querySelectorAll('.stat-num').forEach((el) => {
        const to = parseFloat(el.dataset.to);
        const dec = parseInt(el.dataset.dec, 10);
        const o = { v: 0 };
        gsap.to(o, {
          v: to,
          duration: 1.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          onUpdate: () => (el.textContent = o.v.toFixed(dec)),
        });
      });

      gsap.from('.about-rule', {
        scaleX: 0,
        transformOrigin: 'left',
        duration: 1.4,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.stats', start: 'top 85%' },
      });
    }, root);
    return () => mm.revert();
  }, []);

  return (
    <section id="about" ref={root} className="about section">
      {/* the sheet that flows in and explains itself */}
      <div ref={flowRef} className="af" aria-label="About the sheet">
        {/* weather tints behind the sheet */}
        <div className="af-sun" aria-hidden="true">
          <span className="af-rays" />
        </div>
        <div className="af-haze" aria-hidden="true" />
        <div className="af-rainsky" aria-hidden="true" />

        <div ref={mount} className="af-canvas" aria-hidden="true" />

        {/* layer labels */}
        {LAYERS.map((l) => (
          <div className="af-label" key={l.name} aria-hidden="true">
            <span className="af-ldot" />
            <span className="af-pill">
              <strong>{l.name}</strong>
              <em>{l.note}</em>
            </span>
          </div>
        ))}

        <div className="af-gauge" aria-hidden="true">
          <span className="af-tick" />
          <span className="af-gauge-pill">{GAUGE_LABEL}</span>
        </div>
        {TESTS.map((t) => (
          <span className="af-test" key={t} aria-hidden="true">
            <span className="af-check">✓</span>
            {t}
          </span>
        ))}

        <div className="af-ui wrap">
          <div className="about-head">
            <h2 className="kicker">About us</h2>
            <p className="kicker-note">Since 1984</p>
          </div>
          <div className="af-steps" aria-live="polite">
            {FLOW_STEPS.map((s, i) => (
              <div className={`af-step ${s.side}`} key={s.title}>
                <p className="af-num">{String(i + 1).padStart(2, '0')}</p>
                <p className="af-title">{s.title}</p>
                <p className="af-body">{s.body}</p>
                {s.swatches && (
                  <ul className="af-swatches">
                    {COLOURS.map((c) => (
                      <li className="af-swatch" key={c.name}>
                        <span style={{ background: c.hex }} />
                        {c.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        <ol className="af-dots" aria-hidden="true">
          {FLOW_STEPS.map((s) => (
            <li key={s.title} />
          ))}
        </ol>
      </div>

      <div className="wrap">
        <p className="statement">
          {STATEMENT.split(' ').map((w, i) => (
            <span className="sw" key={i}>
              {w}{' '}
            </span>
          ))}
        </p>

        <div className="about-body">
          <p>
            We started with a single pressing line and a promise that a roof should outlive the
            person who paid for it. Four decades on, the sheets we roll still go onto homes in the
            same districts, fitted by families we have known across three generations of their
            trade.
          </p>
          <p>
            Every coil is pulled off the line and tested for salt, sun and monsoon before it earns
            our mark. Nothing ships on a batch average. If a sheet will not hold up on the coast,
            it does not leave the floor.
          </p>
        </div>

        <div className="about-rule" />
        <dl className="stats">
          {STATS.map((s) => (
            <div key={s.label} className="stat">
              <dt>{s.label}</dt>
              <dd>
                <span className="stat-num" data-to={s.to} data-dec={s.dec}>
                  {s.to.toFixed(s.dec)}
                </span>
                {s.suffix && <span className="stat-unit">{s.suffix}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <style jsx>{`
        .af {
          position: relative;
          height: 100svh;
          min-height: 560px;
          overflow: hidden;
        }
        .af-canvas,
        .af-sun,
        .af-haze,
        .af-rainsky {
          position: absolute;
          inset: 0;
        }
        .af-canvas :global(canvas) {
          display: block;
          width: 100% !important;
          height: 100% !important;
        }

        /* weather tints */
        .af-sun,
        .af-haze,
        .af-rainsky {
          opacity: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .af-sun {
          background:
            radial-gradient(circle at 12% 6%, rgba(255, 244, 214, 1) 0, rgba(255, 214, 140, 0.75) 9vmin, rgba(255, 190, 110, 0.25) 30vmin, rgba(255, 190, 110, 0) 60vmin),
            linear-gradient(180deg, #fbe3c0 0%, #fbf1e2 70%);
        }
        .af-rays {
          position: absolute;
          left: 12%;
          top: 6%;
          width: 220vmax;
          height: 220vmax;
          margin: -110vmax 0 0 -110vmax;
          background: repeating-conic-gradient(
            from 0deg,
            rgba(255, 240, 205, 0.32) 0deg 3deg,
            rgba(255, 240, 205, 0) 3deg 14deg
          );
          -webkit-mask-image: radial-gradient(circle, #000 0, rgba(0, 0, 0, 0.6) 18%, transparent 42%);
          mask-image: radial-gradient(circle, #000 0, rgba(0, 0, 0, 0.6) 18%, transparent 42%);
          animation: af-spin 60s linear infinite;
        }
        @keyframes af-spin {
          to {
            transform: rotate(360deg);
          }
        }
        .af-haze {
          background:
            radial-gradient(120% 70% at 0% 50%, rgba(214, 186, 146, 0.75) 0%, rgba(214, 186, 146, 0) 70%),
            linear-gradient(180deg, #ecdcc4 0%, #f3ebdf 100%);
        }
        .af-rainsky {
          background: linear-gradient(180deg, #b9c4cc 0%, #dfe4e7 100%);
        }

        /* layer labels */
        .af-label {
          position: absolute;
          left: 0;
          top: 0;
          opacity: 0;
          pointer-events: none;
          will-change: transform, opacity;
        }
        .af-ldot {
          position: absolute;
          left: -5px;
          top: -5px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--ink, #1b2631);
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.85);
        }
        .af-pill {
          position: absolute;
          left: 18px;
          top: -22px;
          display: flex;
          flex-direction: column;
          padding: 8px 14px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(8px);
          white-space: nowrap;
          box-shadow: 0 10px 30px -14px rgba(27, 38, 49, 0.35);
        }
        .af-label.flip .af-pill {
          left: auto;
          right: 18px;
        }
        .af-pill strong {
          font-weight: 600;
          font-size: 0.95rem;
        }
        .af-pill em {
          font-style: normal;
          color: var(--stone, #6b7480);
          font-size: 0.82rem;
        }

        /* gauge + test callouts */
        .af-gauge,
        .af-test {
          position: absolute;
          left: 0;
          top: 0;
          opacity: 0;
          pointer-events: none;
          will-change: transform, opacity;
        }
        .af-tick {
          position: absolute;
          left: -1px;
          top: 6px;
          width: 2px;
          height: 46px;
          background: var(--ink, #1b2631);
        }
        .af-tick::before,
        .af-tick::after {
          content: '';
          position: absolute;
          left: -5px;
          width: 12px;
          height: 2px;
          background: inherit;
        }
        .af-tick::before {
          top: 0;
        }
        .af-tick::after {
          bottom: 0;
        }
        .af-gauge-pill {
          position: absolute;
          left: -44px;
          top: 62px;
          width: 88px;
          text-align: center;
          padding: 6px 0;
          border-radius: 999px;
          background: var(--ink, #1b2631);
          color: var(--paper, #fff);
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .af-test {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin: -18px 0 0 -40px;
          padding: 8px 14px 8px 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(8px);
          box-shadow: 0 10px 30px -14px rgba(27, 38, 49, 0.4);
          font-weight: 600;
          white-space: nowrap;
          transform-origin: 40px 18px;
        }
        .af-check {
          display: grid;
          place-items: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #2f7a4f;
          color: #fff;
          font-size: 0.75rem;
        }

        /* captions */
        .af-ui {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding-top: clamp(84px, 12vh, 120px);
          padding-bottom: clamp(48px, 9vh, 90px);
          pointer-events: none;
        }
        .af-steps {
          position: relative;
          min-height: 210px;
        }
        .af-step {
          position: absolute;
          left: 0;
          bottom: 0;
          width: min(440px, 100%);
          padding: 22px 24px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.86);
          backdrop-filter: blur(12px);
          opacity: 0;
          transform: translateX(-28px);
          transition: opacity 0.5s var(--ease, ease), transform 0.6s var(--ease, ease);
        }
        .af-step.right {
          left: auto;
          right: 0;
          transform: translateX(28px);
        }
        .af-step.is-on {
          opacity: 1;
          transform: none;
        }
        .af-num {
          margin: 0 0 8px;
          font-size: 0.82rem;
          letter-spacing: 0.14em;
          color: var(--stone, #6b7480);
          font-variant-numeric: tabular-nums;
        }
        .af-title {
          margin: 0;
          font-stretch: 110%;
          font-weight: 640;
          font-size: clamp(1.35rem, 2.1vw, 1.9rem);
          line-height: 1.12;
          letter-spacing: -0.02em;
        }
        .af-body {
          margin: 8px 0 0;
          color: var(--stone, #6b7480);
        }
        .af-swatches {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 14px 0 0;
          padding: 0;
          list-style: none;
        }
        .af-swatch {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 12px 5px 5px;
          border-radius: 999px;
          border: 1px solid rgba(27, 38, 49, 0.12);
          font-size: 0.85rem;
          font-weight: 560;
          color: var(--stone, #6b7480);
          transition: background 0.3s, color 0.3s, border-color 0.3s;
        }
        .af-swatch span {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
        }
        .af-swatch.is-on {
          background: var(--ink, #1b2631);
          border-color: var(--ink, #1b2631);
          color: #fff;
        }

        .af-dots {
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
        }
        .af-dots li {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1.5px solid var(--ink, #1b2631);
          opacity: 0.4;
          transition: opacity 0.4s, background 0.4s, height 0.4s;
        }
        .af-dots li.is-on {
          opacity: 1;
          height: 26px;
          border-radius: 6px;
          background: var(--ink, #1b2631);
        }

        @media (max-width: 899px) {
          .af-dots {
            display: none;
          }
          .af-step,
          .af-step.right {
            left: 0;
            right: 0;
            width: auto;
            transform: translateY(14px);
          }
          .af-step.is-on {
            transform: none;
          }
          .af-test {
            font-size: 0.85rem;
          }
          .af-pill {
            padding: 6px 10px;
          }
          .af-pill em {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .af {
            height: auto;
            min-height: 0;
          }
          .af-canvas {
            position: relative;
            height: 60vh;
          }
          .af-ui {
            position: relative;
          }
          .af-steps {
            display: grid;
            gap: 12px;
            min-height: 0;
          }
          .af-step,
          .af-step.right {
            position: static;
            width: auto;
            opacity: 1;
            transform: none;
            transition: none;
          }
          .af-rays {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}