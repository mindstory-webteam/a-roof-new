'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { createSpin } from './spin360';

/* ------------------------------------------------------------------ */
/*  Sheet profiles — height (z) of the sheet at any (x, y) on its face */
/* ------------------------------------------------------------------ */
const frac = (v) => ((v % 1) + 1) % 1;

function tileZ(x, y) {
  // Roman tile: rounded barrels across, stepped courses down the slope
  const barrel = Math.pow(Math.sin(Math.PI * frac(x / 0.5)), 0.75) * 0.11;
  const r = frac(y / 0.42);
  const course = (r < 0.88 ? r / 0.88 : 1 - (r - 0.88) / 0.12) * 0.05;
  return barrel + course;
}

function traffordZ(x) {
  // Trapezoidal rib: flat valley, sloped web, flat crown
  const t = frac(x / 0.62);
  let h = 0;
  if (t < 0.22) h = 0;
  else if (t < 0.34) h = (t - 0.22) / 0.12;
  else if (t < 0.52) h = 1;
  else if (t < 0.64) h = 1 - (t - 0.52) / 0.12;
  // small stiffening ribs inside the valley
  const mini = t > 0.72 && t < 0.9 ? Math.sin(((t - 0.72) / 0.18) * Math.PI) * 0.12 : 0;
  return (h + mini) * 0.12;
}

const W = 4.4;
const H = 3.2;

/**
 * RoofScene
 * props:
 *  colour     hex string of the sheet
 *  profile    'tile' | 'trafford'
 *  weather    'rain' | 'sun' | 'none'
 *  progress   optional ref ({ current: { p: 0..1 } }) driven by ScrollTrigger
 *  spin360    true = drag to rotate the sheet a full 360°
 *  className
 */
export default function RoofScene({
  colour = '#a3452f',
  profile = 'tile',
  weather = 'rain',
  progress,
  distance = 9,
  offset = [0, 0],
  spin360 = false,
  className = '',
}) {
  const mountRef = useRef(null);
  const api = useRef(null);

  /* ---------------- one-time scene setup ---------------- */
  useEffect(() => {
    const mount = mountRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.45;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0.2, distance);

    /* lights */
    const hemi = new THREE.HemisphereLight(0xffffff, 0xd9e0e4, 1.1);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.position.set(-3.5, 5, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 20 });
    scene.add(sun);

    /* sheet geometry with two morph targets */
    const geo = new THREE.PlaneGeometry(W, H, 340, 200);
    const pos = geo.attributes.position;
    const count = pos.count;
    const zTile = new Float32Array(count);
    const zTraf = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      zTile[i] = tileZ(x, y);
      zTraf[i] = traffordZ(x);
    }
    const morph = { mix: profile === 'trafford' ? 1 : 0 };
    const applyMorph = () => {
      const m = morph.mix;
      for (let i = 0; i < count; i++) pos.setZ(i, zTile[i] * (1 - m) + zTraf[i] * m);
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    };
    applyMorph();

    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(colour),
      roughness: 0.46,
      metalness: 0,
      clearcoat: 0.55,
      clearcoatRoughness: 0.3,
      sheen: 0.2,
      side: THREE.DoubleSide,
    });
    const sheet = new THREE.Mesh(geo, mat);
    sheet.castShadow = true;
    sheet.receiveShadow = true;

    // pivot so the sheet sits like a pitched roof
    const pitch = new THREE.Group();
    pitch.add(sheet);
    pitch.rotation.set(-1.02, 0, 0.32);
    const group = new THREE.Group();
    group.add(pitch);
    scene.add(group);

    /* rain: short line segments falling at a slight angle */
    const DROPS = reduce ? 0 : 1600;
    const rainPos = new Float32Array(DROPS * 6);
    const speeds = new Float32Array(DROPS);
    const spawn = (i, anyY) => {
      const x = (Math.random() - 0.5) * 9;
      const y = anyY ? Math.random() * 8 - 3 : 5 + Math.random() * 2;
      const z = (Math.random() - 0.5) * 6;
      const len = 0.16 + Math.random() * 0.22;
      rainPos.set([x, y, z, x + len * 0.18, y + len, z], i * 6);
      speeds[i] = 7 + Math.random() * 5;
    };
    for (let i = 0; i < DROPS; i++) spawn(i, true);
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.LineBasicMaterial({
      color: 0x7f97aa,
      transparent: true,
      opacity: weather === 'rain' ? 0.38 : 0,
      depthWrite: false,
    });
    const rain = new THREE.LineSegments(rainGeo, rainMat);
    scene.add(rain);

    /* sizing */
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // pull back on narrow screens so the sheet fits
      camera.position.z = w / h < 0.9 ? distance * 1.4 : distance;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    /* pointer parallax */
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    /* 360° drag-to-rotate */
    const spin = createSpin(mount, { autoSpeed: reduce ? 0 : 0.35 });
    spin.setEnabled(spin360);

    /* only render while visible */
    let visible = true;
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), {
      rootMargin: '100px',
    });
    io.observe(mount);

    const timer = new THREE.Timer();
    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      timer.update();
      const dt = Math.min(timer.getDelta(), 0.05);
      if (!visible) return;
      const t = timer.getElapsed();
      const p = progress?.current?.p ?? 0;

      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      spin.update(dt);
      const parallax = 1 - spin.mix; // no mouse-follow while in 360° mode

      const float = reduce ? 0 : Math.sin(t * 0.6) * 0.04;
      group.rotation.y =
        pointer.x * 0.18 * parallax + p * 0.7 + (reduce ? 0 : Math.sin(t * 0.25) * 0.05) + spin.yaw;
      group.rotation.x = pointer.y * 0.08 * parallax - p * 0.25 + spin.pitch;
      group.position.x = offset[0];
      group.position.y = offset[1] + float + p * 0.6;
      group.scale.setScalar(1 + p * 0.18);

      if (DROPS && rainMat.opacity > 0.01) {
        for (let i = 0; i < DROPS; i++) {
          const o = i * 6;
          const d = speeds[i] * dt;
          rainPos[o + 1] -= d;
          rainPos[o + 4] -= d;
          rainPos[o] -= d * 0.18;
          rainPos[o + 3] -= d * 0.18;
          if (rainPos[o + 1] < -3) spawn(i, false);
        }
        rainGeo.attributes.position.needsUpdate = true;
      }
      renderer.render(scene, camera);
    };
    tick();

    api.current = { mat, morph, applyMorph, rainMat, sun, hemi, spin };

    return () => {
      cancelAnimationFrame(raf);
      timer.dispose();
      ro.disconnect();
      io.disconnect();
      spin.dispose();
      window.removeEventListener('pointermove', onMove);
      gsap.killTweensOf([mat.color, morph, rainMat, sun.color, sun]);
      geo.dispose();
      mat.dispose();
      rainGeo.dispose();
      rainMat.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- reactive props ---------------- */
  useEffect(() => {
    api.current?.spin.setEnabled(spin360);
  }, [spin360]);

  useEffect(() => {
    const a = api.current;
    if (!a) return;
    const c = new THREE.Color(colour);
    gsap.to(a.mat.color, { r: c.r, g: c.g, b: c.b, duration: 0.8, ease: 'power2.out' });
  }, [colour]);

  useEffect(() => {
    const a = api.current;
    if (!a) return;
    gsap.to(a.morph, {
      mix: profile === 'trafford' ? 1 : 0,
      duration: 1.1,
      ease: 'power3.inOut',
      onUpdate: a.applyMorph,
    });
  }, [profile]);

  useEffect(() => {
    const a = api.current;
    if (!a) return;
    const sunny = weather === 'sun';
    gsap.to(a.rainMat, { opacity: weather === 'rain' ? 0.38 : 0, duration: 0.9 });
    const sc = new THREE.Color(sunny ? '#fff1d9' : '#ffffff');
    gsap.to(a.sun.color, { r: sc.r, g: sc.g, b: sc.b, duration: 0.9 });
    gsap.to(a.sun, { intensity: sunny ? 3.4 : 2.4, duration: 0.9 });
    gsap.to(a.hemi, { intensity: sunny ? 1.3 : 1.0, duration: 0.9 });
  }, [weather]);

  return <div ref={mountRef} className={`roof-scene ${className}`} aria-hidden="true" />;
}