import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { resolveChessSkin } from '../lib/chessSkins';

const FILES = 'abcdefgh';

function makePiece(type, color, skin = 'classic', customization, performance = {}) {
  const group = new THREE.Group();
  const white = color === 'w';
  const skinSet = resolveChessSkin(skin, customization);
  const palette = white ? skinSet.white : skinSet.black;

  const isNeon = skin === 'neon' || skin === 'anime' || skin === 'custom';
  const isFancy = skin === 'fancy' || skin === 'historical' || skin === 'holy';
  const bodyRoughness   = isNeon ? 0.18 : isFancy ? 0.28 : 0.38;
  const bodyMetalness   = isNeon ? 0.45 : isFancy ? 0.35 : 0.18;
  const trimRoughness   = isNeon ? 0.12 : isFancy ? 0.20 : 0.25;
  const trimMetalness   = isNeon ? 0.88 : isFancy ? 0.72 : 0.60;

  const materials = {
    body: new THREE.MeshStandardMaterial({
      color: palette.body,
      roughness: bodyRoughness,
      metalness: bodyMetalness,
    }),
    trim: new THREE.MeshStandardMaterial({
      color: palette.accent,
      roughness: trimRoughness,
      metalness: trimMetalness,
    }),
    shade: new THREE.MeshStandardMaterial({
      color: palette.shade,
      roughness: bodyRoughness + 0.1,
      metalness: bodyMetalness * 0.5,
    }),
  };

  // High-poly helper values — mobile uses half segments to save GPU
  const isMobile = performance.reducedGeometry === true;
  const SEG_ROUND  = isMobile ? 16 : 32;   // circles / cylinders
  const SEG_SPHERE = isMobile ? 10 : 20;   // sphere lat/lon

  const add = (geometry, material, y, x = 0, z = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  /** Smooth cylinder */
  const cyl = (rTop, rBottom, height, y, material = materials.body, segments = SEG_ROUND) =>
    add(new THREE.CylinderGeometry(rTop, rBottom, height, segments), material, y);
  /** Rounded-edge box (via subdivided Box) */
  const box = (w, h, d, x, y, z, material = materials.body) =>
    add(new THREE.BoxGeometry(w, h, d), material, y, x, z);
  /** Smooth sphere */
  const sphere = (r, y, material = materials.body) =>
    add(new THREE.SphereGeometry(r, SEG_SPHERE, SEG_SPHERE), material, y);
  /** Smooth torus */
  const torus = (R, r, y, material = materials.trim) =>
    add(new THREE.TorusGeometry(R, r, isMobile ? 8 : 16, SEG_ROUND), material, y);

  /* ── Shared base (all pieces) ──────────────────────────────────────────── */
  // Foot disc — wide flat ring at the very bottom
  cyl(0.335, 0.385, 0.045, 0.023, materials.trim, SEG_ROUND);
  // Foot body
  cyl(0.300, 0.335, 0.090, 0.085, materials.shade, SEG_ROUND);
  // Waist torus ring (decorative collar)
  torus(0.270, 0.028, 0.14, materials.trim);
  // Lower stem
  cyl(0.195, 0.270, 0.100, 0.215, materials.body, SEG_ROUND);
  // Mid-stem taper
  cyl(0.150, 0.195, 0.120, 0.335, materials.body, SEG_ROUND);

  /* ── Faction mark (subtle front-face embossed mark) ─────────────────────
     Kept thin so it shows colour accent without bulk.                        */
  const markY = 0.38;
  const markDepth = 0.022;
  if (white) {
    // Cross
    box(0.048, 0.18, markDepth, 0, markY, 0.19, materials.trim);
    box(0.14,  0.048, markDepth, 0, markY, 0.19, materials.trim);
  } else {
    // X
    const mA = box(0.040, 0.22, markDepth, 0, markY, 0.19, materials.trim);
    mA.rotation.z = Math.PI / 4;
    const mB = box(0.040, 0.22, markDepth, 0, markY, 0.19, materials.trim);
    mB.rotation.z = -Math.PI / 4;
  }

  /* ── Type-specific upper body ───────────────────────────────────────────── */
  switch (type) {
    case 'p': {
      // Neck cone
      cyl(0.145, 0.185, 0.14, 0.455, materials.body, SEG_ROUND);
      // Neck ring
      torus(0.145, 0.022, 0.52, materials.trim);
      // Head
      sphere(0.195, 0.655, materials.body);
      // Tiny top knob
      sphere(0.055, 0.855, materials.trim);
      break;
    }
    case 'r': {
      // Tower shaft
      cyl(0.210, 0.185, 0.28, 0.485, materials.body, SEG_ROUND);
      // Battlement ring (wide flat disc)
      cyl(0.300, 0.300, 0.040, 0.640, materials.trim, SEG_ROUND);
      // Top platform
      cyl(0.260, 0.260, 0.040, 0.660, materials.body, SEG_ROUND);
      // Merlons — 4 battlements, evenly spaced
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2;
        const mx = Math.cos(ang) * 0.195;
        const mz = Math.sin(ang) * 0.195;
        const merlon = new THREE.Mesh(
          new THREE.BoxGeometry(0.090, 0.130, 0.090),
          materials.body,
        );
        merlon.position.set(mx, 0.745, mz);
        merlon.rotation.y = ang;
        merlon.castShadow = true;
        group.add(merlon);
      }
      break;
    }
    case 'b': {
      // Long mitre shaft
      cyl(0.095, 0.165, 0.28, 0.490, materials.body, SEG_ROUND);
      // Collar ring at mitre base
      torus(0.145, 0.022, 0.635, materials.trim);
      // Mitre upper cone
      cyl(0.045, 0.095, 0.26, 0.715, materials.body, SEG_ROUND);
      // Orb at top
      sphere(0.075, 0.855, materials.trim);
      // Tiny ball on orb
      sphere(0.030, 0.935, materials.body);
      break;
    }
    case 'n': {
      // Horse-neck block — angled to suggest a horse head
      cyl(0.165, 0.195, 0.16, 0.465, materials.body, SEG_ROUND);
      // Neck / lower head block
      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.270, 0.230, 0.230), materials.body);
      neck.position.set(0, 0.625, 0);
      neck.castShadow = true;
      group.add(neck);
      // Upper head block (slightly forward)
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.220, 0.260, 0.215), materials.body);
      head.position.set(0.030, 0.845, -0.040);
      head.castShadow = true;
      group.add(head);
      // Snout
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.090, 0.095), materials.shade);
      snout.position.set(0.085, 0.780, -0.095);
      snout.castShadow = true;
      group.add(snout);
      // Eye
      sphere(0.038, 0.890, materials.trim);
      // Mane ridge (trim colour, runs top-back)
      const mane = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.030, 0.230, 8), materials.trim);
      mane.position.set(-0.070, 0.845, 0.045);
      mane.rotation.z = Math.PI / 2.4;
      mane.castShadow = true;
      group.add(mane);
      // Ear
      const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.000, 0.040, 0.075, 6), materials.body);
      ear.position.set(0.030, 0.985, 0.010);
      ear.castShadow = true;
      group.add(ear);
      break;
    }
    case 'q': {
      // Waist above base
      cyl(0.165, 0.185, 0.22, 0.510, materials.body, SEG_ROUND);
      // Upper waist ring
      torus(0.155, 0.022, 0.630, materials.trim);
      // Upper shaft
      cyl(0.095, 0.145, 0.165, 0.735, materials.body, SEG_ROUND);
      // Crown band
      torus(0.145, 0.028, 0.825, materials.trim);
      // 5 crown points (small spheres)
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2;
        sphere(0.055, 0.870, materials.trim);
        const sp = group.children[group.children.length - 1];
        sp.position.set(Math.cos(ang) * 0.145, 0.870, Math.sin(ang) * 0.145);
      }
      // Orb at top
      sphere(0.110, 0.945, materials.trim);
      sphere(0.040, 1.065, materials.body);
      break;
    }
    case 'k': {
      // Waist above base
      cyl(0.168, 0.188, 0.22, 0.510, materials.body, SEG_ROUND);
      // Ring
      torus(0.158, 0.022, 0.630, materials.trim);
      // Upper shaft
      cyl(0.098, 0.148, 0.165, 0.735, materials.body, SEG_ROUND);
      // Crown band
      torus(0.148, 0.025, 0.825, materials.trim);
      // Cross (vertical + horizontal bars) — trim colour
      box(0.072, 0.320, 0.072, 0, 1.000, 0, materials.trim);
      box(0.230, 0.072, 0.072, 0, 1.025, 0, materials.trim);
      // Small orb where bars meet
      sphere(0.048, 1.000, materials.body);
      break;
    }
    default:
      return null;
  }
  if ((skin === 'anime' || skin === 'custom') && (type === 'k' || type === 'q') && customization?.aura !== false) {
    const requestedParticleCount = customization?.particleCount ?? 12;
    const particleCount = Math.min(requestedParticleCount, performance.maxParticles ?? requestedParticleCount);
    const particleSize = customization?.particleSize ?? 0.035;
    const particleSpeed = customization?.particleSpeed ?? 1;
    const fx = new THREE.Group();
    const ringMaterial = new THREE.MeshBasicMaterial({ color: palette.accent, transparent: true, opacity: 0.72 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(type === 'k' ? 0.27 : 0.23, 0.018, 6, 16), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = type === 'k' ? 1.12 : 1.02;
    fx.add(ring);
    const particleGeometry = new THREE.BoxGeometry(particleSize, particleSize, particleSize);
    const primaryParticleMaterial = new THREE.MeshBasicMaterial({ color: palette.accent, transparent: true, opacity: 0.88, depthWrite: false });
    const secondaryParticleMaterial = new THREE.MeshBasicMaterial({ color: palette.accentDark, transparent: true, opacity: 0.88, depthWrite: false });
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const particle = new THREE.Mesh(particleGeometry, i % 2 ? primaryParticleMaterial : secondaryParticleMaterial);
      particle.userData.orbit = { angle, radius: 0.24 + (i % 3) * 0.04, speed: (0.65 + (i % 4) * 0.14) * particleSpeed, y: 0.76 + (i % 4) * 0.1 };
      fx.add(particle);
    }
    fx.userData.cyberFx = true;
    group.add(fx);
  }
  return group;
}

function squareName(row, col) {
  return `${FILES[col]}${8 - row}`;
}

export default function ChessBoard3D({ board, selectedSquare, validTargets = [], lastMove, kingInCheck, onSquareClick, skin = 'classic', customization, whiteName = 'White', blackName = 'Black', capturedByWhite = [], capturedByBlack = [], playerSide = 'w' }) {
  const hostRef = useRef(null);
  const boardRef = useRef(null);
  const sceneRef = useRef(null);
  const objectsRef = useRef([]);
  const interactionMeshesRef = useRef([]);
  const animatedEffectsRef = useRef([]);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const onSquareClickRef = useRef(onSquareClick);
  const zoomRef = useRef(1);
  const [zoom, setZoom] = useState(1);
  const [yaw, setYaw] = useState(playerSide === 'b' ? 180 : 0);
  const [pitch, setPitch] = useState(24);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gardenBackdrop, setGardenBackdrop] = useState(true);

  useEffect(() => {
    setYaw(playerSide === 'b' ? 180 : 0);
  }, [playerSide]);

  useEffect(() => {
    onSquareClickRef.current = onSquareClick;
  }, [onSquareClick]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const skinSet = resolveChessSkin(skin);
    const isMobile = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const frameInterval = isMobile ? 1000 / 30 : 0;
    const scene = new THREE.Scene();
    scene.background = (isFullscreen && gardenBackdrop) ? null : new THREE.Color(0x171411);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 15, 0.01);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2.0));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xf5e9d2, 0x31221a, 1.8));
    const keyLight = new THREE.DirectionalLight(0xffe2a8, 3.4);
    keyLight.position.set(-5, 12, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
    keyLight.shadow.camera.left = -8;
    keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -8;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.radius = 2.5;
    scene.add(keyLight);
    // Fill light — cool blue from opposite side
    const fillLight = new THREE.DirectionalLight(0xc8d8ff, 1.5);
    fillLight.position.set(8, 7, -6);
    scene.add(fillLight);
    // Rim / back light for depth separation on pieces
    const rimLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    rimLight.position.set(0, 4, -10);
    scene.add(rimLight);
    // Soft warm bounce light from board surface
    const bounceLight = new THREE.PointLight(0xd4a96a, 0.5, 20, 2);
    bounceLight.position.set(0, -1, 0);
    scene.add(bounceLight);

    let animationFrame;
    let lastFrame = 0;
    const animate = (time) => {
      animationFrame = requestAnimationFrame(animate);
      if (frameInterval && time - lastFrame < frameInterval) return;
      const delta = lastFrame ? Math.min((time - lastFrame) / 16.67, 2) : 1;
      lastFrame = time;
      animatedEffectsRef.current.forEach((effect) => {
        effect.rotation.y += 0.008 * delta;
        effect.children.forEach((child) => {
          const orbit = child.userData?.orbit;
          if (!orbit) return;
          orbit.angle += orbit.speed * 0.01 * delta;
          child.position.set(Math.cos(orbit.angle) * orbit.radius, orbit.y + Math.sin(orbit.angle * 1.7) * 0.06, Math.sin(orbit.angle) * orbit.radius);
          child.rotation.x += 0.025 * delta;
          child.rotation.z += 0.03 * delta;
        });
      });
      renderer.render(scene, camera);
    };
    if (!reducedMotion) animationFrame = requestAnimationFrame(animate);

    const wood = new THREE.MeshStandardMaterial({ color: skinSet.board.frame, roughness: 0.38, metalness: skin === 'fancy' ? 0.32 : 0.14 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(8.55, 0.38, 8.55), wood);
    frame.position.y = -0.22;
    frame.receiveShadow = true;
    frame.castShadow = true;
    scene.add(frame);
    const darkWood = new THREE.MeshStandardMaterial({ color: skinSet.board.rim, roughness: 0.30, metalness: skin === 'fancy' ? 0.38 : 0.22 });
    const rim = new THREE.Mesh(new THREE.BoxGeometry(8.68, 0.12, 8.68), darkWood);
    rim.position.y = -0.45;
    scene.add(rim);

    // Pre-build tile materials (one per light/dark, shared across 64 tiles)
    const tileMats = {
      light: new THREE.MeshStandardMaterial({ color: skinSet.board.light, roughness: 0.42, metalness: skin === 'neon' || skin === 'anime' ? 0.22 : 0.10 }),
      dark:  new THREE.MeshStandardMaterial({ color: skinSet.board.dark,  roughness: 0.52, metalness: skin === 'neon' || skin === 'anime' ? 0.28 : 0.16 }),
    };
    interactionMeshesRef.current = [];
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const isLight = (row + col) % 2 === 0;
      const mat = isLight ? tileMats.light : tileMats.dark;
      const tile = new THREE.Mesh(new THREE.BoxGeometry(0.995, 0.12, 0.995), mat);
      tile.position.set(col - 3.5, 0.015, row - 3.5);
      tile.receiveShadow = true;
      tile.castShadow = false;
      scene.add(tile);

      const interaction = new THREE.Mesh(
        new THREE.PlaneGeometry(0.995, 0.995),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
      );
      interaction.rotation.x = -Math.PI / 2;
      interaction.position.set(col - 3.5, 0.09, row - 3.5);
      interaction.userData.square = squareName(row, col);
      scene.add(interaction);
      interactionMeshesRef.current.push(interaction);
    }
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
      animatedEffectsRef.current = [];
      interactionMeshesRef.current = [];
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
    };
  }, [skin]);

  useEffect(() => {
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    if (!camera || !renderer || !scene) return;
    const distance = 15 / zoom;
    const yawRadians = THREE.MathUtils.degToRad(yaw);
    const pitchRadians = THREE.MathUtils.degToRad(pitch);
    camera.position.set(
      Math.sin(yawRadians) * Math.sin(pitchRadians) * distance,
      Math.cos(pitchRadians) * distance,
      Math.cos(yawRadians) * Math.sin(pitchRadians) * distance,
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }, [zoom, yaw, pitch]);

  useEffect(() => {
    const canvas = rendererRef.current?.domElement;
    if (!canvas) return undefined;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const activePointers = new Map();
    const gesture = { startX: 0, startY: 0, lastX: 0, lastY: 0, moved: false, pinchDistance: 0, pinchZoom: 1 };
    const clampZoom = (value) => Math.min(1.2, Math.max(0.4, Number(value.toFixed(2))));
    const clampPitch = (value) => Math.min(64, Math.max(6, Number(value.toFixed(1))));
    const pointerDistance = () => {
      const points = Array.from(activePointers.values());
      if (points.length < 2) return 0;
      return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    };
    const updatePointer = (event) => activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const selectSquareAt = (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, cameraRef.current);
      const hit = raycaster.intersectObjects(interactionMeshesRef.current, false)[0];
      if (hit?.object?.userData?.square) onSquareClickRef.current?.(hit.object.userData.square);
    };
    const onPointerDown = (event) => {
      canvas.setPointerCapture?.(event.pointerId);
      updatePointer(event);
      if (activePointers.size === 1) {
        gesture.startX = event.clientX;
        gesture.startY = event.clientY;
        gesture.lastX = event.clientX;
        gesture.lastY = event.clientY;
        gesture.moved = false;
        canvas.style.cursor = 'grabbing';
      } else if (activePointers.size === 2) {
        gesture.pinchDistance = pointerDistance();
        gesture.pinchZoom = zoomRef.current;
        gesture.moved = true;
      }
    };
    const onPointerMove = (event) => {
      if (!activePointers.has(event.pointerId)) return;
      updatePointer(event);
      if (activePointers.size >= 2) {
        const distance = pointerDistance();
        if (gesture.pinchDistance > 0 && distance > 0) setZoom(clampZoom(gesture.pinchZoom * (distance / gesture.pinchDistance)));
        gesture.moved = true;
        event.preventDefault();
        return;
      }
      const dx = event.clientX - gesture.lastX;
      const dy = event.clientY - gesture.lastY;
      if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 5) gesture.moved = true;
      if (gesture.moved) {
        setYaw((value) => Number((value + dx * 0.55).toFixed(1)));
        setPitch((value) => clampPitch(value + dy * 0.35));
        event.preventDefault();
      }
      gesture.lastX = event.clientX;
      gesture.lastY = event.clientY;
    };
    const onPointerUp = (event) => {
      const wasTap = activePointers.size === 1 && !gesture.moved;
      activePointers.delete(event.pointerId);
      if (wasTap) selectSquareAt(event);
      if (activePointers.size === 0) {
        gesture.pinchDistance = 0;
        canvas.style.cursor = 'grab';
      } else if (activePointers.size === 1) {
        const remaining = Array.from(activePointers.values())[0];
        gesture.lastX = remaining.x;
        gesture.lastY = remaining.y;
        gesture.moved = true;
      }
    };
    const onPointerCancel = (event) => {
      activePointers.delete(event.pointerId);
      if (activePointers.size === 0) canvas.style.cursor = 'grab';
    };
    const onWheel = (event) => {
      event.preventDefault();
      setZoom((value) => clampZoom(value - event.deltaY * 0.001));
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove, { passive: false });
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerCancel);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, []);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === boardRef.current);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;
    if (isFullscreen && gardenBackdrop) {
      sceneRef.current.background = null;
    } else {
      sceneRef.current.background = new THREE.Color(0x171411);
    }
    rendererRef.current?.render(sceneRef.current, cameraRef.current);
  }, [isFullscreen, gardenBackdrop]);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === boardRef.current) await document.exitFullscreen();
      else await boardRef.current?.requestFullscreen();
    } catch {
      // Fullscreen can be denied by the browser; the board remains usable normally.
    }
  }

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    for (const object of objectsRef.current) {
      scene.remove(object);
      object.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          for (const material of Array.isArray(child.material) ? child.material : [child.material]) material.dispose();
        }
      });
    }
    objectsRef.current = [];
    animatedEffectsRef.current = [];
    const isMobile = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const square = squareName(row, col);
      const isSelected = selectedSquare === square;
      const isValid = validTargets.includes(square);
      const isRecent = lastMove && (lastMove.from === square || lastMove.to === square);
      const isCheck = kingInCheck === square;
      if (isSelected || isValid || isRecent || isCheck) {
        const color = isCheck ? 0xc52f3b : isSelected ? 0xd5ad48 : isValid ? 0x4ade80 : 0x81a96a;
        const highlight = new THREE.Mesh(
          new THREE.BoxGeometry(0.94, 0.025, 0.94),
          new THREE.MeshStandardMaterial({ color, transparent: true, opacity: isSelected || isCheck ? 0.8 : isValid ? 0.32 : 0.56, roughness: 0.65 }),
        );
        highlight.position.set(col - 3.5, 0.087, row - 3.5);
        scene.add(highlight);
        objectsRef.current.push(highlight);
        if (isValid && !isSelected) {
          const marker = new THREE.Mesh(
            new THREE.CylinderGeometry(0.13, 0.13, 0.035, 16),
            new THREE.MeshBasicMaterial({ color: 0xbbf7d0, transparent: true, opacity: 0.84 }),
          );
          marker.position.set(col - 3.5, 0.12, row - 3.5);
          scene.add(marker);
          objectsRef.current.push(marker);
        }
      }
      const piece = board?.[row]?.[col];
      if (piece) {
        const model = makePiece(piece.type, piece.color, skin, customization, { maxParticles: isMobile ? 6 : undefined, reducedGeometry: isMobile });
        if (model) {
          model.position.set(col - 3.5, 0.085, row - 3.5);
          scene.add(model);
          objectsRef.current.push(model);
          model.traverse((child) => {
            if (child.userData?.cyberFx) animatedEffectsRef.current.push(child);
          });
        }
      }
    }
    rendererRef.current?.render(scene, cameraRef.current);
  }, [board, selectedSquare, validTargets, lastMove, kingInCheck, skin, customization]);

  function adjustZoom(amount) {
    setZoom((value) => Math.min(1.2, Math.max(0.4, Number((value + amount).toFixed(2)))));
  }

  function adjustYaw(amount) {
    setYaw((value) => Number((value + amount).toFixed(1)));
  }

  function adjustPitch(amount) {
    setPitch((value) => Math.min(64, Math.max(6, Number((value + amount).toFixed(1)))));
  }

  function resetCamera() {
    setZoom(1);
    setYaw(playerSide === 'b' ? 180 : 0);
    setPitch(24);
  }

  return (
    <>
      <div
        ref={boardRef}
        className={`relative isolate aspect-square w-full overflow-hidden rounded-xl border-4 border-[#6b4423] shadow-2xl transition-all duration-300 ${
          isFullscreen ? 'h-screen max-h-screen rounded-none border-0' : 'bg-[#171411]'
        }`}
        style={
          isFullscreen && gardenBackdrop
            ? {
                backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.45)), url(/garden-background.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }
            : undefined
        }
        aria-label="Three-dimensional chessboard"
      >
        <div ref={hostRef} className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-x-2 top-2 z-20 flex justify-between gap-2 text-[10px] sm:text-xs">
          <div className="max-w-[48%] rounded-lg border border-white/15 bg-black/65 px-2 py-1 text-white backdrop-blur"><span className="font-semibold text-gold">♚ {blackName}</span><div className="truncate text-gray-300">Captured: {capturedByBlack.join('') || '—'}</div></div>
          <div className="max-w-[48%] rounded-lg border border-white/15 bg-black/65 px-2 py-1 text-right text-white backdrop-blur"><span className="font-semibold text-gold">♔ {whiteName}</span><div className="truncate text-gray-300">Captured: {capturedByWhite.join('') || '—'}</div></div>
        </div>
        {isFullscreen && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border border-gold/40 bg-black/75 px-3 py-1 text-xs backdrop-blur">
            <span className="text-gold font-bold">🌿 Royal Garden View</span>
            <button
              type="button"
              onClick={() => setGardenBackdrop((prev) => !prev)}
              className="text-[11px] underline text-gray-300 hover:text-white"
            >
              {gardenBackdrop ? 'Hide Garden' : 'Show Garden'}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="text-[11px] bg-white/15 px-2 py-0.5 rounded text-gray-200 hover:bg-white/25"
            >
              Exit Fullscreen
            </button>
          </div>
        )}
        <div className="pointer-events-none absolute bottom-2 left-2 z-20 rounded-md border border-white/10 bg-black/55 px-2 py-1 text-[10px] text-gray-300 backdrop-blur">Drag to rotate · Pinch to zoom</div>
        <div className="sr-only" role="grid" aria-label="Chess board keyboard access">
          {Array.from({ length: 64 }, (_, index) => {
            const row = Math.floor(index / 8);
            const col = index % 8;
            const square = squareName(row, col);
            const piece = board?.[row]?.[col];
            const selected = selectedSquare === square;
            const valid = validTargets.includes(square);
            const recent = lastMove && (lastMove.from === square || lastMove.to === square);
            const checked = kingInCheck === square;
            const status = [selected && 'selected', valid && 'legal move target', recent && 'last move', checked && 'king in check'].filter(Boolean).join(', ');
            const pieceName = piece ? `${piece.color === 'w' ? 'White' : 'Black'} ${({ k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' })[piece.type] || piece.type}` : 'empty';
            return <button key={square} type="button" role="gridcell" aria-label={`${square}: ${pieceName}${status ? `, ${status}` : ''}`} aria-pressed={selected} onClick={() => onSquareClick?.(square)}>{square}</button>;
          })}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-gold/20 bg-graphite p-3" aria-label="3D board perspective controls">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold/80">Perspective controls</p>
            <p className="mt-1 text-[11px] text-gray-400">Adjust angle from outside the board for a clearer view.</p>
          </div>
          <span className="font-mono text-sm font-bold text-gold">{Math.round(zoom * 100)}%</span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 sm:max-w-[15rem]" aria-label="Rotate board">
          <button type="button" onClick={() => adjustYaw(-15)} className="rounded-lg border border-white/10 bg-obsidian px-3 py-2 text-sm text-gray-200 transition hover:border-gold/60 hover:text-gold" aria-label="Rotate board left">↶ <span className="sr-only">Left</span></button>
          <button type="button" onClick={() => adjustPitch(-8)} className="rounded-lg border border-white/10 bg-obsidian px-3 py-2 text-sm text-gray-200 transition hover:border-gold/60 hover:text-gold" aria-label="Tilt board up">↟ <span className="sr-only">Up</span></button>
          <button type="button" onClick={() => adjustPitch(8)} className="rounded-lg border border-white/10 bg-obsidian px-3 py-2 text-sm text-gray-200 transition hover:border-gold/60 hover:text-gold" aria-label="Tilt board down">↡ <span className="sr-only">Down</span></button>
          <button type="button" onClick={() => adjustYaw(15)} className="rounded-lg border border-white/10 bg-obsidian px-3 py-2 text-sm text-gray-200 transition hover:border-gold/60 hover:text-gold" aria-label="Rotate board right">↷ <span className="sr-only">Right</span></button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => adjustZoom(-0.1)} className="rounded-lg border border-white/10 bg-obsidian px-3 py-2 text-sm text-gray-200 hover:border-gold/60 hover:text-gold" aria-label="Zoom out">−</button>
          <input type="range" min="0.4" max="1.2" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="min-w-[10rem] flex-1 accent-gold" aria-label="Board zoom from 40 to 120 percent" />
          <button type="button" onClick={() => adjustZoom(0.1)} className="rounded-lg border border-white/10 bg-obsidian px-3 py-2 text-sm text-gray-200 hover:border-gold/60 hover:text-gold" aria-label="Zoom in">+</button>
          <button type="button" onClick={resetCamera} className="rounded-lg border border-gold/30 px-3 py-2 text-xs font-semibold text-gold hover:bg-gold/10">Reset</button>
          <button type="button" onClick={() => setGardenBackdrop((prev) => !prev)} className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${gardenBackdrop ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-obsidian text-gray-400'}`} title="Toggle Royal Garden backdrop in fullscreen 3D">🌿 Garden</button>
          <button type="button" onClick={toggleFullscreen} className="rounded-lg border border-white/10 bg-obsidian px-3 py-2 text-sm text-gray-200 hover:border-gold/60 hover:text-gold" aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>{isFullscreen ? '×' : '⛶'}</button>
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-gray-500"><span>40%</span><span>Board zoom</span><span>120%</span></div>
      </div>
    </>
  );
}
