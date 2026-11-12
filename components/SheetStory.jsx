'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * SheetStory — a pinned, scroll-driven 3D roofing sheet
 *
 *   1. The sheet turns into view.
 *   2. It splits into its three layers, each labelled.
 *   3. The layers close up and the profile morphs from Tile to Trafford.
 *   4. The colour runs through the range.
 *   5. Climates: Summer → Monsoon → Storm → Coast, each with its own
 *      background video and effects on the sheet itself.
 * The sheet slides left / right, always opposite the caption.
 *
 * Videos: put loops in /public/video/ (see CLIMATES). If a file is
 * missing, the gradient sky behind it shows instead.
 */

/* ── Content ───────────────────────────────────────────────────────── */
// side = where the caption sits; the sheet moves to the other side
const STEPS = [
  { at: 0, rail: 'Sheet', side: 'left', title: 'One sheet, rolled in Kerala.', body: 'Scroll to take it apart.' },
  { at: 0.1, rail: 'Layers', side: 'right', title: 'Three layers, each with a job.', body: 'Co-extruded together, so they never peel apart on the roof.' },
  { at: 0.3, rail: 'Profiles', side: 'left', title: 'Two profiles from one line.', body: 'Tile for homes, Trafford for long spans and sheds.' },
  { at: 0.44, rail: 'Colours', side: 'right', title: 'Colour all the way through the coat.', body: 'Four shades per profile, held against years of sun.' },
  { at: 0.6, rail: 'Summer', side: 'left', title: 'Built for the Kerala summer.', body: 'The ASA top coat reflects heat and keeps its colour. No fading, no warping.' },
  { at: 0.7, rail: 'Monsoon', side: 'right', title: 'Months of monsoon rain.', body: 'Water runs straight down the channels. Nothing pools, nothing seeps.' },
  { at: 0.8, rail: 'Storm', side: 'left', title: 'Thunderstorms and high wind.', body: 'Fixed tight on every crown, the sheet stays put when the weather turns.' },
  { at: 0.9, rail: 'Coast', side: 'right', title: 'Salt air on the coast.', body: 'UPVC doesn’t rust, so seaside homes get the same long life.' },
];
const FIRST_CLIMATE_STEP = 4;

const CLIMATES = [
  { key: 'summer', video: '/video/summer.mp4', sky: 'linear-gradient(180deg,#f2b877 0%,#f5dcb6 55%,#f3ece2 100%)' },
  { key: 'monsoon', video: '/video/monsoon.mp4', sky: 'linear-gradient(180deg,#76889a 0%,#a6b4be 60%,#c9d1d6 100%)' },
  { key: 'storm', video: '/video/storm.mp4', sky: 'linear-gradient(180deg,#252c34 0%,#434d58 60%,#646d76 100%)' },
  { key: 'coast', video: '/video/coast.mp4', sky: 'linear-gradient(180deg,#c9d9e0 0%,#e2eaee 60%,#f1f4f5 100%)' },
];

const LAYERS = [
  { name: 'ASA top coat', note: 'Colour and UV resistance' },
  { name: 'UPVC core', note: 'Strength and stiffness' },
  { name: 'Under layer', note: 'Moisture and heat barrier' },
];

const COLOURS = [
  { name: 'Terracotta', hex: '#a3452f' },
  { name: 'Charcoal', hex: '#3b3e42' },
  { name: 'Forest', hex: '#2f4c3c' },
  { name: 'Slate', hex: '#5d6873' },
];
const CORE_COLOUR = '#ece8e0';
const UNDER_COLOUR = '#c9ced3';

/* ── Scroll ────────────────────────────────────────────────────────── */
const PIN_LENGTH = '+=700%';

/* ── Sheet profiles: height of the sheet face at (x, y) ────────────── */
const frac = (v) => ((v % 1) + 1) % 1;
const tileZ = (x, y) => {
  const barrel = Math.pow(Math.sin(Math.PI * frac(x / 0.5)), 0.75) * 0.11;
  const r = frac(y / 0.42);
  const course = (r < 0.88 ? r / 0.88 : 1 - (r - 0.88) / 0.12) * 0.05;
  return barrel + course;
};
const traffordZ = (x) => {
  const t = frac(x / 0.62);
  let h = 0;
  if (t < 0.22) h = 0;
  else if (t < 0.34) h = (t - 0.22) / 0.12;
  else if (t < 0.52) h = 1;
  else if (t < 0.64) h = 1 - (t - 0.52) / 0.12;
  const mini = t > 0.72 && t < 0.9 ? Math.sin(((t - 0.72) / 0.18) * Math.PI) * 0.12 : 0;
  return (h + mini) * 0.12;
};
const profZ = (x, y, m) => tileZ(x, y) * (1 - m) + traffordZ(x) * m;

const W = 4.2;
const H = 2.6;
const LABEL_X = [0.3, 0.06, -0.18];

// the low channels water runs down, for each profile
const TILE_LANES = Array.from({ length: 9 }, (_, k) => -2 + k * 0.5);
const TRAF_LANES = Array.from({ length: 7 }, (_, k) => (k - 3 + 0.06) * 0.62);

/* soft round sprite for water / heat particles */
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

export default function SheetStory() {
  const root = useRef(null);
  const mount = useRef(null);
  const labels = useRef([]);
  const chip = useRef(null);

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
    scene.fog = new THREE.FogExp2(0xdfe6ea, 0);
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
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 4, bottom: -4 });
    scene.add(sun);
    const WHITE = new THREE.Color(0xffffff);
    const WARM = new THREE.Color('#ffcf94');
    const STORM_BLUE = new THREE.Color('#9fb3c8');

    const dot = makeDot();

    /* ---------- the three layers ---------- */
    const SEG_X = 260;
    const SEG_Y = 110;
    const base = new THREE.PlaneGeometry(W, H, SEG_X, SEG_Y);
    const n = base.attributes.position.count;
    const zTile = new Float32Array(n);
    const zTraf = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = base.attributes.position.getX(i);
      const y = base.attributes.position.getY(i);
      zTile[i] = tileZ(x, y);
      zTraf[i] = traffordZ(x);
    }

    const sheet = new THREE.Group();
    sheet.rotation.order = 'YXZ';
    scene.add(sheet);

    const layerDefs = [
      { colour: COLOURS[0].hex, gap: 0.035, spread: 0.95, rough: 0.42, clear: 0.6 },
      { colour: CORE_COLOUR, gap: 0, spread: 0, rough: 0.6, clear: 0 },
      { colour: UNDER_COLOUR, gap: -0.035, spread: -0.95, rough: 0.7, clear: 0 },
    ];
    const layers = layerDefs.map((d) => {
      const geo = base.clone();
      const mat = new THREE.MeshPhysicalMaterial({
        color: d.colour,
        roughness: d.rough,
        clearcoat: d.clear,
        clearcoatRoughness: 0.3,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      sheet.add(mesh);
      return { mesh, geo, mat, ...d };
    });
    base.dispose();
    const top = layers[0];

    /* ---------- water on the sheet: beads + run-off streams ---------- */
    const BEADS = reduce ? 0 : 520;
    const beadPos = new Float32Array(BEADS * 3);
    for (let i = 0; i < BEADS; i++) {
      beadPos[i * 3] = (Math.random() - 0.5) * W * 0.96;
      beadPos[i * 3 + 1] = (Math.random() - 0.5) * H * 0.96;
    }
    const beadGeo = new THREE.BufferGeometry();
    beadGeo.setAttribute('position', new THREE.BufferAttribute(beadPos, 3));
    const beadMat = new THREE.PointsMaterial({
      color: 0xeef6ff, size: 0.03, map: dot, transparent: true, opacity: 0, depthWrite: false,
    });
    const beads = new THREE.Points(beadGeo, beadMat);
    beads.frustumCulled = false;
    top.mesh.add(beads);

    const STREAM = reduce ? 0 : 300;
    const stLane = new Uint8Array(STREAM);
    const stY = new Float32Array(STREAM);
    const stSpeed = new Float32Array(STREAM);
    const stPos = new Float32Array(STREAM * 3);
    for (let i = 0; i < STREAM; i++) {
      stLane[i] = i % TILE_LANES.length;
      stY[i] = (Math.random() - 0.5) * H;
      stSpeed[i] = 0.6 + Math.random() * 0.9;
    }
    const streamGeo = new THREE.BufferGeometry();
    streamGeo.setAttribute('position', new THREE.BufferAttribute(stPos, 3));
    const streamMat = new THREE.PointsMaterial({
      color: 0xe6f2ff, size: 0.045, map: dot, transparent: true, opacity: 0, depthWrite: false,
    });
    const streams = new THREE.Points(streamGeo, streamMat);
    streams.frustumCulled = false;
    top.mesh.add(streams);

    const applyProfile = (m) => {
      for (const L of layers) {
        const pos = L.geo.attributes.position;
        for (let i = 0; i < n; i++) pos.setZ(i, zTile[i] * (1 - m) + zTraf[i] * m);
        pos.needsUpdate = true;
        L.geo.computeVertexNormals();
      }
      for (let i = 0; i < BEADS; i++) {
        beadPos[i * 3 + 2] = profZ(beadPos[i * 3], beadPos[i * 3 + 1], m) + 0.012;
      }
      beadGeo.attributes.position.needsUpdate = true;
    };
    applyProfile(0);

    /* ---------- rain ---------- */
    const DROPS = reduce ? 0 : 1600;
    const rainPos = new Float32Array(DROPS * 6);
    const speed = new Float32Array(DROPS);
    const spawn = (i, anyY) => {
      const x = (Math.random() - 0.5) * 12;
      const y = anyY ? Math.random() * 8 - 3 : 5 + Math.random() * 2;
      const z = (Math.random() - 0.5) * 6;
      const len = 0.16 + Math.random() * 0.22;
      rainPos.set([x, y, z, x + len * 0.18, y + len, z], i * 6);
      speed[i] = 7 + Math.random() * 5;
    };
    for (let i = 0; i < DROPS; i++) spawn(i, true);
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.LineBasicMaterial({ color: 0x7f97aa, transparent: true, opacity: 0, depthWrite: false });
    const RAIN_LIGHT = new THREE.Color(0xcfd9e2);
    const RAIN_DARK = new THREE.Color(0x7f97aa);
    scene.add(new THREE.LineSegments(rainGeo, rainMat));

    /* ---------- summer heat motes ---------- */
    const MOTES = reduce ? 0 : 220;
    const motePos = new Float32Array(MOTES * 3);
    const moteSpeed = new Float32Array(MOTES);
    const spawnMote = (i, anyY) => {
      motePos[i * 3] = (Math.random() - 0.5) * 5;
      motePos[i * 3 + 1] = anyY ? Math.random() * 3.5 - 0.5 : -0.5 + Math.random() * 0.4;
      motePos[i * 3 + 2] = (Math.random() - 0.5) * 3;
      moteSpeed[i] = 0.35 + Math.random() * 0.6;
    };
    for (let i = 0; i < MOTES; i++) spawnMote(i, true);
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
    const moteMat = new THREE.PointsMaterial({
      color: 0xffb35c, size: 0.07, map: dot, transparent: true, opacity: 0, depthWrite: false,
    });
    const motes = new THREE.Points(moteGeo, moteMat);
    motes.frustumCulled = false;
    scene.add(motes);

    /* ---------- state the scroll timeline animates ---------- */
    const state = {
      spin: -0.9,
      tilt: -0.35,
      scale: 0.8,
      x: 0, // -1 = left of section, 1 = right
      explode: 0,
      morph: 0,
      colour: 0,
      dolly: 0,
      weather: 0, // 0 = studio, 1 = climate scenes on
      climate: 0, // 0 summer … 3 coast
    };
    if (reduce) Object.assign(state, { spin: 0.45, tilt: -0.5, scale: 1, explode: 1, x: -1 });

    const cA = new THREE.Color();
    const cB = new THREE.Color();
    let lastMorph = -1;
    let lastColour = -1;

    /* ---------- sizing ---------- */
    let baseZ = 11;
    let dollyAmt = 2.2;
    let xAmt = 1.3;
    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const tall = w / h < 0.9;
      baseZ = tall ? 17 : 11;
      dollyAmt = tall ? 0.6 : 2.2;
      xAmt = tall ? 0 : w / h > 1.5 ? 1.5 : 1.05;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    /* ---------- labels follow their layer on screen ---------- */
    const anchor = new THREE.Vector3();
    const placeLabels = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      const show = Math.max(0, Math.min(1, (state.explode - 0.35) / 0.5));
      layers.forEach((L, i) => {
        const tag = labels.current[i];
        if (!tag) return;
        anchor.set(LABEL_X[i] * W, -H * 0.42, 0.06);
        L.mesh.localToWorld(anchor);
        anchor.project(camera);
        const x = (anchor.x * 0.5 + 0.5) * w;
        const y = (-anchor.y * 0.5 + 0.5) * h;
        tag.style.transform = `translate(${x}px, ${y}px)`;
        tag.style.opacity = show;
        tag.classList.toggle('flip', x > w * 0.62);
      });
    };

    /* ---------- climate DOM: skies, videos, mist, lightning ---------- */
    const skies = [...el.querySelectorAll('.ss-sky')];
    const videos = skies.map((s) => s.querySelector('video'));
    const mistEl = el.querySelector('.ss-mist');
    const flashEl = el.querySelector('.ss-flash');
    const lastW = [-1, -1, -1, -1];
    let flash = 0;

    const syncClimateDom = (weights) => {
      weights.forEach((w, i) => {
        const r = Math.round(w * 100) / 100;
        if (r === lastW[i]) return;
        lastW[i] = r;
        skies[i].style.opacity = r;
        const v = videos[i];
        if (!v || reduce) return;
        if (r > 0.02 && v.paused) v.play().catch(() => {});
        else if (r <= 0.02 && !v.paused) v.pause();
      });
    };

    /* ---------- render loop ---------- */
    let visible = true;
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (!visible) {
          videos.forEach((v) => v && v.pause());
          lastW.fill(-1);
        }
      },
      { rootMargin: '100px' }
    );
    io.observe(host);

    const timer = new THREE.Timer();
    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      timer.update();
      const dt = Math.min(timer.getDelta(), 0.05);
      if (!visible) return;
      const t = timer.getElapsed();

      /* climate weights */
      const wOf = (i) => state.weather * Math.max(0, 1 - Math.abs(state.climate - i));
      const summer = wOf(0);
      const monsoon = wOf(1);
      const storm = wOf(2);
      const coast = wOf(3);
      const wet = Math.max(monsoon, storm, coast * 0.35);
      const rainW = Math.max(monsoon, storm);

      /* sheet transform */
      sheet.rotation.y = state.spin + (reduce ? 0 : Math.sin(t * 0.4) * 0.03);
      sheet.rotation.x = state.tilt;
      sheet.position.x = state.x * xAmt * (1 - state.dolly * 0.2);
      sheet.position.y = reduce ? 0 : Math.sin(t * 0.7) * 0.04;
      sheet.scale.setScalar(state.scale);
      layers.forEach((L) => (L.mesh.position.z = L.gap + L.spread * state.explode));

      if (Math.abs(state.morph - lastMorph) > 0.002) {
        applyProfile(state.morph);
        lastMorph = state.morph;
      }

      if (state.colour !== lastColour) {
        const i = Math.min(Math.floor(state.colour), COLOURS.length - 2);
        const f = state.colour - i;
        cA.set(COLOURS[i].hex);
        cB.set(COLOURS[i + 1].hex);
        top.mat.color.lerpColors(cA, cB, f);
        if (chip.current) chip.current.textContent = COLOURS[Math.round(state.colour)].name;
        lastColour = state.colour;
      }

      /* light per climate */
      sun.color.copy(WHITE).lerp(WARM, summer).lerp(STORM_BLUE, storm * 0.6);
      sun.intensity = 2.4 + summer * 1.3 - monsoon * 0.8 - storm * 1.4 - coast * 0.6;
      if (storm > 0.6 && Math.random() < dt * 0.45) flash = 1;
      flash *= Math.exp(-dt * 7);
      const bolt = flash * storm * (0.55 + 0.45 * Math.random());
      hemi.intensity = 1.1 - storm * 0.35 + bolt * 3;
      scene.environmentIntensity = 0.45 - storm * 0.18 + summer * 0.1;
      flashEl.style.opacity = (bolt * 0.75).toFixed(3);

      /* wet surface: glossier top coat */
      top.mat.roughness = top.rough - wet * 0.3;
      top.mat.clearcoat = top.clear + wet * 0.4;
      top.mat.clearcoatRoughness = 0.3 - wet * 0.24;

      /* fog / mist */
      scene.fog.density = coast * 0.075 + monsoon * 0.012;
      mistEl.style.opacity = (coast * 0.7).toFixed(3);

      syncClimateDom([summer, monsoon, storm, coast]);

      camera.position.set(0, 0.3 + state.dolly * 0.4, baseZ - state.dolly * dollyAmt);
      camera.lookAt(0, 0, 0);

      /* rain: heavier and slanted in a storm */
      rainMat.opacity = rainW * (0.45 + storm * 0.15);
      rainMat.color.copy(RAIN_DARK).lerp(RAIN_LIGHT, storm);
      if (rainMat.opacity > 0.01) {
        const slant = 0.18 + storm * 0.75;
        const fast = 1 + storm * 0.6;
        for (let i = 0; i < DROPS; i++) {
          const o = i * 6;
          const d = speed[i] * dt * fast;
          rainPos[o + 1] -= d;
          rainPos[o + 4] -= d;
          rainPos[o] -= d * slant;
          rainPos[o + 3] = rainPos[o] + (rainPos[o + 4] - rainPos[o + 1]) * slant;
          if (rainPos[o + 1] < -3) spawn(i, false);
        }
        rainGeo.attributes.position.needsUpdate = true;
      }

      /* water beads + streams running down the channels */
      beadMat.opacity = wet * 0.85;
      streamMat.opacity = rainW * 0.9;
      if (streamMat.opacity > 0.01) {
        const lanes = state.morph > 0.5 ? TRAF_LANES : TILE_LANES;
        const run = 1 + storm * 0.8;
        for (let i = 0; i < STREAM; i++) {
          stY[i] -= stSpeed[i] * dt * run;
          if (stY[i] < -H / 2) stY[i] = H / 2 - Math.random() * 0.2;
          const x = lanes[stLane[i] % lanes.length] + Math.sin(stY[i] * 9 + i) * 0.012;
          stPos[i * 3] = x;
          stPos[i * 3 + 1] = stY[i];
          stPos[i * 3 + 2] = profZ(x, stY[i], state.morph) + 0.018;
        }
        streamGeo.attributes.position.needsUpdate = true;
      }

      /* heat motes rising off the sheet */
      moteMat.opacity = summer * 0.8;
      if (moteMat.opacity > 0.01) {
        motes.position.x = sheet.position.x;
        for (let i = 0; i < MOTES; i++) {
          motePos[i * 3 + 1] += moteSpeed[i] * dt;
          motePos[i * 3] += Math.sin(t * 1.5 + i) * dt * 0.08;
          if (motePos[i * 3 + 1] > 3) spawnMote(i, false);
        }
        moteGeo.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
      placeLabels();
    };
    tick();

    /* ---------- captions + progress ---------- */
    const stepEls = el.querySelectorAll('.ss-step');
    const railEls = el.querySelectorAll('.ss-rail li');
    const chipEl = el.querySelector('.ss-chip');
    let current = -1;
    const setStep = (p) => {
      let idx = 0;
      STEPS.forEach((s, i) => p >= s.at && (idx = i));
      if (idx === current) return;
      current = idx;
      stepEls.forEach((s, i) => s.classList.toggle('is-on', i === idx));
      railEls.forEach((s, i) => s.classList.toggle('is-on', i <= idx));
      chipEl.classList.toggle('is-on', idx === 3);
      el.classList.toggle('is-weather', idx >= FIRST_CLIMATE_STEP);
      el.classList.toggle('is-storm', idx === FIRST_CLIMATE_STEP + 2);
    };

    /* ---------- the scroll timeline ---------- */
    let tl;
    if (reduce) {
      setStep(0.1);
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
            el.style.setProperty('--ss-p', self.progress.toFixed(4));
          },
        },
      });

      tl
        // 1. turn into view (sheet sits a little right of the first caption)
        .to(state, { spin: 0.35, tilt: -0.55, scale: 1, x: 0.45, duration: 0.1, ease: 'power2.out' }, 0)
        // 2. split into layers
        .to(state, { explode: 1, duration: 0.1, ease: 'power2.inOut' }, 0.1)
        .to(state, { spin: 0.7, tilt: -0.32, duration: 0.16, ease: 'power1.inOut' }, 0.1)
        // 3. close up, morph tile → trafford
        .to(state, { explode: 0, duration: 0.06, ease: 'power2.inOut' }, 0.26)
        .to(state, { morph: 1, duration: 0.08, ease: 'power2.inOut' }, 0.32)
        .to(state, { spin: -0.35, tilt: -0.6, duration: 0.1, ease: 'power1.inOut' }, 0.32)
        // 4. colours, then back to tile
        .to(state, { colour: COLOURS.length - 1, duration: 0.12 }, 0.44)
        .to(state, { morph: 0, duration: 0.06, ease: 'power2.inOut' }, 0.54)
        // 5. roof pitch, climates fade in, then step through them
        .to(state, { spin: 0.25, tilt: -1.05, dolly: 1, duration: 0.08, ease: 'power2.inOut' }, 0.54)
        .to(state, { weather: 1, duration: 0.05, ease: 'power1.inOut' }, 0.57)
        .to(state, { climate: 1, duration: 0.06, ease: 'power1.inOut' }, 0.67)
        .to(state, { climate: 2, duration: 0.06, ease: 'power1.inOut' }, 0.77)
        .to(state, { climate: 3, duration: 0.06, ease: 'power1.inOut' }, 0.87)
        .fromTo(el.querySelector('.ss-end'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.05 }, 0.94)
        .to(el.querySelector('.ss-intro'), { opacity: 0, yPercent: -40, duration: 0.06 }, 0.02);

      // slide the sheet to the side opposite each caption
      STEPS.forEach((s, i) => {
        if (i === 0) return;
        tl.to(state, { x: s.side === 'left' ? 1 : -1, duration: 0.06, ease: 'power2.inOut' }, s.at - 0.04);
      });
    }

    return () => {
      tl?.scrollTrigger?.kill();
      tl?.kill();
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      timer.dispose();
      videos.forEach((v) => v && v.pause());
      layers.forEach((L) => {
        L.geo.dispose();
        L.mat.dispose();
      });
      [rainGeo, rainMat, beadGeo, beadMat, streamGeo, streamMat, moteGeo, moteMat, dot].forEach((o) => o.dispose());
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  const lastSide = STEPS[STEPS.length - 1].side;

  return (
    <section ref={root} className="ss" aria-label="How the sheet is made">
      {/* climate skies: gradient fallback + optional video loop */}
      <div className="ss-skies" aria-hidden="true">
        {CLIMATES.map((c) => (
          <div className={`ss-sky ss-sky-${c.key}`} key={c.key} style={{ background: c.sky }}>
            <video
              src={c.video}
              muted
              loop
              playsInline
              preload="metadata"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <span className="ss-veil" />
          </div>
        ))}
      </div>

      <div ref={mount} className="ss-canvas" aria-hidden="true" />
      <div className="ss-mist" aria-hidden="true" />
      <div className="ss-flash" aria-hidden="true" />

      <div className="ss-labels" aria-hidden="true">
        {LAYERS.map((l, i) => (
          <div className="ss-label" key={l.name} ref={(e) => (labels.current[i] = e)}>
            <span className="ss-dot" />
            <span className="ss-pill">
              <strong>{l.name}</strong>
              <em>{l.note}</em>
            </span>
          </div>
        ))}
      </div>

      <div className="ss-intro wrap">
        <h2 className="h2">How a sheet is made.</h2>
      </div>

      <div className="ss-ui wrap">
        <div className="ss-steps" aria-live="polite">
          {STEPS.map((s) => (
            <div className={`ss-step ${s.side}`} key={s.title}>
              <p className="ss-title">{s.title}</p>
              <p className="ss-body">{s.body}</p>
            </div>
          ))}
        </div>

        <p className="ss-chip" ref={chip} aria-live="polite">
          {COLOURS[0].name}
        </p>

        <div className={`ss-end ${lastSide}`}>
          <a href="#products" className="btn btn-ink">
            See the sheets
          </a>
          <a href="#contact" className="btn btn-line">
            Get a quote
          </a>
        </div>
      </div>

      <ol className="ss-rail" aria-hidden="true">
        {STEPS.map((s) => (
          <li key={s.rail}>{s.rail}</li>
        ))}
      </ol>

      <div className="ss-bar" aria-hidden="true">
        <span />
      </div>

      <style jsx>{`
        .ss {
          --ss-p: 0;
          position: relative;
          height: 100svh;
          overflow: hidden;
          background: radial-gradient(110% 80% at 60% 40%, #ffffff 0%, var(--mist) 100%);
        }

        /* climate skies */
        .ss-skies,
        .ss-sky,
        .ss-canvas,
        .ss-mist,
        .ss-flash {
          position: absolute;
          inset: 0;
        }
        .ss-sky {
          opacity: 0;
          overflow: hidden;
        }
        .ss-sky video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .ss-veil {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0) 35%, rgba(255, 255, 255, 0.3) 100%);
        }
        .ss-sky-storm .ss-veil {
          background: linear-gradient(180deg, rgba(10, 14, 20, 0.25) 0%, rgba(10, 14, 20, 0.1) 100%);
        }
        .ss-sky-summer::after {
          content: '';
          position: absolute;
          left: 8%;
          top: -12%;
          width: 46vmin;
          height: 46vmin;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 236, 190, 0.9) 0%, rgba(255, 200, 120, 0.35) 40%, rgba(255, 200, 120, 0) 70%);
        }

        .ss-canvas :global(canvas) {
          display: block;
          width: 100% !important;
          height: 100% !important;
        }
        .ss-mist {
          opacity: 0;
          pointer-events: none;
          background: linear-gradient(0deg, rgba(236, 241, 243, 0.95) 0%, rgba(236, 241, 243, 0.55) 45%, rgba(236, 241, 243, 0) 80%);
        }
        .ss-flash {
          opacity: 0;
          pointer-events: none;
          background: radial-gradient(120% 90% at 50% 0%, #f4f8ff 0%, rgba(220, 230, 255, 0.4) 60%, rgba(220, 230, 255, 0) 100%);
          mix-blend-mode: screen;
        }

        .ss-intro {
          position: absolute;
          top: clamp(90px, 12vh, 130px);
          left: 0;
          right: 0;
          pointer-events: none;
        }

        /* labels */
        .ss-labels {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .ss-label {
          position: absolute;
          left: 0;
          top: 0;
          opacity: 0;
          will-change: transform, opacity;
        }
        .ss-dot {
          position: absolute;
          left: -5px;
          top: -5px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--ink);
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.85);
        }
        .ss-pill {
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
        .ss-label.flip .ss-pill {
          left: auto;
          right: 18px;
        }
        .ss-pill strong {
          font-weight: 600;
          font-size: 0.95rem;
        }
        .ss-pill em {
          font-style: normal;
          color: var(--stone);
          font-size: 0.82rem;
        }

        /* captions, alternating sides */
        .ss-ui {
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
        .ss-steps {
          position: relative;
          width: 100%;
          min-height: 150px;
        }
        .ss-step {
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
        .ss-step.right {
          left: auto;
          right: 0;
          transform: translateX(28px);
        }
        .ss-step.is-on {
          opacity: 1;
          transform: none;
        }
        .ss-title {
          font-stretch: 110%;
          font-weight: 640;
          font-size: clamp(1.25rem, 1.9vw, 1.7rem);
          line-height: 1.15;
          letter-spacing: -0.02em;
        }
        .ss-body {
          margin-top: 6px;
          color: var(--stone);
        }
        .ss-chip {
          position: absolute;
          left: 50%;
          top: clamp(96px, 14vh, 140px);
          transform: translate(-50%, 10px);
          padding: 8px 18px;
          border-radius: 999px;
          background: var(--ink);
          color: var(--paper);
          font-weight: 560;
          opacity: 0;
          transition: opacity 0.4s var(--ease), transform 0.5s var(--ease);
        }
        .ss-chip.is-on {
          opacity: 1;
          transform: translate(-50%, 0);
        }
        .ss-end {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          opacity: 0;
          pointer-events: auto;
        }
        .ss-end.right {
          justify-content: flex-end;
        }

        /* progress */
        .ss-rail {
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
          transition: color 0.4s var(--ease);
        }
        .ss-rail li {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          opacity: 0.45;
          transition: opacity 0.4s var(--ease), color 0.4s var(--ease);
        }
        .ss-rail li::after {
          content: '';
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1.5px solid currentColor;
          transition: background 0.4s var(--ease);
        }
        .ss-rail li.is-on {
          opacity: 1;
          color: var(--ink);
        }
        .ss-rail li.is-on::after {
          background: currentColor;
        }
        .ss.is-storm .ss-rail li.is-on {
          color: #ffffff;
        }
        .ss-bar {
          position: absolute;
          left: var(--gutter);
          right: var(--gutter);
          bottom: 22px;
          height: 2px;
          background: rgba(27, 38, 49, 0.1);
        }
        .ss-bar span {
          display: block;
          height: 100%;
          background: var(--ink);
          transform-origin: left;
          transform: scaleX(var(--ss-p));
        }
        .ss.is-storm .ss-bar span {
          background: #ffffff;
        }

        @media (max-width: 899px) {
          .ss-rail {
            display: none;
          }
          .ss-step,
          .ss-step.right {
            left: 0;
            right: 0;
            width: auto;
            transform: translateY(14px);
          }
          .ss-step.is-on {
            transform: none;
          }
          .ss-end.right {
            justify-content: flex-start;
          }
          .ss-pill {
            padding: 6px 10px;
          }
          .ss-pill em {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ss {
            height: auto;
            min-height: 100svh;
          }
          .ss-end {
            opacity: 1;
          }
          .ss-step {
            transition: none;
          }
        }
      `}</style>
    </section>
  );
}